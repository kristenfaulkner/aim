/**
 * Re-fetch Strava streams for activities that have avg_power but no NP.
 * This recovers metrics for activities where streams were unavailable during
 * the initial sync (rate limits, API errors, etc.).
 *
 * POST /api/integrations/sync/strava-refetch-streams
 */
import { supabaseAdmin } from "../../_lib/supabase.js";
import { getStravaToken, stravaFetch } from "../../_lib/strava.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { verifySession, cors } from "../../_lib/auth.js";

export const config = { maxDuration: 300 }; // 5 min — may process many activities

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userId = session.userId;

  try {
    const tokenData = await getStravaToken(userId);
    if (!tokenData) {
      return res.status(400).json({ error: "No valid Strava connection" });
    }
    const { accessToken } = tokenData;

    // Get user's FTP and weight
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts, weight_kg")
      .eq("id", userId)
      .single();

    const ftp = profile?.ftp_watts || null;

    // Find Strava activities with avg power but no NP
    const { data: activities, error: fetchErr } = await supabaseAdmin
      .from("activities")
      .select("id, source_id, duration_seconds, avg_power_watts, started_at")
      .eq("user_id", userId)
      .eq("source", "strava")
      .gt("avg_power_watts", 0)
      .is("normalized_power_watts", null)
      .order("started_at", { ascending: false });

    if (fetchErr) throw fetchErr;

    if (!activities || activities.length === 0) {
      return res.status(200).json({ updated: 0, skipped: 0, failed: 0, total: 0, message: "No activities need stream re-fetch" });
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    for (const act of activities) {
      try {
        // Fetch streams from Strava
        let streams = {};
        const streamData = await stravaFetch(
          accessToken,
          `/activities/${act.source_id}/streams?keys=watts,heartrate,cadence,altitude,time,latlng,temp&key_by_type=true`
        );

        if (Array.isArray(streamData)) {
          for (const stream of streamData) {
            streams[stream.type] = stream;
          }
        } else {
          streams = streamData || {};
        }

        // If no watts stream, skip — can't compute NP without it
        if (!streams.watts) {
          skipped++;
          continue;
        }

        // Compute full metrics from streams
        const metrics = computeActivityMetrics(streams, act.duration_seconds, ftp);

        if (!metrics.normalized_power_watts) {
          skipped++;
          continue;
        }

        // Update the activity with all computed metrics
        const updates = {
          normalized_power_watts: metrics.normalized_power_watts,
        };
        if (metrics.tss != null) updates.tss = metrics.tss;
        if (metrics.intensity_factor != null) updates.intensity_factor = metrics.intensity_factor;
        if (metrics.variability_index != null) updates.variability_index = metrics.variability_index;
        if (metrics.efficiency_factor != null) updates.efficiency_factor = metrics.efficiency_factor;
        if (metrics.hr_drift_pct != null) updates.hr_drift_pct = metrics.hr_drift_pct;
        if (metrics.decoupling_pct != null) updates.decoupling_pct = metrics.decoupling_pct;
        if (metrics.work_kj != null) updates.work_kj = metrics.work_kj;
        if (metrics.zone_distribution != null) updates.zone_distribution = metrics.zone_distribution;
        if (metrics.power_curve != null) updates.power_curve = metrics.power_curve;
        if (metrics.max_power_watts != null) updates.max_power_watts = metrics.max_power_watts;
        if (metrics.avg_hr_bpm != null) updates.avg_hr_bpm = metrics.avg_hr_bpm;
        if (metrics.max_hr_bpm != null) updates.max_hr_bpm = metrics.max_hr_bpm;
        if (metrics.avg_cadence_rpm != null) updates.avg_cadence_rpm = metrics.avg_cadence_rpm;
        if (ftp) updates.ftp_at_time = ftp;

        await supabaseAdmin
          .from("activities")
          .update(updates)
          .eq("id", act.id);

        // Update daily training load if TSS was computed
        if (updates.tss) {
          await updateDailyMetrics(userId, {
            started_at: act.started_at,
            tss: updates.tss,
          });
        }

        // Update power profile bests
        if (metrics.power_curve) {
          await updatePowerProfile(userId, metrics.power_curve, profile?.weight_kg);
        }

        updated++;
      } catch (err) {
        console.error(`Stream re-fetch failed for activity ${act.id} (Strava ${act.source_id}):`, err.message);
        errors.push({ id: act.id, source_id: act.source_id, error: err.message });
        failed++;

        // If rate limited, stop processing to avoid wasting requests
        if (err.message?.includes("rate limit")) {
          break;
        }
      }

      // Throttle to stay under Strava's 600 req/15min limit
      await new Promise(r => setTimeout(r, 1000));
    }

    return res.status(200).json({
      updated,
      skipped,
      failed,
      total: activities.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Strava stream re-fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
}

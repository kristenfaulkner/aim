import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { stravaFetch, refreshStravaToken } from "../_lib/strava.js";
import { computeWbalStream } from "../_lib/wbal.js";

/**
 * POST /api/activities/backfill-wbal
 * Computes W'bal for activities that have power data but no wbal_data.
 * Re-fetches Strava streams since raw streams aren't stored.
 * Processes up to 30 activities per call.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  // Need CP model
  const { data: powerProfile } = await supabaseAdmin
    .from("power_profiles")
    .select("cp_watts, w_prime_kj")
    .eq("user_id", session.userId)
    .order("computed_date", { ascending: false })
    .limit(1)
    .single();

  if (!powerProfile?.cp_watts || !powerProfile?.w_prime_kj) {
    return res.status(200).json({ processed: 0, failed: 0, message: "CP model required. Sync more activities." });
  }

  // Get Strava integration for stream fetching
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", session.userId)
    .eq("provider", "strava")
    .single();

  if (!integration) {
    return res.status(200).json({ processed: 0, failed: 0, message: "Strava connection required for W'bal backfill" });
  }

  // Find Strava activities with power data but no wbal_data
  const { data: activities } = await supabaseAdmin
    .from("activities")
    .select("id, source_id, avg_power_watts, duration_seconds")
    .eq("user_id", session.userId)
    .eq("source", "strava")
    .not("avg_power_watts", "is", null)
    .is("wbal_data", null)
    .gte("duration_seconds", 300) // at least 5 min (shorter than durability's 30 min since W'bal is useful for short hard efforts too)
    .order("started_at", { ascending: false })
    .limit(30);

  if (!activities || activities.length === 0) {
    return res.status(200).json({ processed: 0, failed: 0, message: "No activities to backfill" });
  }

  let tokenData;
  try {
    tokenData = await refreshStravaToken(integration);
  } catch {
    return res.status(400).json({ error: "Failed to refresh Strava token" });
  }

  const wPrimeJ = powerProfile.w_prime_kj * 1000;
  let processed = 0;
  let failed = 0;

  for (const activity of activities) {
    try {
      const streamData = await stravaFetch(
        tokenData.accessToken,
        `/activities/${activity.source_id}/streams?keys=watts,time&key_by_type=true`
      );

      let streams = {};
      if (Array.isArray(streamData)) {
        for (const s of streamData) streams[s.type] = s;
      } else {
        streams = streamData;
      }

      if (!streams.watts?.data) {
        failed++;
        continue;
      }

      const result = computeWbalStream(
        streams.watts.data,
        streams.time?.data,
        powerProfile.cp_watts,
        wPrimeJ
      );

      if (result) {
        await supabaseAdmin
          .from("activities")
          .update({
            wbal_data: result,
            wbal_min_pct: result.summary.min_wbal_pct,
            wbal_empty_events: result.summary.empty_tank_events,
          })
          .eq("id", activity.id);
        processed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`W'bal backfill failed for ${activity.id}:`, err.message);
      failed++;
    }
  }

  return res.status(200).json({
    processed,
    failed,
    remaining: activities.length - processed - failed,
    message: processed > 0 ? `Computed W'bal for ${processed} activities` : "No activities processed",
  });
}

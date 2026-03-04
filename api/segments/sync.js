import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { enrichEffortContext, computeAdjustedScore, computeAthleteBaselines, detectPR } from "../_lib/segment-scoring.js";

/**
 * POST /api/segments/sync
 * Backfill segments from existing Strava activities that have segment_efforts in source_data.
 * Processes up to 100 activities per call.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userId = session.userId;

    // Fetch recent Strava activities with source_data
    const { data: activities, error: actErr } = await supabaseAdmin
      .from("activities")
      .select("id, source_data, started_at, activity_type, activity_weather, hr_source")
      .eq("user_id", userId)
      .eq("source", "strava")
      .not("source_data", "is", null)
      .order("started_at", { ascending: false })
      .limit(100);

    if (actErr) throw actErr;
    if (!activities || activities.length === 0) {
      return res.status(200).json({ synced: 0, message: "No Strava activities found" });
    }

    // Fetch 30-day baselines
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const { data: recentMetrics } = await supabaseAdmin
      .from("daily_metrics")
      .select("hrv_ms, hrv_overnight_avg_ms, sleep_score, tsb")
      .eq("user_id", userId)
      .gte("date", thirtyDaysAgo);

    const baselines = computeAthleteBaselines(recentMetrics || []);

    let segmentsCreated = 0;
    let effortsCreated = 0;

    for (const act of activities) {
      const sourceData = act.source_data;
      const segEfforts = sourceData?.segment_efforts;
      if (!segEfforts || segEfforts.length === 0) continue;

      const effortDate = act.started_at
        ? new Date(act.started_at).toISOString().split("T")[0]
        : null;

      let dailyMetrics = null;
      if (effortDate) {
        const { data } = await supabaseAdmin
          .from("daily_metrics")
          .select("hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, sleep_score, total_sleep_seconds, ctl, atl, tsb")
          .eq("user_id", userId)
          .eq("date", effortDate)
          .single();
        dailyMetrics = data;
      }

      const trainingLoad = dailyMetrics ? { ctl: dailyMetrics.ctl, atl: dailyMetrics.atl, tsb: dailyMetrics.tsb } : null;
      const sport = (act.activity_type || "ride").includes("run") ? "running" : "cycling";

      for (const se of segEfforts) {
        try {
          const seg = se.segment;
          if (!seg || !seg.id) continue;

          // Upsert segment
          const { data: segRecord } = await supabaseAdmin
            .from("segments")
            .upsert({
              user_id: userId,
              strava_segment_id: String(seg.id),
              name: seg.name || "Unknown Segment",
              sport,
              distance_m: seg.distance || null,
              average_grade_pct: seg.average_grade || null,
              maximum_grade_pct: seg.maximum_grade || null,
              elevation_gain_m: seg.elevation_high != null && seg.elevation_low != null
                ? seg.elevation_high - seg.elevation_low : null,
              start_lat: seg.start_latlng?.[0] || null,
              start_lng: seg.start_latlng?.[1] || null,
              end_lat: seg.end_latlng?.[0] || null,
              end_lng: seg.end_latlng?.[1] || null,
              climb_category: seg.climb_category ?? null,
              city: seg.city || null,
              state: seg.state || null,
              country: seg.country || null,
            }, { onConflict: "user_id,strava_segment_id" })
            .select("id")
            .single();

          if (!segRecord?.id) continue;
          segmentsCreated++;

          const rawEffort = {
            elapsed_time_seconds: se.elapsed_time,
            moving_time_seconds: se.moving_time || se.elapsed_time,
            avg_power_watts: se.average_watts || null,
            normalized_power_watts: null,
            avg_hr_bpm: se.average_heartrate || null,
            max_hr_bpm: se.max_heartrate || null,
            avg_cadence_rpm: se.average_cadence || null,
            avg_speed_mps: se.distance && se.elapsed_time ? se.distance / se.elapsed_time : null,
            avg_pace_min_km: sport === "running" && se.distance && se.elapsed_time
              ? (se.elapsed_time / 60) / (se.distance / 1000) : null,
          };

          const enriched = enrichEffortContext(rawEffort, dailyMetrics, act.activity_weather, trainingLoad);

          const { data: historicalEfforts } = await supabaseAdmin
            .from("segment_efforts")
            .select("elapsed_time_seconds, started_at, strava_effort_id, adjustment_factors, power_hr_ratio")
            .eq("segment_id", segRecord.id)
            .eq("user_id", userId)
            .order("started_at", { ascending: false })
            .limit(50);

          const prInfo = detectPR(enriched, historicalEfforts || []);
          const prTime = prInfo.pr_time || enriched.elapsed_time_seconds;
          const scoreResult = computeAdjustedScore(enriched, prTime, baselines);

          const { error: upsertErr } = await supabaseAdmin
            .from("segment_efforts")
            .upsert({
              user_id: userId,
              segment_id: segRecord.id,
              activity_id: act.id,
              strava_effort_id: String(se.id),
              started_at: se.start_date || act.started_at,
              ...enriched,
              adjusted_score: scoreResult.adjusted_score,
              adjustment_factors: {
                adjusted_time: scoreResult.adjusted_time,
                adjustments: scoreResult.adjustments,
                total_adjustment_seconds: scoreResult.total_adjustment_seconds,
              },
              is_pr: prInfo.is_raw_pr,
              hr_source: act.hr_source || null,
            }, { onConflict: "user_id,strava_effort_id" });

          if (!upsertErr) effortsCreated++;
        } catch (effortErr) {
          console.error(`Backfill segment effort ${se.id} failed:`, effortErr.message);
        }
      }
    }

    return res.status(200).json({
      synced: effortsCreated,
      segments_created: segmentsCreated,
      activities_scanned: activities.length,
    });
  } catch (err) {
    console.error("[segments/sync]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

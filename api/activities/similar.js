import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { computeSimilarity, enrichActivity } from "../_lib/similar-sessions.js";

/**
 * GET /api/activities/similar?id=<uuid>&limit=5
 * Finds past activities similar to the given one, enriched with cross-domain context.
 *
 * Matching weights:
 *   Duration ±25%  → 0.30
 *   TSS ±30%       → 0.25
 *   IF ±15%        → 0.20
 *   NP ±20%        → 0.15
 *   Tag overlap     → 0.10
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const activityId = req.query.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);
  if (!activityId) return res.status(400).json({ error: "Activity ID required" });

  try {
    const selectFields = "id, name, activity_type, started_at, duration_seconds, distance_meters, elevation_gain_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, hr_drift_pct, avg_hr_bpm, max_hr_bpm, work_kj, calories, activity_weather, user_tags";

    // Fetch the current activity
    const { data: current, error: actErr } = await supabaseAdmin
      .from("activities")
      .select(selectFields)
      .eq("id", activityId)
      .eq("user_id", session.userId)
      .single();

    if (actErr || !current) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Fetch activities of the same type for matching (most recent 200)
    const { data: candidates } = await supabaseAdmin
      .from("activities")
      .select(selectFields)
      .eq("user_id", session.userId)
      .eq("activity_type", current.activity_type || "Ride")
      .neq("id", activityId)
      .order("started_at", { ascending: false })
      .limit(200);

    if (!candidates || !candidates.length) {
      return res.status(200).json({ current: enrichActivity(current), similar: [] });
    }

    // Score each candidate
    const currentTags = Array.isArray(current.user_tags) ? current.user_tags : [];
    const scored = candidates
      .map((c) => {
        const score = computeSimilarity(current, c, currentTags);
        return { ...c, similarity_score: score };
      })
      .filter((c) => c.similarity_score > 0.4)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    if (!scored.length) {
      return res.status(200).json({ current: enrichActivity(current), similar: [] });
    }

    // Gather dates for cross-domain enrichment
    const allDates = [current, ...scored]
      .map((a) => a.started_at?.split("T")[0])
      .filter(Boolean);

    const dayBeforeDates = allDates.map((d) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - 1);
      return dt.toISOString().split("T")[0];
    });

    const allLookupDates = [...new Set([...allDates, ...dayBeforeDates])];

    // Parallel enrichment queries
    const [metricsResult, nutritionResult, travelResult, crossTrainResult, loadResult] = await Promise.allSettled([
      supabaseAdmin
        .from("daily_metrics")
        .select("date, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, recovery_score, sleep_score, sleep_duration_hours, life_stress_score, motivation_score, muscle_soreness_score, mood_score")
        .eq("user_id", session.userId)
        .in("date", allLookupDates),
      supabaseAdmin
        .from("nutrition_logs")
        .select("activity_id, totals, per_hour")
        .eq("user_id", session.userId)
        .in("activity_id", [activityId, ...scored.map((s) => s.id)]),
      supabaseAdmin
        .from("travel_events")
        .select("detected_date, timezone_shift_hours, altitude_change_meters, jet_lag_severity")
        .eq("user_id", session.userId)
        .in("detected_date", allDates),
      supabaseAdmin
        .from("cross_training_log")
        .select("date, activity_type, recovery_impact, estimated_tss")
        .eq("user_id", session.userId)
        .in("date", allLookupDates),
      supabaseAdmin
        .from("power_profiles")
        .select("computed_date, ctl, atl, tsb")
        .eq("user_id", session.userId)
        .order("computed_date", { ascending: false })
        .limit(100),
    ]);

    // Build lookup maps
    const metricsByDate = {};
    if (metricsResult.status === "fulfilled" && metricsResult.value.data) {
      for (const m of metricsResult.value.data) metricsByDate[m.date] = m;
    }

    const nutritionByActivity = {};
    if (nutritionResult.status === "fulfilled" && nutritionResult.value.data) {
      for (const n of nutritionResult.value.data) nutritionByActivity[n.activity_id] = n;
    }

    const travelByDate = {};
    if (travelResult.status === "fulfilled" && travelResult.value.data) {
      for (const t of travelResult.value.data) travelByDate[t.detected_date] = t;
    }

    const crossTrainByDate = {};
    if (crossTrainResult.status === "fulfilled" && crossTrainResult.value.data) {
      for (const ct of crossTrainResult.value.data) {
        if (!crossTrainByDate[ct.date]) crossTrainByDate[ct.date] = [];
        crossTrainByDate[ct.date].push(ct);
      }
    }

    const loadByDate = {};
    if (loadResult.status === "fulfilled" && loadResult.value.data) {
      for (const dateStr of allDates) {
        const closest = loadResult.value.data.find((p) => p.computed_date <= dateStr);
        if (closest) loadByDate[dateStr] = { ctl: closest.ctl, atl: closest.atl, tsb: closest.tsb };
      }
    }

    // Enrich current and similar activities
    const enrichedCurrent = enrichActivity(current, metricsByDate, nutritionByActivity, travelByDate, crossTrainByDate, loadByDate);
    const enrichedSimilar = scored.map((s) =>
      enrichActivity(s, metricsByDate, nutritionByActivity, travelByDate, crossTrainByDate, loadByDate)
    );

    return res.status(200).json({
      current: enrichedCurrent,
      similar: enrichedSimilar,
    });
  } catch (err) {
    console.error("[activities/similar]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

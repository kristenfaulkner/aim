import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { matchActivitiesToContext, computeAllModels } from "../_lib/performance-models.js";

/**
 * GET /api/models/summary
 * Returns all conditional performance models computed from 90 days of data.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const [profileResult, activitiesResult, dailyMetricsResult, nutritionResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("weight_kg, ftp_watts")
      .eq("id", session.userId)
      .single(),
    supabaseAdmin
      .from("activities")
      .select("id, name, activity_type, started_at, duration_seconds, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, hr_drift_pct, variability_index, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm, calories, work_kj, temperature_celsius, elevation_gain_meters, activity_weather, laps")
      .eq("user_id", session.userId)
      .gte("started_at", new Date(Date.now() - 90 * 86400000).toISOString())
      .order("started_at", { ascending: false }),
    supabaseAdmin
      .from("daily_metrics")
      .select("date, total_sleep_seconds, sleep_score, deep_sleep_seconds, rem_sleep_seconds, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, tsb, ctl, atl")
      .eq("user_id", session.userId)
      .gte("date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0])
      .order("date", { ascending: false }),
    supabaseAdmin
      .from("nutrition_logs")
      .select("activity_id, date, totals, per_hour")
      .eq("user_id", session.userId)
      .gte("date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]),
  ]);

  const profile = profileResult.data;
  const activities = activitiesResult.data || [];
  const dailyMetrics = dailyMetricsResult.data || [];
  const nutritionLogs = nutritionResult.data || [];

  if (activities.length < 5) {
    return res.status(200).json({
      models: null,
      message: "Not enough activity data for performance models (need at least 5 activities)",
    });
  }

  const pairs = matchActivitiesToContext(activities, dailyMetrics, nutritionLogs, profile?.weight_kg);
  const models = computeAllModels(pairs);

  return res.status(200).json({ models });
}

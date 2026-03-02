import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * GET /api/activities/detail?id=<uuid>
 * Returns full activity data including AI analysis.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing activity id" });

  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("id, name, description, activity_type, source, started_at, duration_seconds, distance_meters, elevation_gain_meters, avg_power_watts, normalized_power_watts, max_power_watts, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm, avg_speed_mps, max_speed_mps, calories, tss, intensity_factor, variability_index, efficiency_factor, hr_drift_pct, decoupling_pct, work_kj, temperature_celsius, zone_distribution, power_curve, ai_analysis, ai_analysis_generated_at")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  if (error) return res.status(404).json({ error: "Activity not found" });

  return res.status(200).json(data);
}

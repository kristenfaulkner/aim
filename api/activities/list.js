import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * GET /api/activities/list
 * Query params: ?page=1&limit=20&type=ride
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;
  const type = req.query.type;

  let query = supabaseAdmin
    .from("activities")
    .select("id, name, activity_type, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, avg_hr_bpm, max_hr_bpm, avg_speed_mps, elevation_gain_meters, calories, work_kj, ai_analysis, ai_analysis_generated_at", { count: "exact" })
    .eq("user_id", session.userId)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq("activity_type", type);
  }

  const { data, error, count } = await query;

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    activities: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

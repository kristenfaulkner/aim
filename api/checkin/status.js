import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * GET /api/checkin/status — Get today's check-in status
 *
 * Returns the subjective check-in fields for today, or null if not submitted.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("daily_metrics")
    .select("date, life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at")
    .eq("user_id", session.userId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }

  // Return null if no row or no checkin_completed_at
  if (!data || !data.checkin_completed_at) {
    return res.status(200).json({ checkin: null });
  }

  return res.status(200).json({ checkin: data });
}

import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * POST /api/checkin/submit — Save daily subjective check-in
 *
 * Body: { life_stress, motivation, muscle_soreness, mood }
 * Each value is 1-5 (SMALLINT). Null values are ignored.
 *
 * Upserts into daily_metrics for today's date.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { life_stress, motivation, muscle_soreness, mood } = req.body;

  // Validate: at least one field must be provided
  if (
    life_stress == null &&
    motivation == null &&
    muscle_soreness == null &&
    mood == null
  ) {
    return res.status(400).json({ error: "At least one check-in field is required" });
  }

  // Validate ranges (1-5)
  const fields = { life_stress, motivation, muscle_soreness, mood };
  for (const [key, val] of Object.entries(fields)) {
    if (val != null && (val < 1 || val > 5 || !Number.isInteger(val))) {
      return res.status(400).json({ error: `${key} must be an integer between 1 and 5` });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const updates = { checkin_completed_at: new Date().toISOString() };
  if (life_stress != null) updates.life_stress_score = life_stress;
  if (motivation != null) updates.motivation_score = motivation;
  if (muscle_soreness != null) updates.muscle_soreness_score = muscle_soreness;
  if (mood != null) updates.mood_score = mood;

  const { data, error } = await supabaseAdmin
    .from("daily_metrics")
    .upsert(
      { user_id: session.userId, date: today, ...updates },
      { onConflict: "user_id,date" }
    )
    .select("date, life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ checkin: data });
}

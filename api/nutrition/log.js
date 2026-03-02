import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { activity_id, date, items, totals, per_hour, ride_duration_hours, ai_insight } =
      req.body;

    const { data: log, error } = await supabaseAdmin
      .from("nutrition_logs")
      .insert({
        user_id: session.userId,
        activity_id,
        date,
        items,
        totals,
        per_hour,
        ride_duration_hours,
        ai_insight,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ log });
  } catch (err) {
    console.error("Nutrition log error:", err);
    return res.status(500).json({ error: "Failed to save nutrition log" });
  }
}

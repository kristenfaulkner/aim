import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res
        .status(400)
        .json({ error: "start and end date query params are required" });
    }

    const { data: workouts, error } = await supabaseAdmin
      .from("training_calendar")
      .select("*")
      .eq("user_id", session.userId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (error) throw error;

    return res.status(200).json({ workouts: workouts || [] });
  } catch (err) {
    console.error("Calendar list error:", err);
    return res.status(500).json({ error: "Failed to fetch calendar" });
  }
}

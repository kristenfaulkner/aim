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
    const workoutData = { ...req.body, user_id: session.userId };

    let result;
    if (workoutData.id) {
      // Update existing workout
      const { data, error } = await supabaseAdmin
        .from("training_calendar")
        .update(workoutData)
        .eq("id", workoutData.id)
        .eq("user_id", session.userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new workout
      delete workoutData.id;
      const { data, error } = await supabaseAdmin
        .from("training_calendar")
        .insert(workoutData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({ workout: result });
  } catch (err) {
    console.error("Calendar upsert error:", err);
    return res.status(500).json({ error: "Failed to save workout" });
  }
}

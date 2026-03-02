import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "PATCH" && req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { id, status, this_week } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Goal id is required" });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (this_week !== undefined) updates.this_week = this_week;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data: goal, error } = await supabaseAdmin
      .from("working_goals")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.userId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ goal });
  } catch (err) {
    console.error("Goals update-status error:", err);
    return res.status(500).json({ error: "Failed to update goal status" });
  }
}

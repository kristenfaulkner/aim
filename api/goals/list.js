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
    const { data: goals, error } = await supabaseAdmin
      .from("working_goals")
      .select("*")
      .eq("user_id", session.userId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ goals: goals || [] });
  } catch (err) {
    console.error("Goals list error:", err);
    return res.status(500).json({ error: "Failed to fetch goals" });
  }
}

import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, avatar_url, riding_level, weekly_hours, ftp_watts, weight_kg, onboarding_completed, created_at")
      .eq("id", session.userId)
      .single();

    if (error) return res.status(404).json({ error: "Profile not found" });
    return res.status(200).json({ user: data });
  }

  if (req.method === "PUT") {
    const { full_name } = req.body;
    if (!full_name?.trim()) return res.status(400).json({ error: "Name is required" });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: full_name.trim() })
      .eq("id", session.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ user: data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

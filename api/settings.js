import { verifySession, cors } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";

/**
 * GET  /api/settings — Get user settings (notification_preferences, etc.)
 * PUT  /api/settings — Update user settings
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .select("notification_preferences, preferences")
      .eq("user_id", session.userId)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ settings: data || {} });
  }

  if (req.method === "PUT") {
    const { notification_preferences, preferences } = req.body;

    const updates = {};
    if (notification_preferences) updates.notification_preferences = notification_preferences;
    if (preferences) updates.preferences = preferences;

    // Upsert — create if not exists
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        { user_id: session.userId, ...updates },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ settings: data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

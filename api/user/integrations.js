import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("provider, is_active, last_sync_at, sync_status")
      .eq("user_id", session.userId)
      .eq("is_active", true);

    if (error) return res.status(500).json({ error: error.message });

    const integrations = (data || []).map(i => i.provider);
    return res.status(200).json({ integrations });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

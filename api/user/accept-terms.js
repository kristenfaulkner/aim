import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { terms, privacy, healthData } = req.body || {};
  const now = new Date().toISOString();

  const updates = {};
  if (terms) updates.terms_accepted_at = now;
  if (privacy) updates.privacy_accepted_at = now;
  if (healthData) updates.health_data_consent_at = now;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No consent flags provided" });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", session.userId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, accepted: updates });
}

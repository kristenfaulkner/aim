import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: "Provider is required" });

  // Get the integration to attempt token revocation
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("access_token, provider")
    .eq("user_id", session.userId)
    .eq("provider", provider)
    .single();

  if (!integration) return res.status(404).json({ error: "Integration not found" });

  // Attempt to revoke token at the provider (best-effort)
  try {
    if (provider === "strava") {
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ access_token: integration.access_token }),
      });
    }
    // Other providers: Whoop, Oura, Withings don't have simple revoke endpoints
  } catch {
    // Continue even if revocation fails
  }

  // Remove from database
  const { error } = await supabaseAdmin
    .from("integrations")
    .delete()
    .eq("user_id", session.userId)
    .eq("provider", provider);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

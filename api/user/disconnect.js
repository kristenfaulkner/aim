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
    } else if (provider === "garmin") {
      // Garmin requires calling the deregistration endpoint to remove user permissions
      // This also stops webhook pushes for this user
      const { createHmac } = await import("crypto");
      const OAuth = (await import("oauth-1.0a")).default;
      const oauth = new OAuth({
        consumer: { key: process.env.GARMIN_CONSUMER_KEY, secret: process.env.GARMIN_CONSUMER_SECRET },
        signature_method: "HMAC-SHA1",
        hash_function(baseString, key) { return createHmac("sha1", key).update(baseString).digest("base64"); },
      });
      const url = "https://apis.garmin.com/wellness-api/rest/user/registration";
      const token = { key: integration.access_token, secret: "" };
      // Try to get token secret from metadata
      try {
        const { decrypt } = await import("../_lib/crypto.js");
        const fullInt = await supabaseAdmin.from("integrations").select("metadata").eq("user_id", session.userId).eq("provider", "garmin").single();
        if (fullInt.data?.metadata?.token_secret_encrypted) {
          token.secret = decrypt(fullInt.data.metadata.token_secret_encrypted);
        } else if (fullInt.data?.metadata?.token_secret) {
          token.secret = fullInt.data.metadata.token_secret;
        }
      } catch {}
      const requestData = { url, method: "DELETE" };
      await fetch(url, {
        method: "DELETE",
        headers: oauth.toHeader(oauth.authorize(requestData, token)),
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

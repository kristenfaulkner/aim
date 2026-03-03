import { supabaseAdmin } from "../../_lib/supabase.js";
import { redis } from "../../_lib/redis.js";
import { fullWhoopSync } from "../../integrations/sync/whoop.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=whoop_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=whoop_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=whoop_invalid_state");
  await redis.del(`oauth:state:${state}`);

  const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `https://${req.headers.host}/api/auth/callback/whoop`,
    }),
  });

  if (!tokenRes.ok) return res.redirect(302, "/connect?error=whoop_token_failed");

  const data = await tokenRes.json();

  // Fetch Whoop user ID for webhook matching
  let whoopUserId = "";
  try {
    const profileRes = await fetch("https://api.prod.whoop.com/developer/v2/user/profile/basic", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      whoopUserId = String(profile.user_id || "");
    }
  } catch {}

  await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    provider: "whoop",
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date((Math.floor(Date.now() / 1000) + data.expires_in) * 1000).toISOString(),
    provider_user_id: whoopUserId,
    scopes: ["read:recovery", "read:sleep", "read:workout", "read:profile", "read:body_measurement"],
    is_active: true,
    sync_status: "pending",
  }, { onConflict: "user_id,provider" });

  // Auto-sync last 365 days of data (fire-and-forget)
  fullWhoopSync(userId, 365).catch(err =>
    console.error(`Whoop auto-backfill failed for ${userId}:`, err.message)
  );

  res.redirect(302, "/connect?connected=whoop");
}

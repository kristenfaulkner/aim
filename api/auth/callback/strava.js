import { supabaseAdmin } from "../../_lib/supabase.js";
import { redis } from "../../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=strava_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=strava_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=strava_invalid_state");
  await redis.del(`oauth:state:${state}`);

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return res.redirect(302, "/connect?error=strava_token_failed");

  const data = await tokenRes.json();

  await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    provider: "strava",
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    provider_user_id: String(data.athlete?.id || ""),
    scopes: ["read", "activity:read_all", "profile:read_all"],
    is_active: true,
    sync_status: "pending",
  }, { onConflict: "user_id,provider" });

  res.redirect(302, "/connect?connected=strava");
}

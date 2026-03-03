import { supabaseAdmin } from "../../_lib/supabase.js";
import { redis } from "../../_lib/redis.js";
import { fullOuraSync } from "../../integrations/sync/oura.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=oura_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=oura_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=oura_invalid_state");
  await redis.del(`oauth:state:${state}`);

  const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `https://${req.headers.host}/api/auth/callback/oura`,
    }),
  });

  if (!tokenRes.ok) return res.redirect(302, "/connect?error=oura_token_failed");

  const data = await tokenRes.json();

  await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    provider: "oura",
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    token_expires_at: new Date((Math.floor(Date.now() / 1000) + data.expires_in) * 1000).toISOString(),
    scopes: ["personal", "daily", "heartrate", "workout", "session", "sleep"],
    is_active: true,
    sync_status: "pending",
  }, { onConflict: "user_id,provider" });

  // Auto-sync last 365 days of data (fire-and-forget)
  fullOuraSync(userId, 365).catch(err =>
    console.error(`Oura auto-backfill failed for ${userId}:`, err.message)
  );

  res.redirect(302, "/connect?connected=oura");
}

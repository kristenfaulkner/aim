import { supabaseAdmin } from "../../_lib/supabase.js";
import { redis } from "../../_lib/redis.js";
import { fullWithingsSync } from "../../integrations/sync/withings.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=withings_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=withings_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=withings_invalid_state");
  await redis.del(`oauth:state:${state}`);

  const tokenRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers.host}/api/auth/callback/withings`,
    }),
  });

  if (!tokenRes.ok) return res.redirect(302, "/connect?error=withings_token_failed");

  const json = await tokenRes.json();
  if (json.status !== 0) return res.redirect(302, "/connect?error=withings_token_failed");

  const data = json.body;

  await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    provider: "withings",
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    token_expires_at: new Date((Math.floor(Date.now() / 1000) + data.expires_in) * 1000).toISOString(),
    provider_user_id: String(data.userid || ""),
    scopes: ["user.info", "user.metrics", "user.activity"],
    is_active: true,
    sync_status: "pending",
  }, { onConflict: "user_id,provider" });

  // Auto-sync last 365 days of data (fire-and-forget)
  fullWithingsSync(userId, 365).catch(err =>
    console.error(`Withings auto-backfill failed for ${userId}:`, err.message)
  );

  res.redirect(302, "/connect?connected=withings");
}

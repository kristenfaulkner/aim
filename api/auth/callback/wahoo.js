import { supabaseAdmin } from "../../_lib/supabase.js";
import { redis } from "../../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=wahoo_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=wahoo_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=wahoo_invalid_state");
  await redis.del(`oauth:state:${state}`);

  const baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers.host}`;
  const tokenParams = new URLSearchParams({
    client_id: process.env.WAHOO_CLIENT_ID,
    client_secret: process.env.WAHOO_CLIENT_SECRET,
    code,
    redirect_uri: `${baseUrl}/api/auth/callback/wahoo`,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(`https://api.wahooligan.com/oauth/token?${tokenParams}`, {
    method: "POST",
  });

  if (!tokenRes.ok) return res.redirect(302, "/connect?error=wahoo_token_failed");

  const data = await tokenRes.json();

  // Fetch Wahoo user ID for webhook matching
  let wahooUserId = "";
  try {
    const userRes = await fetch("https://api.wahooligan.com/v1/user", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      wahooUserId = String(userData.id || "");
    }
  } catch { /* non-blocking */ }

  await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    provider: "wahoo",
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    provider_user_id: wahooUserId,
    scopes: ["user_read", "workouts_read", "power_zones_read", "offline_data"],
    is_active: true,
    sync_status: "pending",
  }, { onConflict: "user_id,provider" });

  res.redirect(302, "/connect?connected=wahoo");
}

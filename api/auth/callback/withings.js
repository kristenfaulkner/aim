import { redis } from "../../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=withings_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=withings_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=withings_invalid_state");
  await redis.del(`oauth:state:${state}`);

  // Withings uses action=requesttoken for token exchange
  const tokenRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `https://${req.headers.host}/api/auth/callback/withings`,
    }),
  });

  if (!tokenRes.ok) return res.redirect(302, "/connect?error=withings_token_failed");

  const json = await tokenRes.json();
  if (json.status !== 0) return res.redirect(302, "/connect?error=withings_token_failed");

  const data = json.body;

  await redis.hset(`user:${userId}:tokens:withings`, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresAt: String(Math.floor(Date.now() / 1000) + data.expires_in),
    userid: String(data.userid || ""),
  });

  const raw = await redis.get(`user:${userId}:integrations`);
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  if (!list.includes("Withings")) {
    list.push("Withings");
    await redis.set(`user:${userId}:integrations`, JSON.stringify(list));
  }

  res.redirect(302, "/connect?connected=withings");
}

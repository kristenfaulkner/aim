import { redis } from "../../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=whoop_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=whoop_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=whoop_invalid_state");
  await redis.del(`oauth:state:${state}`);

  // Exchange code for tokens
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

  await redis.hset(`user:${userId}:tokens:whoop`, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: String(Math.floor(Date.now() / 1000) + data.expires_in),
  });

  // Add Whoop to user's integrations list
  const raw = await redis.get(`user:${userId}:integrations`);
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  if (!list.includes("Whoop")) {
    list.push("Whoop");
    await redis.set(`user:${userId}:integrations`, JSON.stringify(list));
  }

  res.redirect(302, "/connect?connected=whoop");
}

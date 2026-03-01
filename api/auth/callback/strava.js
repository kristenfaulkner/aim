import { redis } from "../../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code, state, error } = req.query;

  if (error) return res.redirect(302, "/connect?error=strava_denied");
  if (!code || !state) return res.redirect(302, "/connect?error=strava_missing_params");

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return res.redirect(302, "/connect?error=strava_invalid_state");
  await redis.del(`oauth:state:${state}`);

  // Exchange code for tokens
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

  await redis.hset(`user:${userId}:tokens:strava`, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: String(data.expires_at),
    athleteId: String(data.athlete?.id || ""),
  });

  // Add Strava to user's integrations list
  const raw = await redis.get(`user:${userId}:integrations`);
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  if (!list.includes("Strava")) {
    list.push("Strava");
    await redis.set(`user:${userId}:integrations`, JSON.stringify(list));
  }

  res.redirect(302, "/connect?connected=strava");
}

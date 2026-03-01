import { redis } from "../../_lib/redis.js";

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

  await redis.hset(`user:${userId}:tokens:oura`, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresAt: String(Math.floor(Date.now() / 1000) + data.expires_in),
  });

  const raw = await redis.get(`user:${userId}:integrations`);
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  if (!list.includes("Oura Ring")) {
    list.push("Oura Ring");
    await redis.set(`user:${userId}:integrations`, JSON.stringify(list));
  }

  res.redirect(302, "/connect?connected=oura");
}

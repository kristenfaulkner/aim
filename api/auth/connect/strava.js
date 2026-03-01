import { redis } from "../../_lib/redis.js";
import { verifySession, cors } from "../../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const state = crypto.randomUUID();
  await redis.set(`oauth:state:${state}`, session.userId, { ex: 600 });

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: `https://${req.headers.host}/api/auth/callback/strava`,
    response_type: "code",
    scope: "read,activity:read_all,profile:read_all",
    state,
  });

  res.redirect(302, `https://www.strava.com/oauth/authorize?${params}`);
}

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
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: `https://${req.headers.host}/api/auth/callback/whoop`,
    response_type: "code",
    scope: "read:recovery read:sleep read:workout read:profile read:body_measurement offline",
    state,
  });

  res.redirect(302, `https://api.prod.whoop.com/oauth/oauth2/auth?${params}`);
}

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

  const redirectUri = `https://${req.headers.host}/api/auth/callback/oura`;
  const params = new URLSearchParams({
    client_id: process.env.OURA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "personal daily heartrate workout session spo2",
    state,
  });

  const authUrl = `https://cloud.ouraring.com/oauth/authorize?${params}`;
  console.log("[oura-connect] redirect_uri:", redirectUri, "client_id:", process.env.OURA_CLIENT_ID?.slice(0, 8) + "...", "authUrl:", authUrl);
  res.redirect(302, authUrl);
}

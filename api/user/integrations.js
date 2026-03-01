import { redis } from "../_lib/redis.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const key = `user:${session.userId}:integrations`;

  if (req.method === "GET") {
    const data = await redis.get(key);
    return res.status(200).json({ integrations: data || [] });
  }

  if (req.method === "POST") {
    const { integrations } = req.body;
    if (!Array.isArray(integrations)) {
      return res.status(400).json({ error: "integrations must be an array" });
    }
    await redis.set(key, JSON.stringify(integrations));
    return res.status(200).json({ integrations });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

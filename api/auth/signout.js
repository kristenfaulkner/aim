import { verifySession, cors } from "../_lib/auth.js";
import { redis } from "../_lib/redis.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await redis.del(`session:${session.jti}`);

  return res.status(200).json({ ok: true });
}

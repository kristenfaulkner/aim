import { redis } from "../_lib/redis.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userKey = `user:${session.userId}`;

  if (req.method === "GET") {
    const user = await redis.hgetall(userKey);
    if (!user) return res.status(404).json({ error: "User not found" });

    const prefs = await redis.hgetall(`user:${session.userId}:preferences`);
    return res.status(200).json({
      user: {
        id: session.userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      preferences: prefs || {},
    });
  }

  if (req.method === "PUT") {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    await redis.hset(userKey, { name: name.trim() });
    return res.status(200).json({ name: name.trim() });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

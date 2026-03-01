import { redis } from "../_lib/redis.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await redis.hgetall(`user:${session.userId}`);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({
    user: {
      id: session.userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}

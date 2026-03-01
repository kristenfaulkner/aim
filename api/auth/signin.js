import bcrypt from "bcryptjs";
import { redis } from "../_lib/redis.js";
import { createSession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userId = await redis.get(`user:email:${normalizedEmail}`);
  if (!userId) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = await redis.hgetall(`user:${userId}`);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = await createSession(userId);

  return res.status(200).json({
    token,
    user: { id: userId, name: user.name, email: user.email },
  });
}

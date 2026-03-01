import bcrypt from "bcryptjs";
import { redis } from "../_lib/redis.js";
import { createSession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user
  const existing = await redis.get(`user:email:${normalizedEmail}`);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user hash and email index atomically via pipeline
  const pipe = redis.pipeline();
  pipe.hset(`user:${userId}`, {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  pipe.set(`user:email:${normalizedEmail}`, userId);
  await pipe.exec();

  const token = await createSession(userId);

  return res.status(201).json({
    token,
    user: { id: userId, name: name.trim(), email: normalizedEmail },
  });
}

import { SignJWT, jwtVerify } from "jose";
import { redis } from "./redis.js";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId) {
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  await redis.set(`session:${jti}`, userId, { ex: SESSION_TTL });
  return token;
}

export async function verifySession(req) {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) return null;

  try {
    const { payload } = await jwtVerify(auth.slice(7), SECRET);
    const stored = await redis.get(`session:${payload.jti}`);
    if (!stored) return null;
    return { userId: payload.sub, jti: payload.jti };
  } catch {
    return null;
  }
}

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

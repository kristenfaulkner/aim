import { redis } from "../../_lib/redis.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { getRequestToken, getAuthorizeUrl } from "../../_lib/garmin.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const callbackUrl = `${baseUrl}/api/auth/callback/garmin`;

  // Step 1: Get a request token from Garmin
  const { oauth_token, oauth_token_secret } = await getRequestToken(callbackUrl);

  // Store request token secret + user ID in Redis (10 min TTL)
  // We need both to complete the exchange in the callback
  await redis.set(`oauth:garmin:${oauth_token}`, JSON.stringify({
    userId: session.userId,
    tokenSecret: oauth_token_secret,
  }), { ex: 600 });

  // Step 2: Redirect user to Garmin authorization page
  res.redirect(302, getAuthorizeUrl(oauth_token));
}

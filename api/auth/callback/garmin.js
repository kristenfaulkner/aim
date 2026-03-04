import { supabaseAdmin } from "../../_lib/supabase.js";
import { redis } from "../../_lib/redis.js";
import { getAccessToken, garminFetch } from "../../_lib/garmin.js";
import { encrypt } from "../../_lib/crypto.js";
import { syncGarminData } from "../../integrations/sync/garmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res.redirect(302, "/connect?error=garmin_missing_params");
  }

  // Retrieve stored request token secret + userId from Redis
  const stored = await redis.get(`oauth:garmin:${oauth_token}`);
  if (!stored) return res.redirect(302, "/connect?error=garmin_invalid_state");
  await redis.del(`oauth:garmin:${oauth_token}`);

  const { userId, tokenSecret: requestTokenSecret } = typeof stored === "string"
    ? JSON.parse(stored)
    : stored;

  // Step 3: Exchange request token + verifier for access token
  let accessData;
  try {
    accessData = await getAccessToken(oauth_token, requestTokenSecret, oauth_verifier);
  } catch (err) {
    console.error("[Garmin Callback] Token exchange failed:", err.message);
    return res.redirect(302, "/connect?error=garmin_token_failed");
  }

  const { oauth_token: accessToken, oauth_token_secret: accessTokenSecret } = accessData;

  // Fetch user ID from Garmin to store as provider_user_id
  let garminUserId = "";
  try {
    const userInfo = await garminFetch(accessToken, accessTokenSecret, "/wellness-api/rest/user/id");
    garminUserId = String(userInfo.userId || "");
  } catch (err) {
    console.warn("[Garmin Callback] Could not fetch user ID:", err.message);
  }

  // Encrypt the token secret for storage (same pattern as Eight Sleep)
  const tokenSecretEncrypted = encrypt(accessTokenSecret);

  // Garmin tokens expire after ~3 months (no refresh mechanism)
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    provider: "garmin",
    access_token: accessToken,
    refresh_token: null, // Garmin has no refresh tokens
    token_expires_at: expiresAt,
    provider_user_id: garminUserId,
    scopes: ["ACTIVITY", "DAILY", "SLEEP", "BODY", "STRESS", "PULSE_OX"],
    is_active: true,
    sync_status: "pending",
    metadata: {
      token_secret_encrypted: tokenSecretEncrypted,
    },
  }, { onConflict: "user_id,provider" });

  // Auto-sync last 365 days (fire-and-forget)
  syncGarminData(userId, 365).catch(err =>
    console.error(`[Garmin] Auto-backfill failed for ${userId}:`, err.message)
  );

  res.redirect(302, "/connect?connected=garmin");
}

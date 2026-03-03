import { createHmac } from "crypto";
import { supabaseAdmin } from "../_lib/supabase.js";
import { getWhoopToken, whoopFetch, mapWhoopToMetrics, extractWhoopExtended } from "../_lib/whoop.js";

export const config = { maxDuration: 30 };

/**
 * Verify the X-WHOOP-Signature header.
 * Formula: base64(HMAC-SHA256(timestamp + body, client_secret))
 */
function verifySignature(req, rawBody) {
  const signature = req.headers["x-whoop-signature"];
  const timestamp = req.headers["x-whoop-signature-timestamp"];
  if (!signature || !timestamp) return false;

  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");

  return expected === signature;
}

/**
 * Sync a single day of Whoop data into daily_metrics from webhook event data.
 */
async function syncDayFromWebhook(userId, date, metrics, extended) {
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, source_data")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const sourceData = {
    ...(existing?.source_data || {}),
    whoop_extended: extended,
  };

  if (existing) {
    await supabaseAdmin
      .from("daily_metrics")
      .update({ ...metrics, source_data: sourceData })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("daily_metrics")
      .insert({ user_id: userId, date, ...metrics, source_data: sourceData });
  }
}

/**
 * POST /api/webhooks/whoop
 * Handles Whoop webhook events: recovery.updated, sleep.updated, workout.updated
 * Thin events — we fetch full data from the Whoop API after receiving the notification.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Read raw body for signature verification
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  if (!verifySignature(req, rawBody)) {
    console.warn("[Whoop Webhook] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { user_id: whoopUserId, id: resourceId, type } = req.body;

  console.log(`[Whoop Webhook] Received: type=${type} user=${whoopUserId} resource=${resourceId}`);

  // Only handle scored events (ignore deletes for now)
  if (!type || type.endsWith(".deleted")) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  // Find our user by Whoop user_id
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("user_id")
    .eq("provider", "whoop")
    .eq("provider_user_id", String(whoopUserId))
    .eq("is_active", true)
    .single();

  if (!integration) {
    // Whoop doesn't store provider_user_id in callback — try matching by user_id
    // Fall back to checking all active whoop integrations
    console.warn(`[Whoop Webhook] No integration found for whoop user ${whoopUserId}`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  const userId = integration.user_id;

  // Get a valid access token
  const tokenResult = await getWhoopToken(userId);
  if (!tokenResult) {
    console.error(`[Whoop Webhook] Token refresh failed for user ${userId}`);
    return res.status(200).json({ ok: true, error: "token_failed" });
  }

  const { accessToken } = tokenResult;

  // Process before responding — Vercel can terminate the function after res is sent
  try {
    if (type === "recovery.updated") {
      const data = await whoopFetch(accessToken, `/v2/recovery?limit=1&start=${new Date(Date.now() - 2 * 86400000).toISOString()}`);
      const recovery = data.records?.find(r => r.sleep_id === resourceId);
      if (recovery?.score_state === "SCORED" && recovery.created_at) {
        const date = recovery.created_at.slice(0, 10);
        const whoopData = { recovery: [recovery], sleep: [], body: null };
        const metrics = mapWhoopToMetrics(date, whoopData);
        const extended = extractWhoopExtended(date, whoopData);
        if (metrics) await syncDayFromWebhook(userId, date, metrics, extended);
        console.log(`[Whoop Webhook] Recovery synced for ${userId} on ${date}`);
      }
    } else if (type === "sleep.updated") {
      const sleepData = await whoopFetch(accessToken, `/v2/activity/sleep/${resourceId}`);
      if (sleepData?.score_state === "SCORED" && sleepData.end) {
        const date = sleepData.end.slice(0, 10);
        const whoopData = { recovery: [], sleep: [sleepData], body: null };
        const metrics = mapWhoopToMetrics(date, whoopData);
        const extended = extractWhoopExtended(date, whoopData);
        if (metrics) await syncDayFromWebhook(userId, date, metrics, extended);
        console.log(`[Whoop Webhook] Sleep synced for ${userId} on ${date}`);
      }
    } else if (type === "workout.updated") {
      console.log(`[Whoop Webhook] Workout event for ${userId}, resource ${resourceId} — skipping (not yet implemented)`);
    }
  } catch (err) {
    console.error(`[Whoop Webhook] Processing failed for ${userId}:`, err.message);
  }

  return res.status(200).json({ ok: true });
}

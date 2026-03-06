import { supabaseAdmin } from "../_lib/supabase.js";

export const config = { maxDuration: 30 };

import {
  getWithingsToken,
  fetchWithingsMeasurements,
  fetchWithingsSleep,
  mapWithingsToMetrics,
  extractWithingsExtended,
  updateProfileWeight,
} from "../_lib/withings.js";

/**
 * Sync Withings data for a specific time window (from webhook notification).
 */
async function syncFromNotification(userId, appli, startdate, enddate) {
  const tokenResult = await getWithingsToken(userId);
  if (!tokenResult) {
    console.error(`[Withings Webhook] Token refresh failed for user ${userId}`);
    return;
  }

  const { accessToken } = tokenResult;

  // Convert epoch timestamps to YYYY-MM-DD
  const startDate = new Date(startdate * 1000).toISOString().split("T")[0];
  const endDate = new Date(enddate * 1000).toISOString().split("T")[0];

  // Get user timezone for local bed/wake times
  const { data: tzProfile } = await supabaseAdmin
    .from("profiles").select("timezone").eq("id", userId).single();
  const timezone = tzProfile?.timezone || "America/New_York";

  // Fetch the relevant data based on appli type
  let withingsData = { measurements: [], activity: [], sleep: [] };

  if (appli === 1) {
    // Weight / body comp
    withingsData.measurements = await fetchWithingsMeasurements(accessToken, startDate, endDate);
  } else if (appli === 44) {
    // Sleep
    withingsData.sleep = await fetchWithingsSleep(accessToken, startDate, endDate);
  }
  // appli 16 (activity) — we could fetch activity but it's less critical; handled by cron

  // Collect dates from the fetched data
  const dates = new Set();
  for (const grp of withingsData.measurements) {
    if (grp.date) dates.add(new Date(grp.date * 1000).toISOString().split("T")[0]);
  }
  for (const s of withingsData.sleep) {
    if (s.date) dates.add(s.date);
  }
  // If no dates found from data, use the notification date range
  if (dates.size === 0) {
    dates.add(startDate);
    if (startDate !== endDate) dates.add(endDate);
  }

  for (const date of dates) {
    const metrics = mapWithingsToMetrics(date, withingsData, timezone);
    if (!metrics) continue;

    const extended = extractWithingsExtended(date, withingsData);

    const { data: existing } = await supabaseAdmin
      .from("daily_metrics")
      .select("id, source_data")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    const sourceData = {
      ...(existing?.source_data || {}),
      withings_extended: extended,
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

    // Auto-update profile weight with latest weigh-in
    if (metrics.weight_kg != null) {
      await updateProfileWeight(userId, metrics.weight_kg);
    }

    console.log(`[Withings Webhook] Synced appli=${appli} for user ${userId} on ${date}`);
  }
}

/**
 * POST /api/webhooks/withings
 * Handles Withings data notifications.
 * Thin events — payload contains userid, appli, startdate, enddate.
 * We fetch the actual data from the Withings API.
 *
 * Also handles GET for Withings callback URL verification (if required).
 */
export default async function handler(req, res) {
  // Withings may send a GET to verify the callback URL exists
  if (req.method === "GET") {
    return res.status(200).send("ok");
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Parse the notification — Withings sends URL-encoded form data
  const { userid, appli, startdate, enddate } = req.body;

  if (!userid || !appli) {
    console.warn("[Withings Webhook] Missing userid or appli");
    return res.status(200).json({ ok: true, skipped: true });
  }

  const appliInt = parseInt(appli);

  console.log(`[Withings Webhook] Received: userid=${userid} appli=${appliInt} start=${startdate} end=${enddate}`);

  // Find our user by Withings provider_user_id
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("user_id")
    .eq("provider", "withings")
    .eq("provider_user_id", String(userid))
    .eq("is_active", true)
    .single();

  if (!integration) {
    console.warn(`[Withings Webhook] No integration found for withings user ${userid}`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  // Process the notification, then respond.
  // On Vercel, the function can be terminated after res is sent,
  // so we must finish processing BEFORE responding.
  try {
    await syncFromNotification(integration.user_id, appliInt, parseInt(startdate), parseInt(enddate));
  } catch (err) {
    console.error(`[Withings Webhook] Processing failed for user ${integration.user_id}:`, err.message);
  }

  return res.status(200).json({ ok: true });
}

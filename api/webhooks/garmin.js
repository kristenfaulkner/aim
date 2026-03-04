import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../_lib/supabase.js";
import {
  mapGarminDaily, mapGarminSleep, mapGarminBodyBattery,
  mapGarminBodyComp, mapGarminPulseOx,
  extractGarminExtended, extractGarminDate,
} from "../_lib/garmin.js";
import { syncGarminActivity } from "../integrations/sync/garmin.js";
import { backfillUserMetrics } from "../_lib/backfill.js";

/**
 * Garmin Health API Webhook Handler
 *
 * Garmin pushes full data payloads (not thin events like Strava).
 * Payload types: activities, dailies, epochs, sleeps, bodyComps, stressDetails, pulseOx, userMetrics
 * Each payload contains an array of summaries with a `userAccessToken` to identify the user.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body;

  // Garmin sends different payload types as top-level keys
  const payloadTypes = [
    "activities", "activityDetails",
    "dailies", "epochs",
    "sleeps",
    "bodyComps",
    "stressDetails",
    "pulseOx",
    "userMetrics",
  ];

  const activeType = payloadTypes.find(t => body[t] && Array.isArray(body[t]) && body[t].length > 0);

  if (!activeType) {
    // Could be a ping/validation request or deregistration callback
    if (body.deregistrations) {
      console.log("[Garmin Webhook] Deregistration received:", JSON.stringify(body.deregistrations));
      return res.status(200).json({ ok: true });
    }
    console.log("[Garmin Webhook] Empty or unrecognized payload:", Object.keys(body).join(", "));
    return res.status(200).json({ ok: true });
  }

  const summaries = body[activeType];
  console.log(`[Garmin Webhook] Received ${activeType}: ${summaries.length} record(s)`);

  // Respond immediately to Garmin (must reply within 30s)
  res.status(200).json({ ok: true });

  // Process in background
  waitUntil(
    (async () => {
      for (const summary of summaries) {
        try {
          // Find user by Garmin access token stored in integrations
          const userToken = summary.userAccessToken;
          if (!userToken) {
            console.warn(`[Garmin Webhook] No userAccessToken in ${activeType} summary`);
            continue;
          }

          const { data: integration } = await supabaseAdmin
            .from("integrations")
            .select("user_id")
            .eq("provider", "garmin")
            .eq("access_token", userToken)
            .eq("is_active", true)
            .single();

          if (!integration) {
            console.warn(`[Garmin Webhook] No active integration for token ${userToken.slice(0, 8)}...`);
            continue;
          }

          const userId = integration.user_id;

          // Route by payload type
          if (activeType === "activities" || activeType === "activityDetails") {
            await processActivity(userId, summary);
          } else {
            await processDailyData(userId, activeType, summary);
          }
        } catch (err) {
          console.error(`[Garmin Webhook] Failed processing ${activeType}:`, err.message);
        }
      }
    })()
  );
}

/**
 * Process a single activity webhook payload.
 */
async function processActivity(userId, summary) {
  console.log(`[Garmin Webhook] Processing activity for user ${userId}: ${summary.activityId || summary.activityName}`);

  const result = await syncGarminActivity(userId, summary, { notify: true });
  console.log(`[Garmin Webhook] Activity synced: ${result.id}`);

  // Backfill derived metrics
  try {
    await backfillUserMetrics(userId);
  } catch (err) {
    console.error(`[Garmin Webhook] Backfill failed:`, err.message);
  }
}

/**
 * Process daily data webhook payloads (dailies, sleep, stress, body comp, pulse ox).
 */
async function processDailyData(userId, type, summary) {
  const date = extractGarminDate(summary);
  if (!date) {
    console.warn(`[Garmin Webhook] Could not extract date from ${type} summary`);
    return;
  }

  console.log(`[Garmin Webhook] Processing ${type} for user ${userId} date ${date}`);

  let mapped = {};

  switch (type) {
    case "dailies":
    case "epochs": {
      const daily = mapGarminDaily(summary);
      if (daily) Object.assign(mapped, daily);
      break;
    }
    case "sleeps": {
      const sleep = mapGarminSleep(summary);
      if (sleep) Object.assign(mapped, sleep);
      break;
    }
    case "stressDetails": {
      const bb = mapGarminBodyBattery(summary);
      if (bb) Object.assign(mapped, bb);
      break;
    }
    case "bodyComps": {
      const bc = mapGarminBodyComp(summary);
      if (bc) Object.assign(mapped, bc);
      // Update profile weight
      if (bc?.weight_kg) {
        await supabaseAdmin
          .from("profiles")
          .update({ weight_kg: bc.weight_kg })
          .eq("id", userId);
      }
      break;
    }
    case "pulseOx": {
      const po = mapGarminPulseOx(summary);
      if (po) Object.assign(mapped, po);
      break;
    }
    default:
      console.log(`[Garmin Webhook] Unhandled type: ${type}`);
      return;
  }

  if (Object.keys(mapped).length === 0) return;

  // Build extended data for this specific payload type
  const garminData = { [type === "stressDetails" ? "bodyBattery" : type === "bodyComps" ? "bodyComp" : type === "epochs" ? "daily" : type.replace(/s$/, "")]: summary };
  const extended = extractGarminExtended(garminData);

  // Selective merge with existing daily_metrics
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, source_data")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const sourceData = {
    ...(existing?.source_data || {}),
    garmin_extended: {
      ...(existing?.source_data?.garmin_extended || {}),
      ...(extended || {}),
    },
  };

  if (existing) {
    await supabaseAdmin
      .from("daily_metrics")
      .update({ ...mapped, source_data: sourceData })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("daily_metrics")
      .insert({ user_id: userId, date, ...mapped, source_data: sourceData });
  }

  console.log(`[Garmin Webhook] Updated daily_metrics for ${date}: ${Object.keys(mapped).join(", ")}`);
}

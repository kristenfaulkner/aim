import { verifySession, cors } from "../../_lib/auth.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import {
  getGarminToken, garminFetch, downloadFitFile,
  mapGarminActivity, mapGarminDaily, mapGarminSleep,
  mapGarminBodyBattery, mapGarminBodyComp, mapGarminPulseOx,
  extractGarminExtended, extractGarminDate,
} from "../../_lib/garmin.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { isHigherPriority, findDuplicate } from "../../_lib/source-priority.js";
import { backfillUserMetrics } from "../../_lib/backfill.js";
import { buildLapsPayload } from "../../_lib/intervals.js";
import { detectAllTags, persistTags } from "../../_lib/tags.js";
import { fetchActivityWeather, extractLocationFromActivity } from "../../_lib/weather-enrich.js";
import { analyzeActivity } from "../../_lib/ai.js";
import { sendWorkoutEmail } from "../../email/send.js";
import { sendWorkoutSMS } from "../../sms/send.js";
import { parseFIT } from "../../_lib/fit.js";

// ── Sync a single Garmin activity ──

/**
 * Process a single Garmin activity (from webhook or sync).
 * If the activity has a FIT file URL, downloads and parses it for detailed metrics.
 * @param {string} userId
 * @param {object} garminActivity - Garmin activity summary payload
 * @param {object} options - { notify: true, accessToken, tokenSecret }
 */
export async function syncGarminActivity(userId, garminActivity, options = {}) {
  const { notify = true, accessToken, tokenSecret } = options;

  // Map Garmin summary to our schema
  const record = {
    user_id: userId,
    ...mapGarminActivity(garminActivity),
  };

  // Get user profile for FTP
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("ftp_watts, weight_kg, timezone")
    .eq("id", userId)
    .single();

  const ftp = profile?.ftp_watts || null;

  // If there's a FIT file callback URL, download and parse it
  let fitData = null;
  if (garminActivity.activityFileUrl || garminActivity.callbackURL) {
    const fitUrl = garminActivity.activityFileUrl || garminActivity.callbackURL;
    try {
      // Need token to download FIT file
      let token = accessToken;
      let secret = tokenSecret;
      if (!token || !secret) {
        const tokenData = await getGarminToken(userId);
        if (tokenData) {
          token = tokenData.accessToken;
          secret = tokenData.tokenSecret;
        }
      }
      if (token && secret) {
        const fitBuffer = await downloadFitFile(fitUrl, token, secret);
        fitData = parseFIT(fitBuffer);
      }
    } catch (err) {
      console.error(`[Garmin] FIT download/parse failed for activity ${record.source_id}:`, err.message);
    }
  }

  // Compute detailed metrics from FIT data if available
  if (fitData?.streams) {
    const metrics = computeActivityMetrics(fitData.streams, record.duration_seconds, ftp);
    if (metrics.avg_power_watts != null) record.avg_power_watts = metrics.avg_power_watts;
    if (metrics.normalized_power_watts != null) record.normalized_power_watts = metrics.normalized_power_watts;
    if (metrics.max_power_watts != null) record.max_power_watts = metrics.max_power_watts;
    if (metrics.avg_hr_bpm != null) record.avg_hr_bpm = metrics.avg_hr_bpm;
    if (metrics.max_hr_bpm != null) record.max_hr_bpm = metrics.max_hr_bpm;
    if (metrics.avg_cadence_rpm != null) record.avg_cadence_rpm = metrics.avg_cadence_rpm;
    if (metrics.tss != null) record.tss = metrics.tss;
    if (metrics.intensity_factor != null) record.intensity_factor = metrics.intensity_factor;
    if (metrics.variability_index != null) record.variability_index = metrics.variability_index;
    if (metrics.efficiency_factor != null) record.efficiency_factor = metrics.efficiency_factor;
    if (metrics.hr_drift_pct != null) record.hr_drift_pct = metrics.hr_drift_pct;
    if (metrics.decoupling_pct != null) record.decoupling_pct = metrics.decoupling_pct;
    if (metrics.work_kj != null) record.work_kj = metrics.work_kj;
    if (metrics.zone_distribution) record.zone_distribution = metrics.zone_distribution;
    if (metrics.power_curve) record.power_curve = metrics.power_curve;

    // Extract intervals from FIT laps
    if (fitData.fitLaps && ftp) {
      try {
        record.laps = buildLapsPayload(fitData.streams, ftp, fitData.fitLaps);
      } catch (err) {
        console.error(`[Garmin] Interval extraction failed for ${record.source_id}:`, err.message);
      }
    }

    // FTP at time if we computed TSS
    if (record.tss != null && ftp) record.ftp_at_time = ftp;
  }

  // Cross-source dedup: Garmin is device-level (priority 3)
  const { data: nearbyActivities } = await supabaseAdmin
    .from("activities")
    .select("id, source, source_id, started_at, duration_seconds, distance_meters, name, description, source_data")
    .eq("user_id", userId)
    .gte("started_at", new Date(new Date(record.started_at).getTime() - 6 * 60 * 1000).toISOString())
    .lte("started_at", new Date(new Date(record.started_at).getTime() + 6 * 60 * 1000).toISOString());

  const duplicate = findDuplicate(
    nearbyActivities || [], record.started_at, record.duration_seconds, "garmin",
    record.source_id, { distanceMeters: record.distance_meters }
  );

  if (duplicate) {
    if (duplicate.source === "garmin" && duplicate.source_id === record.source_id) {
      // Exact same Garmin activity — fall through to upsert (onConflict handles it)
    } else if (duplicate.source === "garmin") {
      // Same source, different ID — update existing row
      await supabaseAdmin
        .from("activities")
        .update({ ...record, source_id: record.source_id })
        .eq("id", duplicate.id);
      return { ...record, id: duplicate.id, enriched: true };
    } else if (isHigherPriority("garmin", duplicate.source)) {
      // Garmin is higher priority — update the existing record with our metrics
      const updateData = { ...record };
      delete updateData.user_id;
      delete updateData.source;
      delete updateData.source_id;
      updateData.source_data = {
        ...(duplicate.source_data || {}),
        garmin: garminActivity,
      };

      await supabaseAdmin
        .from("activities")
        .update(updateData)
        .eq("id", duplicate.id);

      return { ...record, id: duplicate.id, enriched: true };
    } else {
      // Lower/equal priority — just enrich with Garmin metadata
      const enrichData = {
        source_data: {
          ...(duplicate.source_data || {}),
          garmin: garminActivity,
        },
      };
      if (!duplicate.name && record.name) enrichData.name = record.name;

      await supabaseAdmin
        .from("activities")
        .update(enrichData)
        .eq("id", duplicate.id);

      return { ...record, id: duplicate.id, enriched: true };
    }
  }

  // No duplicate — upsert
  const { data: upserted } = await supabaseAdmin
    .from("activities")
    .upsert(record, { onConflict: "user_id,source,source_id" })
    .select("id")
    .single();

  // Update daily metrics with training load
  if (record.tss) {
    await updateDailyMetrics(userId, record);
  }

  // Update power profile
  if (record.power_curve) {
    await updatePowerProfile(userId, record.power_curve, profile?.weight_kg);
  }

  // Weather + tags (fire-and-forget)
  if (upserted?.id) {
    (async () => {
      try {
        const location = extractLocationFromActivity(record);
        if (location) {
          const weather = await fetchActivityWeather(record.started_at, location.lat, location.lng);
          if (weather) {
            await supabaseAdmin.from("activities").update({ activity_weather: weather }).eq("id", upserted.id);
            record.activity_weather = weather;
          }
        }
        const activityWithLaps = { ...record, id: upserted.id };
        const tags = detectAllTags(activityWithLaps, null, record.activity_weather, ftp);
        if (tags.length > 0) {
          await persistTags(supabaseAdmin, upserted.id, userId, tags);
        }
      } catch (err) {
        console.error(`[Garmin] Weather/tag enrichment failed for ${upserted.id}:`, err.message);
      }
    })();
  }

  // AI analysis + notifications for real-time events
  if (upserted?.id && notify) {
    try {
      await analyzeActivity(userId, upserted.id);
      sendWorkoutEmail(userId, upserted.id).catch(err =>
        console.error(`Email failed for Garmin activity ${upserted.id}:`, err.message)
      );
      sendWorkoutSMS(userId, upserted.id).catch(err =>
        console.error(`SMS failed for Garmin activity ${upserted.id}:`, err.message)
      );
    } catch (err) {
      console.error(`AI analysis failed for Garmin activity ${upserted.id}:`, err.message);
    }
  }

  return { ...record, id: upserted?.id };
}

// ── Sync daily data for a single day ──

async function syncDay(userId, date, garminData) {
  let mapped = {};

  // Merge all daily data sources
  if (garminData.daily) {
    const daily = mapGarminDaily(garminData.daily);
    if (daily) Object.assign(mapped, daily);
  }
  if (garminData.sleep) {
    const sleep = mapGarminSleep(garminData.sleep);
    if (sleep) Object.assign(mapped, sleep);
  }
  if (garminData.bodyBattery) {
    const bb = mapGarminBodyBattery(garminData.bodyBattery);
    if (bb) Object.assign(mapped, bb);
  }
  if (garminData.bodyComp) {
    const bc = mapGarminBodyComp(garminData.bodyComp);
    if (bc) Object.assign(mapped, bc);
  }
  if (garminData.pulseOx) {
    const po = mapGarminPulseOx(garminData.pulseOx);
    if (po) Object.assign(mapped, po);
  }

  if (Object.keys(mapped).length === 0) return null;

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
    garmin_extended: extended,
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

  return { date, ...mapped };
}

// ── Full Garmin sync ──

/**
 * Sync Garmin data (activities + daily summaries) for a date range.
 * Used for initial backfill (365 days) and periodic sync.
 */
export async function syncGarminData(userId, days = 7) {
  const tokenResult = await getGarminToken(userId);
  if (!tokenResult) throw new Error("Garmin not connected or token expired");

  const { accessToken, tokenSecret, integration } = tokenResult;

  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("id", integration.id);

  const syncStartedAt = new Date().toISOString();

  // Date range for API queries
  const endEpoch = Math.floor(Date.now() / 1000);
  const startEpoch = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

  const results = { activities: [], dailies: [], errors: [] };

  try {
    // ── Fetch activities ──
    try {
      const activitiesData = await garminFetch(
        accessToken, tokenSecret,
        `/wellness-api/rest/activities?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`
      );
      const activities = Array.isArray(activitiesData) ? activitiesData : [];

      for (const act of activities) {
        try {
          const result = await syncGarminActivity(userId, act, {
            notify: false,
            accessToken,
            tokenSecret,
          });
          results.activities.push({ name: result.name, date: result.started_at });
        } catch (err) {
          console.error(`[Garmin] Activity sync failed for ${act.activityId}:`, err.message);
          results.errors.push({ type: "activity", id: act.activityId, error: err.message });
        }
      }
    } catch (err) {
      console.error(`[Garmin] Activities fetch failed:`, err.message);
      results.errors.push({ type: "activities_fetch", error: err.message });
    }

    // ── Fetch daily summaries ──
    try {
      const [dailies, sleeps, stressData, pulseOxData, bodyComps] = await Promise.allSettled([
        garminFetch(accessToken, tokenSecret, `/wellness-api/rest/dailies?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
        garminFetch(accessToken, tokenSecret, `/wellness-api/rest/epochs?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
        garminFetch(accessToken, tokenSecret, `/wellness-api/rest/stressDetails?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
        garminFetch(accessToken, tokenSecret, `/wellness-api/rest/pulseOx?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
        garminFetch(accessToken, tokenSecret, `/wellness-api/rest/bodyComps?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
      ]);

      // Group all data by date
      const dayMap = {};

      const addToDay = (arr, key, dateFn) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          const date = dateFn ? dateFn(item) : extractGarminDate(item);
          if (!date) continue;
          if (!dayMap[date]) dayMap[date] = {};
          dayMap[date][key] = item;
        }
      };

      addToDay(dailies.status === "fulfilled" ? (Array.isArray(dailies.value) ? dailies.value : []) : [], "daily");
      addToDay(sleeps.status === "fulfilled" ? (Array.isArray(sleeps.value) ? sleeps.value : []) : [], "sleep");
      addToDay(stressData.status === "fulfilled" ? (Array.isArray(stressData.value) ? stressData.value : []) : [], "bodyBattery");
      addToDay(pulseOxData.status === "fulfilled" ? (Array.isArray(pulseOxData.value) ? pulseOxData.value : []) : [], "pulseOx");
      addToDay(bodyComps.status === "fulfilled" ? (Array.isArray(bodyComps.value) ? bodyComps.value : []) : [], "bodyComp");

      for (const [date, data] of Object.entries(dayMap).sort()) {
        try {
          const result = await syncDay(userId, date, data);
          if (result) results.dailies.push(result);
        } catch (err) {
          results.errors.push({ type: "daily", date, error: err.message });
        }
      }
    } catch (err) {
      console.error(`[Garmin] Daily data fetch failed:`, err.message);
      results.errors.push({ type: "daily_fetch", error: err.message });
    }

    // Update sync metadata
    await supabaseAdmin
      .from("integrations")
      .update({
        last_sync_at: syncStartedAt,
        sync_status: results.errors.length > 0 ? "partial" : "success",
        sync_error: results.errors.length > 0 ? `${results.errors.length} item(s) failed` : null,
      })
      .eq("id", integration.id);

    // Backfill derived metrics (fire-and-forget)
    backfillUserMetrics(userId).catch(err =>
      console.error(`[Garmin] Backfill failed for ${userId}:`, err.message)
    );

    return results;
  } catch (err) {
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: err.message })
      .eq("id", integration.id);
    throw err;
  }
}

/**
 * POST /api/integrations/sync/garmin?days=7
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = Math.min(parseInt(req.query.days) || 7, 365);

  try {
    const results = await syncGarminData(session.userId, days);
    return res.status(200).json({
      synced_activities: results.activities.length,
      synced_daily: results.dailies.length,
      failed: results.errors.length,
      days,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

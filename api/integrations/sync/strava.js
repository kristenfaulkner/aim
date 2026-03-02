import { supabaseAdmin } from "../../_lib/supabase.js";
import { getStravaToken, stravaFetch } from "../../_lib/strava.js";
import { computeActivityMetrics, computeTrainingLoad, findNewBests } from "../../_lib/metrics.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { analyzeActivity } from "../../_lib/ai.js";

/**
 * Sync a single Strava activity by ID.
 * Called from webhook or manual sync.
 */
export async function syncStravaActivity(userId, stravaActivityId) {
  const tokenData = await getStravaToken(userId);
  if (!tokenData) throw new Error("No valid Strava token");

  const { accessToken } = tokenData;

  // Fetch detailed activity
  const activity = await stravaFetch(accessToken, `/activities/${stravaActivityId}?include_all_efforts=true`);

  // Fetch streams (power, HR, cadence, altitude, time)
  let streams = {};
  try {
    const streamData = await stravaFetch(
      accessToken,
      `/activities/${stravaActivityId}/streams?keys=watts,heartrate,cadence,altitude,time,latlng,temp&key_by_type=true`
    );
    // Convert array response to keyed object
    if (Array.isArray(streamData)) {
      for (const stream of streamData) {
        streams[stream.type] = stream;
      }
    } else {
      streams = streamData;
    }
  } catch {
    // Streams may not be available for all activities
  }

  // Get user profile for FTP
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("ftp_watts, weight_kg")
    .eq("id", userId)
    .single();

  const ftp = profile?.ftp_watts || null;

  // Compute metrics from streams
  const metrics = streams.watts
    ? computeActivityMetrics(streams, activity.elapsed_time, ftp)
    : {};

  // Build activity record
  const record = {
    user_id: userId,
    source: "strava",
    source_id: String(activity.id),
    activity_type: activity.type?.toLowerCase() || "ride",
    name: activity.name,
    description: activity.description || null,
    started_at: activity.start_date,
    duration_seconds: activity.moving_time,
    distance_meters: activity.distance,
    elevation_gain_meters: activity.total_elevation_gain,
    avg_power_watts: metrics.avg_power_watts ?? activity.average_watts ?? null,
    normalized_power_watts: metrics.normalized_power_watts ?? activity.weighted_average_watts ?? null,
    max_power_watts: metrics.max_power_watts ?? activity.max_watts ?? null,
    avg_hr_bpm: metrics.avg_hr_bpm ?? activity.average_heartrate ?? null,
    max_hr_bpm: metrics.max_hr_bpm ?? activity.max_heartrate ?? null,
    avg_cadence_rpm: metrics.avg_cadence_rpm ?? activity.average_cadence ?? null,
    avg_speed_mps: activity.average_speed ?? null,
    max_speed_mps: activity.max_speed ?? null,
    calories: activity.calories || null,
    tss: metrics.tss ?? null,
    intensity_factor: metrics.intensity_factor ?? null,
    variability_index: metrics.variability_index ?? null,
    efficiency_factor: metrics.efficiency_factor ?? null,
    hr_drift_pct: metrics.hr_drift_pct ?? null,
    decoupling_pct: metrics.decoupling_pct ?? null,
    work_kj: metrics.work_kj ?? (activity.kilojoules || null),
    temperature_celsius: activity.average_temp ?? null,
    zone_distribution: metrics.zone_distribution ?? null,
    power_curve: metrics.power_curve ?? null,
    source_data: activity,
  };

  // Upsert activity and get the ID back
  const { data: upserted } = await supabaseAdmin
    .from("activities")
    .upsert(record, { onConflict: "user_id,source,source_id" })
    .select("id")
    .single();

  // Update daily_metrics with training load
  if (record.tss) {
    await updateDailyMetrics(userId, record);
  }

  // Check for power profile personal bests
  if (metrics.power_curve) {
    await updatePowerProfile(userId, metrics.power_curve, profile?.weight_kg);
  }

  // Update integration sync status
  await supabaseAdmin
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString(), sync_status: "success", sync_error: null })
    .eq("user_id", userId)
    .eq("provider", "strava");

  // Trigger AI analysis (fire-and-forget — don't block the sync)
  if (upserted?.id) {
    analyzeActivity(userId, upserted.id).catch(err =>
      console.error(`AI analysis failed for activity ${upserted.id}:`, err.message)
    );
  }

  return { ...record, id: upserted?.id };
}

/**
 * Update daily_metrics with TSS and recompute CTL/ATL/TSB.
 */
async function updateDailyMetrics(userId, activity) {
  const activityDate = new Date(activity.started_at).toISOString().split("T")[0];

  // Get or create daily_metrics row for this date
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, daily_tss")
    .eq("user_id", userId)
    .eq("date", activityDate)
    .single();

  const newTss = (existing?.daily_tss || 0) + (activity.tss || 0);

  if (existing) {
    await supabaseAdmin
      .from("daily_metrics")
      .update({ daily_tss: newTss })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("daily_metrics")
      .insert({ user_id: userId, date: activityDate, daily_tss: newTss });
  }

  // Recompute CTL/ATL/TSB for the last 90 days
  const { data: dailyData } = await supabaseAdmin
    .from("daily_metrics")
    .select("date, daily_tss")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .limit(365);

  if (dailyData && dailyData.length > 0) {
    const loadData = computeTrainingLoad(
      dailyData.map(d => ({ date: d.date, tss: d.daily_tss || 0 }))
    );

    // Update the most recent 7 days (where values might have changed)
    const recentLoad = loadData.slice(-7);
    for (const day of recentLoad) {
      await supabaseAdmin
        .from("daily_metrics")
        .update({
          ctl: day.ctl,
          atl: day.atl,
          tsb: day.tsb,
          ramp_rate: day.ramp_rate,
        })
        .eq("user_id", userId)
        .eq("date", day.date);
    }
  }
}

/**
 * Check and update power profile with any new personal bests.
 */
async function updatePowerProfile(userId, newCurve, weightKg) {
  const today = new Date().toISOString().split("T")[0];

  // Get or create current power profile (90-day rolling)
  const { data: existing } = await supabaseAdmin
    .from("power_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("period_days", 90)
    .order("computed_date", { ascending: false })
    .limit(1)
    .single();

  const bests = findNewBests(newCurve, existing || {}, weightKg);

  if (bests) {
    if (existing && existing.computed_date === today) {
      // Update today's profile
      await supabaseAdmin
        .from("power_profiles")
        .update(bests)
        .eq("id", existing.id);
    } else {
      // Create new profile entry
      await supabaseAdmin
        .from("power_profiles")
        .upsert({
          user_id: userId,
          computed_date: today,
          period_days: 90,
          ...(existing ? {
            best_5s_watts: existing.best_5s_watts,
            best_30s_watts: existing.best_30s_watts,
            best_1m_watts: existing.best_1m_watts,
            best_5m_watts: existing.best_5m_watts,
            best_20m_watts: existing.best_20m_watts,
            best_60m_watts: existing.best_60m_watts,
            best_5s_wkg: existing.best_5s_wkg,
            best_30s_wkg: existing.best_30s_wkg,
            best_1m_wkg: existing.best_1m_wkg,
            best_5m_wkg: existing.best_5m_wkg,
            best_20m_wkg: existing.best_20m_wkg,
            best_60m_wkg: existing.best_60m_wkg,
          } : {}),
          ...bests,
        }, { onConflict: "user_id,computed_date,period_days" });
    }
  }
}

/**
 * Full sync — fetch all recent activities since last sync.
 */
export async function fullStravaSync(userId) {
  const tokenData = await getStravaToken(userId);
  if (!tokenData) throw new Error("No valid Strava token");

  const { accessToken, integration } = tokenData;

  // Fetch activities since last sync (or last 30 days)
  const since = integration.last_sync_at
    ? Math.floor(new Date(integration.last_sync_at).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const activities = await stravaFetch(
    accessToken,
    `/athlete/activities?after=${since}&per_page=30`
  );

  // Update sync status
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("user_id", userId)
    .eq("provider", "strava");

  const results = [];
  for (const act of activities) {
    try {
      const result = await syncStravaActivity(userId, String(act.id));
      results.push(result);
    } catch (err) {
      console.error(`Failed to sync activity ${act.id}:`, err.message);
    }
  }

  return results;
}

/**
 * Manual sync API endpoint.
 * POST /api/integrations/sync/strava
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const results = await fullStravaSync(session.userId);
    return res.status(200).json({
      synced: results.length,
      activities: results.map(r => ({ name: r.name, date: r.started_at, tss: r.tss })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

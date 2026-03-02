import { supabaseAdmin } from "../../_lib/supabase.js";
import { getStravaToken, stravaFetch } from "../../_lib/strava.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { analyzeActivity } from "../../_lib/ai.js";
import { sendWorkoutSMS } from "../../sms/send.js";
import { isHigherPriority, findCrossSourceDuplicate } from "../../_lib/source-priority.js";

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

  // Check for cross-source duplicates from higher-priority sources.
  // Strava is lowest priority — if the same workout exists from TP or a
  // device source, we just enrich it with Strava metadata instead of
  // creating a duplicate row.
  const { data: nearbyActivities } = await supabaseAdmin
    .from("activities")
    .select("id, source, source_id, started_at, duration_seconds, name, description, source_data")
    .eq("user_id", userId)
    .neq("source", "strava")
    .gte("started_at", new Date(new Date(activity.start_date).getTime() - 3 * 60 * 1000).toISOString())
    .lte("started_at", new Date(new Date(activity.start_date).getTime() + 3 * 60 * 1000).toISOString());

  const higherPriorityDup = findCrossSourceDuplicate(
    nearbyActivities || [], activity.start_date, activity.moving_time, "strava"
  );

  if (higherPriorityDup && isHigherPriority(higherPriorityDup.source, "strava")) {
    // Higher-priority source owns this activity — just enrich with Strava metadata
    const enrichData = {
      source_data: {
        ...(higherPriorityDup.source_data || {}),
        strava: activity, // Store full Strava API data for reference
      },
    };
    // Enrich name/description only if the existing ones are missing
    if (!higherPriorityDup.name && activity.name) enrichData.name = activity.name;
    if (!higherPriorityDup.description && activity.description) enrichData.description = activity.description;

    await supabaseAdmin
      .from("activities")
      .update(enrichData)
      .eq("id", higherPriorityDup.id);

    return { ...record, id: higherPriorityDup.id, enriched: true };
  }

  // No higher-priority duplicate — proceed with normal upsert
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

  // Trigger AI analysis, then SMS notification (fire-and-forget — don't block the sync)
  if (upserted?.id) {
    analyzeActivity(userId, upserted.id)
      .then(() => sendWorkoutSMS(userId, upserted.id))
      .catch(err =>
        console.error(`AI analysis/SMS failed for activity ${upserted.id}:`, err.message)
      );
  }

  return { ...record, id: upserted?.id };
}

/**
 * Fetch all Strava activities since a given epoch timestamp, with pagination.
 * Returns the full list of summary activities.
 */
async function fetchAllActivitiesSince(accessToken, sinceEpoch) {
  const allActivities = [];
  let page = 1;
  const perPage = 100; // Strava max per page

  while (true) {
    const batch = await stravaFetch(
      accessToken,
      `/athlete/activities?after=${sinceEpoch}&per_page=${perPage}&page=${page}`
    );
    if (!batch || batch.length === 0) break;
    allActivities.push(...batch);
    if (batch.length < perPage) break; // Last page
    page++;
  }

  return allActivities;
}

/**
 * Full sync — fetch all recent activities since last sync.
 * Paginates through all results and only updates last_sync_at after the
 * entire batch completes, so partial failures don't skip activities.
 */
export async function fullStravaSync(userId) {
  const tokenData = await getStravaToken(userId);
  if (!tokenData) throw new Error("No valid Strava token");

  const { accessToken, integration } = tokenData;

  // Capture sync start time BEFORE fetching — any activities uploaded during
  // sync will be caught on the next run
  const syncStartedAt = new Date().toISOString();

  // Fetch activities since last sync (or last 30 days)
  const since = integration.last_sync_at
    ? Math.floor(new Date(integration.last_sync_at).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  // Mark as syncing
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("user_id", userId)
    .eq("provider", "strava");

  const activities = await fetchAllActivitiesSince(accessToken, since);

  const results = [];
  for (const act of activities) {
    try {
      const result = await syncStravaActivity(userId, String(act.id));
      results.push(result);
    } catch (err) {
      console.error(`Failed to sync activity ${act.id}:`, err.message);
    }
  }

  // Only update last_sync_at AFTER the full batch completes
  await supabaseAdmin
    .from("integrations")
    .update({
      last_sync_at: syncStartedAt,
      sync_status: "success",
      sync_error: null,
    })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return results;
}

/**
 * Backfill sync — fetch ALL activities from the last N days regardless of
 * last_sync_at. Use this to recover from missed syncs or initial onboarding.
 */
export async function backfillStravaSync(userId, days = 90) {
  const tokenData = await getStravaToken(userId);
  if (!tokenData) throw new Error("No valid Strava token");

  const { accessToken } = tokenData;
  const syncStartedAt = new Date().toISOString();
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

  // Mark as syncing
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("user_id", userId)
    .eq("provider", "strava");

  const activities = await fetchAllActivitiesSince(accessToken, since);

  const results = [];
  const errors = [];
  for (const act of activities) {
    try {
      const result = await syncStravaActivity(userId, String(act.id));
      results.push(result);
    } catch (err) {
      console.error(`Backfill: failed to sync activity ${act.id}:`, err.message);
      errors.push({ id: act.id, name: act.name, error: err.message });
    }
  }

  // Update last_sync_at to now
  await supabaseAdmin
    .from("integrations")
    .update({
      last_sync_at: syncStartedAt,
      sync_status: errors.length > 0 ? "partial" : "success",
      sync_error: errors.length > 0 ? `${errors.length} activities failed` : null,
    })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return { results, errors };
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

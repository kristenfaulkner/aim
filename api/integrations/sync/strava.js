import { supabaseAdmin } from "../../_lib/supabase.js";
import { getStravaToken, stravaFetch } from "../../_lib/strava.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { analyzeActivity } from "../../_lib/ai.js";
import { sendWorkoutSMS } from "../../sms/send.js";
import { sendWorkoutEmail } from "../../email/send.js";
import { isHigherPriority, findCrossSourceDuplicate } from "../../_lib/source-priority.js";
import { backfillUserMetrics } from "../../_lib/backfill.js";
import { buildLapsPayload } from "../../_lib/intervals.js";
import { detectAllTags, persistTags } from "../../_lib/tags.js";
import { fetchActivityWeather, extractLocationFromActivity } from "../../_lib/weather-enrich.js";
import { resolveActivityTimezone, parseStravaTimezone } from "../../_lib/timezone.js";
import { detectTravel } from "../../_lib/travel.js";
import { computeDurabilityData } from "../../_lib/durability.js";

/**
 * Sync a single Strava activity by ID.
 * Called from webhook or manual sync.
 * @param {object} options - { notify: true } to send email/SMS (default true, set false for bulk sync)
 */
export async function syncStravaActivity(userId, stravaActivityId, options = {}) {
  const { notify = true } = options;
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
    .select("ftp_watts, weight_kg, timezone")
    .eq("id", userId)
    .single();

  const ftp = profile?.ftp_watts || null;

  // Resolve timezone — Strava provides start_latlng and timezone directly
  const stravaLat = activity.start_latlng?.[0] ?? null;
  const stravaLng = activity.start_latlng?.[1] ?? null;
  const stravaIanaTz = parseStravaTimezone(activity.timezone);
  const tz = resolveActivityTimezone(
    activity.start_date, stravaLat, stravaLng,
    stravaIanaTz || profile?.timezone || "America/Los_Angeles"
  );
  const startTimeLocal = activity.start_date_local || tz.start_time_local;

  // Compute metrics from streams
  const metrics = streams.watts
    ? computeActivityMetrics(streams, activity.elapsed_time, ftp)
    : {};

  // Extract intervals from power streams (Strava doesn't provide FIT laps)
  let lapsPayload = null;
  if (streams.watts && ftp) {
    try {
      lapsPayload = buildLapsPayload(streams, ftp);
    } catch (err) {
      console.error(`Interval extraction failed for Strava ${stravaActivityId}:`, err.message);
    }
  }

  // Compute durability data from power stream
  let durabilityPayload = null;
  if (streams.watts?.data && profile?.weight_kg) {
    try {
      const sr = streams.time?.data?.length > 1
        ? (streams.time.data[streams.time.data.length - 1] - streams.time.data[0]) / (streams.time.data.length - 1)
        : 1;
      durabilityPayload = computeDurabilityData(streams.watts.data, streams.time?.data, profile.weight_kg, sr);
    } catch (err) {
      console.error(`Durability computation failed for Strava ${stravaActivityId}:`, err.message);
    }
  }

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
    ftp_at_time: (metrics.tss != null && ftp) ? ftp : null,
    temperature_celsius: activity.average_temp ?? null,
    zone_distribution: metrics.zone_distribution ?? null,
    power_curve: metrics.power_curve ?? null,
    laps: lapsPayload,
    durability_data: durabilityPayload,
    start_lat: stravaLat,
    start_lng: stravaLng,
    timezone_iana: tz.timezone_iana,
    start_time_local: startTimeLocal,
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

  // Weather enrichment + tagging (fire-and-forget, non-blocking)
  if (upserted?.id) {
    (async () => {
      try {
        // Enrich with weather
        const location = extractLocationFromActivity(record);
        if (location) {
          const weather = await fetchActivityWeather(record.started_at, location.lat, location.lng);
          if (weather) {
            await supabaseAdmin.from("activities").update({ activity_weather: weather }).eq("id", upserted.id);
            record.activity_weather = weather;
          }
        }

        // Detect and persist tags
        const activityWithLaps = { ...record, id: upserted.id };
        const tags = detectAllTags(activityWithLaps, null, record.activity_weather, ftp);
        if (tags.length > 0) {
          await persistTags(supabaseAdmin, upserted.id, userId, tags);
        }
        // Travel detection — compare with last activity's location
        if (record.start_lat != null && record.start_lng != null) {
          try {
            const { data: lastAct } = await supabaseAdmin
              .from("activities")
              .select("id, start_lat, start_lng, timezone_iana, started_at, duration_seconds, elevation_gain_meters, source_data, activity_weather")
              .eq("user_id", userId)
              .lt("started_at", record.started_at)
              .not("start_lat", "is", null)
              .order("started_at", { ascending: false })
              .limit(1)
              .single();

            if (lastAct) {
              const travelEvent = detectTravel(
                { ...record, id: upserted.id },
                lastAct
              );
              if (travelEvent) {
                const { has_significant_tz, has_significant_altitude, ...eventData } = travelEvent;
                await supabaseAdmin.from("travel_events").insert({
                  user_id: userId,
                  ...eventData,
                });
              }
            }
          } catch (travelErr) {
            console.error(`Travel detection failed for ${upserted.id}:`, travelErr.message);
          }
        }
      } catch (err) {
        console.error(`Weather/tag enrichment failed for ${upserted.id}:`, err.message);
      }
    })();
  }

  // For real-time events (webhook): analyze + notify immediately.
  // Awaited so the caller's waitUntil() keeps the function alive until Claude finishes.
  // For backfill: skip — analysis runs as a batch after backfill completes.
  if (upserted?.id && notify) {
    try {
      await analyzeActivity(userId, upserted.id);
      sendWorkoutEmail(userId, upserted.id).catch(err =>
        console.error(`Email failed for activity ${upserted.id}:`, err.message)
      );
      sendWorkoutSMS(userId, upserted.id).catch(err =>
        console.error(`SMS failed for activity ${upserted.id}:`, err.message)
      );
    } catch (err) {
      console.error(`AI analysis failed for activity ${upserted.id}:`, err.message);
    }
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
      const result = await syncStravaActivity(userId, String(act.id), { notify: false });
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

  // Backfill derived metrics for any activities missing TSS/IF (fire-and-forget)
  backfillUserMetrics(userId).catch(err =>
    console.error(`Backfill after Strava sync failed:`, err.message)
  );

  // Batch AI analysis for newly synced activities without analysis (fire-and-forget)
  (async () => {
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const { data: unanalyzed } = await supabaseAdmin
      .from("activities")
      .select("id")
      .eq("user_id", userId)
      .is("ai_analysis", null)
      .gte("started_at", oneYearAgo)
      .order("started_at", { ascending: false })
      .limit(50);

    if (unanalyzed?.length) {
      for (const act of unanalyzed) {
        try {
          await analyzeActivity(userId, act.id);
        } catch (err) {
          console.error(`Post-sync analysis failed for ${act.id}:`, err.message);
          if (err.message?.includes("credit balance")) break;
        }
      }
    }
  })().catch(err => console.error(`Post-sync analysis error:`, err.message));

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
      const result = await syncStravaActivity(userId, String(act.id), { notify: false });
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

  // Backfill derived metrics for any activities missing TSS/IF (fire-and-forget)
  backfillUserMetrics(userId).catch(err =>
    console.error(`Backfill after Strava backfill sync failed:`, err.message)
  );

  // Sequential AI analysis for recent activities (up to 100, last year) — fire-and-forget
  (async () => {
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const { data: unanalyzed } = await supabaseAdmin
      .from("activities")
      .select("id")
      .eq("user_id", userId)
      .is("ai_analysis", null)
      .gte("started_at", oneYearAgo)
      .order("started_at", { ascending: false })
      .limit(100);

    if (unanalyzed?.length) {
      for (const act of unanalyzed) {
        try {
          await analyzeActivity(userId, act.id);
        } catch (err) {
          console.error(`Post-backfill analysis failed for ${act.id}:`, err.message);
          if (err.message?.includes("credit balance")) break;
        }
      }
    }
  })().catch(err => console.error(`Post-backfill analysis error:`, err.message));

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

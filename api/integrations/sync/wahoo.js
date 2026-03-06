import { supabaseAdmin } from "../../_lib/supabase.js";
import { getWahooToken, wahooFetch, mapWahooToActivity, downloadWahooFit } from "../../_lib/wahoo.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { findDuplicate, isHigherPriority, mergeRaceDuplicates } from "../../_lib/source-priority.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { analyzeActivity } from "../../_lib/ai.js";
import { sendWorkoutSMS } from "../../sms/send.js";
import { sendWorkoutEmail } from "../../email/send.js";
import { backfillUserMetrics } from "../../_lib/backfill.js";
import { buildLapsPayload } from "../../_lib/intervals.js";
import { detectAllTags, persistTags } from "../../_lib/tags.js";
import { fetchActivityWeather, extractLocationFromActivity } from "../../_lib/weather-enrich.js";
import { resolveActivityTimezone } from "../../_lib/timezone.js";
import { detectTravel } from "../../_lib/travel.js";
import { computeDurabilityData } from "../../_lib/durability.js";
import { computeWbalStream } from "../../_lib/wbal.js";
import { parseFitFile } from "../../_lib/fit.js";

/**
 * Sync a single Wahoo workout. Called with the full workout object (which
 * includes embedded workout_summary from the list endpoint).
 *
 * @param {string} userId
 * @param {object} workout - Wahoo workout object with embedded workout_summary
 * @param {object} options - { notify: true } to send email/SMS
 */
export async function syncWahooWorkout(userId, workout, options = {}) {
  const { notify = true } = options;

  const ws = workout.workout_summary;
  if (!ws) {
    console.warn(`[Wahoo Sync] Workout ${workout.id} has no summary, skipping`);
    return null;
  }

  // Fetch user profile upfront (ftp, weight, timezone)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("ftp_watts, weight_kg, timezone")
    .eq("id", userId)
    .single();
  const ftp = profile?.ftp_watts || null;
  const weightKg = profile?.weight_kg || null;

  // Resolve timezone
  const wahooLat = workout.latitude || null;
  const wahooLng = workout.longitude || null;
  const profileTz = profile?.timezone || "America/Los_Angeles";
  const startedAtRaw = workout.starts || ws.created_at;
  const tz = resolveActivityTimezone(startedAtRaw, wahooLat, wahooLng, profileTz);

  // Map to activity record (summary-based baseline)
  const record = mapWahooToActivity(userId, workout, ws, tz);

  // --- FIT file processing (graceful fallback to summary-only) ---
  let streams = null;
  let fitLaps = null;
  const fitUrl = ws.file?.url || null;

  if (fitUrl) {
    try {
      const fitBuffer = await downloadWahooFit(fitUrl);
      if (fitBuffer) {
        const parsed = parseFitFile(fitBuffer, `wahoo_${workout.id}.fit`);
        streams = parsed.streams;
        fitLaps = parsed.fitLaps;
        console.log(`[Wahoo Sync] FIT parsed for workout ${workout.id}: ${streams?.watts?.data?.length || 0} power samples`);
      }
    } catch (err) {
      console.error(`[Wahoo Sync] FIT download/parse failed for workout ${workout.id}:`, err.message);
    }
  }

  // Compute metrics from FIT streams (overrides summary values)
  let metrics = {};
  if (streams?.watts?.data?.length > 0) {
    try {
      metrics = computeActivityMetrics(streams, record.duration_seconds, ftp);
    } catch (err) {
      console.error(`[Wahoo Sync] Metrics computation failed for workout ${workout.id}:`, err.message);
    }
  }

  // Extract intervals from FIT laps + streams
  let lapsPayload = null;
  if (streams?.watts && ftp) {
    try {
      lapsPayload = buildLapsPayload(streams, ftp, fitLaps);
    } catch (err) {
      console.error(`[Wahoo Sync] Interval extraction failed for workout ${workout.id}:`, err.message);
    }
  }

  // Compute durability from power stream
  let durabilityPayload = null;
  if (streams?.watts?.data && weightKg) {
    try {
      const sr = streams.time?.data?.length > 1
        ? (streams.time.data[streams.time.data.length - 1] - streams.time.data[0]) / (streams.time.data.length - 1)
        : 1;
      durabilityPayload = computeDurabilityData(streams.watts.data, streams.time?.data, weightKg, sr);
    } catch (err) {
      console.error(`[Wahoo Sync] Durability computation failed for workout ${workout.id}:`, err.message);
    }
  }

  // Compute W'bal from power stream + CP model
  let wbalPayload = null;
  let wbalMinPct = null;
  let wbalEmptyEvents = 0;
  if (streams?.watts?.data) {
    try {
      const { data: pp } = await supabaseAdmin
        .from("power_profiles")
        .select("cp_watts, w_prime_kj")
        .eq("user_id", userId)
        .order("computed_date", { ascending: false })
        .limit(1)
        .single();
      if (pp?.cp_watts && pp?.w_prime_kj) {
        const wbalResult = computeWbalStream(
          streams.watts.data, streams.time?.data,
          pp.cp_watts, pp.w_prime_kj * 1000
        );
        if (wbalResult) {
          wbalPayload = wbalResult;
          wbalMinPct = wbalResult.summary.min_wbal_pct;
          wbalEmptyEvents = wbalResult.summary.empty_tank_events;
        }
      }
    } catch (err) {
      console.error(`[Wahoo Sync] W'bal computation failed for workout ${workout.id}:`, err.message);
    }
  }

  // Merge computed fields into record (computed metrics override summary values)
  if (Object.keys(metrics).length > 0) {
    record.avg_power_watts = metrics.avg_power_watts ?? record.avg_power_watts;
    record.normalized_power_watts = metrics.normalized_power_watts ?? record.normalized_power_watts;
    record.max_power_watts = metrics.max_power_watts ?? record.max_power_watts;
    record.avg_hr_bpm = metrics.avg_hr_bpm ?? record.avg_hr_bpm;
    record.max_hr_bpm = metrics.max_hr_bpm ?? record.max_hr_bpm;
    record.avg_cadence_rpm = metrics.avg_cadence_rpm ?? record.avg_cadence_rpm;
    record.tss = metrics.tss ?? record.tss;
    record.intensity_factor = metrics.intensity_factor ?? null;
    record.variability_index = metrics.variability_index ?? null;
    record.efficiency_factor = metrics.efficiency_factor ?? null;
    record.hr_drift_pct = metrics.hr_drift_pct ?? null;
    record.decoupling_pct = metrics.decoupling_pct ?? null;
    record.work_kj = metrics.work_kj ?? record.work_kj;
    record.zone_distribution = metrics.zone_distribution ?? null;
    record.power_curve = metrics.power_curve ?? null;
    record.ftp_at_time = (metrics.tss != null && ftp) ? ftp : null;
  }
  if (lapsPayload) record.laps = lapsPayload;
  if (durabilityPayload) record.durability_data = durabilityPayload;
  if (wbalPayload) {
    record.wbal_data = wbalPayload;
    record.wbal_min_pct = wbalMinPct;
    record.wbal_empty_events = wbalEmptyEvents;
  }

  // Tag HR source — Wahoo device file (typically paired with chest strap)
  if (record.avg_hr_bpm != null) {
    record.hr_source = 'device_file';
    record.hr_source_confidence = 'high';
  }

  // --- Cross-source dedup: Wahoo is device-level (priority 3) ---
  const { data: nearbyActivities } = await supabaseAdmin
    .from("activities")
    .select("id, source, source_id, started_at, duration_seconds, distance_meters, name, description, source_data")
    .eq("user_id", userId)
    .gte("started_at", new Date(new Date(record.started_at).getTime() - 6 * 60 * 1000).toISOString())
    .lte("started_at", new Date(new Date(record.started_at).getTime() + 6 * 60 * 1000).toISOString());

  const duplicate = findDuplicate(
    nearbyActivities || [],
    record.started_at,
    record.duration_seconds,
    "wahoo",
    record.source_id,
    { distanceMeters: record.distance_meters }
  );

  if (duplicate && duplicate.source !== "wahoo") {
    // Cross-source duplicate found
    if (isHigherPriority("wahoo", duplicate.source)) {
      // Wahoo is higher priority — overwrite metrics on existing row
      const updateData = { ...record };
      delete updateData.user_id;
      delete updateData.source;
      delete updateData.source_id;
      updateData.source_data = {
        ...(duplicate.source_data || {}),
        wahoo: workout,
      };

      await supabaseAdmin
        .from("activities")
        .update(updateData)
        .eq("id", duplicate.id);

      if (record.tss) {
        try { await updateDailyMetrics(userId, record); } catch (err) {
          console.error(`[Wahoo Sync] Daily metrics update failed:`, err.message);
        }
      }
      if (metrics.power_curve) {
        try { await updatePowerProfile(userId, metrics.power_curve, weightKg); } catch (err) {
          console.error(`[Wahoo Sync] Power profile update failed:`, err.message);
        }
      }

      console.log(`[Wahoo Sync] Merged workout ${workout.id} into existing ${duplicate.source} activity ${duplicate.id}`);
      return { ...record, id: duplicate.id, enriched: true };
    } else {
      // Lower/equal priority — just enrich with Wahoo metadata
      const enrichData = {
        source_data: {
          ...(duplicate.source_data || {}),
          wahoo: workout,
        },
      };
      if (!duplicate.name && record.name) enrichData.name = record.name;

      await supabaseAdmin
        .from("activities")
        .update(enrichData)
        .eq("id", duplicate.id);

      console.log(`[Wahoo Sync] Enriched existing ${duplicate.source} activity ${duplicate.id} with Wahoo metadata`);
      return { ...record, id: duplicate.id, enriched: true };
    }
  } else if (duplicate && duplicate.source === "wahoo" && duplicate.source_id !== record.source_id) {
    // Same source, different ID (re-upload) — update existing row
    await supabaseAdmin
      .from("activities")
      .update(record)
      .eq("id", duplicate.id);

    console.log(`[Wahoo Sync] Updated existing Wahoo activity ${duplicate.id} (source_id changed: ${duplicate.source_id} → ${record.source_id})`);
    return { ...record, id: duplicate.id, enriched: true };
  }

  // No duplicate found — upsert new activity
  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from("activities")
    .upsert(record, { onConflict: "user_id,source,source_id" })
    .select("id")
    .single();

  if (upsertError) {
    console.error(`[Wahoo Sync] Upsert failed for workout ${workout.id}:`, upsertError.message);
    return record;
  }

  // Post-insert race condition sweep: if Strava webhook inserted the same
  // ride concurrently, merge and keep the higher-priority source (Wahoo wins).
  if (upserted?.id) {
    mergeRaceDuplicates(supabaseAdmin, upserted.id, record).catch(err =>
      console.error(`[Wahoo Sync] Race dedup sweep failed:`, err.message)
    );
  }

  // Update daily_metrics with TSS
  if (record.tss) {
    try {
      await updateDailyMetrics(userId, record);
    } catch (err) {
      console.error(`[Wahoo Sync] Daily metrics update failed:`, err.message);
    }
  }

  // Update power profile with personal bests from FIT data
  if (metrics.power_curve) {
    try {
      await updatePowerProfile(userId, metrics.power_curve, weightKg);
    } catch (err) {
      console.error(`[Wahoo Sync] Power profile update failed:`, err.message);
    }
  }

  // Fire-and-forget: weather + tags + travel
  if (upserted?.id) {
    (async () => {
      try {
        // Weather enrichment
        const location = extractLocationFromActivity(record);
        if (location) {
          const weather = await fetchActivityWeather(record.started_at, location.lat, location.lng);
          if (weather) {
            await supabaseAdmin.from("activities").update({ activity_weather: weather }).eq("id", upserted.id);
            record.activity_weather = weather;
          }
        }

        // Tag detection (now with laps for richer tagging)
        const activityWithLaps = { ...record, id: upserted.id };
        const tags = detectAllTags(activityWithLaps, null, record.activity_weather, ftp);
        if (tags.length > 0) {
          await persistTags(supabaseAdmin, upserted.id, userId, tags);
        }

        // Travel detection
        if (record.start_lat != null && record.start_lng != null) {
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
            const travelEvent = detectTravel({ ...record, id: upserted.id }, lastAct);
            if (travelEvent) {
              const { has_significant_tz, has_significant_altitude, ...eventData } = travelEvent;
              await supabaseAdmin.from("travel_events").insert({ user_id: userId, ...eventData });
            }
          }
        }
      } catch (err) {
        console.error(`[Wahoo Sync] Weather/tag enrichment failed for ${upserted.id}:`, err.message);
      }
    })();
  }

  // Notify (AI analysis + email + SMS) — only for real-time, not bulk sync
  if (upserted?.id && notify) {
    try {
      await analyzeActivity(userId, upserted.id);
      sendWorkoutEmail(userId, upserted.id).catch(err =>
        console.error(`[Wahoo Sync] Email failed for activity ${upserted.id}:`, err.message)
      );
      sendWorkoutSMS(userId, upserted.id).catch(err =>
        console.error(`[Wahoo Sync] SMS failed for activity ${upserted.id}:`, err.message)
      );
    } catch (err) {
      console.error(`[Wahoo Sync] AI analysis failed for activity ${upserted.id}:`, err.message);
    }
  }

  return { ...record, id: upserted?.id };
}

/**
 * Fetch all Wahoo workouts since a given date, with pagination.
 * Wahoo returns workouts sorted by `starts` descending (newest first).
 * Summaries are embedded in each workout object.
 *
 * @param {string} accessToken
 * @param {Date} sinceDate
 * @returns {object[]} array of workout objects
 */
async function fetchAllWahooWorkouts(accessToken, sinceDate) {
  const allWorkouts = [];
  let page = 1;
  const perPage = 30; // Wahoo default/max

  while (true) {
    const response = await wahooFetch(accessToken, `/workouts?page=${page}&per_page=${perPage}`);
    const workouts = response.workouts || [];

    if (workouts.length === 0) break;

    // Filter to workouts after sinceDate (results are newest-first)
    let foundOlder = false;
    for (const w of workouts) {
      const startDate = new Date(w.starts);
      if (startDate >= sinceDate) {
        allWorkouts.push(w);
      } else {
        foundOlder = true;
        break;
      }
    }

    // Stop if we found workouts older than sinceDate or last page
    if (foundOlder || workouts.length < perPage) break;
    page++;
  }

  return allWorkouts;
}

/**
 * Full sync — fetch all recent activities since last sync.
 */
export async function fullWahooSync(userId) {
  const tokenData = await getWahooToken(userId);
  if (!tokenData) throw new Error("No valid Wahoo token");

  const { accessToken, integration } = tokenData;
  const syncStartedAt = new Date().toISOString();

  // Fetch workouts since last sync (or last 30 days)
  const sinceDate = integration.last_sync_at
    ? new Date(integration.last_sync_at)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Mark as syncing
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("user_id", userId)
    .eq("provider", "wahoo");

  const workouts = await fetchAllWahooWorkouts(accessToken, sinceDate);

  const results = [];
  for (const w of workouts) {
    try {
      const result = await syncWahooWorkout(userId, w, { notify: false });
      if (result) results.push(result);
    } catch (err) {
      console.error(`[Wahoo Sync] Failed to sync workout ${w.id}:`, err.message);
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
    .eq("provider", "wahoo");

  // Backfill derived metrics (fire-and-forget)
  backfillUserMetrics(userId).catch(err =>
    console.error(`[Wahoo Sync] Backfill after sync failed:`, err.message)
  );

  // Batch AI analysis for unanalyzed activities (fire-and-forget)
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
          console.error(`[Wahoo Sync] Post-sync analysis failed for ${act.id}:`, err.message);
          if (err.message?.includes("credit balance")) break;
        }
      }
    }
  })().catch(err => console.error(`[Wahoo Sync] Post-sync analysis error:`, err.message));

  return results;
}

/**
 * Backfill sync — fetch ALL workouts from the last N days regardless of
 * last_sync_at. Used for initial onboarding (365 days).
 */
export async function backfillWahooSync(userId, days = 365) {
  const tokenData = await getWahooToken(userId);
  if (!tokenData) throw new Error("No valid Wahoo token");

  const { accessToken } = tokenData;
  const syncStartedAt = new Date().toISOString();
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Mark as syncing
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("user_id", userId)
    .eq("provider", "wahoo");

  const workouts = await fetchAllWahooWorkouts(accessToken, sinceDate);

  const results = [];
  const errors = [];
  for (const w of workouts) {
    try {
      const result = await syncWahooWorkout(userId, w, { notify: false });
      if (result) results.push(result);
    } catch (err) {
      console.error(`[Wahoo Sync] Backfill: failed to sync workout ${w.id}:`, err.message);
      errors.push({ id: w.id, name: w.name, error: err.message });
    }
  }

  // Update sync status
  await supabaseAdmin
    .from("integrations")
    .update({
      last_sync_at: syncStartedAt,
      sync_status: errors.length > 0 ? "partial" : "success",
      sync_error: errors.length > 0 ? `${errors.length} workouts failed` : null,
    })
    .eq("user_id", userId)
    .eq("provider", "wahoo");

  // Backfill derived metrics (fire-and-forget)
  backfillUserMetrics(userId).catch(err =>
    console.error(`[Wahoo Sync] Backfill after backfill sync failed:`, err.message)
  );

  // Batch AI analysis (fire-and-forget, up to 100 for backfill)
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
          console.error(`[Wahoo Sync] Post-backfill analysis failed for ${act.id}:`, err.message);
          if (err.message?.includes("credit balance")) break;
        }
      }
    }
  })().catch(err => console.error(`[Wahoo Sync] Post-backfill analysis error:`, err.message));

  return { results, errors };
}

/**
 * Manual sync API endpoint.
 * POST /api/integrations/sync/wahoo
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const results = await fullWahooSync(session.userId);
    return res.status(200).json({
      synced: results.length,
      activities: results.map(r => ({ name: r.name, date: r.started_at, tss: r.tss })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

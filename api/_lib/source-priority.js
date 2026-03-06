/**
 * Source priority for activity data.
 *
 * Higher number = closer to raw sensor data = more trustworthy.
 *
 *   3 — Device manufacturers (Wahoo, Hammerhead, Garmin): raw sensor data
 *   2 — TrainingPeaks: stores original FIT files from devices
 *   1 — Strava: may reprocess / recalculate metrics from uploaded data
 *
 * When the same workout exists in multiple sources, metrics (power, HR,
 * cadence, TSS, etc.) should always come from the highest-priority source.
 * Lower-priority sources can still contribute metadata (name, description).
 */

const SOURCE_PRIORITY = {
  strava: 1,
  trainingpeaks: 2,
  wahoo: 3,
  hammerhead: 3,
  garmin: 3,
};

export function getSourcePriority(source) {
  return SOURCE_PRIORITY[source] || 0;
}

export function isHigherPriority(newSource, existingSource) {
  return getSourcePriority(newSource) > getSourcePriority(existingSource);
}

/**
 * Find a duplicate activity using multi-signal matching.
 *
 * Layer 1 — Exact: same source + same source_id (re-imports, webhook retries).
 * Layer 2 — Fuzzy: start time within ±5 min + confirming signals (duration
 *           and/or distance). Works across ALL sources including same-source.
 *
 * @param {object[]} existingActivities - rows with id, source, source_id,
 *   started_at, duration_seconds, distance_meters (optional)
 * @param {string} startedAt - ISO timestamp of incoming activity
 * @param {number|null} durationSeconds - moving time
 * @param {string} currentSource - source identifier
 * @param {string|null} [sourceId] - source-specific ID for exact matching
 * @param {object} [options]
 * @param {number|null} [options.distanceMeters] - distance in meters
 * @returns {object|null} matching activity or null
 */
export function findDuplicate(
  existingActivities, startedAt, durationSeconds,
  currentSource, sourceId = null,
  { distanceMeters = null } = {}
) {
  const targetTime = new Date(startedAt).getTime();
  const TIME_WINDOW_MS = 5 * 60 * 1000;   // ±5 minutes
  const TIGHT_WINDOW_MS = 2 * 60 * 1000;  // ±2 minutes (needs fewer signals)
  const DURATION_TOLERANCE = 0.10;          // ±10%
  const DISTANCE_TOLERANCE = 0.10;          // ±10%
  const HARD_REJECT = 0.30;                 // >30% = definitely different

  for (const act of existingActivities) {
    // --- Layer 1: Exact source_id match ---
    if (sourceId && act.source === currentSource && act.source_id === sourceId) {
      return act;
    }

    // --- Layer 2: Fuzzy time + signal matching ---
    const timeDiff = Math.abs(new Date(act.started_at).getTime() - targetTime);
    if (timeDiff > TIME_WINDOW_MS) continue;

    let signals = 0;

    // Duration check (normalize by max of the two for symmetry)
    const hasBothDuration = act.duration_seconds && durationSeconds;
    if (hasBothDuration) {
      const durationDiff = Math.abs(act.duration_seconds - durationSeconds) / Math.max(act.duration_seconds, durationSeconds);
      if (durationDiff > HARD_REJECT) continue;  // definitely different
      if (durationDiff <= DURATION_TOLERANCE) signals++;
    }

    // Distance check (normalize by max of the two for symmetry)
    const hasBothDistance = act.distance_meters && distanceMeters && distanceMeters > 0;
    if (hasBothDistance) {
      const distDiff = Math.abs(act.distance_meters - distanceMeters) / Math.max(act.distance_meters, distanceMeters);
      if (distDiff > HARD_REJECT) continue;  // definitely different
      if (distDiff <= DISTANCE_TOLERANCE) signals++;
    }

    // Determine how many signals we need
    const availableSignals = (hasBothDuration ? 1 : 0) + (hasBothDistance ? 1 : 0);
    if (availableSignals === 0) continue; // no data to confirm — skip

    const inTightWindow = timeDiff <= TIGHT_WINDOW_MS;
    const requiredSignals = inTightWindow ? 1 : Math.min(2, availableSignals);

    if (signals >= requiredSignals) {
      return act;
    }
  }
  return null;
}

/**
 * Post-insert dedup sweep for webhook race conditions.
 *
 * When Strava and Wahoo webhooks fire simultaneously for the same ride,
 * both query activities, find nothing, and both insert. This function
 * runs AFTER an upsert to detect and merge any duplicate that was just
 * created by a concurrent webhook.
 *
 * Keeps the higher-priority source's row, enriches it with the lower-
 * priority source's metadata, and deletes the lower-priority duplicate.
 *
 * @param {object} supabase - supabaseAdmin client
 * @param {string} activityId - the just-inserted activity's UUID
 * @param {object} record - the activity record (needs user_id, source, started_at, duration_seconds, distance_meters)
 * @returns {object|null} - merge result, or null if no race duplicate found
 */
export async function mergeRaceDuplicates(supabase, activityId, record) {
  const { data: nearby } = await supabase
    .from("activities")
    .select("id, source, source_id, started_at, duration_seconds, distance_meters, name, description, source_data")
    .eq("user_id", record.user_id)
    .neq("id", activityId)
    .gte("started_at", new Date(new Date(record.started_at).getTime() - 6 * 60 * 1000).toISOString())
    .lte("started_at", new Date(new Date(record.started_at).getTime() + 6 * 60 * 1000).toISOString());

  if (!nearby?.length) return null;

  const dup = findDuplicate(
    nearby, record.started_at, record.duration_seconds,
    record.source, null, // skip exact source_id match — we want cross-source only
    { distanceMeters: record.distance_meters }
  );

  if (!dup || dup.source === record.source) return null;

  // Determine winner (higher priority keeps the row)
  const weWin = isHigherPriority(record.source, dup.source);
  const keepId = weWin ? activityId : dup.id;
  const deleteId = weWin ? dup.id : activityId;
  const loserSource = weWin ? dup.source : record.source;
  const loserData = weWin ? dup : record;

  // Enrich winner with loser's metadata
  const { data: winner } = await supabase
    .from("activities")
    .select("source_data, name, description")
    .eq("id", keepId)
    .single();

  const enrichData = {
    source_data: {
      ...(winner?.source_data || {}),
      [loserSource]: loserData.source_data || {},
    },
  };
  if (!winner?.name && loserData.name) enrichData.name = loserData.name;
  if (!winner?.description && loserData.description) enrichData.description = loserData.description;

  await supabase.from("activities").update(enrichData).eq("id", keepId);
  await supabase.from("activities").delete().eq("id", deleteId);

  console.log(`[Dedup] Race condition resolved: kept ${keepId} (${weWin ? record.source : dup.source}), deleted ${deleteId} (${loserSource})`);
  return { keepId, deleteId, source: weWin ? record.source : dup.source };
}

/** @deprecated Use findDuplicate() instead */
export function findCrossSourceDuplicate(existingActivities, startedAt, durationSeconds, currentSource) {
  return findDuplicate(existingActivities, startedAt, durationSeconds, currentSource);
}

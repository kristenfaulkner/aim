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

    // Duration check
    const hasBothDuration = act.duration_seconds && durationSeconds;
    if (hasBothDuration) {
      const durationDiff = Math.abs(act.duration_seconds - durationSeconds) / Math.max(durationSeconds, 1);
      if (durationDiff > HARD_REJECT) continue;  // definitely different
      if (durationDiff <= DURATION_TOLERANCE) signals++;
    }

    // Distance check
    const hasBothDistance = act.distance_meters && distanceMeters && distanceMeters > 0;
    if (hasBothDistance) {
      const distDiff = Math.abs(act.distance_meters - distanceMeters) / Math.max(distanceMeters, 1);
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

/** @deprecated Use findDuplicate() instead */
export function findCrossSourceDuplicate(existingActivities, startedAt, durationSeconds, currentSource) {
  return findDuplicate(existingActivities, startedAt, durationSeconds, currentSource);
}

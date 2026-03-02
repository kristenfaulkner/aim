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
 * Find a cross-source duplicate activity by matching start time ± 2 min
 * and duration ± 5%. Excludes activities from the given source so we only
 * find matches from OTHER sources.
 */
export function findCrossSourceDuplicate(existingActivities, startedAt, durationSeconds, currentSource) {
  const targetTime = new Date(startedAt).getTime();
  const WINDOW_MS = 2 * 60 * 1000;
  const DURATION_TOLERANCE = 0.05;

  for (const act of existingActivities) {
    if (act.source === currentSource) continue;

    const actTime = new Date(act.started_at).getTime();
    if (Math.abs(actTime - targetTime) > WINDOW_MS) continue;

    if (act.duration_seconds && durationSeconds) {
      const durationDiff = Math.abs(act.duration_seconds - durationSeconds) / Math.max(durationSeconds, 1);
      if (durationDiff > DURATION_TOLERANCE) continue;
    }

    return act;
  }
  return null;
}

/**
 * Canonical Tag Dictionary + Detection Engine.
 *
 * Tags are the foundation of AIM's "searchable workout database."
 * Every tag has:
 *   - tag_id: stable canonical string (snake_case)
 *   - scope: "workout" or "interval"
 *   - detection: a function that returns { match: boolean, confidence: number, evidence: object }
 *
 * Tags are persisted in the `activity_tags` table for cross-activity search.
 */

// ============================================================
// Tag Dictionary — Cycling Workout-Level Tags
// ============================================================

const WORKOUT_TAG_DETECTORS = {
  race_day: {
    label: "Race Day",
    category: "type",
    detect: (a) => {
      const isRaceType = a.activity_type === "race";
      const nameHint = /race|crit|gran fondo|tdf|giro|vuelta|championship/i.test(a.name || "");
      if (isRaceType || nameHint) {
        return { match: true, confidence: isRaceType ? 0.95 : 0.7, evidence: { activity_type: a.activity_type, name: a.name } };
      }
      return { match: false };
    },
  },

  group_ride: {
    label: "Group Ride",
    category: "type",
    detect: (a) => {
      const nameHint = /group|club|social|bunch|hammerfest/i.test(a.name || "");
      const highVI = a.variability_index > 1.15;
      if (nameHint || (highVI && a.duration_seconds > 3600)) {
        return { match: true, confidence: nameHint ? 0.8 : 0.5, evidence: { name: a.name, vi: a.variability_index } };
      }
      return { match: false };
    },
  },

  indoor_trainer: {
    label: "Indoor",
    category: "type",
    detect: (a) => {
      const isTrainer = a.activity_type === "virtualride" || /trainer|zwift|indoor|wahoo kickr/i.test(a.name || "");
      const noGps = !a.distance_meters || a.distance_meters < 100;
      if (isTrainer || noGps) {
        return { match: true, confidence: isTrainer ? 0.95 : 0.7, evidence: { activity_type: a.activity_type, distance: a.distance_meters } };
      }
      return { match: false };
    },
  },

  endurance_steady: {
    label: "Endurance",
    category: "energy_system",
    detect: (a) => {
      if (!a.variability_index || !a.intensity_factor) return { match: false };
      if (a.variability_index < 1.05 && a.intensity_factor >= 0.55 && a.intensity_factor <= 0.75) {
        return { match: true, confidence: 0.85, evidence: { vi: a.variability_index, if: a.intensity_factor } };
      }
      return { match: false };
    },
  },

  tempo_ride: {
    label: "Tempo",
    category: "energy_system",
    detect: (a, _, __, ftp) => {
      if (!a.zone_distribution || !ftp) return { match: false };
      const z3 = a.zone_distribution.z3 || 0;
      const total = Object.values(a.zone_distribution).reduce((s, v) => s + v, 0);
      const z3Pct = total > 0 ? z3 / total : 0;
      if (z3Pct > 0.35) {
        return { match: true, confidence: 0.8, evidence: { z3_pct: Math.round(z3Pct * 100) } };
      }
      return { match: false };
    },
  },

  sweet_spot_session: {
    label: "Sweet Spot",
    category: "energy_system",
    detect: (a) => {
      if (!a.intensity_factor) return { match: false };
      // Sweet spot: IF 0.88-0.94, at least 20 min sustained
      if (a.intensity_factor >= 0.85 && a.intensity_factor <= 0.95 && a.duration_seconds > 1200) {
        return { match: true, confidence: 0.75, evidence: { if: a.intensity_factor, duration: a.duration_seconds } };
      }
      return { match: false };
    },
  },

  threshold_session: {
    label: "Threshold",
    category: "energy_system",
    detect: (a, _, __, ftp) => {
      if (!a.zone_distribution || !ftp) return { match: false };
      const z4 = a.zone_distribution.z4 || 0;
      if (z4 > 900) { // >15 min in zone 4
        return { match: true, confidence: 0.8, evidence: { z4_seconds: z4 } };
      }
      return { match: false };
    },
  },

  vo2_session: {
    label: "VO2max",
    category: "energy_system",
    detect: (a, _, __, ftp) => {
      if (!a.zone_distribution || !ftp) return { match: false };
      const z5 = a.zone_distribution.z5 || 0;
      if (z5 > 300) { // >5 min in zone 5
        return { match: true, confidence: 0.85, evidence: { z5_seconds: z5 } };
      }
      return { match: false };
    },
  },

  anaerobic_session: {
    label: "Anaerobic",
    category: "energy_system",
    detect: (a, _, __, ftp) => {
      if (!a.zone_distribution || !ftp) return { match: false };
      const z6 = a.zone_distribution.z6 || 0;
      if (z6 > 120) { // >2 min in zone 6
        return { match: true, confidence: 0.8, evidence: { z6_seconds: z6 } };
      }
      return { match: false };
    },
  },

  neuromuscular_session: {
    label: "Neuromuscular",
    category: "energy_system",
    detect: (a, _, __, ftp) => {
      if (!a.zone_distribution || !ftp) return { match: false };
      const z7 = a.zone_distribution.z7 || 0;
      if (z7 > 30) { // >30s in zone 7
        return { match: true, confidence: 0.7, evidence: { z7_seconds: z7 } };
      }
      return { match: false };
    },
  },

  climbing_focus: {
    label: "Climbing",
    category: "terrain",
    detect: (a) => {
      if (!a.elevation_gain_meters || !a.distance_meters) return { match: false };
      const gain = a.elevation_gain_meters;
      const gradePct = (gain / (a.distance_meters || 1)) * 100;
      if (gain > 1000 || gradePct > 2.5) {
        return { match: true, confidence: 0.85, evidence: { elevation_gain: gain, avg_grade_pct: Math.round(gradePct * 10) / 10 } };
      }
      return { match: false };
    },
  },

  rolling_surge_ride: {
    label: "Rolling/Surges",
    category: "terrain",
    detect: (a) => {
      if (!a.variability_index) return { match: false };
      if (a.variability_index > 1.15) {
        return { match: true, confidence: 0.7, evidence: { vi: a.variability_index } };
      }
      return { match: false };
    },
  },

  hot_conditions: {
    label: "Hot",
    category: "environment",
    detect: (a, _, weather) => {
      const temp = weather?.temp_c ?? a.temperature_celsius;
      if (temp != null && temp > 30) {
        return { match: true, confidence: 0.9, evidence: { temp_c: temp } };
      }
      return { match: false };
    },
  },

  cold_conditions: {
    label: "Cold",
    category: "environment",
    detect: (a, _, weather) => {
      const temp = weather?.temp_c ?? a.temperature_celsius;
      if (temp != null && temp < 5) {
        return { match: true, confidence: 0.9, evidence: { temp_c: temp } };
      }
      return { match: false };
    },
  },

  high_wind_conditions: {
    label: "Windy",
    category: "environment",
    detect: (_, __, weather) => {
      if (weather?.wind_speed_mps != null && weather.wind_speed_mps > 6.9) { // >25 km/h
        return { match: true, confidence: 0.85, evidence: { wind_speed_mps: weather.wind_speed_mps } };
      }
      return { match: false };
    },
  },

  high_drift: {
    label: "High Drift",
    category: "physiology",
    detect: (a) => {
      if (a.hr_drift_pct != null && Math.abs(a.hr_drift_pct) > 5) {
        return { match: true, confidence: 0.9, evidence: { hr_drift_pct: a.hr_drift_pct } };
      }
      return { match: false };
    },
  },

  low_hrv_day: {
    label: "Low HRV",
    category: "readiness",
    detect: (_, daily) => {
      if (!daily?.hrv || !daily?.hrv_baseline_avg) return { match: false };
      // Bottom 25% of personal baseline
      const threshold = daily.hrv_baseline_avg * 0.75;
      if (daily.hrv < threshold) {
        return { match: true, confidence: 0.8, evidence: { hrv: daily.hrv, threshold, baseline: daily.hrv_baseline_avg } };
      }
      return { match: false };
    },
  },

  poor_sleep_day: {
    label: "Poor Sleep",
    category: "readiness",
    detect: (_, daily) => {
      if (!daily) return { match: false };
      const sleepHours = daily.sleep_duration_hours || (daily.sleep_duration_minutes ? daily.sleep_duration_minutes / 60 : null);
      const sleepScore = daily.sleep_score;
      if ((sleepHours && sleepHours < 6) || (sleepScore && sleepScore < 60)) {
        return { match: true, confidence: 0.8, evidence: { sleep_hours: sleepHours, sleep_score: sleepScore } };
      }
      return { match: false };
    },
  },

  data_quality_issue: {
    label: "Data Quality",
    category: "meta",
    detect: (a) => {
      // Flag if no power data or suspiciously short
      if (!a.avg_power_watts && a.duration_seconds > 600) {
        return { match: true, confidence: 0.6, evidence: { reason: "no_power_data" } };
      }
      return { match: false };
    },
  },
};


// ============================================================
// Tag Dictionary — Cycling Interval-Level Tags
// ============================================================

const INTERVAL_TAG_DETECTORS = {
  vo2_interval: {
    label: "VO2",
    detect: (interval, ftp) => {
      if (!interval.avg_power_w || !ftp) return { match: false };
      const pctFtp = interval.avg_power_w / ftp;
      if (pctFtp >= 1.06 && pctFtp <= 1.20 && interval.duration_s >= 120 && interval.duration_s <= 480) {
        return { match: true, confidence: 0.85, evidence: { pct_ftp: Math.round(pctFtp * 100), duration: interval.duration_s } };
      }
      return { match: false };
    },
  },

  threshold_interval: {
    label: "Threshold",
    detect: (interval, ftp) => {
      if (!interval.avg_power_w || !ftp) return { match: false };
      const pctFtp = interval.avg_power_w / ftp;
      if (pctFtp >= 0.95 && pctFtp <= 1.05 && interval.duration_s >= 300) {
        return { match: true, confidence: 0.85, evidence: { pct_ftp: Math.round(pctFtp * 100), duration: interval.duration_s } };
      }
      return { match: false };
    },
  },

  sweet_spot_interval: {
    label: "Sweet Spot",
    detect: (interval, ftp) => {
      if (!interval.avg_power_w || !ftp) return { match: false };
      const pctFtp = interval.avg_power_w / ftp;
      if (pctFtp >= 0.88 && pctFtp < 0.95 && interval.duration_s >= 480) {
        return { match: true, confidence: 0.8, evidence: { pct_ftp: Math.round(pctFtp * 100) } };
      }
      return { match: false };
    },
  },

  anaerobic_interval: {
    label: "Anaerobic",
    detect: (interval, ftp) => {
      if (!interval.avg_power_w || !ftp) return { match: false };
      const pctFtp = interval.avg_power_w / ftp;
      if (pctFtp > 1.20 && pctFtp <= 1.50 && interval.duration_s >= 30 && interval.duration_s <= 180) {
        return { match: true, confidence: 0.8, evidence: { pct_ftp: Math.round(pctFtp * 100) } };
      }
      return { match: false };
    },
  },

  sprint_interval: {
    label: "Sprint",
    detect: (interval, ftp) => {
      if (!interval.avg_power_w || !ftp) return { match: false };
      const pctFtp = interval.avg_power_w / ftp;
      if (pctFtp > 1.50 && interval.duration_s < 30) {
        return { match: true, confidence: 0.8, evidence: { pct_ftp: Math.round(pctFtp * 100) } };
      }
      return { match: false };
    },
  },

  low_cadence_interval: {
    label: "Low Cadence",
    detect: (interval) => {
      if (interval.avg_cadence_rpm && interval.avg_cadence_rpm < 70) {
        return { match: true, confidence: 0.9, evidence: { cadence: interval.avg_cadence_rpm } };
      }
      return { match: false };
    },
  },

  high_cadence_interval: {
    label: "High Cadence",
    detect: (interval) => {
      if (interval.avg_cadence_rpm && interval.avg_cadence_rpm > 105) {
        return { match: true, confidence: 0.9, evidence: { cadence: interval.avg_cadence_rpm } };
      }
      return { match: false };
    },
  },

  overcooked_start: {
    label: "Overcooked",
    detect: (interval) => {
      if (interval.execution?.execution_label === "overcooked") {
        return { match: true, confidence: 0.9, evidence: { label: "overcooked" } };
      }
      return { match: false };
    },
  },

  power_fade: {
    label: "Faded",
    detect: (interval) => {
      if (interval.execution?.fade_score != null && interval.execution.fade_score < -0.08) {
        return { match: true, confidence: 0.85, evidence: { fade_score: interval.execution.fade_score } };
      }
      return { match: false };
    },
  },

  strong_finish: {
    label: "Strong Finish",
    detect: (interval) => {
      if (interval.execution?.end_strength != null && interval.execution.end_strength > 1.05) {
        return { match: true, confidence: 0.85, evidence: { end_strength: interval.execution.end_strength } };
      }
      return { match: false };
    },
  },

  inconsistent_power: {
    label: "Inconsistent",
    detect: (interval) => {
      if (interval.execution?.smoothness_cv != null && interval.execution.smoothness_cv > 0.10) {
        return { match: true, confidence: 0.8, evidence: { cv: interval.execution.smoothness_cv } };
      }
      return { match: false };
    },
  },

  cadence_decay: {
    label: "Cadence Decay",
    detect: (interval) => {
      if (interval.execution?.cadence_drift != null && interval.execution.cadence_drift < -8) {
        return { match: true, confidence: 0.8, evidence: { drift_rpm: interval.execution.cadence_drift } };
      }
      return { match: false };
    },
  },

  cadence_collapse: {
    label: "Cadence Collapse",
    detect: (interval) => {
      if (interval.execution?.cadence_drift != null && interval.execution.cadence_drift < -15) {
        return { match: true, confidence: 0.85, evidence: { drift_rpm: interval.execution.cadence_drift } };
      }
      return { match: false };
    },
  },

  hr_lag_slow: {
    label: "Slow HR Rise",
    detect: (interval) => {
      if (interval.execution?.hr_rise_slope != null && interval.execution.hr_rise_slope < 0.3 && interval.duration_s > 120) {
        return { match: true, confidence: 0.7, evidence: { hr_rise_slope: interval.execution.hr_rise_slope } };
      }
      return { match: false };
    },
  },
};


// ============================================================
// Detection functions
// ============================================================

/**
 * Detect all applicable workout-level tags for an activity.
 *
 * @param {object} activity - Activity record from DB
 * @param {object|null} dailyMetrics - daily_metrics for that date (HRV, sleep, etc.)
 * @param {object|null} weather - activity_weather JSONB
 * @param {number|null} ftp - FTP at time of activity
 * @returns {object[]} Array of { tag_id, scope: "workout", confidence, evidence }
 */
export function detectWorkoutTags(activity, dailyMetrics = null, weather = null, ftp = null) {
  const tags = [];

  for (const [tagId, detector] of Object.entries(WORKOUT_TAG_DETECTORS)) {
    try {
      const result = detector.detect(activity, dailyMetrics, weather, ftp);
      if (result.match) {
        tags.push({
          tag_id: tagId,
          scope: "workout",
          confidence: result.confidence,
          evidence: result.evidence,
        });
      }
    } catch (err) {
      console.error(`Tag detection error for ${tagId}:`, err.message);
    }
  }

  return tags;
}

/**
 * Detect all applicable interval-level tags.
 *
 * @param {object} interval - Single interval from laps.intervals
 * @param {number|null} ftp - FTP at time of activity
 * @param {number} intervalIndex - Index of the interval in the array
 * @returns {object[]} Array of { tag_id, scope: "interval", confidence, evidence, interval_index }
 */
export function detectIntervalTags(interval, ftp = null, intervalIndex = 0) {
  const tags = [];

  for (const [tagId, detector] of Object.entries(INTERVAL_TAG_DETECTORS)) {
    try {
      const result = detector.detect(interval, ftp);
      if (result.match) {
        tags.push({
          tag_id: tagId,
          scope: "interval",
          confidence: result.confidence,
          evidence: result.evidence,
          interval_index: intervalIndex,
        });
      }
    } catch (err) {
      console.error(`Interval tag detection error for ${tagId}:`, err.message);
    }
  }

  return tags;
}

/**
 * Detect all tags (workout + interval) for an activity and its intervals.
 *
 * @returns {object[]} Combined array of all detected tags
 */
export function detectAllTags(activity, dailyMetrics = null, weather = null, ftp = null) {
  const tags = detectWorkoutTags(activity, dailyMetrics, weather, ftp);

  // Detect interval-level tags if laps exist
  if (activity.laps?.intervals) {
    for (let i = 0; i < activity.laps.intervals.length; i++) {
      const interval = activity.laps.intervals[i];
      if (interval.type === "work") {
        const intervalTags = detectIntervalTags(interval, ftp, i);
        tags.push(...intervalTags);
      }
    }
  }

  return tags;
}

/**
 * Persist tags to the activity_tags table.
 * Uses upsert to avoid duplicates.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase - Admin client
 * @param {string} activityId - Activity UUID
 * @param {string} userId - User UUID
 * @param {object[]} tags - Array of detected tags
 */
export async function persistTags(supabase, activityId, userId, tags) {
  if (!tags.length) return;

  const rows = tags.map(t => ({
    activity_id: activityId,
    user_id: userId,
    tag_id: t.tag_id,
    scope: t.scope,
    confidence: t.confidence,
    evidence: t.evidence,
    interval_index: t.interval_index ?? null,
  }));

  const { error } = await supabase
    .from("activity_tags")
    .upsert(rows, { onConflict: "activity_id,tag_id,COALESCE(interval_index, -1)" })
    .select("id");

  if (error) {
    // Upsert with function in onConflict may not work — fall back to delete+insert
    await supabase.from("activity_tags").delete().eq("activity_id", activityId);
    await supabase.from("activity_tags").insert(rows);
  }
}


// ============================================================
// Tag Dictionary export (for frontend)
// ============================================================

export function getTagDictionary() {
  const dict = {};

  for (const [tagId, def] of Object.entries(WORKOUT_TAG_DETECTORS)) {
    dict[tagId] = { label: def.label, scope: "workout", category: def.category };
  }
  for (const [tagId, def] of Object.entries(INTERVAL_TAG_DETECTORS)) {
    dict[tagId] = { label: def.label, scope: "interval" };
  }

  return dict;
}

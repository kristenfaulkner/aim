/**
 * Similar Session matching and enrichment — pure functions.
 * No DB calls, no imports of supabase/auth.
 */

/**
 * Weighted similarity score (0-1) between current and candidate activity.
 *
 * Weights:
 *   Duration ±25%  → 0.30
 *   TSS ±30%       → 0.25
 *   IF ±15%        → 0.20
 *   NP ±20%        → 0.15
 *   Tag overlap     → 0.10
 */
export function computeSimilarity(current, candidate, currentTags) {
  const weights = { duration: 0.3, tss: 0.25, intensity: 0.2, power: 0.15, tags: 0.1 };
  let score = 0;
  let totalWeight = 0;

  // Duration similarity
  const durA = current.duration_seconds || 0;
  const durB = candidate.duration_seconds || 0;
  if (durA > 0 && durB > 0) {
    const durSim = 1 - Math.min(Math.abs(durA - durB) / durA, 1);
    score += durSim * weights.duration;
    totalWeight += weights.duration;
  }

  // TSS similarity
  const tssA = current.tss;
  const tssB = candidate.tss;
  if (tssA > 0 && tssB > 0) {
    const tssSim = 1 - Math.min(Math.abs(tssA - tssB) / tssA, 1);
    score += tssSim * weights.tss;
    totalWeight += weights.tss;
  }

  // Intensity Factor similarity
  const ifA = current.intensity_factor;
  const ifB = candidate.intensity_factor;
  if (ifA > 0 && ifB > 0) {
    const ifSim = 1 - Math.min(Math.abs(ifA - ifB) / ifA, 1);
    score += ifSim * weights.intensity;
    totalWeight += weights.intensity;
  }

  // Normalized Power similarity (fall back to avg_power_watts)
  const npA = current.normalized_power_watts || current.avg_power_watts || 0;
  const npB = candidate.normalized_power_watts || candidate.avg_power_watts || 0;
  if (npA > 0 && npB > 0) {
    const npSim = 1 - Math.min(Math.abs(npA - npB) / npA, 1);
    score += npSim * weights.power;
    totalWeight += weights.power;
  }

  // Tag overlap (Jaccard similarity)
  const candTags = Array.isArray(candidate.user_tags) ? candidate.user_tags : [];
  if (currentTags.length > 0 && candTags.length > 0) {
    const overlap = currentTags.filter((t) => candTags.includes(t)).length;
    const union = new Set([...currentTags, ...candTags]).size;
    const tagSim = union > 0 ? overlap / union : 0;
    score += tagSim * weights.tags;
    totalWeight += weights.tags;
  }

  // Normalize by available dimensions
  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Enrich an activity with cross-domain context from the day it was performed.
 * All maps are optional — returns null for any unavailable data.
 */
export function enrichActivity(activity, metricsByDate, nutritionByActivity, travelByDate, crossTrainByDate, loadByDate) {
  const dateStr = activity.started_at?.split("T")[0];
  const dayBefore = dateStr ? getPreviousDate(dateStr) : null;

  const metrics = metricsByDate?.[dateStr] || null;
  const nutrition = nutritionByActivity?.[activity.id] || null;
  const travel = travelByDate?.[dateStr] || null;
  const crossTrain = dayBefore && crossTrainByDate?.[dayBefore] ? crossTrainByDate[dayBefore] : null;
  const load = loadByDate?.[dateStr] || null;

  const weather = activity.activity_weather || null;

  return {
    id: activity.id,
    name: activity.name,
    started_at: activity.started_at,
    duration_seconds: activity.duration_seconds,
    distance_meters: activity.distance_meters,
    elevation_gain_meters: activity.elevation_gain_meters,
    avg_power_watts: activity.avg_power_watts,
    normalized_power_watts: activity.normalized_power_watts,
    tss: activity.tss,
    intensity_factor: activity.intensity_factor,
    efficiency_factor: activity.efficiency_factor,
    hr_drift_pct: activity.hr_drift_pct,
    avg_hr_bpm: activity.avg_hr_bpm,
    max_hr_bpm: activity.max_hr_bpm,
    work_kj: activity.work_kj,
    calories: activity.calories,
    user_tags: activity.user_tags,
    similarity_score: activity.similarity_score ?? null,
    context: {
      sleep_score: metrics?.sleep_score ?? null,
      sleep_duration_hours: metrics?.sleep_duration_hours ?? null,
      hrv_ms: metrics?.hrv_ms ?? metrics?.hrv_overnight_avg_ms ?? null,
      resting_hr_bpm: metrics?.resting_hr_bpm ?? null,
      recovery_score: metrics?.recovery_score ?? null,
      life_stress: metrics?.life_stress_score ?? null,
      motivation: metrics?.motivation_score ?? null,
      soreness: metrics?.muscle_soreness_score ?? null,
      mood: metrics?.mood_score ?? null,
      weather_temp_c: weather?.temperature ?? null,
      weather_humidity: weather?.humidity ?? null,
      weather_wind_kph: weather?.wind_speed ?? null,
      weather_description: weather?.description ?? null,
      nutrition_carbs_per_hour: nutrition?.per_hour?.carbs_g ?? null,
      nutrition_calories: nutrition?.totals?.calories ?? null,
      cross_training_prior_day: crossTrain
        ? crossTrain.map((ct) => ({ type: ct.activity_type, impact: ct.recovery_impact, tss: ct.estimated_tss }))
        : null,
      travel: travel
        ? { timezone_shift: travel.timezone_shift_hours, altitude_change: travel.altitude_change_meters, jet_lag: travel.jet_lag_severity }
        : null,
      ctl: load?.ctl ?? null,
      atl: load?.atl ?? null,
      tsb: load?.tsb ?? null,
    },
  };
}

function getPreviousDate(dateStr) {
  const dt = new Date(dateStr);
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().split("T")[0];
}

/**
 * Conditional Performance Models
 * Pure computation functions — no DB calls, fully testable.
 *
 * Builds personal models from historical activity + context data:
 *   - Heat penalty (temp → EF decline, HR drift increase)
 *   - Sleep → interval execution quality
 *   - HRV → readiness / EF prediction
 *   - Fueling → durability / late-ride fade
 *   - Durability (kJ/kg → power quality decay)
 *
 * Follows the exact pattern of sleep-correlations.js.
 */

import { pearsonR } from "./sleep-correlations.js";

// ── Utility functions ──

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 5) return null;
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 100) / 100 };
}

function round(v, decimals = 1) {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}


// ── 1. Match activities to full context ──

/**
 * Join activities with daily metrics, weather, nutrition, and interval data.
 * Produces the unified pair objects that all model functions consume.
 *
 * @param {object[]} activities - Array of activity records
 * @param {object[]} dailyMetrics - Array of daily_metrics records
 * @param {object[]} nutritionLogs - Array of nutrition_logs records
 * @param {number} weightKg - Athlete weight in kg
 * @returns {object[]} Matched pairs
 */
export function matchActivitiesToContext(activities, dailyMetrics, nutritionLogs, weightKg) {
  const metricsByDate = {};
  for (const dm of dailyMetrics) {
    if (dm.date) metricsByDate[dm.date] = dm;
  }

  const nutritionByActivity = {};
  const nutritionByDate = {};
  for (const nl of (nutritionLogs || [])) {
    if (nl.activity_id) nutritionByActivity[nl.activity_id] = nl;
    if (nl.date) nutritionByDate[nl.date] = nl;
  }

  const pairs = [];

  for (const act of activities) {
    if (!act.started_at) continue;
    if (act.avg_power_watts == null && act.normalized_power_watts == null) continue;

    const actDate = act.started_at.split("T")[0];
    const dm = metricsByDate[actDate];
    const nutrition = nutritionByActivity[act.id] || nutritionByDate[actDate] || null;

    // Weather from activity_weather column or dm
    const weather = act.activity_weather || null;
    const temp = weather?.temp_c ?? act.temperature_celsius ?? null;

    // Interval execution data from laps
    const laps = act.laps || null;
    const workIntervals = laps?.intervals?.filter(i => i.type === "work") || [];
    const setMetrics = laps?.set_metrics || null;

    // kJ/kg for durability model
    const workKj = act.work_kj || (act.avg_power_watts && act.duration_seconds
      ? (act.avg_power_watts * act.duration_seconds) / 1000 : null);
    const kjPerKg = workKj && weightKg ? workKj / weightKg : null;

    pairs.push({
      activity: {
        id: act.id,
        date: actDate,
        name: act.name || act.activity_type,
        type: act.activity_type,
        ef: act.efficiency_factor,
        np: act.normalized_power_watts,
        avgPower: act.avg_power_watts,
        hrDrift: act.hr_drift_pct,
        vi: act.variability_index,
        tss: act.tss,
        if: act.intensity_factor,
        avgHr: act.avg_hr_bpm,
        maxHr: act.max_hr_bpm,
        duration: act.duration_seconds,
        durationHours: act.duration_seconds ? act.duration_seconds / 3600 : null,
        temp,
        elevation: act.elevation_gain_meters,
        workKj,
        kjPerKg,
        calories: act.calories,
      },
      sleep: dm ? {
        totalHours: dm.total_sleep_seconds ? dm.total_sleep_seconds / 3600 : null,
        score: dm.sleep_score,
        deepPct: dm.deep_sleep_seconds && dm.total_sleep_seconds
          ? (dm.deep_sleep_seconds / dm.total_sleep_seconds) * 100 : null,
        hrv: dm.hrv_overnight_avg_ms || dm.hrv_ms || null,
        rhr: dm.resting_hr_bpm,
      } : null,
      trainingLoad: dm ? {
        tsb: dm.tsb,
        ctl: dm.ctl,
        atl: dm.atl,
      } : null,
      weather: {
        temp,
        humidity: weather?.humidity_pct ?? null,
        apparentTemp: weather?.apparent_temp_c ?? null,
        dewPoint: weather?.dew_point_c ?? null,
        windSpeed: weather?.wind_speed_mps ?? null,
      },
      intervals: {
        count: workIntervals.length,
        avgPower: setMetrics?.avg_work_power_w ?? null,
        consistencyCV: setMetrics?.power_consistency_cv ?? null,
        durabilityIndex: setMetrics?.durability_index ?? null,
        fadeScore: workIntervals.length >= 3 ? computeFadeScore(workIntervals) : null,
      },
      nutrition: nutrition ? {
        totalCarbs: nutrition.totals?.carbs ?? null,
        totalCalories: nutrition.totals?.calories ?? null,
        carbsPerHour: nutrition.per_hour?.carbs ?? null,
        proteinPerHour: nutrition.per_hour?.protein ?? null,
      } : null,
    });
  }

  return pairs;
}

function computeFadeScore(workIntervals) {
  const powers = workIntervals.map(i => i.avg_power_w).filter(p => p > 0);
  if (powers.length < 3) return null;
  const mid = Math.floor(powers.length / 2);
  const firstAvg = avg(powers.slice(0, mid));
  const secondAvg = avg(powers.slice(mid));
  if (!firstAvg) return null;
  return round((secondAvg - firstAvg) / firstAvg * 100, 1);
}


// ── 2. Heat Performance Model ──

/**
 * Model how temperature affects EF, HR drift, and power output.
 *
 * @param {object[]} pairs - From matchActivitiesToContext
 * @returns {object|null} Heat model or null if insufficient data
 */
export function computeHeatModel(pairs) {
  const withTemp = pairs.filter(p =>
    p.weather.temp != null && p.activity.ef != null && p.activity.duration > 3600
  );
  if (withTemp.length < 10) return null;

  const temps = withTemp.map(p => p.weather.temp);
  const efs = withTemp.map(p => p.activity.ef);

  // Correlation: temp → EF
  const tempEfCorr = pearsonR(temps, efs);

  // Linear regression: temp → EF
  const tempEfRegression = linearRegression(temps, efs);

  // Correlation: temp → HR drift
  const withDrift = withTemp.filter(p => p.activity.hrDrift != null);
  const tempDriftCorr = withDrift.length >= 5
    ? pearsonR(withDrift.map(p => p.weather.temp), withDrift.map(p => p.activity.hrDrift))
    : null;

  // Bin analysis: cool vs moderate vs hot
  const bins = [
    { label: "Cool (<15°C)", filter: p => p.weather.temp < 15 },
    { label: "Moderate (15-25°C)", filter: p => p.weather.temp >= 15 && p.weather.temp <= 25 },
    { label: "Hot (>25°C)", filter: p => p.weather.temp > 25 },
    { label: "Very Hot (>30°C)", filter: p => p.weather.temp > 30 },
  ];

  const binResults = {};
  for (const bin of bins) {
    const subset = withTemp.filter(bin.filter);
    if (subset.length < 3) { binResults[bin.label] = null; continue; }
    binResults[bin.label] = {
      avgEF: round(avg(subset.map(p => p.activity.ef)), 2),
      avgHrDrift: round(avg(subset.filter(p => p.activity.hrDrift != null).map(p => p.activity.hrDrift)), 1),
      avgNP: Math.round(avg(subset.filter(p => p.activity.np != null).map(p => p.activity.np)) || 0),
      count: subset.length,
    };
  }

  // Find breakpoint temperature (where EF starts declining significantly)
  let breakpointTemp = null;
  if (withTemp.length >= 15) {
    const sorted = [...withTemp].sort((a, b) => a.weather.temp - b.weather.temp);
    const windowSize = Math.max(5, Math.floor(sorted.length / 4));
    let maxEf = -Infinity;
    for (let i = 0; i <= sorted.length - windowSize; i++) {
      const windowEf = avg(sorted.slice(i, i + windowSize).map(p => p.activity.ef));
      if (windowEf > maxEf) {
        maxEf = windowEf;
        breakpointTemp = round(sorted[i + Math.floor(windowSize / 2)].weather.temp);
      }
    }
  }

  // Humidity interaction
  const withHumidity = withTemp.filter(p => p.weather.humidity != null && p.weather.temp > 20);
  let humidityEffect = null;
  if (withHumidity.length >= 8) {
    const lowHumidity = withHumidity.filter(p => p.weather.humidity < 60);
    const highHumidity = withHumidity.filter(p => p.weather.humidity >= 60);
    if (lowHumidity.length >= 3 && highHumidity.length >= 3) {
      humidityEffect = {
        lowHumidityEF: round(avg(lowHumidity.map(p => p.activity.ef)), 2),
        highHumidityEF: round(avg(highHumidity.map(p => p.activity.ef)), 2),
        deltaPct: round((avg(highHumidity.map(p => p.activity.ef)) - avg(lowHumidity.map(p => p.activity.ef)))
          / avg(lowHumidity.map(p => p.activity.ef)) * 100, 1),
        counts: { low: lowHumidity.length, high: highHumidity.length },
      };
    }
  }

  const confidence = withTemp.length >= 30 ? "high" : withTemp.length >= 20 ? "medium" : "low";

  return {
    type: "heat",
    correlation: { tempEf: tempEfCorr, tempDrift: tempDriftCorr },
    regression: tempEfRegression,
    bins: binResults,
    breakpointTemp,
    humidityEffect,
    confidence,
    sampleSize: withTemp.length,
    summary: buildHeatSummary(tempEfRegression, binResults, breakpointTemp, confidence),
  };
}

function buildHeatSummary(regression, bins, breakpoint, confidence) {
  const parts = [];
  if (regression?.slope) {
    const dir = regression.slope < 0 ? "decreases" : "increases";
    parts.push(`EF ${dir} by ${Math.abs(regression.slope)} per °C`);
  }
  if (breakpoint != null) {
    parts.push(`performance breakpoint around ${breakpoint}°C`);
  }
  const cool = bins["Cool (<15°C)"];
  const hot = bins["Hot (>25°C)"];
  if (cool && hot) {
    const delta = round((hot.avgEF - cool.avgEF) / cool.avgEF * 100, 1);
    parts.push(`EF is ${Math.abs(delta)}% ${delta < 0 ? "lower" : "higher"} in heat vs cool`);
  }
  return parts.length > 0 ? parts.join("; ") + ` (${confidence} confidence)` : null;
}


// ── 3. Sleep → Interval Execution Model ──

/**
 * Extends sleep-correlations.js by correlating sleep quality
 * with interval execution quality (not just overall EF).
 *
 * @param {object[]} pairs - From matchActivitiesToContext
 * @returns {object|null} Sleep-execution model
 */
export function computeSleepExecutionModel(pairs) {
  const withBoth = pairs.filter(p =>
    p.sleep?.hrv != null && p.intervals.count >= 3
  );
  if (withBoth.length < 8) return null;

  // HRV → consistency CV
  const withCV = withBoth.filter(p => p.intervals.consistencyCV != null);
  const hrvCvCorr = withCV.length >= 5
    ? pearsonR(withCV.map(p => p.sleep.hrv), withCV.map(p => p.intervals.consistencyCV))
    : null;

  // HRV → durability index
  const withDI = withBoth.filter(p => p.intervals.durabilityIndex != null);
  const hrvDiCorr = withDI.length >= 5
    ? pearsonR(withDI.map(p => p.sleep.hrv), withDI.map(p => p.intervals.durabilityIndex))
    : null;

  // Sleep hours → fade score
  const withFade = withBoth.filter(p => p.sleep.totalHours != null && p.intervals.fadeScore != null);
  const sleepFadeCorr = withFade.length >= 5
    ? pearsonR(withFade.map(p => p.sleep.totalHours), withFade.map(p => p.intervals.fadeScore))
    : null;

  // Sleep score → consistency CV
  const withScore = withBoth.filter(p => p.sleep.score != null && p.intervals.consistencyCV != null);
  const scoreCvCorr = withScore.length >= 5
    ? pearsonR(withScore.map(p => p.sleep.score), withScore.map(p => p.intervals.consistencyCV))
    : null;

  // Quartile analysis: top vs bottom HRV quartile → interval quality
  let quartileAnalysis = null;
  if (withCV.length >= 8) {
    const sorted = [...withCV].sort((a, b) => a.sleep.hrv - b.sleep.hrv);
    const q1 = Math.floor(sorted.length * 0.25);
    const q4 = Math.floor(sorted.length * 0.75);
    const bottom = sorted.slice(0, q1);
    const top = sorted.slice(q4);
    if (bottom.length >= 2 && top.length >= 2) {
      quartileAnalysis = {
        lowHRV: {
          avgHRV: Math.round(avg(bottom.map(p => p.sleep.hrv))),
          avgCV: round(avg(bottom.map(p => p.intervals.consistencyCV)) * 100, 1),
          avgDI: round(avg(bottom.filter(p => p.intervals.durabilityIndex != null).map(p => p.intervals.durabilityIndex)) * 100 || 0, 0),
          count: bottom.length,
        },
        highHRV: {
          avgHRV: Math.round(avg(top.map(p => p.sleep.hrv))),
          avgCV: round(avg(top.map(p => p.intervals.consistencyCV)) * 100, 1),
          avgDI: round(avg(top.filter(p => p.intervals.durabilityIndex != null).map(p => p.intervals.durabilityIndex)) * 100 || 0, 0),
          count: top.length,
        },
      };
    }
  }

  const confidence = withBoth.length >= 20 ? "high" : withBoth.length >= 12 ? "medium" : "low";

  return {
    type: "sleep_execution",
    correlations: {
      hrvToCV: hrvCvCorr,
      hrvToDurability: hrvDiCorr,
      sleepHoursToFade: sleepFadeCorr,
      sleepScoreToCV: scoreCvCorr,
    },
    quartileAnalysis,
    confidence,
    sampleSize: withBoth.length,
    summary: buildSleepExecSummary(hrvCvCorr, hrvDiCorr, quartileAnalysis, confidence),
  };
}

function buildSleepExecSummary(hrvCv, hrvDi, quartiles, confidence) {
  const parts = [];
  if (hrvCv?.r != null && Math.abs(hrvCv.r) > 0.2) {
    parts.push(`HRV ${hrvCv.r < 0 ? "inversely" : "positively"} correlates with interval consistency (r=${hrvCv.r})`);
  }
  if (hrvDi?.r != null && Math.abs(hrvDi.r) > 0.2) {
    parts.push(`HRV correlates with durability (r=${hrvDi.r})`);
  }
  if (quartiles) {
    const cvDiff = quartiles.highHRV.avgCV - quartiles.lowHRV.avgCV;
    if (Math.abs(cvDiff) > 0.5) {
      parts.push(`${Math.abs(cvDiff).toFixed(1)}% ${cvDiff < 0 ? "better" : "worse"} consistency on high-HRV days`);
    }
  }
  return parts.length > 0 ? parts.join("; ") + ` (${confidence} confidence)` : null;
}


// ── 4. HRV Readiness Model ──

/**
 * Model how HRV predicts workout quality across multiple dimensions.
 *
 * @param {object[]} pairs - From matchActivitiesToContext
 * @returns {object|null} HRV readiness model
 */
export function computeHRVReadinessModel(pairs) {
  const withHRV = pairs.filter(p =>
    p.sleep?.hrv != null && p.activity.ef != null
  );
  if (withHRV.length < 10) return null;

  // HRV → EF correlation and regression
  const hrvs = withHRV.map(p => p.sleep.hrv);
  const efs = withHRV.map(p => p.activity.ef);
  const hrvEfCorr = pearsonR(hrvs, efs);
  const hrvEfRegression = linearRegression(hrvs, efs);

  // HRV → HR drift
  const withDrift = withHRV.filter(p => p.activity.hrDrift != null);
  const hrvDriftCorr = withDrift.length >= 5
    ? pearsonR(withDrift.map(p => p.sleep.hrv), withDrift.map(p => p.activity.hrDrift))
    : null;

  // Find personal HRV thresholds via tertile analysis
  const sorted = [...withHRV].sort((a, b) => a.sleep.hrv - b.sleep.hrv);
  const tertileSize = Math.floor(sorted.length / 3);
  const lowTertile = sorted.slice(0, tertileSize);
  const midTertile = sorted.slice(tertileSize, tertileSize * 2);
  const highTertile = sorted.slice(tertileSize * 2);

  const thresholds = {
    red: {
      hrvRange: `<${Math.round(lowTertile[lowTertile.length - 1]?.sleep.hrv || 0)}ms`,
      avgEF: round(avg(lowTertile.map(p => p.activity.ef)), 2),
      avgDrift: round(avg(lowTertile.filter(p => p.activity.hrDrift != null).map(p => p.activity.hrDrift)) || 0, 1),
      count: lowTertile.length,
    },
    yellow: {
      hrvRange: `${Math.round(lowTertile[lowTertile.length - 1]?.sleep.hrv || 0)}-${Math.round(highTertile[0]?.sleep.hrv || 0)}ms`,
      avgEF: round(avg(midTertile.map(p => p.activity.ef)), 2),
      avgDrift: round(avg(midTertile.filter(p => p.activity.hrDrift != null).map(p => p.activity.hrDrift)) || 0, 1),
      count: midTertile.length,
    },
    green: {
      hrvRange: `>${Math.round(highTertile[0]?.sleep.hrv || 0)}ms`,
      avgEF: round(avg(highTertile.map(p => p.activity.ef)), 2),
      avgDrift: round(avg(highTertile.filter(p => p.activity.hrDrift != null).map(p => p.activity.hrDrift)) || 0, 1),
      count: highTertile.length,
    },
  };

  // EF delta between low and high HRV days
  const efDeltaPct = thresholds.red.avgEF
    ? round((thresholds.green.avgEF - thresholds.red.avgEF) / thresholds.red.avgEF * 100, 1)
    : null;

  // TSB interaction: does HRV still matter when fresh?
  let tsbInteraction = null;
  const freshHigh = withHRV.filter(p => p.trainingLoad?.tsb > 0 && p.sleep.hrv > (avg(hrvs) || 0));
  const freshLow = withHRV.filter(p => p.trainingLoad?.tsb > 0 && p.sleep.hrv <= (avg(hrvs) || 0));
  if (freshHigh.length >= 3 && freshLow.length >= 3) {
    tsbInteraction = {
      freshHighHRV_EF: round(avg(freshHigh.map(p => p.activity.ef)), 2),
      freshLowHRV_EF: round(avg(freshLow.map(p => p.activity.ef)), 2),
      counts: { high: freshHigh.length, low: freshLow.length },
    };
  }

  const confidence = withHRV.length >= 30 ? "high" : withHRV.length >= 15 ? "medium" : "low";

  return {
    type: "hrv_readiness",
    correlation: { hrvEf: hrvEfCorr, hrvDrift: hrvDriftCorr },
    regression: hrvEfRegression,
    thresholds,
    efDeltaPct,
    tsbInteraction,
    confidence,
    sampleSize: withHRV.length,
    summary: buildHRVSummary(thresholds, efDeltaPct, hrvEfCorr, confidence),
  };
}

function buildHRVSummary(thresholds, efDelta, corr, confidence) {
  const parts = [];
  if (efDelta != null) {
    parts.push(`EF is ${Math.abs(efDelta)}% ${efDelta > 0 ? "higher" : "lower"} on high-HRV days vs low`);
  }
  if (corr?.r != null && Math.abs(corr.r) > 0.15) {
    parts.push(`HRV→EF correlation r=${corr.r} (n=${corr.n})`);
  }
  parts.push(`personal thresholds: Red ${thresholds.red.hrvRange}, Green ${thresholds.green.hrvRange}`);
  return parts.join("; ") + ` (${confidence} confidence)`;
}


// ── 5. Fueling → Durability Model ──

/**
 * Model how in-ride fueling affects late-ride performance.
 *
 * @param {object[]} pairs - From matchActivitiesToContext
 * @returns {object|null} Fueling model
 */
export function computeFuelingModel(pairs) {
  // Only rides >90 min with nutrition data
  const withFueling = pairs.filter(p =>
    p.nutrition != null && p.activity.duration > 5400 && p.activity.ef != null
  );
  if (withFueling.length < 8) return null;

  // Carbs/hr → EF
  const withCarbsHr = withFueling.filter(p => p.nutrition.carbsPerHour != null);
  const carbsEfCorr = withCarbsHr.length >= 5
    ? pearsonR(withCarbsHr.map(p => p.nutrition.carbsPerHour), withCarbsHr.map(p => p.activity.ef))
    : null;

  // Carbs/hr → fade score (for interval workouts)
  const withFade = withFueling.filter(p => p.nutrition.carbsPerHour != null && p.intervals.fadeScore != null);
  const carbsFadeCorr = withFade.length >= 5
    ? pearsonR(withFade.map(p => p.nutrition.carbsPerHour), withFade.map(p => p.intervals.fadeScore))
    : null;

  // Carbs/hr → HR drift
  const withDrift = withCarbsHr.filter(p => p.activity.hrDrift != null);
  const carbsDriftCorr = withDrift.length >= 5
    ? pearsonR(withDrift.map(p => p.nutrition.carbsPerHour), withDrift.map(p => p.activity.hrDrift))
    : null;

  // Bin analysis: under-fueled vs adequate vs well-fueled
  const bins = [
    { label: "Under-fueled (<40g/hr)", filter: p => p.nutrition.carbsPerHour < 40 },
    { label: "Adequate (40-60g/hr)", filter: p => p.nutrition.carbsPerHour >= 40 && p.nutrition.carbsPerHour <= 60 },
    { label: "Well-fueled (>60g/hr)", filter: p => p.nutrition.carbsPerHour > 60 },
  ];

  const binResults = {};
  for (const bin of bins) {
    const subset = withCarbsHr.filter(bin.filter);
    if (subset.length < 2) { binResults[bin.label] = null; continue; }
    binResults[bin.label] = {
      avgEF: round(avg(subset.map(p => p.activity.ef)), 2),
      avgDrift: round(avg(subset.filter(p => p.activity.hrDrift != null).map(p => p.activity.hrDrift)) || 0, 1),
      avgFade: round(avg(subset.filter(p => p.intervals.fadeScore != null).map(p => p.intervals.fadeScore)) || 0, 1),
      avgCarbsHr: round(avg(subset.map(p => p.nutrition.carbsPerHour)), 0),
      count: subset.length,
    };
  }

  // Duration interaction: does fueling matter more on longer rides?
  let durationInteraction = null;
  const longRides = withCarbsHr.filter(p => p.activity.duration > 10800); // >3hr
  if (longRides.length >= 5) {
    const longCorr = pearsonR(
      longRides.map(p => p.nutrition.carbsPerHour),
      longRides.map(p => p.activity.ef)
    );
    durationInteraction = {
      longRideCorrelation: longCorr,
      sampleSize: longRides.length,
    };
  }

  const confidence = withCarbsHr.length >= 20 ? "high" : withCarbsHr.length >= 10 ? "medium" : "low";

  return {
    type: "fueling",
    correlations: {
      carbsToEF: carbsEfCorr,
      carbsToFade: carbsFadeCorr,
      carbsToDrift: carbsDriftCorr,
    },
    bins: binResults,
    durationInteraction,
    confidence,
    sampleSize: withFueling.length,
    summary: buildFuelingSummary(carbsEfCorr, binResults, confidence),
  };
}

function buildFuelingSummary(carbsEf, bins, confidence) {
  const parts = [];
  if (carbsEf?.r != null && Math.abs(carbsEf.r) > 0.15) {
    parts.push(`carbs/hr ${carbsEf.r > 0 ? "positively" : "inversely"} correlates with EF (r=${carbsEf.r})`);
  }
  const under = bins["Under-fueled (<40g/hr)"];
  const well = bins["Well-fueled (>60g/hr)"];
  if (under && well) {
    const delta = round((well.avgEF - under.avgEF) / under.avgEF * 100, 1);
    parts.push(`EF is ${Math.abs(delta)}% ${delta > 0 ? "higher" : "lower"} when well-fueled vs under-fueled`);
  }
  return parts.length > 0 ? parts.join("; ") + ` (${confidence} confidence)` : null;
}


// ── 6. Durability Model (kJ/kg → power quality decay) ──

/**
 * Model how cumulative work (kJ/kg) relates to late-ride performance.
 * Identifies the athlete's personal durability threshold.
 *
 * @param {object[]} pairs - From matchActivitiesToContext
 * @returns {object|null} Durability model
 */
export function computeDurabilityModel(pairs) {
  const withWork = pairs.filter(p =>
    p.activity.kjPerKg != null && p.activity.ef != null && p.activity.duration > 3600
  );
  if (withWork.length < 10) return null;

  // kJ/kg → EF correlation
  const kjPerKgs = withWork.map(p => p.activity.kjPerKg);
  const efs = withWork.map(p => p.activity.ef);
  const kjEfCorr = pearsonR(kjPerKgs, efs);
  const kjEfRegression = linearRegression(kjPerKgs, efs);

  // kJ/kg → HR drift
  const withDrift = withWork.filter(p => p.activity.hrDrift != null);
  const kjDriftCorr = withDrift.length >= 5
    ? pearsonR(withDrift.map(p => p.activity.kjPerKg), withDrift.map(p => p.activity.hrDrift))
    : null;

  // kJ/kg → interval durability index
  const withDI = withWork.filter(p => p.intervals.durabilityIndex != null);
  const kjDiCorr = withDI.length >= 5
    ? pearsonR(withDI.map(p => p.activity.kjPerKg), withDI.map(p => p.intervals.durabilityIndex))
    : null;

  // Bin analysis by kJ/kg ranges
  const bins = [
    { label: "Light (<10 kJ/kg)", filter: p => p.activity.kjPerKg < 10 },
    { label: "Moderate (10-20 kJ/kg)", filter: p => p.activity.kjPerKg >= 10 && p.activity.kjPerKg < 20 },
    { label: "Hard (20-30 kJ/kg)", filter: p => p.activity.kjPerKg >= 20 && p.activity.kjPerKg < 30 },
    { label: "Very Hard (>30 kJ/kg)", filter: p => p.activity.kjPerKg >= 30 },
  ];

  const binResults = {};
  for (const bin of bins) {
    const subset = withWork.filter(bin.filter);
    if (subset.length < 2) { binResults[bin.label] = null; continue; }
    binResults[bin.label] = {
      avgEF: round(avg(subset.map(p => p.activity.ef)), 2),
      avgDrift: round(avg(subset.filter(p => p.activity.hrDrift != null).map(p => p.activity.hrDrift)) || 0, 1),
      avgDurability: round(avg(subset.filter(p => p.intervals.durabilityIndex != null).map(p => p.intervals.durabilityIndex)) * 100 || 0, 0),
      count: subset.length,
    };
  }

  // Find durability threshold (kJ/kg where EF starts to decline)
  let threshold = null;
  if (withWork.length >= 15) {
    const sorted = [...withWork].sort((a, b) => a.activity.kjPerKg - b.activity.kjPerKg);
    const windowSize = Math.max(5, Math.floor(sorted.length / 4));
    let maxEf = -Infinity;
    let maxIdx = 0;
    for (let i = 0; i <= sorted.length - windowSize; i++) {
      const windowEf = avg(sorted.slice(i, i + windowSize).map(p => p.activity.ef));
      if (windowEf > maxEf) {
        maxEf = windowEf;
        maxIdx = i + Math.floor(windowSize / 2);
      }
    }
    threshold = round(sorted[maxIdx].activity.kjPerKg);
  }

  const confidence = withWork.length >= 30 ? "high" : withWork.length >= 15 ? "medium" : "low";

  return {
    type: "durability",
    correlation: { kjEf: kjEfCorr, kjDrift: kjDriftCorr, kjDurabilityIndex: kjDiCorr },
    regression: kjEfRegression,
    bins: binResults,
    threshold,
    confidence,
    sampleSize: withWork.length,
    summary: buildDurabilitySummary(kjEfCorr, threshold, confidence),
  };
}

function buildDurabilitySummary(corr, threshold, confidence) {
  const parts = [];
  if (corr?.r != null && Math.abs(corr.r) > 0.15) {
    parts.push(`kJ/kg ${corr.r < 0 ? "inversely" : "positively"} correlates with EF (r=${corr.r})`);
  }
  if (threshold != null) {
    parts.push(`personal durability threshold around ${threshold} kJ/kg`);
  }
  return parts.length > 0 ? parts.join("; ") + ` (${confidence} confidence)` : null;
}


// ── 7. Orchestrator: compute all models ──

/**
 * Run all performance models on matched data.
 *
 * @param {object[]} pairs - From matchActivitiesToContext
 * @returns {object} All model results (null for insufficient data)
 */
export function computeAllModels(pairs) {
  return {
    heat: computeHeatModel(pairs),
    sleepExecution: computeSleepExecutionModel(pairs),
    hrvReadiness: computeHRVReadinessModel(pairs),
    fueling: computeFuelingModel(pairs),
    durability: computeDurabilityModel(pairs),
    metadata: {
      totalActivities: pairs.length,
      activitiesWithWeather: pairs.filter(p => p.weather.temp != null).length,
      activitiesWithSleep: pairs.filter(p => p.sleep != null).length,
      activitiesWithIntervals: pairs.filter(p => p.intervals.count >= 3).length,
      activitiesWithNutrition: pairs.filter(p => p.nutrition != null).length,
      computedAt: new Date().toISOString(),
    },
  };
}


// ── 8. Format models for AI context ──

/**
 * Build a concise text summary of all models for injection into AI system prompt.
 *
 * @param {object} models - Output from computeAllModels()
 * @returns {string} Formatted text summary
 */
export function formatModelsForAI(models) {
  if (!models) return "";

  const sections = [];

  if (models.heat?.summary) {
    sections.push(`[HEAT MODEL] ${models.heat.summary}`);
  }
  if (models.sleepExecution?.summary) {
    sections.push(`[SLEEP→EXECUTION MODEL] ${models.sleepExecution.summary}`);
  }
  if (models.hrvReadiness?.summary) {
    sections.push(`[HRV READINESS MODEL] ${models.hrvReadiness.summary}`);
  }
  if (models.fueling?.summary) {
    sections.push(`[FUELING MODEL] ${models.fueling.summary}`);
  }
  if (models.durability?.summary) {
    sections.push(`[DURABILITY MODEL] ${models.durability.summary}`);
  }

  if (sections.length === 0) return "";

  return `\n--- PERSONAL PERFORMANCE MODELS (${models.metadata?.totalActivities || 0} activities) ---\n${sections.join("\n")}`;
}

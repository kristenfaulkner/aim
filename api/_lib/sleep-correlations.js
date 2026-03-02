/**
 * Sleep-Performance Correlation Engine
 * Pure computation functions — no DB calls, fully testable.
 */

// ── Utility: Pearson correlation coefficient ──

export function pearsonR(xs, ys) {
  const n = xs.length;
  if (n < 5 || n !== ys.length) return null;
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);
  const sumY2 = ys.reduce((s, v) => s + v * v, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return null;
  return { r: Math.round((num / den) * 1000) / 1000, n };
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// Convert "HH:MM" time string to decimal hours (22:30 → 22.5, handle midnight wrap)
function timeToDecimal(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  let decimal = h + m / 60;
  // If before 6 AM, treat as after midnight (24+)
  if (decimal < 6) decimal += 24;
  return decimal;
}

// ── 1. Match sleep data to activities by date ──

export function matchSleepToActivities(dailyMetrics, activities) {
  // Build a date-keyed map of daily_metrics
  const metricsByDate = {};
  for (const dm of dailyMetrics) {
    if (dm.date) metricsByDate[dm.date] = dm;
  }

  // Sort daily_metrics by date for rolling window computation
  const sortedDates = Object.keys(metricsByDate).sort();

  const matched = [];

  for (const act of activities) {
    if (!act.started_at) continue;
    // Need at least EF or NP to measure performance
    if (act.efficiency_factor == null && act.normalized_power_watts == null) continue;

    const actDate = act.started_at.split("T")[0];
    const prevNight = metricsByDate[actDate]; // daily_metrics date = the night before
    if (!prevNight || prevNight.total_sleep_seconds == null) continue;

    // Compute rolling averages
    const dateIdx = sortedDates.indexOf(actDate);
    const rolling3 = computeRollingAvg(sortedDates, metricsByDate, dateIdx, 3);
    const rolling7 = computeRollingAvg(sortedDates, metricsByDate, dateIdx, 7);

    // Extract Eight Sleep extended metrics
    const extended = prevNight.source_data?.eightsleep_extended || {};

    matched.push({
      activity: {
        date: actDate,
        name: act.name || act.activity_type,
        type: act.activity_type,
        ef: act.efficiency_factor,
        np: act.normalized_power_watts,
        hrDrift: act.hr_drift_pct,
        vi: act.variability_index,
        tss: act.tss,
        if: act.intensity_factor,
        avgHr: act.avg_hr_bpm,
        duration: act.duration_seconds,
        temp: act.temperature_celsius,
        elevation: act.elevation_gain_meters,
        startHour: act.started_at ? new Date(act.started_at).getHours() : null,
      },
      sleep: {
        totalHours: prevNight.total_sleep_seconds / 3600,
        score: prevNight.sleep_score,
        deepPct: prevNight.deep_sleep_seconds && prevNight.total_sleep_seconds
          ? (prevNight.deep_sleep_seconds / prevNight.total_sleep_seconds) * 100 : null,
        remPct: prevNight.rem_sleep_seconds && prevNight.total_sleep_seconds
          ? (prevNight.rem_sleep_seconds / prevNight.total_sleep_seconds) * 100 : null,
        deepMin: prevNight.deep_sleep_seconds ? prevNight.deep_sleep_seconds / 60 : null,
        remMin: prevNight.rem_sleep_seconds ? prevNight.rem_sleep_seconds / 60 : null,
        efficiency: prevNight.sleep_efficiency_pct,
        hrv: prevNight.hrv_overnight_avg_ms || prevNight.hrv_ms,
        rhr: prevNight.resting_hr_bpm,
        latencyMin: prevNight.sleep_latency_seconds ? prevNight.sleep_latency_seconds / 60 : null,
        onsetDecimal: timeToDecimal(prevNight.sleep_onset_time),
        bedTemp: prevNight.bed_temperature_celsius,
        tossAndTurns: extended.toss_and_turns ?? null,
      },
      // Training load context (confounders)
      tsb: prevNight.tsb,
      ctl: prevNight.ctl,
      atl: prevNight.atl,
      rolling3,
      rolling7,
    });
  }

  return matched;
}

function computeRollingAvg(sortedDates, metricsByDate, endIdx, window) {
  const result = { totalHours: null, score: null, deepPct: null, hrv: null };
  if (endIdx < 0) return result;

  const startIdx = Math.max(0, endIdx - window + 1);
  const hours = [], scores = [], deeps = [], hrvs = [];

  for (let i = startIdx; i <= endIdx; i++) {
    const dm = metricsByDate[sortedDates[i]];
    if (!dm) continue;
    if (dm.total_sleep_seconds != null) hours.push(dm.total_sleep_seconds / 3600);
    if (dm.sleep_score != null) scores.push(dm.sleep_score);
    if (dm.deep_sleep_seconds != null && dm.total_sleep_seconds)
      deeps.push((dm.deep_sleep_seconds / dm.total_sleep_seconds) * 100);
    if (dm.hrv_overnight_avg_ms != null) hrvs.push(dm.hrv_overnight_avg_ms);
    else if (dm.hrv_ms != null) hrvs.push(dm.hrv_ms);
  }

  if (hours.length) result.totalHours = avg(hours);
  if (scores.length) result.score = avg(scores);
  if (deeps.length) result.deepPct = avg(deeps);
  if (hrvs.length) result.hrv = avg(hrvs);
  return result;
}

// ── 2. Correlation matrix ──

const SLEEP_KEYS = [
  { key: "totalHours", label: "Total Sleep (hrs)" },
  { key: "score", label: "Sleep Score" },
  { key: "deepPct", label: "Deep Sleep %" },
  { key: "remPct", label: "REM Sleep %" },
  { key: "efficiency", label: "Sleep Efficiency %" },
  { key: "hrv", label: "Overnight HRV" },
  { key: "rhr", label: "Resting HR" },
  { key: "latencyMin", label: "Sleep Latency (min)" },
  { key: "onsetDecimal", label: "Bedtime" },
  { key: "bedTemp", label: "Bed Temperature" },
  { key: "tossAndTurns", label: "Toss & Turns" },
];

const PERF_KEYS = [
  { key: "ef", label: "Efficiency Factor" },
  { key: "hrDrift", label: "HR Drift %" },
  { key: "np", label: "Normalized Power" },
  { key: "vi", label: "Variability Index" },
];

export function computeCorrelations(matchedPairs) {
  const matrix = {};

  for (const sk of SLEEP_KEYS) {
    matrix[sk.key] = { label: sk.label };
    for (const pk of PERF_KEYS) {
      const pairs = matchedPairs.filter(
        m => m.sleep[sk.key] != null && m.activity[pk.key] != null
      );
      if (pairs.length < 5) {
        matrix[sk.key][pk.key] = null;
        continue;
      }
      const xs = pairs.map(m => m.sleep[sk.key]);
      const ys = pairs.map(m => m.activity[pk.key]);
      matrix[sk.key][pk.key] = pearsonR(xs, ys);
    }
  }

  // Also compute rolling 7-night avg correlations
  matrix._rolling7 = {};
  for (const pk of PERF_KEYS) {
    const pairs = matchedPairs.filter(
      m => m.rolling7?.totalHours != null && m.activity[pk.key] != null
    );
    matrix._rolling7[pk.key] = pairs.length >= 5
      ? pearsonR(pairs.map(m => m.rolling7.totalHours), pairs.map(m => m.activity[pk.key]))
      : null;
  }

  return matrix;
}

// ── 3. Quartile analysis ──

export function computeQuartileAnalysis(matchedPairs) {
  const result = {};

  const analyze = (label, extractor, perfKey) => {
    const valid = matchedPairs.filter(m => extractor(m) != null && m.activity[perfKey] != null);
    if (valid.length < 8) return null; // need at least 2 per quartile

    valid.sort((a, b) => extractor(a) - extractor(b));
    const q1End = Math.floor(valid.length * 0.25);
    const q4Start = Math.floor(valid.length * 0.75);
    const bottom = valid.slice(0, q1End);
    const top = valid.slice(q4Start);

    if (!bottom.length || !top.length) return null;

    const bottomAvg = avg(bottom.map(m => m.activity[perfKey]));
    const topAvg = avg(top.map(m => m.activity[perfKey]));
    const bottomSleepAvg = avg(bottom.map(extractor));
    const topSleepAvg = avg(top.map(extractor));

    return {
      bottomQuartile: {
        sleepAvg: Math.round(bottomSleepAvg * 10) / 10,
        perfAvg: Math.round(bottomAvg * 100) / 100,
        count: bottom.length,
      },
      topQuartile: {
        sleepAvg: Math.round(topSleepAvg * 10) / 10,
        perfAvg: Math.round(topAvg * 100) / 100,
        count: top.length,
      },
      deltaPct: bottomAvg !== 0
        ? Math.round(((topAvg - bottomAvg) / Math.abs(bottomAvg)) * 1000) / 10
        : null,
    };
  };

  // Sleep hours → EF
  result.totalHours_ef = analyze("Sleep Hours → EF", m => m.sleep.totalHours, "ef");
  result.totalHours_hrDrift = analyze("Sleep Hours → HR Drift", m => m.sleep.totalHours, "hrDrift");
  result.score_ef = analyze("Sleep Score → EF", m => m.sleep.score, "ef");
  result.deepPct_ef = analyze("Deep Sleep % → EF", m => m.sleep.deepPct, "ef");
  result.hrv_ef = analyze("HRV → EF", m => m.sleep.hrv, "ef");
  result.hrv_hrDrift = analyze("HRV → HR Drift", m => m.sleep.hrv, "hrDrift");

  // Rolling 7-night average → EF
  result.rolling7Hours_ef = analyze("7-Night Avg Hours → EF", m => m.rolling7?.totalHours, "ef");

  return result;
}

// ── 4. Confounder-adjusted correlations ──

export function computeAdjustedCorrelations(matchedPairs) {
  const results = {};

  // Stratify by TSB
  const tsbBins = [
    { label: "Fatigued (TSB < -20)", filter: m => m.tsb != null && m.tsb < -20 },
    { label: "Moderate (-20 to 0)", filter: m => m.tsb != null && m.tsb >= -20 && m.tsb <= 0 },
    { label: "Fresh (TSB > 0)", filter: m => m.tsb != null && m.tsb > 0 },
  ];

  results.byTSB = {};
  for (const bin of tsbBins) {
    const subset = matchedPairs.filter(bin.filter);
    const pairs = subset.filter(m => m.sleep.totalHours != null && m.activity.ef != null);
    results.byTSB[bin.label] = pairs.length >= 5
      ? { ...pearsonR(pairs.map(m => m.sleep.totalHours), pairs.map(m => m.activity.ef)), n: pairs.length }
      : { r: null, n: pairs.length };
  }

  // Stratify by temperature
  const tempBins = [
    { label: "Cool (< 15°C)", filter: m => m.activity.temp != null && m.activity.temp < 15 },
    { label: "Moderate (15-25°C)", filter: m => m.activity.temp != null && m.activity.temp >= 15 && m.activity.temp <= 25 },
    { label: "Hot (> 25°C)", filter: m => m.activity.temp != null && m.activity.temp > 25 },
  ];

  results.byTemperature = {};
  for (const bin of tempBins) {
    const subset = matchedPairs.filter(bin.filter);
    const pairs = subset.filter(m => m.sleep.totalHours != null && m.activity.ef != null);
    results.byTemperature[bin.label] = pairs.length >= 5
      ? { ...pearsonR(pairs.map(m => m.sleep.totalHours), pairs.map(m => m.activity.ef)), n: pairs.length }
      : { r: null, n: pairs.length };
  }

  // Stratify by duration
  const durBins = [
    { label: "Short (< 90 min)", filter: m => m.activity.duration != null && m.activity.duration < 5400 },
    { label: "Medium (90-180 min)", filter: m => m.activity.duration != null && m.activity.duration >= 5400 && m.activity.duration <= 10800 },
    { label: "Long (> 180 min)", filter: m => m.activity.duration != null && m.activity.duration > 10800 },
  ];

  results.byDuration = {};
  for (const bin of durBins) {
    const subset = matchedPairs.filter(bin.filter);
    const pairs = subset.filter(m => m.sleep.totalHours != null && m.activity.ef != null);
    results.byDuration[bin.label] = pairs.length >= 5
      ? { ...pearsonR(pairs.map(m => m.sleep.totalHours), pairs.map(m => m.activity.ef)), n: pairs.length }
      : { r: null, n: pairs.length };
  }

  return results;
}

// ── 5. Sleep pattern detection ──

export function detectSleepPatterns(dailyMetrics) {
  const withSleep = dailyMetrics.filter(dm => dm.total_sleep_seconds != null);
  if (withSleep.length < 7) return null;

  // Bedtime consistency
  const onsets = withSleep
    .map(dm => timeToDecimal(dm.sleep_onset_time))
    .filter(v => v != null);
  const bedtimeConsistency = onsets.length >= 7
    ? { avgOnset: Math.round(avg(onsets) * 10) / 10, stdDevHrs: Math.round(stdDev(onsets) * 10) / 10 }
    : null;

  // Weekday vs weekend
  const weekday = [], weekend = [];
  for (const dm of withSleep) {
    const day = new Date(dm.date).getDay();
    const hours = dm.total_sleep_seconds / 3600;
    if (day === 0 || day === 6) weekend.push(hours);
    else weekday.push(hours);
  }
  const weekdayVsWeekend = weekday.length >= 3 && weekend.length >= 2
    ? {
        weekdayAvg: Math.round(avg(weekday) * 10) / 10,
        weekendAvg: Math.round(avg(weekend) * 10) / 10,
        deltaMin: Math.round((avg(weekend) - avg(weekday)) * 60),
      }
    : null;

  // Sleep debt trajectory (last 7 nights)
  const recent7 = withSleep.slice(-7);
  const debtPerNight = recent7.map(dm => Math.max(0, 7.5 - dm.total_sleep_seconds / 3600));
  const totalDebt7 = debtPerNight.reduce((s, v) => s + v, 0);

  // Bed temperature → deep sleep (if Eight Sleep data exists)
  const tempDeep = withSleep
    .filter(dm => dm.bed_temperature_celsius != null && dm.deep_sleep_seconds != null)
    .map(dm => ({
      temp: dm.bed_temperature_celsius,
      deepMin: dm.deep_sleep_seconds / 60,
    }));

  let temperatureImpact = null;
  if (tempDeep.length >= 10) {
    // Group by temperature ranges
    const cold = tempDeep.filter(t => t.temp < -2);
    const mid = tempDeep.filter(t => t.temp >= -2 && t.temp <= 0);
    const warm = tempDeep.filter(t => t.temp > 0);
    temperatureImpact = {
      cold: cold.length >= 3 ? { avgTemp: Math.round(avg(cold.map(t => t.temp)) * 10) / 10, avgDeepMin: Math.round(avg(cold.map(t => t.deepMin))) } : null,
      mid: mid.length >= 3 ? { avgTemp: Math.round(avg(mid.map(t => t.temp)) * 10) / 10, avgDeepMin: Math.round(avg(mid.map(t => t.deepMin))) } : null,
      warm: warm.length >= 3 ? { avgTemp: Math.round(avg(warm.map(t => t.temp)) * 10) / 10, avgDeepMin: Math.round(avg(warm.map(t => t.deepMin))) } : null,
    };
  }

  // HRV recovery: avg days for HRV to return to baseline after high-TSS days
  const hrvRecovery = computeHrvRecovery(dailyMetrics);

  return {
    bedtimeConsistency,
    weekdayVsWeekend,
    sleepDebt7Night: Math.round(totalDebt7 * 10) / 10,
    temperatureImpact,
    hrvRecovery,
    totalNights: withSleep.length,
  };
}

function computeHrvRecovery(dailyMetrics) {
  // Find days with TSS > 100, then track how many days until HRV returns to 7-day pre-event avg
  const sorted = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
  const recoveryDays = [];

  for (let i = 7; i < sorted.length - 5; i++) {
    const dm = sorted[i];
    if (dm.daily_tss == null || dm.daily_tss < 100) continue;

    // Compute pre-event 7-day HRV avg
    const preHrvs = [];
    for (let j = i - 7; j < i; j++) {
      const hrv = sorted[j]?.hrv_overnight_avg_ms || sorted[j]?.hrv_ms;
      if (hrv != null) preHrvs.push(hrv);
    }
    if (preHrvs.length < 3) continue;
    const baseline = avg(preHrvs);

    // Count days until HRV returns to baseline
    for (let j = i + 1; j < Math.min(i + 6, sorted.length); j++) {
      const hrv = sorted[j]?.hrv_overnight_avg_ms || sorted[j]?.hrv_ms;
      if (hrv != null && hrv >= baseline * 0.95) {
        recoveryDays.push(j - i);
        break;
      }
    }
  }

  return recoveryDays.length >= 3
    ? { avgDays: Math.round(avg(recoveryDays) * 10) / 10, samples: recoveryDays.length }
    : null;
}

// ── 6. Best/worst ride comparison ──

export function findBestAndWorstRides(matchedPairs, n = 5) {
  const withEF = matchedPairs.filter(m => m.activity.ef != null);
  if (withEF.length < 6) return null;

  const sorted = [...withEF].sort((a, b) => b.activity.ef - a.activity.ef);
  const best = sorted.slice(0, n);
  const worst = sorted.slice(-n);

  const summarize = (rides) => ({
    rides: rides.map(m => ({
      date: m.activity.date,
      name: m.activity.name,
      ef: Math.round(m.activity.ef * 100) / 100,
      np: m.activity.np,
      hrDrift: m.activity.hrDrift != null ? Math.round(m.activity.hrDrift * 10) / 10 : null,
      sleepHours: Math.round(m.sleep.totalHours * 10) / 10,
      sleepScore: m.sleep.score,
      deepMin: m.sleep.deepMin != null ? Math.round(m.sleep.deepMin) : null,
      hrv: m.sleep.hrv != null ? Math.round(m.sleep.hrv) : null,
      tsb: m.tsb != null ? Math.round(m.tsb) : null,
    })),
    avgSleep: {
      hours: Math.round(avg(rides.map(m => m.sleep.totalHours)) * 10) / 10,
      score: Math.round(avg(rides.filter(m => m.sleep.score != null).map(m => m.sleep.score)) || 0),
      deepMin: Math.round(avg(rides.filter(m => m.sleep.deepMin != null).map(m => m.sleep.deepMin)) || 0),
      hrv: Math.round(avg(rides.filter(m => m.sleep.hrv != null).map(m => m.sleep.hrv)) || 0),
    },
  });

  return { best: summarize(best), worst: summarize(worst) };
}

// ── 7. Dose-response curve ──

export function computeDoseResponse(matchedPairs) {
  const withEF = matchedPairs.filter(m => m.sleep.totalHours != null && m.activity.ef != null);
  if (withEF.length < 10) return null;

  // Bin into 30-min sleep buckets
  const bins = {};
  for (const m of withEF) {
    const bucket = Math.round(m.sleep.totalHours * 2) / 2; // round to nearest 0.5h
    if (!bins[bucket]) bins[bucket] = [];
    bins[bucket].push(m.activity.ef);
  }

  const points = Object.entries(bins)
    .filter(([, vals]) => vals.length >= 2)
    .map(([hours, vals]) => ({ hours: Number(hours), avgEF: Math.round(avg(vals) * 100) / 100, count: vals.length }))
    .sort((a, b) => a.hours - b.hours);

  if (points.length < 3) return null;

  // Linear regression for slope (EF per hour of sleep)
  const xs = points.map(p => p.hours);
  const ys = points.map(p => p.avgEF);
  const corr = pearsonR(xs, ys);
  const slope = corr
    ? corr.r * (stdDev(ys) / (stdDev(xs) || 1))
    : null;

  // Find diminishing returns (where adding sleep stops helping)
  let optimalHours = null;
  if (points.length >= 4) {
    for (let i = points.length - 2; i >= 1; i--) {
      if (points[i + 1].avgEF <= points[i].avgEF) {
        optimalHours = points[i].hours;
        break;
      }
    }
  }

  // Also compute NP dose-response
  const withNP = matchedPairs.filter(m => m.sleep.totalHours != null && m.activity.np != null);
  const npBins = {};
  for (const m of withNP) {
    const bucket = Math.round(m.sleep.totalHours * 2) / 2;
    if (!npBins[bucket]) npBins[bucket] = [];
    npBins[bucket].push(m.activity.np);
  }
  const npPoints = Object.entries(npBins)
    .filter(([, vals]) => vals.length >= 2)
    .map(([hours, vals]) => ({ hours: Number(hours), avgNP: Math.round(avg(vals)), count: vals.length }))
    .sort((a, b) => a.hours - b.hours);

  return {
    efPerHourSleep: slope != null ? Math.round(slope * 1000) / 1000 : null,
    optimalHours,
    efCurve: points,
    npCurve: npPoints.length >= 3 ? npPoints : null,
    correlation: corr,
  };
}

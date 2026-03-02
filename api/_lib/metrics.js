/**
 * Cycling performance metric computation from stream data.
 * Based on TrainingPeaks / Coggan power analysis methodology.
 */

/**
 * Compute Normalized Power (NP) from power stream.
 * Algorithm: 30s rolling average → raise each to 4th power → average → 4th root.
 */
export function normalizedPower(watts, sampleRate = 1) {
  if (!watts || watts.length < 30) return null;

  const windowSize = Math.round(30 / sampleRate);
  const rollingAvg = [];

  for (let i = windowSize - 1; i < watts.length; i++) {
    let sum = 0;
    for (let j = i - windowSize + 1; j <= i; j++) {
      sum += watts[j];
    }
    rollingAvg.push(sum / windowSize);
  }

  const fourthPowerAvg = rollingAvg.reduce((sum, v) => sum + Math.pow(v, 4), 0) / rollingAvg.length;
  return Math.round(Math.pow(fourthPowerAvg, 0.25));
}

/**
 * Compute Intensity Factor (IF) = NP / FTP
 */
export function intensityFactor(np, ftp) {
  if (!np || !ftp) return null;
  return Math.round((np / ftp) * 1000) / 1000;
}

/**
 * Compute Training Stress Score (TSS) = (duration_s × NP × IF) / (FTP × 3600) × 100
 */
export function trainingStressScore(durationSeconds, np, ifactor, ftp) {
  if (!durationSeconds || !np || !ifactor || !ftp) return null;
  return Math.round((durationSeconds * np * ifactor) / (ftp * 3600) * 100);
}

/**
 * Compute Variability Index (VI) = NP / average power
 */
export function variabilityIndex(np, avgPower) {
  if (!np || !avgPower) return null;
  return Math.round((np / avgPower) * 1000) / 1000;
}

/**
 * Compute Efficiency Factor (EF) = NP / avg HR
 */
export function efficiencyFactor(np, avgHr) {
  if (!np || !avgHr) return null;
  return Math.round((np / avgHr) * 100) / 100;
}

/**
 * Compute HR drift (cardiac decoupling).
 * Compare EF of first half vs second half. Positive = HR drifting up relative to power.
 */
export function hrDrift(watts, heartrate) {
  if (!watts || !heartrate || watts.length < 60) return null;

  const mid = Math.floor(watts.length / 2);

  const avgPower1 = watts.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const avgHr1 = heartrate.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const avgPower2 = watts.slice(mid).reduce((s, v) => s + v, 0) / (watts.length - mid);
  const avgHr2 = heartrate.slice(mid).reduce((s, v) => s + v, 0) / (heartrate.length - mid);

  if (!avgHr1 || !avgHr2 || !avgPower1 || !avgPower2) return null;

  const ef1 = avgPower1 / avgHr1;
  const ef2 = avgPower2 / avgHr2;

  // Positive means decoupling (HR rising relative to power)
  return Math.round(((ef1 - ef2) / ef1) * 10000) / 100;
}

/**
 * Compute power zone distribution (Coggan 7-zone model).
 * Returns object { z1: seconds, z2: seconds, ... z7: seconds }
 */
export function zoneDistribution(watts, ftp, sampleRate = 1) {
  if (!watts || !ftp) return null;

  const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
  const boundaries = [0.55, 0.75, 0.90, 1.05, 1.20, 1.50]; // % of FTP

  for (const w of watts) {
    const pctFtp = w / ftp;
    if (pctFtp < boundaries[0]) zones.z1 += sampleRate;
    else if (pctFtp < boundaries[1]) zones.z2 += sampleRate;
    else if (pctFtp < boundaries[2]) zones.z3 += sampleRate;
    else if (pctFtp < boundaries[3]) zones.z4 += sampleRate;
    else if (pctFtp < boundaries[4]) zones.z5 += sampleRate;
    else if (pctFtp < boundaries[5]) zones.z6 += sampleRate;
    else zones.z7 += sampleRate;
  }

  // Round to whole seconds
  Object.keys(zones).forEach(k => { zones[k] = Math.round(zones[k]); });
  return zones;
}

/**
 * Compute power curve — best average power for standard durations.
 * Returns { "5s": watts, "30s": watts, "1m": watts, "5m": watts, "20m": watts, "60m": watts }
 */
export function powerCurve(watts, sampleRate = 1) {
  if (!watts || watts.length < 5) return null;

  const durations = {
    "5s": Math.round(5 / sampleRate),
    "30s": Math.round(30 / sampleRate),
    "1m": Math.round(60 / sampleRate),
    "5m": Math.round(300 / sampleRate),
    "20m": Math.round(1200 / sampleRate),
    "60m": Math.round(3600 / sampleRate),
  };

  const curve = {};

  for (const [label, window] of Object.entries(durations)) {
    if (window > watts.length) {
      curve[label] = null;
      continue;
    }

    let maxAvg = 0;
    let runningSum = 0;

    // Initialize first window
    for (let i = 0; i < window; i++) {
      runningSum += watts[i];
    }
    maxAvg = runningSum / window;

    // Slide window
    for (let i = window; i < watts.length; i++) {
      runningSum += watts[i] - watts[i - window];
      const avg = runningSum / window;
      if (avg > maxAvg) maxAvg = avg;
    }

    curve[label] = Math.round(maxAvg);
  }

  return curve;
}

/**
 * Compute work in kilojoules from power stream.
 * Work (kJ) = sum of watts × sample_rate / 1000
 */
export function workKj(watts, sampleRate = 1) {
  if (!watts) return null;
  return Math.round(watts.reduce((sum, w) => sum + w * sampleRate, 0) / 1000);
}

/**
 * Compute all activity metrics from stream data.
 */
export function computeActivityMetrics(streams, durationSeconds, ftp) {
  const watts = streams.watts?.data;
  const heartrate = streams.heartrate?.data;
  const cadence = streams.cadence?.data;
  const time = streams.time?.data;

  // Determine sample rate from time stream
  let sampleRate = 1;
  if (time && time.length > 1) {
    sampleRate = (time[time.length - 1] - time[0]) / (time.length - 1);
  }

  const avgPower = watts ? Math.round(watts.reduce((s, v) => s + v, 0) / watts.length) : null;
  const maxPower = watts ? Math.max(...watts) : null;
  const avgHr = heartrate ? Math.round(heartrate.reduce((s, v) => s + v, 0) / heartrate.length) : null;
  const maxHr = heartrate ? Math.max(...heartrate) : null;
  const avgCadence = cadence ? Math.round(cadence.filter(c => c > 0).reduce((s, v) => s + v, 0) / cadence.filter(c => c > 0).length) : null;

  const np = normalizedPower(watts, sampleRate);
  const ifVal = intensityFactor(np, ftp);
  const tss = trainingStressScore(durationSeconds, np, ifVal, ftp);
  const vi = variabilityIndex(np, avgPower);
  const ef = efficiencyFactor(np, avgHr);
  const drift = hrDrift(watts, heartrate);
  const zones = zoneDistribution(watts, ftp, sampleRate);
  const curve = powerCurve(watts, sampleRate);
  const work = workKj(watts, sampleRate);

  return {
    avg_power_watts: avgPower,
    max_power_watts: maxPower,
    normalized_power_watts: np,
    avg_hr_bpm: avgHr,
    max_hr_bpm: maxHr,
    avg_cadence_rpm: avgCadence,
    tss,
    intensity_factor: ifVal,
    variability_index: vi,
    efficiency_factor: ef,
    hr_drift_pct: drift,
    decoupling_pct: drift, // Same as HR drift for cycling
    zone_distribution: zones,
    power_curve: curve,
    work_kj: work,
  };
}

/**
 * Compute CTL, ATL, TSB from a time series of daily TSS values.
 * CTL = exponentially weighted moving average, 42-day time constant (fitness)
 * ATL = exponentially weighted moving average, 7-day time constant (fatigue)
 * TSB = CTL - ATL (form)
 */
export function computeTrainingLoad(dailyTssArray) {
  // dailyTssArray: [{ date, tss }] sorted by date ascending
  const CTL_TC = 42;
  const ATL_TC = 7;

  let ctl = 0;
  let atl = 0;

  const results = [];

  for (const { date, tss } of dailyTssArray) {
    const t = tss || 0;
    ctl = ctl + (t - ctl) * (1 / CTL_TC);
    atl = atl + (t - atl) * (1 / ATL_TC);
    const tsb = ctl - atl;
    results.push({
      date,
      daily_tss: t,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      ramp_rate: null, // Computed as week-over-week CTL change
    });
  }

  // Compute ramp rate (CTL change per week)
  for (let i = 7; i < results.length; i++) {
    results[i].ramp_rate = Math.round((results[i].ctl - results[i - 7].ctl) * 10) / 10;
  }

  return results;
}

/**
 * Check if any power curve values are personal bests.
 * Returns the new bests as an object, or null if none.
 */
export function findNewBests(newCurve, existingProfile, weightKg) {
  if (!newCurve || !existingProfile) return null;

  const durationMap = {
    "5s": { watts: "best_5s_watts", wkg: "best_5s_wkg" },
    "30s": { watts: "best_30s_watts", wkg: "best_30s_wkg" },
    "1m": { watts: "best_1m_watts", wkg: "best_1m_wkg" },
    "5m": { watts: "best_5m_watts", wkg: "best_5m_wkg" },
    "20m": { watts: "best_20m_watts", wkg: "best_20m_wkg" },
    "60m": { watts: "best_60m_watts", wkg: "best_60m_wkg" },
  };

  const updates = {};
  let hasBests = false;

  for (const [duration, fields] of Object.entries(durationMap)) {
    const newVal = newCurve[duration];
    if (!newVal) continue;

    const existing = existingProfile[fields.watts] || 0;
    if (newVal > existing) {
      updates[fields.watts] = newVal;
      if (weightKg) {
        updates[fields.wkg] = Math.round((newVal / weightKg) * 100) / 100;
      }
      hasBests = true;
    }
  }

  return hasBests ? updates : null;
}

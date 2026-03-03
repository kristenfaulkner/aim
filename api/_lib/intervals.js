/**
 * Interval extraction, detection, and per-interval metric computation.
 *
 * This library handles:
 * 1. Extracting laps from FIT file data
 * 2. Detecting intervals from power streams (when no lap data exists)
 * 3. Computing per-interval metrics (NP, IF, HR, cadence, zones, work)
 * 4. Computing execution quality metrics (smoothness, fade, cadence drift)
 * 5. Classifying lap types (warmup, work, rest, cooldown)
 * 6. Building the final JSONB payload for activities.laps
 */

import { normalizedPower, intensityFactor, zoneDistribution, workKj } from "./metrics.js";

// ============================================================
// 1. Extract laps from FIT file data
// ============================================================

/**
 * Extract laps from parsed FIT file data.
 * fit-file-parser returns laps as an array with start_time, total_elapsed_time, etc.
 *
 * @param {object} fitData - Raw parsed FIT data (before we extract streams)
 * @param {number[]} timeStream - The time stream (elapsed seconds from start)
 * @returns {object[]|null} Array of lap objects with stream index ranges, or null
 */
export function extractLapsFromFit(fitLaps, timeStream) {
  if (!fitLaps || !Array.isArray(fitLaps) || fitLaps.length === 0) return null;
  if (!timeStream || timeStream.length === 0) return null;

  const laps = [];
  for (const lap of fitLaps) {
    const startTime = lap.start_time || lap.timestamp;
    if (!startTime) continue;

    const durationS = Math.round(
      lap.total_elapsed_time || lap.total_timer_time || 0
    );
    if (durationS < 5) continue; // Skip trivially short laps

    // Find stream indices that correspond to this lap's time window
    // Laps have absolute timestamps — we need to convert to elapsed seconds
    const lapStartMs = new Date(startTime).getTime();
    const firstRecordMs = new Date(fitLaps[0].start_time || fitLaps[0].timestamp).getTime();
    const lapStartElapsed = (lapStartMs - firstRecordMs) / 1000;
    const lapEndElapsed = lapStartElapsed + durationS;

    // Find closest stream indices
    const startIdx = findClosestIndex(timeStream, lapStartElapsed);
    const endIdx = findClosestIndex(timeStream, lapEndElapsed);

    if (startIdx >= endIdx) continue;

    laps.push({
      start_idx: startIdx,
      end_idx: endIdx,
      duration_s: durationS,
      distance_m: lap.total_distance ? Math.round(lap.total_distance) : null,
      avg_power_fit: lap.avg_power ?? null,
      avg_hr_fit: lap.avg_heart_rate ?? null,
      avg_cadence_fit: lap.avg_cadence ?? null,
      // Original FIT lap data for reference
      _fit_lap: {
        intensity: lap.intensity,
        lap_trigger: lap.lap_trigger,
        sport: lap.sport,
        sub_sport: lap.sub_sport,
      },
    });
  }

  return laps.length > 0 ? laps : null;
}

/**
 * Find the index in a sorted array closest to the target value.
 */
function findClosestIndex(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  // Check if lo-1 is closer
  if (lo > 0 && Math.abs(arr[lo - 1] - target) < Math.abs(arr[lo] - target)) {
    return lo - 1;
  }
  return lo;
}


// ============================================================
// 2. Detect intervals from power streams
// ============================================================

/**
 * Detect intervals from power stream when no lap data exists.
 * Uses a simplified change-point detection: finds sustained efforts
 * above a threshold with recovery dips between them.
 *
 * @param {object} streams - { watts: {data}, heartrate: {data}, time: {data}, ... }
 * @param {number} ftp - Functional threshold power
 * @returns {object[]|null} Array of detected intervals with stream indices
 */
export function detectIntervalsFromStreams(streams, ftp) {
  const watts = streams.watts?.data;
  const time = streams.time?.data;
  if (!watts || watts.length < 60 || !ftp) return null;

  // Smooth power with 10s rolling average to reduce noise
  const smoothed = rollingAverage(watts, 10);

  // Threshold: work intervals must sustain > 88% FTP for at least 30s
  const workThreshold = ftp * 0.88;
  // Recovery: below 65% FTP
  const restThreshold = ftp * 0.65;

  const MIN_WORK_DURATION_S = 30;
  const MIN_REST_DURATION_S = 15;

  const intervals = [];
  let state = "idle"; // idle | work | rest
  let workStart = null;
  let restStart = null;

  for (let i = 0; i < smoothed.length; i++) {
    const power = smoothed[i];
    const elapsed = time ? time[i] : i;

    if (state === "idle" || state === "rest") {
      if (power >= workThreshold) {
        if (state === "rest" && restStart !== null) {
          // Record rest duration for previous interval
          const restElapsed = elapsed - (time ? time[restStart] : restStart);
          if (intervals.length > 0) {
            intervals[intervals.length - 1].recovery_after_s = Math.round(restElapsed);
          }
        }
        workStart = i;
        state = "work";
      }
    } else if (state === "work") {
      if (power < restThreshold) {
        const workElapsed = elapsed - (time ? time[workStart] : workStart);
        if (workElapsed >= MIN_WORK_DURATION_S) {
          intervals.push({
            start_idx: workStart,
            end_idx: i,
            duration_s: Math.round(workElapsed),
            recovery_after_s: null,
          });
        }
        restStart = i;
        state = "rest";
      }
    }
  }

  // Handle last interval if still in work state
  if (state === "work" && workStart !== null) {
    const lastIdx = smoothed.length - 1;
    const workElapsed = (time ? time[lastIdx] : lastIdx) - (time ? time[workStart] : workStart);
    if (workElapsed >= MIN_WORK_DURATION_S) {
      intervals.push({
        start_idx: workStart,
        end_idx: lastIdx,
        duration_s: Math.round(workElapsed),
        recovery_after_s: null,
      });
    }
  }

  // Filter: require at least 2 intervals to consider this an interval session
  if (intervals.length < 2) return null;

  // Check if intervals look structured (similar durations/power)
  // If durations vary wildly (CV > 0.8), this is probably not a structured session
  const durations = intervals.map(i => i.duration_s);
  const avgDur = durations.reduce((s, v) => s + v, 0) / durations.length;
  const durCV = Math.sqrt(
    durations.reduce((s, v) => s + Math.pow(v - avgDur, 2), 0) / durations.length
  ) / avgDur;

  if (durCV > 0.8 && intervals.length < 4) return null;

  return intervals;
}

/**
 * Simple rolling average for smoothing.
 */
function rollingAverage(arr, window) {
  const result = new Array(arr.length);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= window) sum -= arr[i - window];
    const count = Math.min(i + 1, window);
    result[i] = sum / count;
  }
  return result;
}


// ============================================================
// 3. Per-interval metrics
// ============================================================

/**
 * Compute standard metrics for a single interval (stream slice).
 * Reuses metrics.js functions on the slice.
 *
 * @param {object} streams - Full activity streams
 * @param {number} startIdx - Start index in stream arrays
 * @param {number} endIdx - End index in stream arrays (exclusive)
 * @param {number} ftp - FTP at time of activity
 * @returns {object} Per-interval metrics
 */
export function computeIntervalMetrics(streams, startIdx, endIdx, ftp) {
  const watts = streams.watts?.data?.slice(startIdx, endIdx);
  const hr = streams.heartrate?.data?.slice(startIdx, endIdx);
  const cad = streams.cadence?.data?.slice(startIdx, endIdx);
  const time = streams.time?.data?.slice(startIdx, endIdx);

  // Determine sample rate from time stream
  let sampleRate = 1;
  if (time && time.length > 1) {
    sampleRate = (time[time.length - 1] - time[0]) / (time.length - 1);
  }

  const durationS = time ? (time[time.length - 1] - time[0]) : (endIdx - startIdx);

  // Power metrics
  const avgPower = watts?.length ? Math.round(watts.reduce((s, v) => s + v, 0) / watts.length) : null;
  const maxPower = watts?.length ? Math.max(...watts) : null;
  const np = normalizedPower(watts, sampleRate);
  const ifVal = ftp ? intensityFactor(np, ftp) : null;
  const zones = ftp ? zoneDistribution(watts, ftp, sampleRate) : null;
  const work = workKj(watts, sampleRate);

  // HR metrics
  const hrValid = hr?.filter(v => v > 0);
  const avgHr = hrValid?.length ? Math.round(hrValid.reduce((s, v) => s + v, 0) / hrValid.length) : null;
  const maxHr = hrValid?.length ? Math.max(...hrValid) : null;

  // Cadence metrics (exclude zeros = coasting)
  const cadValid = cad?.filter(v => v > 0);
  const avgCadence = cadValid?.length ? Math.round(cadValid.reduce((s, v) => s + v, 0) / cadValid.length) : null;

  // Speed
  const speed = streams.altitude?.data ? null : null; // TODO: compute from GPS if needed

  // Distance from stream
  let distance = null;
  const distData = streams.distance?.data;
  if (distData && distData.length > endIdx) {
    distance = Math.round(distData[endIdx - 1] - distData[startIdx]);
  }

  return {
    duration_s: Math.round(durationS),
    distance_m: distance,
    avg_power_w: avgPower,
    normalized_power_w: np,
    max_power_w: maxPower,
    avg_hr_bpm: avgHr,
    max_hr_bpm: maxHr,
    avg_cadence_rpm: avgCadence,
    work_kj: work,
    intensity_factor: ifVal,
    zone_distribution: zones,
  };
}


// ============================================================
// 4. Execution quality metrics
// ============================================================

/**
 * Compute execution quality metrics for a single interval.
 * These measure how well the athlete executed relative to a target.
 *
 * @param {object} streams - Full activity streams
 * @param {number} startIdx - Start index
 * @param {number} endIdx - End index (exclusive)
 * @param {number} targetPower - Target power for this interval
 * @returns {object} Execution metrics
 */
export function computeExecutionMetrics(streams, startIdx, endIdx, targetPower) {
  const watts = streams.watts?.data?.slice(startIdx, endIdx);
  const cad = streams.cadence?.data?.slice(startIdx, endIdx);
  const hr = streams.heartrate?.data?.slice(startIdx, endIdx);

  if (!watts || watts.length < 10) return null;

  // --- Smoothness (coefficient of variation) ---
  const avgPower = watts.reduce((s, v) => s + v, 0) / watts.length;
  const stdDev = Math.sqrt(
    watts.reduce((s, v) => s + Math.pow(v - avgPower, 2), 0) / watts.length
  );
  const smoothness_cv = avgPower > 0 ? Math.round((stdDev / avgPower) * 1000) / 1000 : null;

  // --- Time in band (% of time within ±X% of target) ---
  let time_in_band = null;
  if (targetPower > 0) {
    const inBand2 = watts.filter(w => Math.abs(w - targetPower) / targetPower <= 0.02).length;
    const inBand5 = watts.filter(w => Math.abs(w - targetPower) / targetPower <= 0.05).length;
    const inBand10 = watts.filter(w => Math.abs(w - targetPower) / targetPower <= 0.10).length;
    time_in_band = {
      "2pct": Math.round((inBand2 / watts.length) * 100) / 100,
      "5pct": Math.round((inBand5 / watts.length) * 100) / 100,
      "10pct": Math.round((inBand10 / watts.length) * 100) / 100,
    };
  }

  // --- Fade score ---
  // Compare thirds: positive = building, negative = fading
  const third = Math.floor(watts.length / 3);
  const firstThird = watts.slice(0, third);
  const lastThird = watts.slice(-third);
  const avgFirst = firstThird.reduce((s, v) => s + v, 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, v) => s + v, 0) / lastThird.length;
  const fade_score = avgFirst > 0
    ? Math.round(((avgLast - avgFirst) / avgFirst) * 1000) / 1000
    : null;

  // --- End strength (last 20% vs first 20%) ---
  const fifth = Math.floor(watts.length / 5);
  const firstFifth = watts.slice(0, fifth);
  const lastFifth = watts.slice(-fifth);
  const avgFirstFifth = firstFifth.reduce((s, v) => s + v, 0) / firstFifth.length;
  const avgLastFifth = lastFifth.reduce((s, v) => s + v, 0) / lastFifth.length;
  const end_strength = avgFirstFifth > 0
    ? Math.round((avgLastFifth / avgFirstFifth) * 1000) / 1000
    : null;

  // --- Cadence drift (rpm change across interval) ---
  let cadence_drift = null;
  if (cad) {
    const cadValid = cad.filter(c => c > 0);
    if (cadValid.length > 10) {
      const cadThird = Math.floor(cadValid.length / 3);
      const cadFirst = cadValid.slice(0, cadThird);
      const cadLast = cadValid.slice(-cadThird);
      const avgCadFirst = cadFirst.reduce((s, v) => s + v, 0) / cadFirst.length;
      const avgCadLast = cadLast.reduce((s, v) => s + v, 0) / cadLast.length;
      cadence_drift = Math.round((avgCadLast - avgCadFirst) * 10) / 10;
    }
  }

  // --- HR rise slope (bpm/s during first 60s) ---
  let hr_rise_slope = null;
  if (hr) {
    const hrValid = hr.filter(h => h > 0);
    if (hrValid.length > 10) {
      const first10 = hrValid.slice(0, 10);
      const hrStart = first10.reduce((s, v) => s + v, 0) / first10.length;
      const peakWindow = Math.min(60, hrValid.length);
      const hrPeakSlice = hrValid.slice(0, peakWindow);
      const hrPeak = Math.max(...hrPeakSlice);
      hr_rise_slope = peakWindow > 0
        ? Math.round(((hrPeak - hrStart) / peakWindow) * 100) / 100
        : null;
    }
  }

  // --- Execution label ---
  const execution_label = deriveExecutionLabel({
    targetPower, avgPower, fade_score, end_strength, smoothness_cv,
  });

  return {
    target_power_w: targetPower || null,
    smoothness_cv,
    time_in_band_pct: time_in_band,
    fade_score,
    end_strength,
    cadence_drift,
    hr_rise_slope,
    execution_label,
  };
}

/**
 * Derive a human-readable execution label from metrics.
 */
function deriveExecutionLabel({ targetPower, avgPower, fade_score, end_strength, smoothness_cv }) {
  if (!targetPower || !avgPower) {
    if (fade_score !== null && fade_score < -0.08) return "faded";
    if (fade_score !== null && fade_score > 0.05) return "negative_split";
    return "unknown";
  }

  const pctOfTarget = avgPower / targetPower;

  if (pctOfTarget > 1.08) return "overcooked";
  if (pctOfTarget < 0.92) return "slightly_low";

  if (fade_score !== null && fade_score < -0.08) return "faded";
  if (end_strength !== null && end_strength > 1.05) return "strong_finish";
  if (fade_score !== null && fade_score > 0.03) return "negative_split";
  if (smoothness_cv !== null && smoothness_cv > 0.15) return "inconsistent";

  if (pctOfTarget > 1.03) return "slightly_high";
  return "met";
}


// ============================================================
// 5. Classify lap types
// ============================================================

/**
 * Classify a lap/interval as warmup, work, rest, or cooldown.
 *
 * @param {object} lapMetrics - Per-interval metrics
 * @param {object} activityMetrics - Whole-activity metrics
 * @param {number} ftp - FTP
 * @param {number} index - Position in the lap array (0-based)
 * @param {number} totalLaps - Total number of laps
 * @returns {string} "warmup" | "work" | "rest" | "cooldown" | "unknown"
 */
export function classifyLapType(lapMetrics, activityMetrics, ftp, index, totalLaps) {
  if (!lapMetrics || !ftp) return "unknown";

  const avgPower = lapMetrics.avg_power_w || 0;
  const pctFtp = avgPower / ftp;
  const duration = lapMetrics.duration_s || 0;

  // Rest: very low power
  if (pctFtp < 0.45 && duration > 10) return "rest";

  // Warmup: first 1-2 laps with moderate power
  if (index <= 1 && pctFtp < 0.75 && pctFtp >= 0.45) return "warmup";

  // Cooldown: last 1-2 laps with moderate power
  if (index >= totalLaps - 2 && pctFtp < 0.75 && pctFtp >= 0.45) return "cooldown";

  // Work: above sweet spot threshold
  if (pctFtp >= 0.75) return "work";

  // Moderate effort in middle of activity
  if (pctFtp >= 0.55) return "work";

  return "unknown";
}


// ============================================================
// 6. Infer target power from work intervals
// ============================================================

/**
 * Infer target power when no plan exists by clustering work interval powers.
 * Uses simple median of work interval average powers.
 *
 * @param {object[]} intervals - Array of intervals with metrics
 * @returns {number|null} Inferred target power
 */
export function inferTargetPower(intervals) {
  const workIntervals = intervals.filter(i => i.type === "work");
  if (workIntervals.length < 2) return null;

  const powers = workIntervals
    .map(i => i.metrics?.avg_power_w)
    .filter(p => p != null && p > 0)
    .sort((a, b) => a - b);

  if (powers.length < 2) return null;

  // Median
  const mid = Math.floor(powers.length / 2);
  return powers.length % 2 === 0
    ? Math.round((powers[mid - 1] + powers[mid]) / 2)
    : powers[mid];
}


// ============================================================
// 7. Set-level metrics (across all work intervals)
// ============================================================

/**
 * Compute cross-interval set metrics.
 *
 * @param {object[]} intervals - Array of classified intervals with metrics + execution
 * @returns {object} Set-level summary metrics
 */
export function computeSetMetrics(intervals) {
  const workIntervals = intervals.filter(i => i.type === "work");
  if (workIntervals.length === 0) return null;

  const powers = workIntervals.map(i => i.metrics?.avg_power_w).filter(p => p > 0);
  const avgWorkPower = powers.length
    ? Math.round(powers.reduce((s, v) => s + v, 0) / powers.length)
    : null;

  // Power consistency (CV across intervals)
  let powerCV = null;
  if (powers.length >= 2 && avgWorkPower > 0) {
    const std = Math.sqrt(powers.reduce((s, v) => s + Math.pow(v - avgWorkPower, 2), 0) / powers.length);
    powerCV = Math.round((std / avgWorkPower) * 1000) / 1000;
  }

  // Total work
  const totalWorkKj = workIntervals.reduce((s, i) => s + (i.metrics?.work_kj || 0), 0);

  // Recovery durations
  const recoveries = workIntervals
    .map(i => i.recovery_after_s)
    .filter(r => r != null && r > 0);
  const avgRecovery = recoveries.length
    ? Math.round(recoveries.reduce((s, v) => s + v, 0) / recoveries.length)
    : null;

  // Durability index: last work interval power / first work interval power
  let durabilityIndex = null;
  if (workIntervals.length >= 3) {
    const firstPower = workIntervals[0].metrics?.avg_power_w;
    const lastPower = workIntervals[workIntervals.length - 1].metrics?.avg_power_w;
    if (firstPower > 0 && lastPower > 0) {
      durabilityIndex = Math.round((lastPower / firstPower) * 100) / 100;
    }
  }

  // Overall execution label
  let overallLabel = "met";
  const labels = workIntervals.map(i => i.execution?.execution_label).filter(Boolean);
  const fadedCount = labels.filter(l => l === "faded").length;
  const overcookedCount = labels.filter(l => l === "overcooked").length;
  if (fadedCount > labels.length / 2) overallLabel = "faded";
  else if (overcookedCount > 0 && fadedCount > 0) overallLabel = "overcooked_then_faded";
  else if (durabilityIndex && durabilityIndex > 1.03) overallLabel = "strong_finish";
  else if (powerCV && powerCV > 0.08) overallLabel = "inconsistent";

  return {
    num_work_intervals: workIntervals.length,
    avg_work_power_w: avgWorkPower,
    power_consistency_cv: powerCV,
    total_work_kj: totalWorkKj,
    avg_recovery_s: avgRecovery,
    durability_index: durabilityIndex,
    overall_execution_label: overallLabel,
  };
}


// ============================================================
// 8. Build final laps payload (JSONB for activities.laps)
// ============================================================

/**
 * Full pipeline: extract/detect intervals → compute metrics → classify → build payload.
 *
 * @param {object} streams - Activity streams (watts, heartrate, cadence, time, etc.)
 * @param {number} ftp - FTP at time of activity
 * @param {object[]|null} fitLaps - FIT file lap data (if available)
 * @returns {object|null} The complete laps JSONB payload
 */
export function buildLapsPayload(streams, ftp, fitLaps = null) {
  const time = streams.time?.data;
  const watts = streams.watts?.data;

  if (!watts || watts.length < 30 || !ftp) return null;

  // Step 1: Extract laps from FIT or detect from streams
  let rawIntervals = null;
  let source = "detected";

  if (fitLaps) {
    rawIntervals = extractLapsFromFit(fitLaps, time);
    if (rawIntervals) source = "fit_laps";
  }

  if (!rawIntervals) {
    rawIntervals = detectIntervalsFromStreams(streams, ftp);
    source = rawIntervals ? "detected" : null;
  }

  if (!rawIntervals || rawIntervals.length === 0) return null;

  // Step 2: Compute per-interval metrics and classify
  const intervals = rawIntervals.map((raw, idx) => {
    const metrics = computeIntervalMetrics(
      streams, raw.start_idx, raw.end_idx, ftp
    );

    const type = classifyLapType(
      metrics, null, ftp, idx, rawIntervals.length
    );

    return {
      ...raw,
      metrics,
      type,
      recovery_after_s: raw.recovery_after_s || null,
    };
  });

  // Step 3: Infer target power from work intervals
  const targetPower = inferTargetPower(intervals);

  // Step 4: Compute execution metrics for work intervals
  for (const interval of intervals) {
    if (interval.type === "work") {
      interval.execution = computeExecutionMetrics(
        streams, interval.start_idx, interval.end_idx, targetPower
      );
    }
  }

  // Step 5: Compute set-level metrics
  const setMetrics = computeSetMetrics(intervals);

  // Step 6: Build clean output (strip internal indices)
  const cleanIntervals = intervals.map((interval, idx) => {
    const base = {
      index: idx,
      type: interval.type,
      duration_s: interval.metrics?.duration_s || interval.duration_s,
      distance_m: interval.metrics?.distance_m || interval.distance_m || null,
      avg_power_w: interval.metrics?.avg_power_w,
      normalized_power_w: interval.metrics?.normalized_power_w,
      max_power_w: interval.metrics?.max_power_w,
      avg_hr_bpm: interval.metrics?.avg_hr_bpm,
      max_hr_bpm: interval.metrics?.max_hr_bpm,
      avg_cadence_rpm: interval.metrics?.avg_cadence_rpm,
      work_kj: interval.metrics?.work_kj,
      intensity_factor: interval.metrics?.intensity_factor,
      zone_distribution: interval.metrics?.zone_distribution,
      recovery_after_s: interval.recovery_after_s,
    };

    if (interval.execution) {
      base.execution = interval.execution;
    }

    return base;
  });

  return {
    source,
    intervals: cleanIntervals,
    set_metrics: setMetrics,
  };
}

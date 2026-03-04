/**
 * Segment Scoring — Adjusted Performance Analysis
 *
 * Pure functions for segment effort context enrichment and adjusted scoring.
 * No DB calls — all data passed in. Fully testable.
 *
 * Reuses adjustment concepts from performance-models.js:
 *   - Heat penalty (temperature → time cost)
 *   - HRV/readiness (HRV below baseline → penalty)
 *   - Fatigue (TSB deeply negative → penalty)
 *   - Sleep quality (poor sleep → penalty)
 */

// ── Context Enrichment ──

/**
 * Denormalize daily context onto a segment effort record.
 * Called at sync time to snapshot conditions.
 *
 * @param {object} effort - Raw effort from Strava (elapsed_time, avg_watts, avg_hr, etc.)
 * @param {object|null} dailyMetrics - daily_metrics row for effort date
 * @param {object|null} activityWeather - activity_weather JSONB from parent activity
 * @param {object|null} trainingLoad - { ctl, atl, tsb } from daily_metrics
 * @returns {object} Enriched effort with denormalized context fields
 */
export function enrichEffortContext(effort, dailyMetrics, activityWeather, trainingLoad) {
  const enriched = { ...effort };

  // Weather context
  if (activityWeather) {
    enriched.temperature_c = activityWeather.temperature_c ?? activityWeather.temperature ?? null;
    enriched.humidity_pct = activityWeather.humidity ?? activityWeather.relative_humidity ?? null;
    enriched.wind_speed_mps = activityWeather.wind_speed_mps ?? activityWeather.wind_speed ?? null;
    enriched.wind_direction_deg = activityWeather.wind_direction ?? null;
  }

  // Recovery context from daily metrics
  if (dailyMetrics) {
    enriched.hrv_morning_ms = dailyMetrics.hrv_ms ?? dailyMetrics.hrv_overnight_avg_ms ?? null;
    enriched.rhr_morning_bpm = dailyMetrics.resting_hr_bpm ?? null;
    enriched.sleep_score = dailyMetrics.sleep_score ?? null;
    enriched.sleep_duration_seconds = dailyMetrics.total_sleep_seconds ?? null;
  }

  // Training load context
  if (trainingLoad) {
    enriched.ctl = trainingLoad.ctl ?? null;
    enriched.atl = trainingLoad.atl ?? null;
    enriched.tsb = trainingLoad.tsb ?? null;
  }

  // Derived ratios
  if (enriched.avg_power_watts && enriched.avg_hr_bpm) {
    enriched.power_hr_ratio = round(enriched.avg_power_watts / enriched.avg_hr_bpm, 2);
  }
  if (enriched.normalized_power_watts && enriched.avg_hr_bpm) {
    enriched.efficiency_factor = round(enriched.normalized_power_watts / enriched.avg_hr_bpm, 2);
  }
  if (enriched.avg_pace_min_km && enriched.avg_hr_bpm) {
    enriched.pace_hr_ratio = round((1 / enriched.avg_pace_min_km) / enriched.avg_hr_bpm, 4);
  }

  return enriched;
}


// ── Adjusted Score Computation ──

/**
 * Compute adjusted performance score for a segment effort.
 * Estimates how many seconds each condition cost the athlete,
 * then produces an "adjusted time" as if conditions were ideal.
 *
 * @param {object} effort - Enriched effort with context fields
 * @param {number|null} prTime - PR elapsed_time_seconds on this segment (null if first effort)
 * @param {object} baselines - Athlete's 30-day baseline averages { hrv_avg, sleep_score_avg, tsb_avg }
 * @returns {object} { adjusted_time, adjusted_score, adjustments, total_adjustment_seconds }
 */
export function computeAdjustedScore(effort, prTime, baselines) {
  const adjustments = [];
  let totalAdjustmentSeconds = 0;
  const elapsed = effort.elapsed_time_seconds;
  if (!elapsed || elapsed <= 0) {
    return { adjusted_time: elapsed, adjusted_score: null, adjustments: [], total_adjustment_seconds: 0 };
  }

  // 1. Heat penalty — above 24°C (75°F), performance degrades ~1-3%
  const tempC = effort.temperature_c;
  if (tempC != null && tempC > 24) {
    const excessDegrees = tempC - 24;
    // ~0.3% per degree above 24°C, capped at 5%
    const pctPenalty = Math.min(excessDegrees * 0.003, 0.05);
    const impactSeconds = round(elapsed * pctPenalty, 1);
    if (impactSeconds >= 0.5) {
      adjustments.push({
        factor: "temperature",
        impact_seconds: impactSeconds,
        detail: `${round(tempC * 9/5 + 32, 0)}°F (+${round(excessDegrees, 0)}° above baseline)`,
      });
      totalAdjustmentSeconds += impactSeconds;
    }
  }

  // 2. HRV readiness — below 85% of baseline signals compromised readiness
  if (effort.hrv_morning_ms != null && baselines.hrv_avg && baselines.hrv_avg > 0) {
    const hrvRatio = effort.hrv_morning_ms / baselines.hrv_avg;
    if (hrvRatio < 0.85) {
      // Up to ~2% penalty for very low HRV
      const pctPenalty = Math.min((0.85 - hrvRatio) * 0.08, 0.02);
      const impactSeconds = round(elapsed * pctPenalty, 1);
      if (impactSeconds >= 0.5) {
        adjustments.push({
          factor: "HRV/readiness",
          impact_seconds: impactSeconds,
          detail: `HRV ${round(effort.hrv_morning_ms, 0)}ms vs ${round(baselines.hrv_avg, 0)}ms avg`,
        });
        totalAdjustmentSeconds += impactSeconds;
      }
    }
  }

  // 3. Fatigue (TSB) — deeply negative TSB penalizes performance
  if (effort.tsb != null && effort.tsb < -15) {
    const excessFatigue = Math.abs(effort.tsb) - 15;
    // ~0.1% per TSB point below -15, capped at 3%
    const pctPenalty = Math.min(excessFatigue * 0.001, 0.03);
    const impactSeconds = round(elapsed * pctPenalty, 1);
    if (impactSeconds >= 0.5) {
      adjustments.push({
        factor: "fatigue",
        impact_seconds: impactSeconds,
        detail: `TSB ${round(effort.tsb, 0)}`,
      });
      totalAdjustmentSeconds += impactSeconds;
    }
  }

  // 4. Sleep quality — poor sleep degrades power output
  if (effort.sleep_score != null && baselines.sleep_score_avg && baselines.sleep_score_avg > 0) {
    const sleepRatio = effort.sleep_score / baselines.sleep_score_avg;
    if (sleepRatio < 0.8) {
      // Up to ~1.5% penalty for very poor sleep
      const pctPenalty = Math.min((0.8 - sleepRatio) * 0.06, 0.015);
      const impactSeconds = round(elapsed * pctPenalty, 1);
      if (impactSeconds >= 0.5) {
        adjustments.push({
          factor: "sleep",
          impact_seconds: impactSeconds,
          detail: `Sleep score ${effort.sleep_score} vs ${round(baselines.sleep_score_avg, 0)} avg`,
        });
        totalAdjustmentSeconds += impactSeconds;
      }
    }
  }

  // 5. Wind — headwind penalty (if wind data available)
  if (effort.wind_speed_mps != null && effort.wind_speed_mps > 5) {
    // Simple wind penalty: ~0.2% per m/s above 5 m/s, capped at 2%
    const excessWind = effort.wind_speed_mps - 5;
    const pctPenalty = Math.min(excessWind * 0.002, 0.02);
    const impactSeconds = round(elapsed * pctPenalty, 1);
    if (impactSeconds >= 0.5) {
      adjustments.push({
        factor: "wind",
        impact_seconds: impactSeconds,
        detail: `${round(effort.wind_speed_mps, 1)} m/s`,
      });
      totalAdjustmentSeconds += impactSeconds;
    }
  }

  totalAdjustmentSeconds = round(totalAdjustmentSeconds, 1);
  const adjustedTime = round(elapsed - totalAdjustmentSeconds, 1);

  // Adjusted score: PR-relative (100 = PR pace, >100 = faster than PR after adjustments)
  let adjustedScore = null;
  if (prTime && prTime > 0) {
    adjustedScore = round((prTime / adjustedTime) * 100, 1);
  }

  return {
    adjusted_time: adjustedTime,
    adjusted_score: adjustedScore,
    adjustments,
    total_adjustment_seconds: totalAdjustmentSeconds,
  };
}


// ── PR Detection ──

/**
 * Determine if an effort is a PR (fastest elapsed_time for this segment).
 * Also flags "adjusted PR" — best adjusted_time even if raw time isn't fastest.
 *
 * @param {object} effort - Current effort with elapsed_time_seconds and adjusted_time
 * @param {object[]} historicalEfforts - Previous efforts on this segment
 * @returns {{ is_raw_pr: boolean, is_adjusted_pr: boolean, pr_time: number|null, pr_date: string|null }}
 */
export function detectPR(effort, historicalEfforts) {
  if (!historicalEfforts || historicalEfforts.length === 0) {
    return { is_raw_pr: true, is_adjusted_pr: true, pr_time: null, pr_date: null };
  }

  const prEffort = historicalEfforts.reduce((best, e) =>
    (e.elapsed_time_seconds < best.elapsed_time_seconds) ? e : best
  , historicalEfforts[0]);

  const is_raw_pr = effort.elapsed_time_seconds <= prEffort.elapsed_time_seconds;

  // Adjusted PR: compare adjusted times if available
  const adjustedEfforts = historicalEfforts.filter(e => e.adjustment_factors?.adjusted_time);
  let is_adjusted_pr = false;
  if (effort.adjusted_time && adjustedEfforts.length > 0) {
    const bestAdjusted = Math.min(...adjustedEfforts.map(e => e.adjustment_factors.adjusted_time));
    is_adjusted_pr = effort.adjusted_time <= bestAdjusted;
  } else if (adjustedEfforts.length === 0) {
    is_adjusted_pr = is_raw_pr;
  }

  return {
    is_raw_pr,
    is_adjusted_pr,
    pr_time: prEffort.elapsed_time_seconds,
    pr_date: prEffort.started_at,
  };
}


// ── Baseline Computation ──

/**
 * Compute athlete baselines from recent daily metrics (30 days).
 * Used as reference points for adjustment calculations.
 *
 * @param {object[]} dailyMetrics - Array of daily_metrics rows
 * @returns {{ hrv_avg: number|null, sleep_score_avg: number|null, tsb_avg: number|null }}
 */
export function computeAthleteBaselines(dailyMetrics) {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return { hrv_avg: null, sleep_score_avg: null, tsb_avg: null };
  }

  const hrvValues = dailyMetrics
    .map(d => d.hrv_ms ?? d.hrv_overnight_avg_ms)
    .filter(v => v != null);
  const sleepValues = dailyMetrics
    .map(d => d.sleep_score)
    .filter(v => v != null);
  const tsbValues = dailyMetrics
    .map(d => d.tsb)
    .filter(v => v != null);

  return {
    hrv_avg: hrvValues.length > 0 ? round(avg(hrvValues), 1) : null,
    sleep_score_avg: sleepValues.length > 0 ? round(avg(sleepValues), 0) : null,
    tsb_avg: tsbValues.length > 0 ? round(avg(tsbValues), 1) : null,
  };
}


// ── AI Formatting ──

/**
 * Format segment efforts for AI context injection.
 * Produces a text block for Category 30 analysis.
 *
 * @param {object[]} segmentEffortsWithHistory - Array of { segment, currentEffort, historicalEfforts }
 * @returns {string} Formatted text for AI context
 */
export function formatSegmentsForAI(segmentEffortsWithHistory) {
  if (!segmentEffortsWithHistory || segmentEffortsWithHistory.length === 0) return "";

  const lines = ["## SEGMENT EFFORTS"];

  for (const { segment, currentEffort, historicalEfforts } of segmentEffortsWithHistory) {
    const s = segment;
    lines.push(`\n### ${s.name} (${s.distance_m ? round(s.distance_m / 1000, 1) + "km" : "?"} · ${s.average_grade_pct ? round(s.average_grade_pct, 1) + "% avg grade" : "flat"})`);

    // Current effort
    const ce = currentEffort;
    lines.push(`Current effort: ${formatDuration(ce.elapsed_time_seconds)}`);
    if (ce.avg_power_watts) lines.push(`  Power: ${round(ce.avg_power_watts, 0)}W avg`);
    if (ce.avg_hr_bpm) lines.push(`  HR: ${round(ce.avg_hr_bpm, 0)} bpm avg`);
    if (ce.power_hr_ratio) lines.push(`  Power:HR ratio: ${ce.power_hr_ratio}`);

    // Adjustments
    const factors = ce.adjustment_factors;
    if (factors && factors.adjustments?.length > 0) {
      const adj = factors.adjustments.map(a => `${a.factor}: +${a.impact_seconds}s`).join(", ");
      lines.push(`  Adjustments: ${adj}`);
      lines.push(`  Adjusted time: ${formatDuration(factors.adjusted_time)} (${round(factors.total_adjustment_seconds, 0)}s total adjustment)`);
    }

    // Historical comparison
    if (historicalEfforts && historicalEfforts.length > 0) {
      const pr = historicalEfforts.reduce((best, e) =>
        e.elapsed_time_seconds < best.elapsed_time_seconds ? e : best
      , historicalEfforts[0]);

      lines.push(`  PR: ${formatDuration(pr.elapsed_time_seconds)} (${pr.started_at ? new Date(pr.started_at).toLocaleDateString() : "unknown"})`);

      const delta = ce.elapsed_time_seconds - pr.elapsed_time_seconds;
      lines.push(`  vs PR: ${delta >= 0 ? "+" : ""}${delta}s`);

      // Last effort comparison
      const last = historicalEfforts.sort((a, b) =>
        new Date(b.started_at) - new Date(a.started_at)
      )[0];
      if (last && last.strava_effort_id !== pr.strava_effort_id) {
        const lastDelta = ce.elapsed_time_seconds - last.elapsed_time_seconds;
        lines.push(`  vs Last (${new Date(last.started_at).toLocaleDateString()}): ${lastDelta >= 0 ? "+" : ""}${lastDelta}s`);
      }

      // Power:HR ratio trend
      const phrHistory = historicalEfforts
        .filter(e => e.power_hr_ratio)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
        .slice(0, 5);
      if (phrHistory.length >= 2 && ce.power_hr_ratio) {
        const rank = phrHistory.filter(e => e.power_hr_ratio >= ce.power_hr_ratio).length + 1;
        lines.push(`  Power:HR rank: ${rank}/${phrHistory.length + 1} (${ce.power_hr_ratio} vs avg ${round(avg(phrHistory.map(e => e.power_hr_ratio)), 2)})`);
      }

      lines.push(`  Total attempts: ${historicalEfforts.length + 1}`);
    } else {
      lines.push("  First attempt on this segment — baseline established.");
    }
  }

  return lines.join("\n");
}


// ── Utility Functions ──

function round(v, decimals = 1) {
  if (v == null) return null;
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

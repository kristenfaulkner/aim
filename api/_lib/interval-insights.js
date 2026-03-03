/**
 * Deterministic interval insight generation.
 *
 * Pure functions that analyze interval data and produce structured insight
 * objects that feed into the AI context for richer coaching feedback.
 * These are NOT AI-generated — they're data-driven observations with numbers.
 */

/**
 * Generate all interval-level insights for an activity.
 *
 * @param {object} laps - The activities.laps JSONB payload
 * @param {number} ftp - FTP at time of activity
 * @returns {object[]} Array of structured insight objects
 */
export function generateIntervalInsights(laps, ftp) {
  if (!laps?.intervals?.length) return [];

  const workIntervals = laps.intervals.filter(i => i.type === "work");
  if (workIntervals.length < 2) return [];

  const insights = [];

  const fade = detectFadePattern(workIntervals);
  if (fade) insights.push(fade);

  const cadence = detectCadenceDecay(workIntervals);
  if (cadence) insights.push(cadence);

  const hrCreep = detectHRCreep(workIntervals);
  if (hrCreep) insights.push(hrCreep);

  const pacing = detectPacingIssues(workIntervals, ftp);
  if (pacing) insights.push(pacing);

  const consistency = detectConsistencyPattern(workIntervals);
  if (consistency) insights.push(consistency);

  const durability = computeDurabilityInsight(workIntervals, laps.set_metrics);
  if (durability) insights.push(durability);

  return insights;
}


/**
 * Detect power fade across intervals.
 * Compares first half of work intervals to second half.
 */
export function detectFadePattern(workIntervals) {
  if (workIntervals.length < 3) return null;

  const powers = workIntervals.map(i => i.avg_power_w).filter(p => p > 0);
  if (powers.length < 3) return null;

  const mid = Math.floor(powers.length / 2);
  const firstHalf = powers.slice(0, mid);
  const secondHalf = powers.slice(mid);

  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const fadePct = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (Math.abs(fadePct) < 2) return null; // Not significant

  if (fadePct < -3) {
    return {
      type: "power_fade",
      severity: fadePct < -8 ? "high" : "medium",
      headline: `Power faded ${Math.abs(fadePct).toFixed(1)}% across ${powers.length} intervals`,
      detail: `First ${firstHalf.length} reps averaged ${Math.round(avgFirst)}W, last ${secondHalf.length} averaged ${Math.round(avgSecond)}W.`,
      evidence: { avg_first_w: Math.round(avgFirst), avg_second_w: Math.round(avgSecond), fade_pct: Math.round(fadePct * 10) / 10 },
      suggestion: fadePct < -8
        ? "Consider starting 3-5% lower or adding more recovery between reps."
        : "Mild fade — may be normal fatigue or consider fueling earlier.",
    };
  }

  if (fadePct > 3) {
    return {
      type: "negative_split",
      severity: "positive",
      headline: `Power built ${fadePct.toFixed(1)}% across ${powers.length} intervals`,
      detail: `Started at ${Math.round(avgFirst)}W and built to ${Math.round(avgSecond)}W — strong execution.`,
      evidence: { avg_first_w: Math.round(avgFirst), avg_second_w: Math.round(avgSecond), build_pct: Math.round(fadePct * 10) / 10 },
      suggestion: "Great pacing — you could potentially start slightly higher next time.",
    };
  }

  return null;
}


/**
 * Detect cadence decay across intervals.
 */
export function detectCadenceDecay(workIntervals) {
  const cadences = workIntervals
    .map(i => i.avg_cadence_rpm)
    .filter(c => c != null && c > 0);

  if (cadences.length < 3) return null;

  const firstThird = cadences.slice(0, Math.ceil(cadences.length / 3));
  const lastThird = cadences.slice(-Math.ceil(cadences.length / 3));

  const avgFirst = firstThird.reduce((s, v) => s + v, 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, v) => s + v, 0) / lastThird.length;
  const drift = avgLast - avgFirst;

  if (Math.abs(drift) < 4) return null;

  if (drift < -4) {
    const powers = workIntervals.map(i => i.avg_power_w).filter(p => p > 0);
    const powerHeld = powers.length >= 3 &&
      Math.abs(powers[powers.length - 1] - powers[0]) / powers[0] < 0.05;

    return {
      type: "cadence_decay",
      severity: drift < -10 ? "high" : "medium",
      headline: `Cadence dropped ${Math.abs(drift).toFixed(0)} rpm across reps`,
      detail: `From ${Math.round(avgFirst)} rpm to ${Math.round(avgLast)} rpm.${powerHeld ? " Power held despite the drop — suggests muscular fatigue, consider gearing down." : ""}`,
      evidence: { avg_first_rpm: Math.round(avgFirst), avg_last_rpm: Math.round(avgLast), drift_rpm: Math.round(drift) },
      suggestion: drift < -10
        ? "Significant cadence collapse — consider shorter intervals or more recovery."
        : "Try maintaining cadence with an easier gear to distribute fatigue.",
    };
  }

  return null;
}


/**
 * Detect HR creep across intervals (HR climbing while power stays flat).
 */
export function detectHRCreep(workIntervals) {
  const hrs = workIntervals
    .map(i => i.avg_hr_bpm)
    .filter(h => h != null && h > 0);

  if (hrs.length < 3) return null;

  const firstThird = hrs.slice(0, Math.ceil(hrs.length / 3));
  const lastThird = hrs.slice(-Math.ceil(hrs.length / 3));

  const avgFirst = firstThird.reduce((s, v) => s + v, 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, v) => s + v, 0) / lastThird.length;
  const drift = avgLast - avgFirst;

  if (drift < 5) return null; // Normal — HR rises during interval sets

  // Check if power was stable
  const powers = workIntervals.map(i => i.avg_power_w).filter(p => p > 0);
  let powerStable = false;
  if (powers.length >= 3) {
    const powerFirst = powers.slice(0, Math.ceil(powers.length / 3));
    const powerLast = powers.slice(-Math.ceil(powers.length / 3));
    const avgPFirst = powerFirst.reduce((s, v) => s + v, 0) / powerFirst.length;
    const avgPLast = powerLast.reduce((s, v) => s + v, 0) / powerLast.length;
    powerStable = Math.abs(avgPLast - avgPFirst) / avgPFirst < 0.03;
  }

  return {
    type: "hr_creep",
    severity: drift > 10 ? "high" : "medium",
    headline: `HR crept up ${Math.round(drift)} bpm across intervals${powerStable ? " while power stayed flat" : ""}`,
    detail: `Avg HR rose from ${Math.round(avgFirst)} to ${Math.round(avgLast)} bpm.${powerStable ? " This suggests cardiovascular drift — check hydration, heat, or recovery status." : ""}`,
    evidence: { avg_first_bpm: Math.round(avgFirst), avg_last_bpm: Math.round(avgLast), drift_bpm: Math.round(drift), power_stable: powerStable },
    suggestion: drift > 10
      ? "Significant HR creep — may indicate dehydration, heat stress, or insufficient recovery. Consider longer rests between reps."
      : "Moderate HR creep is normal in longer interval sets.",
  };
}


/**
 * Detect pacing issues — overcooked first rep, inconsistency.
 */
export function detectPacingIssues(workIntervals, ftp) {
  if (workIntervals.length < 3) return null;

  const powers = workIntervals.map(i => i.avg_power_w).filter(p => p > 0);
  if (powers.length < 3) return null;

  // Check for overcooked first rep
  const median = [...powers].sort((a, b) => a - b)[Math.floor(powers.length / 2)];
  const firstRepPct = ((powers[0] - median) / median) * 100;

  if (firstRepPct > 5) {
    // Check if later reps suffered
    const lastTwo = powers.slice(-2);
    const lastAvg = lastTwo.reduce((s, v) => s + v, 0) / lastTwo.length;
    const lastVsMedian = ((lastAvg - median) / median) * 100;

    return {
      type: "overcooked_start",
      severity: firstRepPct > 10 ? "high" : "medium",
      headline: `Rep 1 was ${firstRepPct.toFixed(0)}% above target${lastVsMedian < -3 ? " — paid for it later" : ""}`,
      detail: `Rep 1: ${powers[0]}W vs median ${Math.round(median)}W.${lastVsMedian < -3 ? ` Last reps dropped to ${Math.round(lastAvg)}W.` : ""}`,
      evidence: { rep1_w: powers[0], median_w: Math.round(median), overcook_pct: Math.round(firstRepPct), last_reps_w: Math.round(lastAvg) },
      suggestion: "Start conservatively — aim for the median target from rep 1. It's better to build than fade.",
    };
  }

  return null;
}


/**
 * Detect consistency patterns across intervals.
 */
export function detectConsistencyPattern(workIntervals) {
  const powers = workIntervals.map(i => i.avg_power_w).filter(p => p > 0);
  if (powers.length < 3) return null;

  const avg = powers.reduce((s, v) => s + v, 0) / powers.length;
  const cv = Math.sqrt(powers.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / powers.length) / avg;

  if (cv < 0.03) {
    return {
      type: "excellent_consistency",
      severity: "positive",
      headline: `Excellent interval consistency (CV ${(cv * 100).toFixed(1)}%)`,
      detail: `${powers.length} work intervals averaged ${Math.round(avg)}W with very low variation. Great pacing discipline.`,
      evidence: { avg_w: Math.round(avg), cv_pct: Math.round(cv * 1000) / 10, num_intervals: powers.length },
      suggestion: null,
    };
  }

  if (cv > 0.10) {
    const min = Math.min(...powers);
    const max = Math.max(...powers);
    return {
      type: "inconsistent_pacing",
      severity: cv > 0.15 ? "high" : "medium",
      headline: `Inconsistent interval power (CV ${(cv * 100).toFixed(1)}%, range ${min}–${max}W)`,
      detail: `Power varied from ${min}W to ${max}W across ${powers.length} intervals. Target was ~${Math.round(avg)}W.`,
      evidence: { avg_w: Math.round(avg), min_w: min, max_w: max, cv_pct: Math.round(cv * 1000) / 10 },
      suggestion: "Focus on starting each rep at the same power. Use a 3-second rolling average target on your head unit.",
    };
  }

  return null;
}


/**
 * Compute durability insight from set metrics.
 */
export function computeDurabilityInsight(workIntervals, setMetrics) {
  if (!setMetrics?.durability_index || workIntervals.length < 3) return null;

  const di = setMetrics.durability_index;
  if (di >= 0.95 && di <= 1.05) return null; // Normal range, no insight needed

  if (di < 0.90) {
    return {
      type: "low_durability",
      severity: di < 0.85 ? "high" : "medium",
      headline: `Last rep was ${((1 - di) * 100).toFixed(0)}% below first rep`,
      detail: `Durability index: ${(di * 100).toFixed(0)}%. First interval: ${workIntervals[0].avg_power_w}W, last: ${workIntervals[workIntervals.length - 1].avg_power_w}W.`,
      evidence: { durability_index: di, first_w: workIntervals[0].avg_power_w, last_w: workIntervals[workIntervals.length - 1].avg_power_w },
      suggestion: di < 0.85
        ? "Significant power drop — consider fewer reps at higher quality, or more recovery between sets."
        : "Some fade is expected. Check if fueling or recovery length could help.",
    };
  }

  if (di > 1.05) {
    return {
      type: "strong_finish",
      severity: "positive",
      headline: `Built power across set — last rep ${((di - 1) * 100).toFixed(0)}% above first`,
      detail: `First: ${workIntervals[0].avg_power_w}W → Last: ${workIntervals[workIntervals.length - 1].avg_power_w}W. Strong negative-split execution.`,
      evidence: { durability_index: di, first_w: workIntervals[0].avg_power_w, last_w: workIntervals[workIntervals.length - 1].avg_power_w },
      suggestion: "Great execution — you may have room to start slightly higher next time.",
    };
  }

  return null;
}


/**
 * Build a concise text summary of interval insights for AI context.
 * This gets injected into the AI system prompt alongside the raw data.
 *
 * @param {object[]} insights - Array from generateIntervalInsights()
 * @returns {string} Formatted text summary
 */
export function formatInsightsForAI(insights) {
  if (!insights.length) return "";

  const lines = insights.map(i => {
    const severity = i.severity === "positive" ? "+" : i.severity === "high" ? "!" : "~";
    return `[${severity}] ${i.headline}${i.suggestion ? ` → ${i.suggestion}` : ""}`;
  });

  return `\n--- INTERVAL EXECUTION INSIGHTS ---\n${lines.join("\n")}`;
}

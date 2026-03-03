/**
 * Planned vs Actual comparison.
 *
 * Matches training_calendar entries to completed activities,
 * compares planned structure to actual intervals,
 * and computes an execution score.
 */

import { supabaseAdmin } from "./supabase.js";

/**
 * Find the matching training_calendar entry for an activity.
 *
 * @param {string} userId - User UUID
 * @param {string} startedAt - Activity start time ISO string
 * @returns {object|null} Training calendar entry or null
 */
export async function matchPlanToActivity(userId, startedAt) {
  if (!startedAt) return null;

  const activityDate = new Date(startedAt).toISOString().split("T")[0];

  const { data } = await supabaseAdmin
    .from("training_calendar")
    .select("*")
    .eq("user_id", userId)
    .eq("date", activityDate)
    .limit(1)
    .single();

  return data || null;
}

/**
 * Compare planned intervals to actual intervals.
 *
 * @param {object} plan - training_calendar entry with structure JSONB
 * @param {object} laps - activities.laps JSONB
 * @param {number} ftp - FTP at time of activity
 * @returns {object|null} Comparison result
 */
export function compareIntervals(plan, laps, ftp) {
  if (!plan?.structure || !laps?.intervals) return null;

  const plannedIntervals = Array.isArray(plan.structure) ? plan.structure : [];
  if (plannedIntervals.length === 0) return null;

  const actualWork = laps.intervals.filter(i => i.type === "work");
  if (actualWork.length === 0) return null;

  // Compare overall structure
  const plannedCount = plannedIntervals.length;
  const actualCount = actualWork.length;

  // Match planned to actual by index (simple alignment)
  const comparisons = [];
  const matchCount = Math.min(plannedCount, actualCount);

  for (let i = 0; i < matchCount; i++) {
    const planned = plannedIntervals[i];
    const actual = actualWork[i];

    // Planned target in watts (from % FTP)
    const targetWatts = planned.target_power_pct && ftp
      ? Math.round((planned.target_power_pct / 100) * ftp)
      : null;

    // Planned duration in seconds
    const targetDuration = planned.duration_min ? planned.duration_min * 60 : null;

    // Power deviation
    let powerDeviation = null;
    if (targetWatts && actual.avg_power_w) {
      powerDeviation = Math.round(((actual.avg_power_w - targetWatts) / targetWatts) * 100);
    }

    // Duration deviation
    let durationDeviation = null;
    if (targetDuration && actual.duration_s) {
      durationDeviation = Math.round(((actual.duration_s - targetDuration) / targetDuration) * 100);
    }

    comparisons.push({
      interval_index: i,
      planned_name: planned.name || `Interval ${i + 1}`,
      planned_watts: targetWatts,
      planned_duration_s: targetDuration,
      actual_watts: actual.avg_power_w,
      actual_duration_s: actual.duration_s,
      power_deviation_pct: powerDeviation,
      duration_deviation_pct: durationDeviation,
      notes: planned.notes || null,
    });
  }

  // Overall duration comparison
  const plannedDuration = plan.planned_duration_min ? plan.planned_duration_min * 60 : null;

  return {
    planned_count: plannedCount,
    actual_count: actualCount,
    count_match: plannedCount === actualCount,
    comparisons,
    planned_duration_s: plannedDuration,
    planned_tss: plan.planned_tss,
    planned_if: plan.planned_intensity_factor,
  };
}

/**
 * Compute an overall execution score (0-100).
 *
 * Scoring:
 * - 40 pts: interval count match
 * - 30 pts: power accuracy (avg deviation from target)
 * - 20 pts: duration accuracy
 * - 10 pts: consistency (low CV across intervals)
 *
 * @param {object} comparison - Output from compareIntervals()
 * @param {object} laps - activities.laps JSONB
 * @returns {object} { score, breakdown, label }
 */
export function computeExecutionScore(comparison, laps) {
  if (!comparison) return null;

  let score = 0;
  const breakdown = {};

  // 1. Count match (40 pts)
  if (comparison.count_match) {
    breakdown.count = 40;
  } else {
    const ratio = Math.min(comparison.actual_count, comparison.planned_count) /
      Math.max(comparison.actual_count, comparison.planned_count);
    breakdown.count = Math.round(ratio * 40);
  }
  score += breakdown.count;

  // 2. Power accuracy (30 pts)
  const powerDevs = comparison.comparisons
    .map(c => c.power_deviation_pct)
    .filter(d => d != null);

  if (powerDevs.length > 0) {
    const avgAbsDev = powerDevs.reduce((s, d) => s + Math.abs(d), 0) / powerDevs.length;
    // 0% deviation = 30 pts, 10% = 15 pts, 20% = 0 pts
    breakdown.power = Math.max(0, Math.round(30 * (1 - avgAbsDev / 20)));
  } else {
    breakdown.power = 15; // No data — neutral score
  }
  score += breakdown.power;

  // 3. Duration accuracy (20 pts)
  const durDevs = comparison.comparisons
    .map(c => c.duration_deviation_pct)
    .filter(d => d != null);

  if (durDevs.length > 0) {
    const avgAbsDev = durDevs.reduce((s, d) => s + Math.abs(d), 0) / durDevs.length;
    breakdown.duration = Math.max(0, Math.round(20 * (1 - avgAbsDev / 30)));
  } else {
    breakdown.duration = 10;
  }
  score += breakdown.duration;

  // 4. Consistency (10 pts)
  if (laps?.set_metrics?.power_consistency_cv != null) {
    const cv = laps.set_metrics.power_consistency_cv;
    // CV < 3% = 10 pts, CV > 15% = 0 pts
    breakdown.consistency = Math.max(0, Math.round(10 * (1 - cv / 0.15)));
  } else {
    breakdown.consistency = 5;
  }
  score += breakdown.consistency;

  // Label
  let label;
  if (score >= 85) label = "excellent";
  else if (score >= 70) label = "good";
  else if (score >= 50) label = "fair";
  else label = "needs_work";

  return { score, breakdown, label };
}

/**
 * Full planned-vs-actual pipeline for an activity.
 * Returns null if no training plan exists for that date.
 *
 * @param {string} userId
 * @param {object} activity - Activity record with laps and started_at
 * @param {number} ftp
 * @returns {object|null} { plan, comparison, execution_score }
 */
export async function getPlannedVsActual(userId, activity, ftp) {
  const plan = await matchPlanToActivity(userId, activity.started_at);
  if (!plan) return null;

  const comparison = compareIntervals(plan, activity.laps, ftp);
  const executionScore = computeExecutionScore(comparison, activity.laps);

  return {
    plan: {
      title: plan.title,
      description: plan.description,
      workout_type: plan.workout_type,
      planned_duration_min: plan.planned_duration_min,
      planned_tss: plan.planned_tss,
      structure: plan.structure,
      nutrition_plan: plan.nutrition_plan,
    },
    comparison,
    execution_score: executionScore,
  };
}

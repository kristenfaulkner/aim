/**
 * Cross-Training Utilities — pure functions, no DB calls.
 *
 * Estimates recovery impact and training stress for non-cycling activities
 * like strength, yoga, swimming, hiking, etc.
 */

// ============================================================
// Recovery Impact Estimation
// ============================================================

/**
 * Estimate the recovery impact of a cross-training session on cycling performance.
 *
 * @param {object} entry - Cross-training log entry
 * @param {string} entry.activity_type - 'strength' | 'yoga' | 'swimming' | 'hiking' | 'pilates' | 'other'
 * @param {string} entry.body_region - 'upper_body' | 'lower_body' | 'full_body' | 'core' | null
 * @param {number} entry.perceived_intensity - 1-5
 * @returns {string} 'none' | 'minor' | 'moderate' | 'major'
 */
export function estimateRecoveryImpact(entry) {
  if (!entry) return "none";

  const type = (entry.activity_type || "").toLowerCase();
  const region = (entry.body_region || "").toLowerCase();
  const intensity = entry.perceived_intensity || 3;

  // Yoga and pilates have minimal impact on cycling performance
  if (type === "yoga" || type === "pilates") return "none";

  // Low intensity anything is minor
  if (intensity <= 2) return "minor";

  // Heavy lower body work directly impacts cycling
  if (region === "lower_body" && intensity >= 4) return "major";

  // Heavy full body work has moderate-to-major impact
  if (region === "full_body" && intensity >= 4) return "major";
  if (region === "full_body" && intensity >= 3) return "moderate";

  // Upper body rarely impacts cycling/running
  if (region === "upper_body") return "minor";

  // Core work at moderate+ intensity
  if (region === "core" && intensity >= 4) return "moderate";
  if (region === "core") return "minor";

  // Default for unspecified region at moderate+ intensity
  return "moderate";
}

// ============================================================
// TSS Estimation
// ============================================================

/**
 * Estimate training stress score (TSS equivalent) for cross-training activities.
 *
 * Uses a simplified model based on perceived intensity and duration.
 * Not directly comparable to power-based TSS, but gives the training load
 * model a reasonable proxy for non-cycling stress.
 *
 * Rough scale:
 *   Intensity 1 (easy):     ~0.3 TSS/min  (yoga, stretching)
 *   Intensity 2 (moderate): ~0.5 TSS/min  (light swim, easy hike)
 *   Intensity 3 (hard):     ~0.75 TSS/min (moderate strength, tempo swim)
 *   Intensity 4 (very hard): ~1.0 TSS/min (heavy lifting, hard swim)
 *   Intensity 5 (max):      ~1.25 TSS/min (HIIT, CrossFit, race-pace)
 *
 * @param {object} entry - Cross-training log entry
 * @param {number} entry.perceived_intensity - 1-5
 * @param {number} entry.duration_minutes - Duration in minutes
 * @returns {number} Estimated TSS
 */
export function estimateCrossTrainingTSS(entry) {
  if (!entry || !entry.duration_minutes) return 0;

  const intensity = entry.perceived_intensity || 3;
  const duration = entry.duration_minutes;

  const tssPerMinute = {
    1: 0.3,
    2: 0.5,
    3: 0.75,
    4: 1.0,
    5: 1.25,
  };

  const rate = tssPerMinute[intensity] || 0.75;
  return Math.round(rate * duration);
}

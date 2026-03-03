/**
 * Critical Power (CP) & W' Model — pure math functions.
 *
 * The classic 2-parameter model: P(t) = W'/t + CP
 * Rearranged to linear form: Work(t) = W' + CP × t
 * Slope = CP, intercept = W' (joules).
 *
 * CP is the highest power sustainable without continuous W' depletion.
 * W' is the finite anaerobic energy reserve above CP (kJ).
 * Pmax is peak neuromuscular/sprint power (best 5s proxy).
 */

/**
 * Duration labels → seconds mapping, matching power_profiles columns.
 */
const DURATION_MAP = {
  best_5s_watts: 5,
  best_30s_watts: 30,
  best_1m_watts: 60,
  best_5m_watts: 300,
  best_20m_watts: 1200,
  best_60m_watts: 3600,
};

/**
 * Fit the 2-parameter CP model using ordinary least squares (OLS)
 * on the linear work-time form: Work = W' + CP × t.
 *
 * @param {Object} bestEfforts - power_profiles row with best_Xs_watts fields
 * @returns {Object|null} { cp_watts, w_prime_kj, pmax_watts, r_squared, model_data } or null if insufficient data
 */
export function fitCPModel(bestEfforts) {
  if (!bestEfforts) return null;

  // Build data points from non-null bests
  const points = [];
  for (const [col, durationS] of Object.entries(DURATION_MAP)) {
    const watts = bestEfforts[col];
    if (watts && watts > 0) {
      points.push({ duration_s: durationS, watts });
    }
  }

  // Need at least 3 data points for a meaningful fit
  if (points.length < 3) return null;

  // Need both short (<= 60s) and long (>= 300s) efforts for valid model
  const hasShort = points.some((p) => p.duration_s <= 60);
  const hasLong = points.some((p) => p.duration_s >= 300);
  if (!hasShort || !hasLong) return null;

  // OLS linear regression on (t, Work) where Work = watts × duration_s
  // Work = W' + CP × t  →  slope = CP, intercept = W'
  const n = points.length;
  let sumT = 0,
    sumW = 0,
    sumTT = 0,
    sumTW = 0;

  for (const p of points) {
    const t = p.duration_s;
    const work = p.watts * t; // joules
    sumT += t;
    sumW += work;
    sumTT += t * t;
    sumTW += t * work;
  }

  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return null;

  const cp = (n * sumTW - sumT * sumW) / denom;
  const wPrimeJ = (sumW * sumTT - sumT * sumTW) / denom;
  const wPrimeKj = wPrimeJ / 1000;

  // Sanity bounds
  if (cp <= 0) return null;
  if (wPrimeJ <= 0) return null;
  if (wPrimeKj > 50) return null; // physiological upper limit

  // CP should not vastly exceed longest-duration best
  const longest = bestEfforts.best_60m_watts || bestEfforts.best_20m_watts;
  if (longest && cp > longest * 1.15) return null;

  // Compute R-squared (coefficient of determination)
  const meanW = sumW / n;
  let ssTot = 0,
    ssRes = 0;
  for (const p of points) {
    const work = p.watts * p.duration_s;
    const predicted = wPrimeJ + cp * p.duration_s;
    ssTot += (work - meanW) ** 2;
    ssRes += (work - predicted) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 10000) / 10000 : 0;

  const pmax = estimatePmax(bestEfforts);

  return {
    cp_watts: Math.round(cp),
    w_prime_kj: Math.round(wPrimeKj * 10) / 10,
    pmax_watts: pmax,
    r_squared: rSquared,
    model_data: points,
  };
}

/**
 * Estimate Pmax (peak neuromuscular power) from best short-duration efforts.
 * Uses best 5s as practical proxy; falls back to 30s.
 *
 * @param {Object} bestEfforts - power_profiles row
 * @returns {number|null}
 */
export function estimatePmax(bestEfforts) {
  if (!bestEfforts) return null;
  return bestEfforts.best_5s_watts || bestEfforts.best_30s_watts || null;
}

/**
 * Compute CP-based 6-zone model (Skiba/Vanhatalo structure).
 * Optional alternative to Coggan 7-zone FTP model.
 *
 * @param {number} cp - Critical Power in watts
 * @returns {Array|null} Zone objects with zone, name, min, max, color
 */
export function computeCPZones(cp) {
  if (!cp || cp <= 0) return null;
  return [
    { zone: "Z1", name: "Recovery", min: 0, max: Math.round(cp * 0.55), color: "#6b7280" },
    { zone: "Z2", name: "Endurance", min: Math.round(cp * 0.55), max: Math.round(cp * 0.75), color: "#3b82f6" },
    { zone: "Z3", name: "Tempo", min: Math.round(cp * 0.75), max: Math.round(cp * 0.9), color: "#10b981" },
    { zone: "Z4", name: "Threshold", min: Math.round(cp * 0.9), max: Math.round(cp * 1.05), color: "#f59e0b" },
    { zone: "Z5", name: "VO2max", min: Math.round(cp * 1.05), max: Math.round(cp * 1.3), color: "#ef4444" },
    { zone: "Z6", name: "Anaerobic", min: Math.round(cp * 1.3), max: null, color: "#8b5cf6" },
  ];
}

/**
 * Format CP model data as a context string for AI analysis.
 *
 * @param {Object} cpModel - { cp_watts, w_prime_kj, pmax_watts, r_squared }
 * @param {number|null} ftp - Athlete's FTP in watts
 * @returns {string} Formatted context string, empty if no CP data
 */
export function formatCPModelForAI(cpModel, ftp) {
  if (!cpModel?.cp_watts) return "";

  const parts = [`CP: ${cpModel.cp_watts}W`, `W': ${cpModel.w_prime_kj} kJ`];
  if (cpModel.pmax_watts) parts.push(`Pmax: ${cpModel.pmax_watts}W`);
  if (ftp) {
    const delta = cpModel.cp_watts - ftp;
    parts.push(`CP vs FTP: ${delta > 0 ? "+" : ""}${delta}W`);
  }
  if (cpModel.r_squared != null) {
    parts.push(`Model fit R²: ${cpModel.r_squared}`);
  }

  return `\n--- CRITICAL POWER MODEL ---\n${parts.join(" | ")}\nCP is the aerobic ceiling (highest sustainable power without W' depletion). W' is the finite anaerobic reserve above CP. Pmax is peak sprint power.`;
}

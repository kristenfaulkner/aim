/**
 * Compute Coggan 7-zone power zones from FTP.
 * Returns array of zone objects with boundaries in watts.
 */
export function computePowerZones(ftp) {
  if (!ftp) return null;
  return [
    { zone: "Z1", name: "Recovery", min: 0, max: Math.round(ftp * 0.55), color: "#6b7280" },
    { zone: "Z2", name: "Endurance", min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75), color: "#3b82f6" },
    { zone: "Z3", name: "Tempo", min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.90), color: "#10b981" },
    { zone: "Z4", name: "Threshold", min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.05), color: "#f59e0b" },
    { zone: "Z5", name: "VO2max", min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.20), color: "#ef4444" },
    { zone: "Z6", name: "Anaerobic", min: Math.round(ftp * 1.20), max: Math.round(ftp * 1.50), color: "#8b5cf6" },
    { zone: "Z7", name: "Sprint", min: Math.round(ftp * 1.50), max: null, color: "#7c3aed" },
  ];
}

/**
 * Compute 5-zone HR zones from max heart rate.
 * Returns array of zone objects with boundaries in bpm.
 */
export function computeHRZones(maxHR) {
  if (!maxHR) return null;
  return [
    { zone: "Z1", name: "Recovery", min: 0, max: Math.round(maxHR * 0.60), color: "#6b7280" },
    { zone: "Z2", name: "Aerobic", min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70), color: "#3b82f6" },
    { zone: "Z3", name: "Tempo", min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80), color: "#10b981" },
    { zone: "Z4", name: "Threshold", min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90), color: "#f59e0b" },
    { zone: "Z5", name: "VO2max", min: Math.round(maxHR * 0.90), max: maxHR, color: "#ef4444" },
  ];
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

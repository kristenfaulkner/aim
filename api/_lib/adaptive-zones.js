/**
 * Adaptive Training Zones — pure functions.
 *
 * Zones auto-adjust based on:
 * 1. CP model (when available) vs traditional FTP-based Coggan zones
 * 2. Daily readiness signals (recovery score, TSB) — shifts targets down on red days
 *
 * No DB calls — fully testable.
 */

import { computePowerZones, computeCPZones } from "../../src/lib/zones.js";

/**
 * Select the correct zone set based on user preference and available data.
 *
 * @param {number|null} cp - Critical Power in watts
 * @param {number|null} ftp - FTP in watts
 * @param {string} preference - "auto" | "cp" | "coggan"
 * @returns {{ zones: Array, source: string, referenceWatts: number }|null}
 */
export function computeAdaptiveZones(cp, ftp, preference = "auto") {
  if (preference === "cp" && cp > 0) {
    return { zones: computeCPZones(cp), source: "cp", referenceWatts: cp };
  }
  if (preference === "coggan" && ftp > 0) {
    return { zones: computePowerZones(ftp), source: "ftp", referenceWatts: ftp };
  }
  // Auto: prefer CP when available
  if (cp > 0) {
    return { zones: computeCPZones(cp), source: "cp", referenceWatts: cp };
  }
  if (ftp > 0) {
    return { zones: computePowerZones(ftp), source: "ftp", referenceWatts: ftp };
  }
  return null;
}

/**
 * Apply readiness-based zone adjustment — the AIM differentiator.
 *
 * On fatigued or under-recovered days, shift zone boundaries down so
 * prescribed workouts remain achievable.
 *
 * @param {Array} zones - Zone objects with { zone, name, min, max, color }
 * @param {number|null} recoveryScore - 0-100 (green 70+, yellow 45-69, red <45)
 * @param {number|null} tsb - Training Stress Balance
 * @returns {{ zones: Array, adjustmentPct: number, reason: string|null }}
 */
export function applyReadinessAdjustment(zones, recoveryScore, tsb) {
  if (!zones || zones.length === 0) {
    return { zones: zones || [], adjustmentPct: 0, reason: null };
  }

  let adjustPct = 0;
  const reasons = [];

  // Recovery score signal
  if (recoveryScore != null) {
    if (recoveryScore < 45) {
      adjustPct -= 5;
      reasons.push(`recovery ${recoveryScore}/100 (red)`);
    } else if (recoveryScore < 70) {
      adjustPct -= 3;
      reasons.push(`recovery ${recoveryScore}/100 (yellow)`);
    }
  }

  // TSB signal — deep overreaching
  if (tsb != null && tsb < -30) {
    adjustPct -= 2;
    reasons.push(`TSB ${Math.round(tsb)} (overreaching)`);
  }

  // Cap total adjustment
  adjustPct = Math.max(adjustPct, -8);

  if (adjustPct === 0) {
    return { zones, adjustmentPct: 0, reason: null };
  }

  const factor = 1 + adjustPct / 100;
  const adjusted = zones.map((z) => ({
    ...z,
    min: z.min ? Math.round(z.min * factor) : 0,
    max: z.max ? Math.round(z.max * factor) : null,
  }));

  return {
    zones: adjusted,
    adjustmentPct: adjustPct,
    reason: reasons.join("; "),
  };
}

/**
 * Compare two zone arrays and produce human-readable deltas.
 *
 * @param {Array} currentZones - Current zone array
 * @param {Array} previousZones - Previous zone array
 * @returns {Array} Delta objects with { zone, name, oldMin, oldMax, newMin, newMax, deltaMin, deltaMax }
 */
export function computeZoneDelta(currentZones, previousZones) {
  if (!currentZones || !previousZones) return [];
  if (currentZones.length === 0 || previousZones.length === 0) return [];

  const deltas = [];
  const prevMap = Object.fromEntries(previousZones.map((z) => [z.zone, z]));

  for (const cur of currentZones) {
    const prev = prevMap[cur.zone];
    if (!prev) continue;

    const deltaMin = (cur.min || 0) - (prev.min || 0);
    const deltaMax =
      cur.max != null && prev.max != null ? cur.max - prev.max : null;

    if (deltaMin !== 0 || (deltaMax != null && deltaMax !== 0)) {
      deltas.push({
        zone: cur.zone,
        name: cur.name,
        oldMin: prev.min || 0,
        oldMax: prev.max,
        newMin: cur.min || 0,
        newMax: cur.max,
        deltaMin,
        deltaMax,
      });
    }
  }

  return deltas;
}

/**
 * Create a zone history snapshot for storage in power_profiles.zones_history.
 *
 * @param {number} cp - CP in watts
 * @param {Array} zones - Zone array
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Object} { date, cp_watts, zones }
 */
export function buildZonesSnapshot(cp, zones, date) {
  return { date, cp_watts: cp, zones };
}

/**
 * Format adaptive zones context for AI analysis.
 *
 * @param {{ zones: Array, source: string, referenceWatts: number }} adaptiveZones
 * @param {{ zones: Array, adjustmentPct: number, reason: string|null }} adjusted
 * @param {Array|null} zoneDelta - From computeZoneDelta
 * @returns {string}
 */
export function formatAdaptiveZonesForAI(adaptiveZones, adjusted, zoneDelta) {
  if (!adaptiveZones?.zones) return "";

  const parts = [];
  parts.push(
    `Zones from ${adaptiveZones.source === "cp" ? "CP" : "FTP"} ${adaptiveZones.referenceWatts}W`
  );

  // Zone boundaries
  const zoneStr = adaptiveZones.zones
    .map(
      (z) =>
        `${z.zone} ${z.name}: ${z.min}-${z.max != null ? z.max : "∞"}W`
    )
    .join(", ");
  parts.push(zoneStr);

  // Readiness adjustment
  if (adjusted?.adjustmentPct && adjusted.adjustmentPct !== 0) {
    parts.push(
      `Today readiness-adjusted ${adjusted.adjustmentPct}% (${adjusted.reason})`
    );
  }

  // Zone evolution
  if (zoneDelta?.length > 0) {
    const changes = zoneDelta
      .filter((d) => d.deltaMin !== 0)
      .map(
        (d) =>
          `${d.zone} floor ${d.deltaMin > 0 ? "+" : ""}${d.deltaMin}W (${d.oldMin}→${d.newMin}W)`
      )
      .join(", ");
    if (changes) parts.push(`Recent changes: ${changes}`);
  }

  return `\n--- ADAPTIVE TRAINING ZONES ---\n${parts.join("\n")}`;
}

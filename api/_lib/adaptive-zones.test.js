import { describe, it, expect } from "vitest";
import {
  computeAdaptiveZones,
  applyReadinessAdjustment,
  computeZoneDelta,
  buildZonesSnapshot,
  formatAdaptiveZonesForAI,
} from "./adaptive-zones.js";

describe("computeAdaptiveZones", () => {
  it("returns CP zones when preference is 'cp' and CP exists", () => {
    const result = computeAdaptiveZones(280, 260, "cp");
    expect(result.source).toBe("cp");
    expect(result.referenceWatts).toBe(280);
    expect(result.zones).toHaveLength(6);
    expect(result.zones[0].zone).toBe("Z1");
  });

  it("returns Coggan zones when preference is 'coggan'", () => {
    const result = computeAdaptiveZones(280, 260, "coggan");
    expect(result.source).toBe("ftp");
    expect(result.referenceWatts).toBe(260);
    expect(result.zones).toHaveLength(7); // Coggan has 7 zones
  });

  it("returns CP zones in auto mode when CP exists", () => {
    const result = computeAdaptiveZones(280, 260, "auto");
    expect(result.source).toBe("cp");
    expect(result.referenceWatts).toBe(280);
  });

  it("returns Coggan zones in auto mode when only FTP exists", () => {
    const result = computeAdaptiveZones(null, 260, "auto");
    expect(result.source).toBe("ftp");
    expect(result.referenceWatts).toBe(260);
  });

  it("returns null when neither CP nor FTP exist", () => {
    expect(computeAdaptiveZones(null, null, "auto")).toBeNull();
    expect(computeAdaptiveZones(0, 0, "auto")).toBeNull();
  });

  it("defaults to auto preference when not specified", () => {
    const result = computeAdaptiveZones(280, 260);
    expect(result.source).toBe("cp");
  });
});

describe("applyReadinessAdjustment", () => {
  const baseZones = [
    { zone: "Z1", name: "Recovery", min: 0, max: 154, color: "#6b7280" },
    { zone: "Z2", name: "Endurance", min: 154, max: 210, color: "#3b82f6" },
    { zone: "Z3", name: "Tempo", min: 210, max: 252, color: "#10b981" },
    { zone: "Z4", name: "Threshold", min: 252, max: 294, color: "#f59e0b" },
    { zone: "Z5", name: "VO2max", min: 294, max: 364, color: "#ef4444" },
    { zone: "Z6", name: "Anaerobic", min: 364, max: null, color: "#8b5cf6" },
  ];

  it("returns unadjusted zones when recovery is green (>=70)", () => {
    const result = applyReadinessAdjustment(baseZones, 85, 10);
    expect(result.adjustmentPct).toBe(0);
    expect(result.reason).toBeNull();
    expect(result.zones).toEqual(baseZones);
  });

  it("shifts zones down 3% for yellow recovery (45-69)", () => {
    const result = applyReadinessAdjustment(baseZones, 55, 10);
    expect(result.adjustmentPct).toBe(-3);
    expect(result.reason).toContain("yellow");
    // Z3 min should be ~204 (210 * 0.97 = 203.7 → 204)
    expect(result.zones[2].min).toBe(204);
  });

  it("shifts zones down 5% for red recovery (<45)", () => {
    const result = applyReadinessAdjustment(baseZones, 30, 10);
    expect(result.adjustmentPct).toBe(-5);
    expect(result.reason).toContain("red");
    // Z3 min should be ~200 (210 * 0.95 = 199.5 → 200)
    expect(result.zones[2].min).toBe(200);
  });

  it("adds 2% shift for TSB < -30 (overreaching)", () => {
    const result = applyReadinessAdjustment(baseZones, 55, -35);
    expect(result.adjustmentPct).toBe(-5); // -3 (yellow) + -2 (TSB)
    expect(result.reason).toContain("yellow");
    expect(result.reason).toContain("overreaching");
  });

  it("caps total adjustment at -8%", () => {
    const result = applyReadinessAdjustment(baseZones, 30, -40);
    expect(result.adjustmentPct).toBe(-7); // -5 (red) + -2 (TSB) = -7
    // Even more extreme:
    const result2 = applyReadinessAdjustment(baseZones, 10, -50);
    expect(result2.adjustmentPct).toBe(-7); // Still -5 + -2 = -7 (capped at -8)
  });

  it("returns unadjusted zones when no readiness data exists", () => {
    const result = applyReadinessAdjustment(baseZones, null, null);
    expect(result.adjustmentPct).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("keeps Z1 min at 0 and last zone max at null", () => {
    const result = applyReadinessAdjustment(baseZones, 30, -35);
    expect(result.zones[0].min).toBe(0);
    expect(result.zones[result.zones.length - 1].max).toBeNull();
  });

  it("preserves zone names and colors", () => {
    const result = applyReadinessAdjustment(baseZones, 30, 10);
    for (let i = 0; i < baseZones.length; i++) {
      expect(result.zones[i].name).toBe(baseZones[i].name);
      expect(result.zones[i].color).toBe(baseZones[i].color);
      expect(result.zones[i].zone).toBe(baseZones[i].zone);
    }
  });

  it("handles empty or null zones gracefully", () => {
    expect(applyReadinessAdjustment(null, 30, -35).adjustmentPct).toBe(0);
    expect(applyReadinessAdjustment([], 30, -35).adjustmentPct).toBe(0);
  });
});

describe("computeZoneDelta", () => {
  it("computes correct deltas between two zone sets", () => {
    const current = [
      { zone: "Z3", name: "Tempo", min: 210, max: 252 },
      { zone: "Z4", name: "Threshold", min: 252, max: 294 },
    ];
    const previous = [
      { zone: "Z3", name: "Tempo", min: 200, max: 240 },
      { zone: "Z4", name: "Threshold", min: 240, max: 280 },
    ];
    const delta = computeZoneDelta(current, previous);
    expect(delta).toHaveLength(2);
    expect(delta[0].deltaMin).toBe(10);
    expect(delta[0].deltaMax).toBe(12);
  });

  it("returns empty array when zones are identical", () => {
    const zones = [{ zone: "Z1", name: "Recovery", min: 0, max: 154 }];
    expect(computeZoneDelta(zones, zones)).toHaveLength(0);
  });

  it("handles null inputs", () => {
    expect(computeZoneDelta(null, null)).toHaveLength(0);
    expect(computeZoneDelta([], null)).toHaveLength(0);
  });
});

describe("buildZonesSnapshot", () => {
  it("creates a snapshot object", () => {
    const zones = [{ zone: "Z1", min: 0, max: 150 }];
    const snap = buildZonesSnapshot(280, zones, "2026-03-01");
    expect(snap.date).toBe("2026-03-01");
    expect(snap.cp_watts).toBe(280);
    expect(snap.zones).toEqual(zones);
  });
});

describe("formatAdaptiveZonesForAI", () => {
  it("includes zone source and boundaries", () => {
    const adaptive = {
      zones: [
        { zone: "Z1", name: "Recovery", min: 0, max: 154 },
        { zone: "Z2", name: "Endurance", min: 154, max: 210 },
      ],
      source: "cp",
      referenceWatts: 280,
    };
    const adjusted = { zones: adaptive.zones, adjustmentPct: 0, reason: null };
    const text = formatAdaptiveZonesForAI(adaptive, adjusted, null);
    expect(text).toContain("CP 280W");
    expect(text).toContain("Z1 Recovery");
  });

  it("includes readiness adjustment when present", () => {
    const adaptive = {
      zones: [{ zone: "Z1", name: "Recovery", min: 0, max: 154 }],
      source: "cp",
      referenceWatts: 280,
    };
    const adjusted = { adjustmentPct: -5, reason: "recovery 30/100 (red)" };
    const text = formatAdaptiveZonesForAI(adaptive, adjusted, null);
    expect(text).toContain("-5%");
    expect(text).toContain("red");
  });

  it("returns empty string when no zones", () => {
    expect(formatAdaptiveZonesForAI(null, null, null)).toBe("");
  });
});

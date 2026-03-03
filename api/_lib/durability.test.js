import { describe, it, expect } from "vitest";
import {
  computeDurabilityData,
  computeDurabilityScore,
  aggregateDurability,
  predictFatiguedPower,
  formatDurabilityForAI,
} from "./durability.js";

// Helper: generate a power stream of constant watts for durationSec at 1Hz
function constantStream(watts, durationSec) {
  const w = new Array(durationSec).fill(watts);
  const t = Array.from({ length: durationSec }, (_, i) => i);
  return { watts: w, time: t };
}

// Helper: generate a declining power stream (linear fade)
function fadingStream(startWatts, endWatts, durationSec) {
  const w = [];
  const t = [];
  for (let i = 0; i < durationSec; i++) {
    w.push(Math.round(startWatts + (endWatts - startWatts) * (i / (durationSec - 1))));
    t.push(i);
  }
  return { watts: w, time: t };
}

describe("computeDurabilityData", () => {
  it("returns null for null/empty inputs", () => {
    expect(computeDurabilityData(null, null, 75)).toBeNull();
    expect(computeDurabilityData([], [], 75)).toBeNull();
    expect(computeDurabilityData([200], [0], 75)).toBeNull();
  });

  it("returns null when weightKg is invalid", () => {
    const { watts, time } = constantStream(250, 3600);
    expect(computeDurabilityData(watts, time, 0)).toBeNull();
    expect(computeDurabilityData(watts, time, null)).toBeNull();
  });

  it("returns null for short rides (< 10 kJ/kg)", () => {
    // 200W for 20 min = 240 kJ / 75 kg = 3.2 kJ/kg
    const { watts, time } = constantStream(200, 1200);
    expect(computeDurabilityData(watts, time, 75)).toBeNull();
  });

  it("returns data for rides with sufficient work", () => {
    // 250W for 2 hours = 1800 kJ / 75 kg = 24 kJ/kg
    const { watts, time } = constantStream(250, 7200);
    const result = computeDurabilityData(watts, time, 75);
    expect(result).not.toBeNull();
    expect(result.total_kj_per_kg).toBe(24);
    expect(result.buckets.length).toBeGreaterThanOrEqual(2);
  });

  it("produces score ≈ 1.0 for constant power", () => {
    // 300W for 3 hours = 3240 kJ / 75 kg = 43.2 kJ/kg (fills all 4 buckets)
    const { watts, time } = constantStream(300, 10800);
    const result = computeDurabilityData(watts, time, 75);
    expect(result).not.toBeNull();
    // Constant power means fatigued power should equal fresh power
    if (result.score_5m != null) {
      expect(result.score_5m).toBeCloseTo(1.0, 1);
    }
  });

  it("detects power fade (score < 1.0 for declining power)", () => {
    // 350W → 200W over 3 hours at 75kg
    const { watts, time } = fadingStream(350, 200, 10800);
    const result = computeDurabilityData(watts, time, 75);
    expect(result).not.toBeNull();
    // Power declines, so fatigued bucket should have lower power than fresh
    if (result.score_5m != null) {
      expect(result.score_5m).toBeLessThan(1.0);
    }
  });

  it("correctly assigns samples to fatigue buckets", () => {
    // 250W for 2h at 75kg: total 24 kJ/kg
    // Bucket 0-10: first ~40 min (2400s at 250W = 600kJ → 8 kJ/kg per 2400s)
    // Actually: 10 kJ/kg threshold at 250W/75kg → 10*75*1000/250 = 3000s
    const { watts, time } = constantStream(250, 7200);
    const result = computeDurabilityData(watts, time, 75);
    expect(result.buckets.length).toBeGreaterThanOrEqual(2);
    // First bucket should start at 0
    expect(result.buckets[0].kj_kg_min).toBe(0);
  });

  it("computes best power within each bucket", () => {
    // Two-phase ride: 350W for 1.5h then 250W for 1.5h at 75kg
    const phase1 = new Array(5400).fill(350);
    const phase2 = new Array(5400).fill(250);
    const watts = [...phase1, ...phase2];
    const time = Array.from({ length: watts.length }, (_, i) => i);
    const result = computeDurabilityData(watts, time, 75);
    expect(result).not.toBeNull();
    // Fresh bucket (mostly 350W) should have higher 5m power than fatigued (250W)
    const fresh = result.buckets.find((b) => b.kj_kg_min === 0);
    const last = result.buckets[result.buckets.length - 1];
    if (fresh?.best_5m && last?.best_5m) {
      expect(fresh.best_5m).toBeGreaterThan(last.best_5m);
    }
  });

  it("returns correct total_kj_per_kg", () => {
    // 200W for 1h = 720 kJ / 60 kg = 12 kJ/kg
    const { watts, time } = constantStream(200, 3600);
    const result = computeDurabilityData(watts, time, 60);
    expect(result.total_kj_per_kg).toBe(12);
  });
});

describe("computeDurabilityScore", () => {
  it("extracts 5m retention score from durability data", () => {
    const data = { score_5m: 0.92, score_20m: 0.88 };
    expect(computeDurabilityScore(data, "best_5m")).toBe(0.92);
  });

  it("returns null for missing data", () => {
    expect(computeDurabilityScore(null)).toBeNull();
    expect(computeDurabilityScore({ score_5m: null })).toBeNull();
  });

  it("extracts other duration scores", () => {
    const data = { score_1m: 0.85 };
    expect(computeDurabilityScore(data, "best_1m")).toBe(0.85);
  });
});

describe("aggregateDurability", () => {
  const makeActivity = (date, score5m, buckets) => ({
    date,
    durability_data: {
      score_5m: score5m,
      buckets: buckets || [
        { range: "0-10", kj_kg_min: 0, kj_kg_max: 10, best_5m: 300 },
        { range: "30+", kj_kg_min: 30, kj_kg_max: null, best_5m: Math.round(300 * score5m) },
      ],
    },
  });

  it("returns null for insufficient data (<3 activities)", () => {
    expect(aggregateDurability([makeActivity("2026-03-01", 0.9)])).toBeNull();
  });

  it("averages scores across multiple activities", () => {
    const activities = [
      makeActivity("2026-03-01", 0.90),
      makeActivity("2026-03-02", 0.92),
      makeActivity("2026-03-03", 0.88),
    ];
    const result = aggregateDurability(activities);
    expect(result.avgScore).toBe(0.9);
  });

  it("builds trend array sorted by date", () => {
    const activities = [
      makeActivity("2026-03-03", 0.88),
      makeActivity("2026-03-01", 0.90),
      makeActivity("2026-03-02", 0.92),
    ];
    const result = aggregateDurability(activities);
    expect(result.trend[0].date).toBe("2026-03-01");
    expect(result.trend[result.trend.length - 1].date).toBe("2026-03-03");
  });

  it("computes best-of buckets correctly", () => {
    const activities = [
      makeActivity("2026-03-01", 0.90, [
        { range: "0-10", kj_kg_min: 0, kj_kg_max: 10, best_5m: 300 },
      ]),
      makeActivity("2026-03-02", 0.92, [
        { range: "0-10", kj_kg_min: 0, kj_kg_max: 10, best_5m: 310 },
      ]),
      makeActivity("2026-03-03", 0.88, [
        { range: "0-10", kj_kg_min: 0, kj_kg_max: 10, best_5m: 295 },
      ]),
    ];
    const result = aggregateDurability(activities);
    const bucket = result.bestBuckets.find((b) => b.range === "0-10");
    expect(bucket.best_5m).toBe(310); // best-of
  });
});

describe("predictFatiguedPower", () => {
  const buckets = [
    { range: "0-10", kj_kg_min: 0, kj_kg_max: 10, best_5m: 320 },
    { range: "10-20", kj_kg_min: 10, kj_kg_max: 20, best_5m: 310 },
    { range: "20-30", kj_kg_min: 20, kj_kg_max: 30, best_5m: 295 },
    { range: "30+", kj_kg_min: 30, kj_kg_max: null, best_5m: 280 },
  ];

  it("interpolates power between bucket midpoints", () => {
    const result = predictFatiguedPower(buckets, 15, "best_5m");
    expect(result).not.toBeNull();
    // At 15 kJ/kg, between bucket midpoints 5 and 15, should be ~310W
    expect(result.predictedWatts).toBeGreaterThan(290);
    expect(result.predictedWatts).toBeLessThan(320);
  });

  it("returns prediction for extrapolation beyond last bucket", () => {
    const result = predictFatiguedPower(buckets, 45, "best_5m");
    expect(result).not.toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.predictedWatts).toBeLessThan(280);
  });

  it("returns null when no bucket data exists", () => {
    expect(predictFatiguedPower(null, 20, "best_5m")).toBeNull();
    expect(predictFatiguedPower([], 20, "best_5m")).toBeNull();
  });
});

describe("formatDurabilityForAI", () => {
  it("formats per-ride and aggregate data", () => {
    const data = {
      total_kj_per_kg: 35.2,
      score_5m: 0.92,
      score_20m: 0.88,
      buckets: [
        { kj_kg_min: 0, best_5m: 320 },
        { kj_kg_min: 30, best_5m: 295 },
      ],
    };
    const text = formatDurabilityForAI(data, 0.89, null);
    expect(text).toContain("35.2 kJ/kg");
    expect(text).toContain("92%");
    expect(text).toContain("89%");
  });

  it("includes trend direction", () => {
    const trend = [
      { date: "2026-02-01", score: 0.85 },
      { date: "2026-02-15", score: 0.87 },
      { date: "2026-03-01", score: 0.90 },
      { date: "2026-03-15", score: 0.92 },
    ];
    const text = formatDurabilityForAI(null, 0.89, trend);
    expect(text).toContain("+7%");
  });

  it("returns empty string when no data", () => {
    expect(formatDurabilityForAI(null, null, null)).toBe("");
  });
});

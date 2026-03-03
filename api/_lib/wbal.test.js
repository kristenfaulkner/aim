import { describe, it, expect } from "vitest";
import {
  computeWbalStream,
  summarizeWbal,
  formatWbalForAI,
} from "./wbal.js";

// Helper: generate a constant power stream at 1Hz
function constantStream(watts, durationSec) {
  const w = new Array(durationSec).fill(watts);
  const t = Array.from({ length: durationSec }, (_, i) => i);
  return { watts: w, time: t };
}

// Helper: generate interval workout (alternating high/low)
function intervalStream(highW, lowW, intervalSec, restSec, repeats) {
  const w = [];
  const t = [];
  let idx = 0;
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < intervalSec; i++) {
      w.push(highW);
      t.push(idx++);
    }
    for (let i = 0; i < restSec; i++) {
      w.push(lowW);
      t.push(idx++);
    }
  }
  return { watts: w, time: t };
}

const CP = 280;
const W_PRIME_J = 20000; // 20 kJ
const W_PRIME_KJ = 20;

describe("computeWbalStream", () => {
  it("returns null for null/empty inputs", () => {
    expect(computeWbalStream(null, null, CP, W_PRIME_J)).toBeNull();
    expect(computeWbalStream([], [], CP, W_PRIME_J)).toBeNull();
    expect(computeWbalStream([200], [0], CP, W_PRIME_J)).toBeNull();
  });

  it("returns null when CP or W' is invalid", () => {
    const { watts, time } = constantStream(200, 300);
    expect(computeWbalStream(watts, time, 0, W_PRIME_J)).toBeNull();
    expect(computeWbalStream(watts, time, CP, 0)).toBeNull();
    expect(computeWbalStream(watts, time, null, W_PRIME_J)).toBeNull();
    expect(computeWbalStream(watts, time, CP, null)).toBeNull();
  });

  it("returns null for very short streams (< 60 samples)", () => {
    const { watts, time } = constantStream(200, 30);
    expect(computeWbalStream(watts, time, CP, W_PRIME_J)).toBeNull();
  });

  it("stays full when riding constantly below CP", () => {
    const { watts, time } = constantStream(200, 600); // 200W for 10 min, well below CP=280
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    expect(result).not.toBeNull();
    expect(result.summary.min_wbal_pct).toBe(100);
    expect(result.summary.empty_tank_events).toBe(0);
    expect(result.summary.total_time_below_50_pct).toBe(0);
  });

  it("drains toward 0 when riding constantly above CP", () => {
    // 380W is 100W above CP=280. W'=20000J depletes in 200s theoretically
    // but we run for 600s to let it fully drain
    const { watts, time } = constantStream(380, 600);
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    expect(result).not.toBeNull();
    expect(result.summary.min_wbal_pct).toBeLessThan(5);
    expect(result.summary.empty_tank_events).toBeGreaterThanOrEqual(1);
  });

  it("oscillates during interval workout", () => {
    // 5x (60s at 380W / 120s at 150W) = 5 * 180s = 900s total
    const { watts, time } = intervalStream(380, 150, 60, 120, 5);
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    expect(result).not.toBeNull();
    // Should deplete during intervals but recover during rest
    expect(result.summary.min_wbal_pct).toBeLessThan(100);
    expect(result.summary.min_wbal_pct).toBeGreaterThan(0);
    // Should have depletion events
    expect(result.summary.depletion_events.length).toBeGreaterThan(0);
    // Should have recovery events
    expect(result.summary.recovery_events.length).toBeGreaterThan(0);
  });

  it("recovers faster when riding further below CP", () => {
    // Two scenarios: rest at 100W vs rest at 250W (both below CP=280)
    // 60s at 380W then 120s recovery
    const makeRecoveryTest = (recoveryWatts) => {
      const w = [];
      const t = [];
      // Deplete
      for (let i = 0; i < 60; i++) { w.push(380); t.push(i); }
      // Recover
      for (let i = 0; i < 120; i++) { w.push(recoveryWatts); t.push(60 + i); }
      return computeWbalStream(w, t, CP, W_PRIME_J);
    };

    const deepRecovery = makeRecoveryTest(100); // 180W below CP
    const shallowRecovery = makeRecoveryTest(250); // 30W below CP

    // After same depletion, deeper rest should recover more
    const deepFinal = deepRecovery.stream[deepRecovery.stream.length - 1].pct;
    const shallowFinal = shallowRecovery.stream[shallowRecovery.stream.length - 1].pct;
    expect(deepFinal).toBeGreaterThan(shallowFinal);
  });

  it("clamps W'bal to [0, W']", () => {
    // Extreme depletion scenario
    const { watts, time } = constantStream(500, 300); // 220W above CP for 5 min
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    // All stream values should be >= 0
    for (const pt of result.stream) {
      expect(pt.wbal).toBeGreaterThanOrEqual(0);
      expect(pt.pct).toBeGreaterThanOrEqual(0);
    }
  });

  it("never exceeds W' during recovery", () => {
    // Deplete then long recovery
    const w = [];
    const t = [];
    for (let i = 0; i < 120; i++) { w.push(380); t.push(i); } // Deplete
    for (let i = 0; i < 600; i++) { w.push(100); t.push(120 + i); } // Long recovery
    const result = computeWbalStream(w, t, CP, W_PRIME_J);
    for (const pt of result.stream) {
      expect(pt.wbal).toBeLessThanOrEqual(W_PRIME_J);
      expect(pt.pct).toBeLessThanOrEqual(100);
    }
  });

  it("detects empty tank events correctly", () => {
    // High power to deplete fully, then recover, then deplete again
    const w = [];
    const t = [];
    // Deplete to empty (380W for 250s = 25000J drained, fully empty)
    for (let i = 0; i < 250; i++) { w.push(380); t.push(i); }
    // Recover
    for (let i = 0; i < 300; i++) { w.push(100); t.push(250 + i); }
    // Deplete again
    for (let i = 0; i < 250; i++) { w.push(380); t.push(550 + i); }

    const result = computeWbalStream(w, t, CP, W_PRIME_J);
    expect(result.summary.empty_tank_events).toBe(2);
  });

  it("produces downsampled stream for long rides", () => {
    // 2 hour ride at 1Hz = 7200 samples
    const { watts, time } = constantStream(250, 7200);
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    // Should be downsampled to ~5s intervals
    expect(result.stream.length).toBeLessThan(7200);
    expect(result.stream.length).toBeLessThan(1500); // roughly 7200/5 = 1440
  });

  it("handles variable sample rate from time stream", () => {
    // 300 samples but spanning 600 seconds (2Hz effective)
    const watts = new Array(300).fill(200);
    const time = Array.from({ length: 300 }, (_, i) => i * 2);
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    expect(result).not.toBeNull();
    expect(result.summary.min_wbal_pct).toBe(100); // All below CP
  });

  it("tracks time below thresholds accurately", () => {
    // 380W for 180s = 18000J drained from 20000J W', gets to ~10% → well below 50%
    const w = [];
    const t = [];
    for (let i = 0; i < 180; i++) { w.push(380); t.push(i); }
    for (let i = 0; i < 120; i++) { w.push(150); t.push(180 + i); }
    const result = computeWbalStream(w, t, CP, W_PRIME_J);
    // Should have time below 50% during heavy depletion phase
    expect(result.summary.total_time_below_50_pct).toBeGreaterThan(0);
    expect(result.summary.total_time_below_25_pct).toBeGreaterThan(0);
  });
});

describe("summarizeWbal", () => {
  it("extracts summary from full result", () => {
    const { watts, time } = constantStream(200, 300);
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    const summary = summarizeWbal(result);
    expect(summary).not.toBeNull();
    expect(summary.min_wbal_pct).toBeDefined();
    expect(summary.empty_tank_events).toBeDefined();
    expect(summary.total_time_below_25_pct).toBeDefined();
    expect(summary.total_time_below_50_pct).toBeDefined();
  });

  it("returns null for null input", () => {
    expect(summarizeWbal(null)).toBeNull();
    expect(summarizeWbal({})).toBeNull();
    expect(summarizeWbal({ stream: [] })).toBeNull();
  });

  it("correctly reports empty tank count", () => {
    // Heavy sustained effort to deplete
    const { watts, time } = constantStream(380, 600);
    const result = computeWbalStream(watts, time, CP, W_PRIME_J);
    const summary = summarizeWbal(result);
    expect(summary.empty_tank_events).toBeGreaterThanOrEqual(1);
  });

  it("reports zero for easy ride", () => {
    const { watts, time } = constantStream(200, 300);
    const summary = summarizeWbal(computeWbalStream(watts, time, CP, W_PRIME_J));
    expect(summary.empty_tank_events).toBe(0);
    expect(summary.total_time_below_25_pct).toBe(0);
  });
});

describe("formatWbalForAI", () => {
  it("formats basic summary with min and thresholds", () => {
    const summary = {
      min_wbal_pct: 15.2,
      min_wbal_time_s: 2400,
      empty_tank_events: 0,
      total_time_below_25_pct: 120,
      total_time_below_50_pct: 480,
      avg_recovery_rate_pct_per_min: 8.5,
      depletion_events: [],
      recovery_events: [],
    };
    const text = formatWbalForAI(summary, CP, W_PRIME_KJ);
    expect(text).toContain("W' BALANCE");
    expect(text).toContain("15.2%");
    expect(text).toContain("40:00"); // 2400s
    expect(text).toContain("below 25%");
    expect(text).toContain("below 50%");
    expect(text).toContain("8.5%/min");
    expect(text).toContain(`CP: ${CP}W`);
    expect(text).toContain(`W': ${W_PRIME_KJ} kJ`);
  });

  it("includes empty tank events when present", () => {
    const summary = {
      min_wbal_pct: 0,
      min_wbal_time_s: 1800,
      empty_tank_events: 3,
      total_time_below_25_pct: 300,
      total_time_below_50_pct: 600,
      avg_recovery_rate_pct_per_min: 5.2,
      depletion_events: [],
      recovery_events: [],
    };
    const text = formatWbalForAI(summary, CP, W_PRIME_KJ);
    expect(text).toContain("Empty tank events");
    expect(text).toContain("3");
  });

  it("includes major depletions", () => {
    const summary = {
      min_wbal_pct: 8.0,
      min_wbal_time_s: 1200,
      empty_tank_events: 1,
      total_time_below_25_pct: 60,
      total_time_below_50_pct: 180,
      avg_recovery_rate_pct_per_min: 6.0,
      depletion_events: [
        { start_s: 300, end_s: 420, start_pct: 85.0, end_pct: 12.0, power_avg: 400 },
      ],
      recovery_events: [],
    };
    const text = formatWbalForAI(summary, CP, W_PRIME_KJ);
    expect(text).toContain("Major depletions");
    expect(text).toContain("400W");
  });

  it("returns empty string for null input", () => {
    expect(formatWbalForAI(null, CP, W_PRIME_KJ)).toBe("");
  });

  it("omits sections with zero values", () => {
    const summary = {
      min_wbal_pct: 100,
      min_wbal_time_s: 0,
      empty_tank_events: 0,
      total_time_below_25_pct: 0,
      total_time_below_50_pct: 0,
      avg_recovery_rate_pct_per_min: null,
      depletion_events: [],
      recovery_events: [],
    };
    const text = formatWbalForAI(summary, CP, W_PRIME_KJ);
    expect(text).not.toContain("Empty tank");
    expect(text).not.toContain("below 25%");
    expect(text).not.toContain("below 50%");
    expect(text).not.toContain("recovery rate");
    expect(text).not.toContain("Major depletions");
  });

  it("handles missing CP/W' gracefully", () => {
    const summary = {
      min_wbal_pct: 45.0,
      min_wbal_time_s: 600,
      empty_tank_events: 0,
      total_time_below_25_pct: 0,
      total_time_below_50_pct: 120,
      avg_recovery_rate_pct_per_min: 10.0,
      depletion_events: [],
      recovery_events: [],
    };
    const text = formatWbalForAI(summary, null, null);
    expect(text).toContain("45%");
    expect(text).not.toContain("CP:");
  });
});

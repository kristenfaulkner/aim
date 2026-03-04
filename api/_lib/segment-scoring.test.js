import { describe, it, expect } from "vitest";
import {
  enrichEffortContext,
  computeAdjustedScore,
  computeAthleteBaselines,
  detectPR,
  formatSegmentsForAI,
} from "./segment-scoring.js";

// ── enrichEffortContext ──

describe("enrichEffortContext", () => {
  it("enriches effort with weather, recovery, and training load context", () => {
    const effort = { elapsed_time_seconds: 300, avg_power_watts: 280, avg_hr_bpm: 155 };
    const dailyMetrics = { hrv_ms: 55, resting_hr_bpm: 52, sleep_score: 78, total_sleep_seconds: 25200 };
    const weather = { temperature_c: 28, humidity: 65, wind_speed_mps: 3.5, wind_direction: 180 };
    const trainingLoad = { ctl: 85, atl: 92, tsb: -7 };

    const result = enrichEffortContext(effort, dailyMetrics, weather, trainingLoad);

    expect(result.temperature_c).toBe(28);
    expect(result.humidity_pct).toBe(65);
    expect(result.wind_speed_mps).toBe(3.5);
    expect(result.hrv_morning_ms).toBe(55);
    expect(result.rhr_morning_bpm).toBe(52);
    expect(result.sleep_score).toBe(78);
    expect(result.ctl).toBe(85);
    expect(result.tsb).toBe(-7);
    expect(result.power_hr_ratio).toBeCloseTo(1.81, 1);
  });

  it("handles null daily metrics gracefully", () => {
    const effort = { elapsed_time_seconds: 300, avg_power_watts: 280 };
    const result = enrichEffortContext(effort, null, null, null);
    expect(result.hrv_morning_ms).toBeUndefined();
    expect(result.temperature_c).toBeUndefined();
    expect(result.ctl).toBeUndefined();
  });

  it("computes efficiency_factor from NP and HR", () => {
    const effort = { elapsed_time_seconds: 300, normalized_power_watts: 260, avg_hr_bpm: 150 };
    const result = enrichEffortContext(effort, null, null, null);
    expect(result.efficiency_factor).toBeCloseTo(1.73, 1);
  });

  it("computes pace_hr_ratio for running", () => {
    const effort = { elapsed_time_seconds: 300, avg_pace_min_km: 5.0, avg_hr_bpm: 160 };
    const result = enrichEffortContext(effort, null, null, null);
    expect(result.pace_hr_ratio).toBeCloseTo(0.00125, 3);
  });
});

// ── computeAdjustedScore ──

describe("computeAdjustedScore", () => {
  const baselines = { hrv_avg: 60, sleep_score_avg: 80, tsb_avg: -5 };

  it("returns no adjustments when all conditions are ideal", () => {
    const effort = { elapsed_time_seconds: 300, temperature_c: 20, hrv_morning_ms: 65, tsb: -5, sleep_score: 85 };
    const result = computeAdjustedScore(effort, 290, baselines);
    expect(result.adjustments).toHaveLength(0);
    expect(result.total_adjustment_seconds).toBe(0);
    expect(result.adjusted_time).toBe(300);
  });

  it("applies heat penalty above 24°C", () => {
    const effort = { elapsed_time_seconds: 300, temperature_c: 34 };
    const result = computeAdjustedScore(effort, 280, baselines);
    expect(result.adjustments.length).toBe(1);
    expect(result.adjustments[0].factor).toBe("temperature");
    expect(result.adjustments[0].impact_seconds).toBeGreaterThan(0);
    expect(result.adjusted_time).toBeLessThan(300);
  });

  it("applies HRV penalty when below 85% of baseline", () => {
    const effort = { elapsed_time_seconds: 300, hrv_morning_ms: 40 };
    const result = computeAdjustedScore(effort, 280, baselines);
    const hrvAdj = result.adjustments.find(a => a.factor === "HRV/readiness");
    expect(hrvAdj).toBeDefined();
    expect(hrvAdj.impact_seconds).toBeGreaterThan(0);
  });

  it("applies fatigue penalty when TSB < -15", () => {
    const effort = { elapsed_time_seconds: 300, tsb: -30 };
    const result = computeAdjustedScore(effort, 280, baselines);
    const fatigueAdj = result.adjustments.find(a => a.factor === "fatigue");
    expect(fatigueAdj).toBeDefined();
    expect(fatigueAdj.impact_seconds).toBeGreaterThan(0);
  });

  it("applies sleep penalty when score well below baseline", () => {
    const effort = { elapsed_time_seconds: 300, sleep_score: 50 };
    const result = computeAdjustedScore(effort, 280, baselines);
    const sleepAdj = result.adjustments.find(a => a.factor === "sleep");
    expect(sleepAdj).toBeDefined();
    expect(sleepAdj.impact_seconds).toBeGreaterThan(0);
  });

  it("applies wind penalty above 5 m/s", () => {
    const effort = { elapsed_time_seconds: 300, wind_speed_mps: 10 };
    const result = computeAdjustedScore(effort, 280, baselines);
    const windAdj = result.adjustments.find(a => a.factor === "wind");
    expect(windAdj).toBeDefined();
    expect(windAdj.impact_seconds).toBeGreaterThan(0);
  });

  it("stacks multiple adjustments", () => {
    const effort = { elapsed_time_seconds: 600, temperature_c: 35, hrv_morning_ms: 35, tsb: -25, sleep_score: 45, wind_speed_mps: 12 };
    const result = computeAdjustedScore(effort, 550, baselines);
    expect(result.adjustments.length).toBeGreaterThanOrEqual(4);
    expect(result.total_adjustment_seconds).toBeGreaterThan(0);
    expect(result.adjusted_time).toBeLessThan(600);
  });

  it("computes adjusted_score relative to PR", () => {
    const effort = { elapsed_time_seconds: 300, temperature_c: 34 };
    const result = computeAdjustedScore(effort, 280, baselines);
    expect(result.adjusted_score).not.toBeNull();
    // Score should be slightly above raw (PR/elapsed)*100 since adjustments reduce time
    expect(result.adjusted_score).toBeGreaterThan((280 / 300) * 100);
  });

  it("returns null adjusted_score when no PR", () => {
    const effort = { elapsed_time_seconds: 300 };
    const result = computeAdjustedScore(effort, null, baselines);
    expect(result.adjusted_score).toBeNull();
  });

  it("handles zero/null elapsed time", () => {
    const effort = { elapsed_time_seconds: 0 };
    const result = computeAdjustedScore(effort, 280, baselines);
    expect(result.adjusted_time).toBe(0);
    expect(result.adjustments).toHaveLength(0);
  });

  it("handles missing baselines gracefully", () => {
    const effort = { elapsed_time_seconds: 300, hrv_morning_ms: 40, sleep_score: 50 };
    const result = computeAdjustedScore(effort, 280, { hrv_avg: null, sleep_score_avg: null });
    // No HRV or sleep adjustments possible without baselines
    expect(result.adjustments).toHaveLength(0);
  });

  it("caps heat penalty at 5%", () => {
    const effort = { elapsed_time_seconds: 600, temperature_c: 50 }; // extreme heat
    const result = computeAdjustedScore(effort, 550, baselines);
    const heatAdj = result.adjustments.find(a => a.factor === "temperature");
    expect(heatAdj.impact_seconds).toBeLessThanOrEqual(600 * 0.05 + 0.5);
  });
});

// ── computeAthleteBaselines ──

describe("computeAthleteBaselines", () => {
  it("computes averages from daily metrics", () => {
    const metrics = [
      { hrv_ms: 50, sleep_score: 75, tsb: -5 },
      { hrv_ms: 60, sleep_score: 85, tsb: 5 },
      { hrv_ms: 55, sleep_score: 80, tsb: 0 },
    ];
    const result = computeAthleteBaselines(metrics);
    expect(result.hrv_avg).toBeCloseTo(55, 0);
    expect(result.sleep_score_avg).toBe(80);
    expect(result.tsb_avg).toBe(0);
  });

  it("returns nulls for empty metrics", () => {
    const result = computeAthleteBaselines([]);
    expect(result.hrv_avg).toBeNull();
    expect(result.sleep_score_avg).toBeNull();
    expect(result.tsb_avg).toBeNull();
  });

  it("handles null values in metrics", () => {
    const metrics = [
      { hrv_ms: 50, sleep_score: null, tsb: -5 },
      { hrv_ms: null, sleep_score: 85, tsb: null },
    ];
    const result = computeAthleteBaselines(metrics);
    expect(result.hrv_avg).toBe(50);
    expect(result.sleep_score_avg).toBe(85);
    expect(result.tsb_avg).toBe(-5);
  });

  it("uses hrv_overnight_avg_ms as fallback", () => {
    const metrics = [
      { hrv_overnight_avg_ms: 65, sleep_score: 80, tsb: 0 },
    ];
    const result = computeAthleteBaselines(metrics);
    expect(result.hrv_avg).toBe(65);
  });
});

// ── detectPR ──

describe("detectPR", () => {
  it("flags first effort as PR", () => {
    const effort = { elapsed_time_seconds: 300 };
    const result = detectPR(effort, []);
    expect(result.is_raw_pr).toBe(true);
    expect(result.is_adjusted_pr).toBe(true);
    expect(result.pr_time).toBeNull();
  });

  it("detects when effort is faster than all history", () => {
    const effort = { elapsed_time_seconds: 280 };
    const history = [
      { elapsed_time_seconds: 300, started_at: "2026-02-01T10:00:00Z", strava_effort_id: "1" },
      { elapsed_time_seconds: 290, started_at: "2026-02-15T10:00:00Z", strava_effort_id: "2" },
    ];
    const result = detectPR(effort, history);
    expect(result.is_raw_pr).toBe(true);
    expect(result.pr_time).toBe(290);
  });

  it("detects when effort is slower than PR", () => {
    const effort = { elapsed_time_seconds: 310 };
    const history = [
      { elapsed_time_seconds: 290, started_at: "2026-02-15T10:00:00Z", strava_effort_id: "1" },
    ];
    const result = detectPR(effort, history);
    expect(result.is_raw_pr).toBe(false);
    expect(result.pr_time).toBe(290);
  });

  it("detects adjusted PR when raw time is slower", () => {
    const effort = { elapsed_time_seconds: 310, adjusted_time: 285 };
    const history = [
      { elapsed_time_seconds: 290, started_at: "2026-02-15T10:00:00Z", strava_effort_id: "1", adjustment_factors: { adjusted_time: 288 }, power_hr_ratio: 1.7 },
    ];
    const result = detectPR(effort, history);
    expect(result.is_raw_pr).toBe(false);
    expect(result.is_adjusted_pr).toBe(true);
  });
});

// ── formatSegmentsForAI ──

describe("formatSegmentsForAI", () => {
  it("returns empty string for no segments", () => {
    expect(formatSegmentsForAI([])).toBe("");
    expect(formatSegmentsForAI(null)).toBe("");
  });

  it("formats first-attempt segment", () => {
    const data = [{
      segment: { name: "Hawk Hill", distance_m: 1200, average_grade_pct: 7.2 },
      currentEffort: {
        elapsed_time_seconds: 292,
        avg_power_watts: 312,
        avg_hr_bpm: 167,
        power_hr_ratio: 1.87,
        adjustment_factors: null,
      },
      historicalEfforts: [],
    }];
    const result = formatSegmentsForAI(data);
    expect(result).toContain("Hawk Hill");
    expect(result).toContain("312W");
    expect(result).toContain("First attempt");
  });

  it("formats segment with history and adjustments", () => {
    const data = [{
      segment: { name: "Box Hill", distance_m: 2500, average_grade_pct: 5.0 },
      currentEffort: {
        elapsed_time_seconds: 420,
        avg_power_watts: 290,
        avg_hr_bpm: 158,
        power_hr_ratio: 1.84,
        adjustment_factors: {
          adjusted_time: 408,
          adjustments: [
            { factor: "temperature", impact_seconds: 8 },
            { factor: "fatigue", impact_seconds: 4 },
          ],
          total_adjustment_seconds: 12,
        },
      },
      historicalEfforts: [
        { elapsed_time_seconds: 400, started_at: "2026-02-01T10:00:00Z", strava_effort_id: "1", power_hr_ratio: 1.80 },
        { elapsed_time_seconds: 410, started_at: "2026-01-15T10:00:00Z", strava_effort_id: "2", power_hr_ratio: 1.75 },
      ],
    }];
    const result = formatSegmentsForAI(data);
    expect(result).toContain("Box Hill");
    expect(result).toContain("Adjustments");
    expect(result).toContain("temperature");
    expect(result).toContain("PR");
    expect(result).toContain("Total attempts: 3");
  });
});

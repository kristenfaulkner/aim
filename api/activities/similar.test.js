import { describe, it, expect } from "vitest";
import { computeSimilarity, enrichActivity } from "../_lib/similar-sessions.js";

// ── Test helpers ──

function makeActivity(overrides = {}) {
  return {
    id: "act-1",
    name: "Morning Ride",
    activity_type: "Ride",
    started_at: "2026-03-01T10:00:00Z",
    duration_seconds: 7200,
    distance_meters: 60000,
    elevation_gain_meters: 800,
    avg_power_watts: 220,
    normalized_power_watts: 250,
    tss: 180,
    intensity_factor: 0.85,
    efficiency_factor: 1.75,
    hr_drift_pct: 3.2,
    avg_hr_bpm: 155,
    max_hr_bpm: 178,
    work_kj: 1600,
    calories: 1800,
    activity_weather: { temperature: 22, humidity: 60, wind_speed: 12 },
    user_tags: ["tempo", "endurance"],
    ...overrides,
  };
}

// ── computeSimilarity ──

describe("computeSimilarity", () => {
  it("returns 1.0 for identical activities", () => {
    const a = makeActivity();
    const b = makeActivity({ id: "act-2" });
    const score = computeSimilarity(a, b, a.user_tags);
    expect(score).toBeCloseTo(1.0, 1);
  });

  it("returns high score for similar duration and power", () => {
    const a = makeActivity();
    const b = makeActivity({
      id: "act-2",
      duration_seconds: 7500, // +4%
      normalized_power_watts: 245, // -2%
      tss: 175,
      intensity_factor: 0.83,
    });
    const score = computeSimilarity(a, b, a.user_tags);
    expect(score).toBeGreaterThan(0.85);
  });

  it("returns low score for very different activities", () => {
    const a = makeActivity();
    const b = makeActivity({
      id: "act-2",
      duration_seconds: 1800, // 30 min vs 2h
      normalized_power_watts: 350, // 350W vs 250W
      tss: 80,
      intensity_factor: 1.2,
      user_tags: ["race", "vo2max"],
    });
    const score = computeSimilarity(a, b, a.user_tags);
    expect(score).toBeLessThan(0.6);
  });

  it("handles missing TSS gracefully", () => {
    const a = makeActivity({ tss: null });
    const b = makeActivity({ id: "act-2", tss: null });
    const score = computeSimilarity(a, b, a.user_tags);
    // Should still compute from other dimensions
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("handles missing power gracefully", () => {
    const a = makeActivity({ normalized_power_watts: null, avg_power_watts: null });
    const b = makeActivity({ id: "act-2", normalized_power_watts: null, avg_power_watts: null });
    const score = computeSimilarity(a, b, a.user_tags);
    expect(score).toBeGreaterThan(0);
  });

  it("falls back to avg_power_watts when NP is missing", () => {
    const a = makeActivity({ normalized_power_watts: null, avg_power_watts: 220 });
    const b = makeActivity({ id: "act-2", normalized_power_watts: null, avg_power_watts: 225 });
    const score = computeSimilarity(a, b, a.user_tags);
    expect(score).toBeGreaterThan(0.8);
  });

  it("gives bonus for tag overlap", () => {
    const a = makeActivity({ user_tags: ["tempo", "endurance"] });
    const bNoTags = makeActivity({ id: "act-2", user_tags: [] });
    const bWithTags = makeActivity({ id: "act-3", user_tags: ["tempo", "endurance"] });

    const scoreNoTags = computeSimilarity(a, bNoTags, a.user_tags);
    const scoreWithTags = computeSimilarity(a, bWithTags, a.user_tags);

    // With matching tags should score higher than without (all else equal)
    expect(scoreWithTags).toBeGreaterThanOrEqual(scoreNoTags);
  });

  it("handles null user_tags", () => {
    const a = makeActivity({ user_tags: null });
    const b = makeActivity({ id: "act-2", user_tags: null });
    const score = computeSimilarity(a, b, []);
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 when all dimensions are missing", () => {
    const a = makeActivity({
      duration_seconds: 0,
      normalized_power_watts: null,
      avg_power_watts: null,
      tss: null,
      intensity_factor: null,
      user_tags: null,
    });
    const b = makeActivity({ id: "act-2", ...a });
    const score = computeSimilarity(a, b, []);
    expect(score).toBe(0);
  });

  it("partial tag overlap scores less than full overlap", () => {
    const a = makeActivity({ user_tags: ["tempo", "endurance", "long"] });
    const bPartial = makeActivity({ id: "act-2", user_tags: ["tempo"] });
    const bFull = makeActivity({ id: "act-3", user_tags: ["tempo", "endurance", "long"] });

    const scorePartial = computeSimilarity(a, bPartial, a.user_tags);
    const scoreFull = computeSimilarity(a, bFull, a.user_tags);

    expect(scoreFull).toBeGreaterThan(scorePartial);
  });

  it("duration difference of exactly 25% still has decent score", () => {
    const a = makeActivity({ duration_seconds: 4000 });
    const b = makeActivity({ id: "act-2", duration_seconds: 5000 }); // +25%
    const score = computeSimilarity(a, b, a.user_tags);
    expect(score).toBeGreaterThan(0.5);
  });
});

// ── enrichActivity ──

describe("enrichActivity", () => {
  it("returns basic activity fields without enrichment", () => {
    const a = makeActivity();
    const result = enrichActivity(a);

    expect(result.id).toBe("act-1");
    expect(result.name).toBe("Morning Ride");
    expect(result.normalized_power_watts).toBe(250);
    expect(result.tss).toBe(180);
    expect(result.context).toBeDefined();
    expect(result.context.sleep_score).toBeNull();
    expect(result.context.hrv_ms).toBeNull();
  });

  it("enriches with daily metrics when available", () => {
    const a = makeActivity();
    const metricsByDate = {
      "2026-03-01": {
        date: "2026-03-01",
        hrv_ms: 55,
        resting_hr_bpm: 48,
        recovery_score: 78,
        sleep_score: 85,
        sleep_duration_hours: 7.5,
        life_stress_score: 2,
        motivation_score: 4,
        muscle_soreness_score: 1,
        mood_score: 4,
      },
    };
    const result = enrichActivity(a, metricsByDate);

    expect(result.context.hrv_ms).toBe(55);
    expect(result.context.recovery_score).toBe(78);
    expect(result.context.sleep_score).toBe(85);
    expect(result.context.sleep_duration_hours).toBe(7.5);
    expect(result.context.life_stress).toBe(2);
    expect(result.context.motivation).toBe(4);
  });

  it("enriches with weather from activity_weather", () => {
    const a = makeActivity();
    const result = enrichActivity(a);

    expect(result.context.weather_temp_c).toBe(22);
    expect(result.context.weather_humidity).toBe(60);
    expect(result.context.weather_wind_kph).toBe(12);
  });

  it("enriches with nutrition when available", () => {
    const a = makeActivity();
    const nutritionByActivity = {
      "act-1": {
        activity_id: "act-1",
        totals: { calories: 800, carbs_g: 120 },
        per_hour: { carbs_g: 60, calories: 400 },
      },
    };
    const result = enrichActivity(a, {}, nutritionByActivity);

    expect(result.context.nutrition_carbs_per_hour).toBe(60);
    expect(result.context.nutrition_calories).toBe(800);
  });

  it("enriches with training load when available", () => {
    const a = makeActivity();
    const loadByDate = {
      "2026-03-01": { ctl: 85, atl: 92, tsb: -7 },
    };
    const result = enrichActivity(a, {}, {}, {}, {}, loadByDate);

    expect(result.context.ctl).toBe(85);
    expect(result.context.atl).toBe(92);
    expect(result.context.tsb).toBe(-7);
  });

  it("enriches with cross-training from day before", () => {
    const a = makeActivity();
    const crossTrainByDate = {
      "2026-02-28": [
        { date: "2026-02-28", activity_type: "strength", recovery_impact: "moderate", estimated_tss: 40 },
      ],
    };
    const result = enrichActivity(a, {}, {}, {}, crossTrainByDate);

    expect(result.context.cross_training_prior_day).toHaveLength(1);
    expect(result.context.cross_training_prior_day[0].type).toBe("strength");
    expect(result.context.cross_training_prior_day[0].impact).toBe("moderate");
  });

  it("enriches with travel when available", () => {
    const a = makeActivity();
    const travelByDate = {
      "2026-03-01": {
        detected_date: "2026-03-01",
        timezone_shift_hours: 3,
        altitude_change_meters: 1500,
        jet_lag_severity: "moderate",
      },
    };
    const result = enrichActivity(a, {}, {}, travelByDate);

    expect(result.context.travel).not.toBeNull();
    expect(result.context.travel.timezone_shift).toBe(3);
    expect(result.context.travel.altitude_change).toBe(1500);
  });

  it("uses hrv_overnight_avg_ms as fallback when hrv_ms is null", () => {
    const a = makeActivity();
    const metricsByDate = {
      "2026-03-01": {
        date: "2026-03-01",
        hrv_ms: null,
        hrv_overnight_avg_ms: 62,
      },
    };
    const result = enrichActivity(a, metricsByDate);
    expect(result.context.hrv_ms).toBe(62);
  });

  it("preserves similarity_score when present", () => {
    const a = makeActivity({ similarity_score: 0.87 });
    const result = enrichActivity(a);
    expect(result.similarity_score).toBe(0.87);
  });

  it("handles activity with no started_at", () => {
    const a = makeActivity({ started_at: null });
    const result = enrichActivity(a);
    expect(result.context.sleep_score).toBeNull();
    expect(result.context.ctl).toBeNull();
  });
});

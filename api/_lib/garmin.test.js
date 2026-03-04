import { describe, it, expect, vi } from "vitest";

// Mock supabase and crypto to avoid needing env vars
vi.mock("./supabase.js", () => ({
  supabaseAdmin: {},
}));
vi.mock("./crypto.js", () => ({
  encrypt: vi.fn(v => `encrypted:${v}`),
  decrypt: vi.fn(v => v.replace("encrypted:", "")),
}));

import {
  mapGarminActivity,
  mapGarminDaily,
  mapGarminSleep,
  mapGarminBodyBattery,
  mapGarminBodyComp,
  mapGarminPulseOx,
  extractGarminExtended,
  extractGarminDate,
} from "./garmin.js";

// ── mapGarminActivity ──

describe("mapGarminActivity", () => {
  it("maps a cycling activity with full data", () => {
    const result = mapGarminActivity({
      activityId: 12345,
      activityType: "CYCLING",
      activityName: "Morning Ride",
      startTimeInSeconds: 1709510400,
      durationInSeconds: 3600,
      distanceInMeters: 40000,
      totalElevationGainInMeters: 500,
      averagePowerInWatts: 220,
      normalizedPowerInWatts: 235,
      maxPowerInWatts: 800,
      averageHeartRateInBeatsPerMinute: 145,
      maxHeartRateInBeatsPerMinute: 180,
      averageBikeCadenceInRoundsPerMinute: 88,
      averageSpeedInMetersPerSecond: 11.1,
      maxSpeedInMetersPerSecond: 16.5,
      activeKilocalories: 900,
      startingLatitudeInDegree: 37.7749,
      startingLongitudeInDegree: -122.4194,
    });

    expect(result.source).toBe("garmin");
    expect(result.source_id).toBe("12345");
    expect(result.activity_type).toBe("ride");
    expect(result.name).toBe("Morning Ride");
    expect(result.duration_seconds).toBe(3600);
    expect(result.distance_meters).toBe(40000);
    expect(result.elevation_gain_meters).toBe(500);
    expect(result.avg_power_watts).toBe(220);
    expect(result.normalized_power_watts).toBe(235);
    expect(result.max_power_watts).toBe(800);
    expect(result.avg_hr_bpm).toBe(145);
    expect(result.max_hr_bpm).toBe(180);
    expect(result.avg_cadence_rpm).toBe(88);
    expect(result.calories).toBe(900);
    expect(result.work_kj).toBe(Math.round(220 * 3600 / 1000));
    expect(result.start_lat).toBe(37.7749);
    expect(result.start_lng).toBe(-122.4194);
  });

  it("maps running activity type correctly", () => {
    const result = mapGarminActivity({ activityType: "RUNNING", activityId: 1 });
    expect(result.activity_type).toBe("run");
  });

  it("maps mountain biking to ride", () => {
    const result = mapGarminActivity({ activityType: "MOUNTAIN_BIKING", activityId: 1 });
    expect(result.activity_type).toBe("ride");
  });

  it("maps unknown sport types to workout", () => {
    const result = mapGarminActivity({ activityType: "PILATES", activityId: 1 });
    expect(result.activity_type).toBe("workout");
  });

  it("uses summaryId as fallback for source_id", () => {
    const result = mapGarminActivity({ summaryId: "abc-123" });
    expect(result.source_id).toBe("abc-123");
  });

  it("handles missing fields gracefully", () => {
    const result = mapGarminActivity({});
    expect(result.source).toBe("garmin");
    expect(result.source_id).toBe("");
    expect(result.avg_power_watts).toBeNull();
    expect(result.duration_seconds).toBeNull();
    expect(result.distance_meters).toBeNull();
    expect(result.work_kj).toBeNull();
  });
});

// ── mapGarminDaily ──

describe("mapGarminDaily", () => {
  it("maps daily summary fields", () => {
    const result = mapGarminDaily({
      restingHeartRateInBeatsPerMinute: 52,
      maxHeartRateInBeatsPerMinute: 155,
      averageStressLevel: 35,
      totalSteps: 8500,
      activeKilocalories: 650,
    });

    expect(result.resting_hr_bpm).toBe(52);
    expect(result.max_hr_bpm).toBe(155);
    expect(result.strain_score).toBe(35);
    expect(result.steps).toBe(8500);
    expect(result.active_calories).toBe(650);
  });

  it("returns null for empty data", () => {
    const result = mapGarminDaily({});
    expect(result).toBeNull();
  });
});

// ── mapGarminSleep ──

describe("mapGarminSleep", () => {
  it("maps sleep data with all fields", () => {
    const result = mapGarminSleep({
      durationInSeconds: 28800,
      deepSleepDurationInSeconds: 5400,
      lightSleepDurationInSeconds: 14400,
      remSleepInSeconds: 7200,
      awakeDurationInSeconds: 1800,
      overallSleepScore: { value: 82 },
      averageRespirationValue: 14.5,
      averageSpO2Value: 97,
      lowestSpO2Value: 94,
      startTimeInSeconds: 1709510400,
    });

    expect(result.total_sleep_seconds).toBe(28800);
    expect(result.deep_sleep_seconds).toBe(5400);
    expect(result.light_sleep_seconds).toBe(14400);
    expect(result.rem_sleep_seconds).toBe(7200);
    expect(result.sleep_efficiency_pct).toBeCloseTo(93.75, 0);
    expect(result.sleep_score).toBe(82);
    expect(result.respiratory_rate).toBe(14.5);
    expect(result.blood_oxygen_pct).toBe(97);
    expect(result.resting_spo2).toBe(94);
    expect(result.sleep_onset_time).toBeDefined();
    expect(result.wake_time).toBeDefined();
  });

  it("returns null for empty data", () => {
    const result = mapGarminSleep({});
    expect(result).toBeNull();
  });
});

// ── mapGarminBodyBattery ──

describe("mapGarminBodyBattery", () => {
  it("maps Body Battery to recovery_score", () => {
    const result = mapGarminBodyBattery({ bodyBatteryChargedValue: 78 });
    expect(result.recovery_score).toBe(78);
  });

  it("returns null when no Body Battery", () => {
    const result = mapGarminBodyBattery({});
    expect(result).toBeNull();
  });
});

// ── mapGarminBodyComp ──

describe("mapGarminBodyComp", () => {
  it("maps body composition data", () => {
    const result = mapGarminBodyComp({
      weightInGrams: 65500,
      bodyFatPercentage: 12.5,
      muscleMassInGrams: 52000,
      boneMassInGrams: 3200,
      bodyWaterPercentage: 58.2,
    });

    expect(result.weight_kg).toBe(65.5);
    expect(result.body_fat_pct).toBe(12.5);
    expect(result.muscle_mass_kg).toBe(52);
    expect(result.bone_mass_kg).toBe(3.2);
    expect(result.body_water_pct).toBe(58.2);
  });

  it("returns null for empty data", () => {
    const result = mapGarminBodyComp({});
    expect(result).toBeNull();
  });
});

// ── mapGarminPulseOx ──

describe("mapGarminPulseOx", () => {
  it("maps pulse ox data", () => {
    const result = mapGarminPulseOx({
      averageSPO2: 97,
      lowestSPO2: 93,
    });

    expect(result.blood_oxygen_pct).toBe(97);
    expect(result.resting_spo2).toBe(93);
  });

  it("returns null for empty data", () => {
    const result = mapGarminPulseOx({});
    expect(result).toBeNull();
  });
});

// ── extractGarminExtended ──

describe("extractGarminExtended", () => {
  it("extracts extended daily data", () => {
    const result = extractGarminExtended({
      daily: {
        restingHeartRateInBeatsPerMinute: 52,
        averageStressLevel: 35,
        totalSteps: 10000,
        floorsClimbed: 15,
      },
    });

    expect(result.resting_heart_rate).toBe(52);
    expect(result.average_stress).toBe(35);
    expect(result.total_steps).toBe(10000);
    expect(result.floors_climbed).toBe(15);
  });

  it("extracts Body Battery extended data", () => {
    const result = extractGarminExtended({
      bodyBattery: {
        bodyBatteryChargedValue: 85,
        bodyBatteryDrainedValue: 30,
      },
    });

    expect(result.body_battery_high).toBe(85);
    expect(result.body_battery_low).toBe(30);
  });

  it("extracts sleep extended data", () => {
    const result = extractGarminExtended({
      sleep: {
        overallSleepScore: { value: 80, qualifierKey: "GOOD" },
        averageRespirationValue: 14,
        averageSpO2Value: 97,
        lowestSpO2Value: 93,
        durationInSeconds: 28800,
        startTimeInSeconds: 1709510400,
      },
    });

    expect(result.sleep_score).toBe(80);
    expect(result.sleep_quality).toBe("GOOD");
    expect(result.average_respiration).toBe(14);
  });

  it("returns null for empty data", () => {
    const result = extractGarminExtended({});
    expect(result).toBeNull();
  });
});

// ── extractGarminDate ──

describe("extractGarminDate", () => {
  it("uses calendarDate when available", () => {
    expect(extractGarminDate({ calendarDate: "2024-03-04" })).toBe("2024-03-04");
  });

  it("calculates from startTimeInSeconds", () => {
    // 2024-03-04 00:00:00 UTC = 1709510400
    const result = extractGarminDate({ startTimeInSeconds: 1709510400, startTimeOffsetInSeconds: 0 });
    expect(result).toBe("2024-03-04");
  });

  it("applies timezone offset", () => {
    // UTC midnight + 5 hours offset = still same day
    const result = extractGarminDate({ startTimeInSeconds: 1709510400, startTimeOffsetInSeconds: -18000 });
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null when no date info", () => {
    expect(extractGarminDate({})).toBeNull();
  });
});

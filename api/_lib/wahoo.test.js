import { describe, it, expect, vi } from "vitest";

// Mock supabase to avoid needing env vars
vi.mock("./supabase.js", () => ({
  supabaseAdmin: {},
}));

import {
  WAHOO_WORKOUT_TYPE_MAP,
  wahooActivityType,
  mapWahooToActivity,
} from "./wahoo.js";

// ── wahooActivityType ────────────────────────────────────────────────

describe("wahooActivityType", () => {
  it("maps cycling types to ride", () => {
    expect(wahooActivityType(0)).toBe("ride");
    expect(wahooActivityType(2)).toBe("ride");
    expect(wahooActivityType(18)).toBe("ride");
  });

  it("maps running types to run", () => {
    expect(wahooActivityType(1)).toBe("run");
    expect(wahooActivityType(17)).toBe("run");
  });

  it("maps swimming types to swim", () => {
    expect(wahooActivityType(6)).toBe("swim");
    expect(wahooActivityType(19)).toBe("swim");
  });

  it("maps other known types", () => {
    expect(wahooActivityType(8)).toBe("weight_training");
    expect(wahooActivityType(9)).toBe("yoga");
    expect(wahooActivityType(14)).toBe("rowing");
    expect(wahooActivityType(15)).toBe("elliptical");
    expect(wahooActivityType(21)).toBe("hike");
    expect(wahooActivityType(22)).toBe("walk");
  });

  it("returns workout for null/undefined", () => {
    expect(wahooActivityType(null)).toBe("workout");
    expect(wahooActivityType(undefined)).toBe("workout");
  });

  it("returns workout for unknown type IDs", () => {
    expect(wahooActivityType(99)).toBe("workout");
    expect(wahooActivityType(-1)).toBe("workout");
  });
});

// ── WAHOO_WORKOUT_TYPE_MAP ───────────────────────────────────────────

describe("WAHOO_WORKOUT_TYPE_MAP", () => {
  it("has entries for type IDs 0-22", () => {
    for (let i = 0; i <= 22; i++) {
      expect(WAHOO_WORKOUT_TYPE_MAP).toHaveProperty(String(i));
    }
  });

  it("all values are strings", () => {
    Object.values(WAHOO_WORKOUT_TYPE_MAP).forEach(v => {
      expect(typeof v).toBe("string");
    });
  });
});

// ── mapWahooToActivity ───────────────────────────────────────────────

const MOCK_WORKOUT = {
  id: 12345,
  starts: "2026-03-01T14:00:00.000Z",
  workout_type_id: 0,
  name: "Morning Ride",
  latitude: 37.7749,
  longitude: -122.4194,
};

const MOCK_SUMMARY = {
  id: 67890,
  duration_active_accum: 3720.5,
  duration_paused_accum: 120.0,
  duration_total_accum: 3840.5,
  distance_accum: 45000.0,
  speed_avg: 12.1,
  heart_rate_avg: 145.2,
  cadence_avg: 88.0,
  power_avg: 215.0,
  power_bike_np_last: 230.0,
  power_bike_tss_last: 85.0,
  calories_accum: 980,
  ascent_accum: 450.0,
  work_accum: 799200,
  created_at: "2026-03-01T15:05:00.000Z",
  manual: false,
  file: { url: "https://cdn.wahoo.com/fit/12345.fit" },
};

const MOCK_TZ = {
  timezone_iana: "America/Los_Angeles",
  start_time_local: "2026-03-01T06:00:00",
};

describe("mapWahooToActivity", () => {
  it("maps all fields with correct DB column names", () => {
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, MOCK_SUMMARY, MOCK_TZ);

    // Correct column names (the bug fix)
    expect(result.elevation_gain_meters).toBe(450);
    expect(result.avg_speed_mps).toBe(12.1);
    expect(result.avg_hr_bpm).toBe(145.2);
    expect(result.avg_cadence_rpm).toBe(88);
    expect(result.avg_power_watts).toBe(215);
    expect(result.normalized_power_watts).toBe(230);
    expect(result.calories).toBe(980);

    // Verify OLD wrong column names are NOT present
    expect(result).not.toHaveProperty("elevation_gain");
    expect(result).not.toHaveProperty("avg_speed");
    expect(result).not.toHaveProperty("avg_heart_rate");
    expect(result).not.toHaveProperty("avg_cadence");
    expect(result).not.toHaveProperty("avg_power");
    expect(result).not.toHaveProperty("normalized_power");
    expect(result).not.toHaveProperty("total_calories");
  });

  it("sets core fields correctly", () => {
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, MOCK_SUMMARY, MOCK_TZ);

    expect(result.user_id).toBe("user-123");
    expect(result.source).toBe("wahoo");
    expect(result.source_id).toBe("67890");
    expect(result.activity_type).toBe("ride");
    expect(result.name).toBe("Morning Ride");
    expect(result.started_at).toBe("2026-03-01T14:00:00.000Z");
    expect(result.duration_seconds).toBe(3721);
    expect(result.distance_meters).toBe(45000);
    expect(result.tss).toBe(85);
    expect(result.start_lat).toBe(37.7749);
    expect(result.start_lng).toBe(-122.4194);
    expect(result.timezone_iana).toBe("America/Los_Angeles");
    expect(result.start_time_local).toBe("2026-03-01T06:00:00");
  });

  it("computes work_kj from work_accum (Joules to kJ)", () => {
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, MOCK_SUMMARY, MOCK_TZ);
    expect(result.work_kj).toBe(799); // 799200 / 1000 = 799.2 → rounded to 799
  });

  it("stores source_data with raw Wahoo fields", () => {
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, MOCK_SUMMARY, MOCK_TZ);

    expect(result.source_data.wahoo_workout_id).toBe(12345);
    expect(result.source_data.wahoo_summary_id).toBe(67890);
    expect(result.source_data.workout_type_id).toBe(0);
    expect(result.source_data.duration_paused).toBe(120);
    expect(result.source_data.duration_total).toBe(3840.5);
    expect(result.source_data.work_accum).toBe(799200);
    expect(result.source_data.manual).toBe(false);
    expect(result.source_data.fit_file_url).toBe("https://cdn.wahoo.com/fit/12345.fit");
  });

  it("handles null/missing summary fields gracefully", () => {
    const emptySummary = { id: 999, created_at: "2026-03-01T15:00:00.000Z" };
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, emptySummary, MOCK_TZ);

    expect(result.source_id).toBe("999");
    expect(result.duration_seconds).toBe(0);
    expect(result.distance_meters).toBe(0);
    expect(result.elevation_gain_meters).toBeNull();
    expect(result.avg_speed_mps).toBeNull();
    expect(result.avg_hr_bpm).toBeNull();
    expect(result.avg_cadence_rpm).toBeNull();
    expect(result.avg_power_watts).toBeNull();
    expect(result.normalized_power_watts).toBeNull();
    expect(result.calories).toBeNull();
    expect(result.tss).toBeNull();
    expect(result.work_kj).toBeNull();
  });

  it("handles missing workout (null) gracefully", () => {
    const result = mapWahooToActivity("user-123", null, MOCK_SUMMARY, MOCK_TZ);

    expect(result.activity_type).toBe("workout"); // null workout_type_id
    expect(result.name).toBe("Wahoo Workout"); // fallback name
    expect(result.start_lat).toBeNull();
    expect(result.start_lng).toBeNull();
    expect(result.started_at).toBe("2026-03-01T15:05:00.000Z"); // falls back to ws.created_at
  });

  it("uses summary name when workout name is missing", () => {
    const workoutNoName = { id: 1, starts: "2026-03-01T14:00:00.000Z" };
    const summaryWithName = { ...MOCK_SUMMARY, name: "Evening Spin" };
    const result = mapWahooToActivity("user-123", workoutNoName, summaryWithName, MOCK_TZ);
    expect(result.name).toBe("Evening Spin");
  });

  it("prefers workout.starts over ws.created_at for started_at", () => {
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, MOCK_SUMMARY, MOCK_TZ);
    expect(result.started_at).toBe("2026-03-01T14:00:00.000Z"); // workout.starts, not ws.created_at
  });

  it("handles zero work_accum", () => {
    const summary = { ...MOCK_SUMMARY, work_accum: 0 };
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, summary, MOCK_TZ);
    expect(result.work_kj).toBeNull();
  });

  it("handles missing file in summary", () => {
    const summary = { ...MOCK_SUMMARY, file: null };
    const result = mapWahooToActivity("user-123", MOCK_WORKOUT, summary, MOCK_TZ);
    expect(result.source_data.fit_file_url).toBeNull();
  });
});

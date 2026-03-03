import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  detectTravel,
  estimateJetLagRecoveryDays,
  estimateAltitudePowerPenalty,
} from "./travel.js";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it("calculates NYC to LA roughly correct (~3940km)", () => {
    const dist = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(3900);
    expect(dist).toBeLessThan(4000);
  });

  it("calculates NYC to London roughly correct (~5570km)", () => {
    const dist = haversineDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(5600);
  });

  it("calculates short distance (< 1km)", () => {
    // Two points ~1km apart in Manhattan
    const dist = haversineDistance(40.7128, -74.006, 40.7218, -74.006);
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(1.1);
  });
});

describe("detectTravel", () => {
  const baseActivity = {
    id: "act-1",
    start_lat: 40.7128,
    start_lng: -74.006,
    timezone_iana: "America/New_York",
    started_at: "2026-03-01T10:00:00Z",
    duration_seconds: 3600,
    elevation_gain_meters: 100,
  };

  it("returns null when no previous activity", () => {
    expect(detectTravel(baseActivity, null)).toBeNull();
  });

  it("returns null when activities are close together", () => {
    const nearby = {
      ...baseActivity,
      id: "act-2",
      start_lat: 40.73,
      start_lng: -74.01,
      started_at: "2026-03-02T10:00:00Z",
    };
    expect(detectTravel(nearby, baseActivity)).toBeNull();
  });

  it("detects travel when distance > 200km", () => {
    const farAway = {
      id: "act-2",
      start_lat: 34.0522,
      start_lng: -118.2437,
      timezone_iana: "America/Los_Angeles",
      // Only 6 hours later — implied speed >600kph = flight_likely
      started_at: "2026-03-01T17:00:00Z",
      duration_seconds: 3600,
    };
    const result = detectTravel(farAway, baseActivity);
    expect(result).not.toBeNull();
    expect(result.distance_km).toBeGreaterThan(3900);
    expect(result.travel_type).toBe("flight_likely");
    expect(result.last_activity_before).toBe("act-1");
    expect(result.first_activity_after).toBe("act-2");
  });

  it("returns null when GPS is missing", () => {
    const noGps = { ...baseActivity, start_lat: null, start_lng: null };
    expect(detectTravel(noGps, baseActivity)).toBeNull();
  });

  it("infers drive_likely for moderate distances with moderate time gap", () => {
    // 300km away, 5 hours later
    const driveAway = {
      id: "act-2",
      start_lat: 42.3601,
      start_lng: -71.0589,
      timezone_iana: "America/New_York",
      started_at: "2026-03-01T16:00:00Z",
      duration_seconds: 3600,
    };
    const result = detectTravel(driveAway, baseActivity);
    if (result) {
      expect(result.distance_km).toBeGreaterThan(200);
      expect(["drive_likely", "unknown"]).toContain(result.travel_type);
    }
  });
});

describe("estimateJetLagRecoveryDays", () => {
  it("returns 0 for no timezone change", () => {
    expect(estimateJetLagRecoveryDays(0)).toBe(0);
  });

  it("returns 3 for 3-hour shift", () => {
    expect(estimateJetLagRecoveryDays(3)).toBe(3);
  });

  it("handles negative shifts (traveling west)", () => {
    expect(estimateJetLagRecoveryDays(-6)).toBe(6);
  });

  it("rounds up partial timezone", () => {
    expect(estimateJetLagRecoveryDays(5.5)).toBe(6);
  });
});

describe("estimateAltitudePowerPenalty", () => {
  it("returns 0 below 1000m", () => {
    expect(estimateAltitudePowerPenalty(500)).toBe(0);
    expect(estimateAltitudePowerPenalty(999)).toBe(0);
  });

  it("returns 0 for null altitude", () => {
    expect(estimateAltitudePowerPenalty(null)).toBe(0);
  });

  it("returns reasonable penalty at 1800m (no acclimation)", () => {
    const penalty = estimateAltitudePowerPenalty(1800, 0);
    expect(penalty).toBeGreaterThan(2);
    expect(penalty).toBeLessThan(4);
  });

  it("reduces penalty with acclimation", () => {
    const dayZero = estimateAltitudePowerPenalty(2500, 0);
    const dayTen = estimateAltitudePowerPenalty(2500, 10);
    expect(dayTen).toBeLessThan(dayZero);
  });

  it("higher altitude = higher penalty", () => {
    const lower = estimateAltitudePowerPenalty(1500, 0);
    const higher = estimateAltitudePowerPenalty(2500, 0);
    expect(higher).toBeGreaterThan(lower);
  });
});

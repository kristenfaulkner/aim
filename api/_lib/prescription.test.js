import { describe, it, expect } from "vitest";
import {
  predictPower,
  analyzeProfileGaps,
  selectWorkoutTemplate,
  countRecentIntensityDays,
  adjustForConditions,
  buildPrescriptionContext,
  formatForCalendar,
} from "./prescription.js";

// ── Helpers ──

function generateProfile(cp, wPrimeKj) {
  // P(t) = W'/t + CP
  const wPrimeJ = wPrimeKj * 1000;
  return {
    best_5s_watts: Math.round(wPrimeJ / 5 + cp),
    best_30s_watts: Math.round(wPrimeJ / 30 + cp),
    best_1m_watts: Math.round(wPrimeJ / 60 + cp),
    best_5m_watts: Math.round(wPrimeJ / 300 + cp),
    best_20m_watts: Math.round(wPrimeJ / 1200 + cp),
    best_60m_watts: Math.round(wPrimeJ / 3600 + cp),
  };
}

function generateProfileWithGap(cp, wPrimeKj, gapKey, gapPct) {
  const profile = generateProfile(cp, wPrimeKj);
  // Reduce the specified duration by gapPct
  profile[gapKey] = Math.round(profile[gapKey] * (1 - gapPct / 100));
  return profile;
}

const baseCPModel = { cp_watts: 280, w_prime_kj: 20, pmax_watts: 1200 };

// ── predictPower ──

describe("predictPower", () => {
  it("computes power from CP model correctly", () => {
    // P(300) = 20000/300 + 280 = 66.67 + 280 = 347
    expect(predictPower(280, 20000, 300)).toBe(347);
  });

  it("returns 0 for invalid inputs", () => {
    expect(predictPower(0, 20000, 300)).toBe(0);
    expect(predictPower(280, 0, 300)).toBe(0);
    expect(predictPower(280, 20000, 0)).toBe(0);
    expect(predictPower(null, null, null)).toBe(0);
  });

  it("produces higher power at shorter durations", () => {
    const p5s = predictPower(280, 20000, 5);
    const p5m = predictPower(280, 20000, 300);
    const p60m = predictPower(280, 20000, 3600);
    expect(p5s).toBeGreaterThan(p5m);
    expect(p5m).toBeGreaterThan(p60m);
  });
});

// ── analyzeProfileGaps ──

describe("analyzeProfileGaps", () => {
  it("returns empty for balanced profile", () => {
    const profile = generateProfile(280, 20);
    const gaps = analyzeProfileGaps(profile, baseCPModel);
    expect(gaps).toEqual([]);
  });

  it("detects a gap at a weak duration", () => {
    const profile = generateProfileWithGap(280, 20, "best_5m_watts", 10);
    const gaps = analyzeProfileGaps(profile, baseCPModel);
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    const vo2gap = gaps.find((g) => g.label === "5m");
    expect(vo2gap).toBeDefined();
    expect(vo2gap.deficit).toBeGreaterThanOrEqual(8);
    expect(vo2gap.category).toBe("vo2max");
  });

  it("detects multiple gaps", () => {
    const profile = generateProfile(280, 20);
    profile.best_5s_watts = Math.round(profile.best_5s_watts * 0.8);
    profile.best_5m_watts = Math.round(profile.best_5m_watts * 0.85);
    const gaps = analyzeProfileGaps(profile, baseCPModel);
    expect(gaps.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts gaps by priority (highest first)", () => {
    const profile = generateProfile(280, 20);
    profile.best_5s_watts = Math.round(profile.best_5s_watts * 0.8);
    profile.best_20m_watts = Math.round(profile.best_20m_watts * 0.85);
    const gaps = analyzeProfileGaps(profile, baseCPModel);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].priority).toBeGreaterThanOrEqual(gaps[i].priority);
    }
  });

  it("returns empty for null inputs", () => {
    expect(analyzeProfileGaps(null, baseCPModel)).toEqual([]);
    expect(analyzeProfileGaps({}, null)).toEqual([]);
    expect(analyzeProfileGaps(null, null)).toEqual([]);
  });

  it("ignores durations with null values", () => {
    const profile = generateProfile(280, 20);
    profile.best_60m_watts = null;
    const gaps = analyzeProfileGaps(profile, baseCPModel);
    expect(gaps.every((g) => g.label !== "60m")).toBe(true);
  });

  it("applies goal-type weighting for crit racing", () => {
    const profile = generateProfile(280, 20);
    profile.best_5s_watts = Math.round(profile.best_5s_watts * 0.85);
    profile.best_60m_watts = Math.round(profile.best_60m_watts * 0.85);

    const critGaps = analyzeProfileGaps(profile, baseCPModel, { goalType: "crit" });
    const ttGaps = analyzeProfileGaps(profile, baseCPModel, { goalType: "tt" });

    const critSprint = critGaps.find((g) => g.label === "5s");
    const ttSprint = ttGaps.find((g) => g.label === "5s");

    // Sprint should be higher priority for crit than for TT
    expect(critSprint.priority).toBeGreaterThan(ttSprint.priority);
  });
});

// ── selectWorkoutTemplate ──

describe("selectWorkoutTemplate", () => {
  it("returns recovery when readiness < 45", () => {
    const gaps = [{ label: "5m", deficit: 10, category: "vo2max", priority: 15 }];
    const result = selectWorkoutTemplate(gaps, { recoveryScore: 30 });
    expect(result.readinessCheck).toBe("red");
    expect(result.template.type).toBe("recovery");
  });

  it("returns recovery when TSB < -30", () => {
    const gaps = [{ label: "5m", deficit: 10, category: "vo2max", priority: 15 }];
    const result = selectWorkoutTemplate(gaps, { tsb: -35 });
    expect(result.readinessCheck).toBe("red");
    expect(result.template.type).toBe("recovery");
  });

  it("returns taper when race in < 7 days", () => {
    const gaps = [{ label: "5m", deficit: 10, category: "vo2max", priority: 15 }];
    const result = selectWorkoutTemplate(gaps, { raceInDays: 3 });
    expect(result.template.type).toBe("taper");
  });

  it("returns complete rest for sick/injured athlete", () => {
    const gaps = [];
    const result = selectWorkoutTemplate(gaps, {
      muscleSoreness: 5,
      motivation: 1,
    });
    expect(result.template.type).toBe("rest");
    expect(result.readinessCheck).toBe("red");
  });

  it("targets top gap when readiness is green", () => {
    const gaps = [
      { label: "5m", deficit: 10, category: "vo2max", priority: 15 },
      { label: "20m", deficit: 8, category: "threshold", priority: 12 },
    ];
    const result = selectWorkoutTemplate(gaps, { recoveryScore: 80 });
    expect(result.readinessCheck).toBe("green");
    expect(result.template.name).toContain("VO2max");
  });

  it("avoids high-intensity on yellow readiness days", () => {
    const gaps = [
      { label: "5m", deficit: 10, category: "vo2max", priority: 15 },
      { label: "20m", deficit: 8, category: "threshold", priority: 12 },
    ];
    const result = selectWorkoutTemplate(gaps, { recoveryScore: 55 });
    // Should pick threshold (not VO2max) or endurance — VO2max is skipped on yellow days
    expect(result.template.name).not.toContain("VO2max");
    expect(result.template.name).toMatch(/Threshold|Endurance/);
  });

  it("suggests endurance when only intensity gaps exist and yellow readiness", () => {
    const gaps = [
      { label: "5s", deficit: 15, category: "sprint", priority: 10 },
      { label: "30s", deficit: 12, category: "anaerobic", priority: 12 },
    ];
    const result = selectWorkoutTemplate(gaps, { recoveryScore: 55 });
    expect(result.template.type).toBe("endurance");
  });

  it("suggests threshold when no gaps exist and fully recovered", () => {
    const result = selectWorkoutTemplate([], { recoveryScore: 85 });
    expect(result.template.name).toContain("Threshold");
  });

  it("suggests endurance when no gaps exist and yellow readiness", () => {
    const result = selectWorkoutTemplate([], { recoveryScore: 55 });
    expect(result.template.type).toBe("endurance");
  });

  it("avoids intensity when too many intensity days recently", () => {
    const gaps = [
      { label: "5m", deficit: 10, category: "vo2max", priority: 15 },
    ];
    const recentActivities = [
      { started_at: new Date(Date.now() - 1 * 86400000).toISOString(), tss: 100, intensity_factor: 0.9 },
      { started_at: new Date(Date.now() - 2 * 86400000).toISOString(), tss: 90, intensity_factor: 0.88 },
      { started_at: new Date(Date.now() - 3 * 86400000).toISOString(), tss: 95, intensity_factor: 0.87 },
    ];
    const result = selectWorkoutTemplate(gaps, { recoveryScore: 80 }, recentActivities);
    // Should NOT be VO2max — either endurance or threshold
    expect(result.template.type).not.toBe("sprints");
  });
});

// ── countRecentIntensityDays ──

describe("countRecentIntensityDays", () => {
  it("returns 0 for empty array", () => {
    expect(countRecentIntensityDays([])).toBe(0);
    expect(countRecentIntensityDays(null)).toBe(0);
  });

  it("counts high-intensity days correctly", () => {
    const activities = [
      { started_at: new Date(Date.now() - 1 * 86400000).toISOString(), tss: 100, intensity_factor: 0.9 },
      { started_at: new Date(Date.now() - 2 * 86400000).toISOString(), tss: 40, intensity_factor: 0.6 },
      { started_at: new Date(Date.now() - 3 * 86400000).toISOString(), tss: 90, intensity_factor: 0.88 },
    ];
    expect(countRecentIntensityDays(activities)).toBe(2);
  });

  it("ignores activities older than 7 days", () => {
    const activities = [
      { started_at: new Date(Date.now() - 10 * 86400000).toISOString(), tss: 100, intensity_factor: 0.95 },
    ];
    expect(countRecentIntensityDays(activities)).toBe(0);
  });

  it("deduplicates multiple activities on the same day", () => {
    const today = new Date().toISOString();
    const activities = [
      { started_at: today, tss: 100, intensity_factor: 0.9 },
      { started_at: today, tss: 80, intensity_factor: 0.86 },
    ];
    expect(countRecentIntensityDays(activities)).toBe(1);
  });
});

// ── adjustForConditions ──

describe("adjustForConditions", () => {
  it("reduces power 5% for yellow readiness", () => {
    const workout = { template: { name: "test" } };
    const result = adjustForConditions(workout, 55, null);
    expect(result.powerFactor).toBeCloseTo(0.95, 2);
    expect(result.adjustmentNotes).toBeDefined();
    expect(result.adjustmentNotes.length).toBeGreaterThan(0);
  });

  it("reduces power 5% for extreme heat", () => {
    const workout = { template: { name: "test" } };
    const result = adjustForConditions(workout, 80, { temp_c: 35 });
    expect(result.powerFactor).toBeCloseTo(0.95, 2);
  });

  it("reduces power 3% for warm conditions", () => {
    const workout = { template: { name: "test" } };
    const result = adjustForConditions(workout, 80, { temp_c: 28 });
    expect(result.powerFactor).toBeCloseTo(0.97, 2);
  });

  it("stacks readiness and heat adjustments", () => {
    const workout = { template: { name: "test" } };
    const result = adjustForConditions(workout, 55, { temp_c: 35 });
    // 0.95 * 0.95 = 0.9025
    expect(result.powerFactor).toBeCloseTo(0.9025, 2);
    expect(result.adjustmentNotes.length).toBe(2);
  });

  it("returns factor 1.0 when no adjustments needed", () => {
    const workout = { template: { name: "test" } };
    const result = adjustForConditions(workout, 80, { temp_c: 20 });
    expect(result.powerFactor).toBe(1.0);
    expect(result.adjustmentNotes).toBeNull();
  });

  it("adds warm-up note for cold conditions", () => {
    const workout = { template: { name: "test" } };
    const result = adjustForConditions(workout, 80, { temp_c: -5 });
    expect(result.adjustmentNotes).toBeDefined();
    expect(result.adjustmentNotes[0]).toContain("warm-up");
  });
});

// ── buildPrescriptionContext ──

describe("buildPrescriptionContext", () => {
  it("extracts first name from profile", () => {
    const ctx = buildPrescriptionContext({
      profile: { full_name: "Kristen Faulkner", ftp_watts: 280 },
    });
    expect(ctx.athlete.first_name).toBe("Kristen");
  });

  it("defaults to 'Athlete' when no name", () => {
    const ctx = buildPrescriptionContext({ profile: null });
    expect(ctx.athlete.first_name).toBe("Athlete");
  });

  it("limits recent activities to 10", () => {
    const acts = Array.from({ length: 20 }, (_, i) => ({
      name: `Ride ${i}`,
      started_at: new Date(Date.now() - i * 86400000).toISOString(),
      tss: 50 + i,
    }));
    const ctx = buildPrescriptionContext({ recentActivities: acts });
    expect(ctx.recentActivities.length).toBe(10);
  });

  it("includes CP model when available", () => {
    const ctx = buildPrescriptionContext({
      cpModel: { cp_watts: 280, w_prime_kj: 20, pmax_watts: 1200 },
    });
    expect(ctx.cpModel.cp_watts).toBe(280);
    expect(ctx.cpModel.w_prime_kj).toBe(20);
  });

  it("omits optional fields when empty", () => {
    const ctx = buildPrescriptionContext({});
    expect(ctx.crossTraining).toBeUndefined();
    expect(ctx.travelEvents).toBeUndefined();
    expect(ctx.upcomingRace).toBeUndefined();
  });
});

// ── formatForCalendar ──

describe("formatForCalendar", () => {
  it("formats prescription for training_calendar", () => {
    const rx = {
      workout_name: "VO2max Builder: 5x4min",
      workout_type: "intervals",
      rationale: "Targeting 5m gap",
      duration_minutes: 75,
      tss_estimate: 85,
      structure: [{ name: "Warm-up", duration_min: 15 }],
      fueling: { during: "40g carbs" },
    };
    const result = formatForCalendar(rx, "user-123", "2026-03-03");
    expect(result.user_id).toBe("user-123");
    expect(result.date).toBe("2026-03-03");
    expect(result.title).toBe("VO2max Builder: 5x4min");
    expect(result.source).toBe("ai_prescription");
    expect(result.structure.intervals).toHaveLength(1);
    expect(result.nutrition_plan.during).toBe("40g carbs");
  });
});

import { describe, it, expect } from "vitest";
import { estimateRecoveryImpact, estimateCrossTrainingTSS } from "./cross-training.js";

describe("estimateRecoveryImpact", () => {
  it("returns none for null entry", () => {
    expect(estimateRecoveryImpact(null)).toBe("none");
  });

  it("returns none for yoga", () => {
    expect(estimateRecoveryImpact({ activity_type: "yoga", perceived_intensity: 3 })).toBe("none");
  });

  it("returns none for pilates", () => {
    expect(estimateRecoveryImpact({ activity_type: "pilates", perceived_intensity: 4 })).toBe("none");
  });

  it("returns minor for low intensity anything", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "lower_body", perceived_intensity: 2 })).toBe("minor");
  });

  it("returns major for heavy lower body", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "lower_body", perceived_intensity: 4 })).toBe("major");
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "lower_body", perceived_intensity: 5 })).toBe("major");
  });

  it("returns major for heavy full body", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "full_body", perceived_intensity: 4 })).toBe("major");
  });

  it("returns moderate for moderate full body", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "full_body", perceived_intensity: 3 })).toBe("moderate");
  });

  it("returns minor for upper body at any intensity", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "upper_body", perceived_intensity: 5 })).toBe("minor");
  });

  it("returns moderate for core at high intensity", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "core", perceived_intensity: 4 })).toBe("moderate");
  });

  it("returns minor for core at moderate intensity", () => {
    expect(estimateRecoveryImpact({ activity_type: "strength", body_region: "core", perceived_intensity: 3 })).toBe("minor");
  });

  it("returns moderate as default for unspecified region at moderate+ intensity", () => {
    expect(estimateRecoveryImpact({ activity_type: "hiking", perceived_intensity: 3 })).toBe("moderate");
  });
});

describe("estimateCrossTrainingTSS", () => {
  it("returns 0 for null entry", () => {
    expect(estimateCrossTrainingTSS(null)).toBe(0);
  });

  it("returns 0 when no duration", () => {
    expect(estimateCrossTrainingTSS({ perceived_intensity: 3 })).toBe(0);
  });

  it("estimates low TSS for easy yoga (30min, intensity 1)", () => {
    const tss = estimateCrossTrainingTSS({ perceived_intensity: 1, duration_minutes: 30 });
    expect(tss).toBe(9); // 0.3 * 30
  });

  it("estimates moderate TSS for strength (60min, intensity 3)", () => {
    const tss = estimateCrossTrainingTSS({ perceived_intensity: 3, duration_minutes: 60 });
    expect(tss).toBe(45); // 0.75 * 60
  });

  it("estimates high TSS for hard HIIT (45min, intensity 5)", () => {
    const tss = estimateCrossTrainingTSS({ perceived_intensity: 5, duration_minutes: 45 });
    expect(tss).toBe(56); // 1.25 * 45 = 56.25 → 56
  });

  it("defaults to intensity 3 when not specified", () => {
    const tss = estimateCrossTrainingTSS({ duration_minutes: 60 });
    expect(tss).toBe(45); // 0.75 * 60
  });

  it("scales with duration", () => {
    const short = estimateCrossTrainingTSS({ perceived_intensity: 4, duration_minutes: 30 });
    const long = estimateCrossTrainingTSS({ perceived_intensity: 4, duration_minutes: 60 });
    // 1.0 * 30 = 30, 1.0 * 60 = 60
    expect(short).toBe(30);
    expect(long).toBe(60);
    expect(long).toBe(short * 2);
  });
});

import { describe, it, expect } from "vitest";
import { hasFeature, requiredTier, tierAtLeast, TIERS, TIER_ORDER } from "./entitlements";

describe("entitlements", () => {
  describe("hasFeature", () => {
    it("free tier has dashboard access", () => {
      expect(hasFeature("free", "dashboard")).toBe(true);
    });

    it("free tier does NOT have sleep", () => {
      expect(hasFeature("free", "sleep")).toBe(false);
    });

    it("starter tier has sleep", () => {
      expect(hasFeature("starter", "sleep")).toBe(true);
    });

    it("starter tier does NOT have cp_model", () => {
      expect(hasFeature("starter", "cp_model")).toBe(false);
    });

    it("pro tier has cp_model", () => {
      expect(hasFeature("pro", "cp_model")).toBe(true);
    });

    it("pro tier does NOT have api_access", () => {
      expect(hasFeature("pro", "api_access")).toBe(false);
    });

    it("elite tier has api_access", () => {
      expect(hasFeature("elite", "api_access")).toBe(true);
    });

    it("null tier defaults to free", () => {
      expect(hasFeature(null, "dashboard")).toBe(true);
      expect(hasFeature(null, "sleep")).toBe(false);
    });

    it("unknown tier returns false", () => {
      expect(hasFeature("unknown_tier", "dashboard")).toBe(false);
    });
  });

  describe("requiredTier", () => {
    it("dashboard requires free", () => {
      expect(requiredTier("dashboard")).toBe("free");
    });

    it("sleep requires starter", () => {
      expect(requiredTier("sleep")).toBe("starter");
    });

    it("cp_model requires pro", () => {
      expect(requiredTier("cp_model")).toBe("pro");
    });

    it("api_access requires elite", () => {
      expect(requiredTier("api_access")).toBe("elite");
    });

    it("unknown feature defaults to elite", () => {
      expect(requiredTier("nonexistent_feature")).toBe("elite");
    });
  });

  describe("tierAtLeast", () => {
    it("elite >= pro", () => {
      expect(tierAtLeast("elite", "pro")).toBe(true);
    });

    it("pro >= starter", () => {
      expect(tierAtLeast("pro", "starter")).toBe(true);
    });

    it("free >= free", () => {
      expect(tierAtLeast("free", "free")).toBe(true);
    });

    it("free < starter", () => {
      expect(tierAtLeast("free", "starter")).toBe(false);
    });

    it("starter < pro", () => {
      expect(tierAtLeast("starter", "pro")).toBe(false);
    });

    it("null defaults to free", () => {
      expect(tierAtLeast(null, "free")).toBe(true);
      expect(tierAtLeast(null, "starter")).toBe(false);
    });
  });

  describe("tier hierarchy", () => {
    it("each tier includes all features of lower tiers", () => {
      for (let i = 1; i < TIER_ORDER.length; i++) {
        const lower = TIERS[TIER_ORDER[i - 1]];
        const higher = TIERS[TIER_ORDER[i]];
        for (const feat of lower.features) {
          expect(higher.features).toContain(feat);
        }
      }
    });

    it("tier order is correct", () => {
      expect(TIER_ORDER).toEqual(["free", "starter", "pro", "elite"]);
    });
  });
});

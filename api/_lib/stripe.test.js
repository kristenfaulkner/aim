import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe constructor — Stripe uses `new Stripe(key)`
function MockStripe() {
  this.customers = {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ id: "cus_new" }),
  };
}
vi.mock("stripe", () => ({ default: MockStripe }));

// Set env vars before import
process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_starter";
process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro";
process.env.STRIPE_PRICE_ELITE_MONTHLY = "price_elite";

const { tierFromPriceId, PRICE_IDS, TIER_ORDER, TIER_LABELS, findOrCreateCustomer } = await import("./stripe.js");

describe("stripe.js", () => {
  describe("tierFromPriceId", () => {
    it("maps starter price to starter", () => {
      expect(tierFromPriceId("price_starter")).toBe("starter");
    });

    it("maps pro price to pro", () => {
      expect(tierFromPriceId("price_pro")).toBe("pro");
    });

    it("maps elite price to elite", () => {
      expect(tierFromPriceId("price_elite")).toBe("elite");
    });

    it("returns free for unknown price ID", () => {
      expect(tierFromPriceId("price_unknown")).toBe("free");
    });

    it("returns free for null", () => {
      expect(tierFromPriceId(null)).toBe("free");
    });
  });

  describe("PRICE_IDS", () => {
    it("has all 3 price keys", () => {
      expect(Object.keys(PRICE_IDS)).toHaveLength(3);
      expect(PRICE_IDS).toHaveProperty("starter");
      expect(PRICE_IDS).toHaveProperty("pro");
      expect(PRICE_IDS).toHaveProperty("elite");
    });
  });

  describe("TIER_ORDER", () => {
    it("has 4 tiers in correct order", () => {
      expect(TIER_ORDER).toEqual(["free", "starter", "pro", "elite"]);
    });
  });

  describe("TIER_LABELS", () => {
    it("has labels for all tiers", () => {
      expect(TIER_LABELS.free).toBe("Free");
      expect(TIER_LABELS.starter).toBe("Starter");
      expect(TIER_LABELS.pro).toBe("Pro");
      expect(TIER_LABELS.elite).toBe("Elite");
    });
  });

  describe("findOrCreateCustomer", () => {
    it("creates a new customer when none exists", async () => {
      const result = await findOrCreateCustomer("user-1", "test@example.com", "Test User");
      expect(result).toEqual({ id: "cus_new" });
    });
  });
});

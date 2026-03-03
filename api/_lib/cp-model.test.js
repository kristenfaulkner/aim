import { describe, it, expect } from "vitest";
import { fitCPModel, estimatePmax, computeCPZones, formatCPModelForAI } from "./cp-model.js";

/**
 * Generate synthetic best efforts from known CP and W' values.
 * P(t) = W'/t + CP
 */
function generateEfforts(cp, wPrimeKj) {
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

describe("fitCPModel", () => {
  it("recovers known CP and W' from synthetic data", () => {
    const efforts = generateEfforts(280, 20);
    const result = fitCPModel(efforts);

    expect(result).not.toBeNull();
    expect(result.cp_watts).toBeGreaterThanOrEqual(278);
    expect(result.cp_watts).toBeLessThanOrEqual(282);
    expect(result.w_prime_kj).toBeGreaterThanOrEqual(19.5);
    expect(result.w_prime_kj).toBeLessThanOrEqual(20.5);
  });

  it("produces R² near 1.0 for clean synthetic data", () => {
    const efforts = generateEfforts(250, 15);
    const result = fitCPModel(efforts);

    expect(result).not.toBeNull();
    expect(result.r_squared).toBeGreaterThan(0.99);
  });

  it("returns null for fewer than 3 data points", () => {
    const efforts = { best_5s_watts: 1000, best_60m_watts: 250 };
    expect(fitCPModel(efforts)).toBeNull();
  });

  it("returns null for all null values", () => {
    const efforts = {
      best_5s_watts: null,
      best_30s_watts: null,
      best_1m_watts: null,
      best_5m_watts: null,
      best_20m_watts: null,
      best_60m_watts: null,
    };
    expect(fitCPModel(efforts)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(fitCPModel(null)).toBeNull();
  });

  it("returns null when only short efforts exist (no long)", () => {
    const efforts = {
      best_5s_watts: 1100,
      best_30s_watts: 680,
      best_1m_watts: 480,
    };
    expect(fitCPModel(efforts)).toBeNull();
  });

  it("returns null when only long efforts exist (no short)", () => {
    const efforts = {
      best_5m_watts: 320,
      best_20m_watts: 290,
      best_60m_watts: 270,
    };
    expect(fitCPModel(efforts)).toBeNull();
  });

  it("returns null for zero values", () => {
    const efforts = {
      best_5s_watts: 0,
      best_30s_watts: 0,
      best_1m_watts: 0,
      best_5m_watts: 0,
      best_20m_watts: 0,
      best_60m_watts: 0,
    };
    expect(fitCPModel(efforts)).toBeNull();
  });

  it("works with exactly 3 data points spanning short and long", () => {
    const efforts = {
      best_30s_watts: 680,
      best_5m_watts: 320,
      best_20m_watts: 290,
    };
    const result = fitCPModel(efforts);
    expect(result).not.toBeNull();
    expect(result.cp_watts).toBeGreaterThan(0);
    expect(result.w_prime_kj).toBeGreaterThan(0);
  });

  it("includes model_data in result", () => {
    const efforts = generateEfforts(280, 20);
    const result = fitCPModel(efforts);

    expect(result.model_data).toBeDefined();
    expect(result.model_data.length).toBe(6);
    expect(result.model_data[0]).toHaveProperty("duration_s");
    expect(result.model_data[0]).toHaveProperty("watts");
  });

  it("includes pmax_watts in result", () => {
    const efforts = generateEfforts(280, 20);
    const result = fitCPModel(efforts);

    expect(result.pmax_watts).toBe(efforts.best_5s_watts);
  });

  it("handles realistic athlete data", () => {
    // Typical competitive amateur cyclist
    const efforts = {
      best_5s_watts: 1050,
      best_30s_watts: 650,
      best_1m_watts: 450,
      best_5m_watts: 330,
      best_20m_watts: 295,
      best_60m_watts: 275,
    };
    const result = fitCPModel(efforts);

    expect(result).not.toBeNull();
    expect(result.cp_watts).toBeGreaterThan(200);
    expect(result.cp_watts).toBeLessThan(350);
    expect(result.w_prime_kj).toBeGreaterThan(5);
    expect(result.w_prime_kj).toBeLessThan(50);
    expect(result.r_squared).toBeGreaterThan(0.9);
  });
});

describe("estimatePmax", () => {
  it("returns best_5s_watts when available", () => {
    expect(estimatePmax({ best_5s_watts: 1100, best_30s_watts: 700 })).toBe(1100);
  });

  it("falls back to best_30s_watts", () => {
    expect(estimatePmax({ best_30s_watts: 700 })).toBe(700);
  });

  it("returns null when no data", () => {
    expect(estimatePmax({})).toBeNull();
  });

  it("returns null for null input", () => {
    expect(estimatePmax(null)).toBeNull();
  });
});

describe("computeCPZones", () => {
  it("returns 6 zones with correct boundaries for CP=280", () => {
    const zones = computeCPZones(280);

    expect(zones).not.toBeNull();
    expect(zones).toHaveLength(6);
    expect(zones[0].zone).toBe("Z1");
    expect(zones[0].name).toBe("Recovery");
    expect(zones[0].max).toBe(Math.round(280 * 0.55));
    expect(zones[3].zone).toBe("Z4");
    expect(zones[3].name).toBe("Threshold");
    expect(zones[3].min).toBe(Math.round(280 * 0.9));
    expect(zones[3].max).toBe(Math.round(280 * 1.05));
    expect(zones[5].zone).toBe("Z6");
    expect(zones[5].name).toBe("Anaerobic");
    expect(zones[5].max).toBeNull();
  });

  it("returns null for zero CP", () => {
    expect(computeCPZones(0)).toBeNull();
  });

  it("returns null for null CP", () => {
    expect(computeCPZones(null)).toBeNull();
  });

  it("returns null for negative CP", () => {
    expect(computeCPZones(-100)).toBeNull();
  });

  it("zones have continuous boundaries (no gaps)", () => {
    const zones = computeCPZones(300);
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].min).toBe(zones[i - 1].max);
    }
  });
});

describe("formatCPModelForAI", () => {
  it("formats complete model with FTP comparison", () => {
    const model = { cp_watts: 280, w_prime_kj: 22.4, pmax_watts: 1100, r_squared: 0.987 };
    const result = formatCPModelForAI(model, 270);

    expect(result).toContain("CP: 280W");
    expect(result).toContain("W': 22.4 kJ");
    expect(result).toContain("Pmax: 1100W");
    expect(result).toContain("CP vs FTP: +10W");
    expect(result).toContain("R²: 0.987");
    expect(result).toContain("CRITICAL POWER MODEL");
  });

  it("shows negative delta when CP < FTP", () => {
    const model = { cp_watts: 260, w_prime_kj: 18, pmax_watts: 900, r_squared: 0.95 };
    const result = formatCPModelForAI(model, 270);

    expect(result).toContain("CP vs FTP: -10W");
  });

  it("omits FTP comparison when no FTP", () => {
    const model = { cp_watts: 280, w_prime_kj: 22, pmax_watts: 1100, r_squared: 0.99 };
    const result = formatCPModelForAI(model, null);

    expect(result).not.toContain("CP vs FTP");
  });

  it("omits Pmax value line when null", () => {
    const model = { cp_watts: 280, w_prime_kj: 22, pmax_watts: null, r_squared: 0.99 };
    const result = formatCPModelForAI(model, 270);

    // The metrics line should not contain a Pmax value
    const metricsLine = result.split("\n").find((l) => l.startsWith("CP: "));
    expect(metricsLine).not.toContain("Pmax:");
  });

  it("returns empty string for null model", () => {
    expect(formatCPModelForAI(null, 270)).toBe("");
  });

  it("returns empty string when cp_watts is missing", () => {
    expect(formatCPModelForAI({}, 270)).toBe("");
  });
});

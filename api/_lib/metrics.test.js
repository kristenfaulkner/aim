/**
 * Unit tests for cycling performance metric calculations.
 * These are exact Coggan formulas — verified with known inputs/outputs.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizedPower,
  intensityFactor,
  trainingStressScore,
  variabilityIndex,
  efficiencyFactor,
  hrDrift,
  zoneDistribution,
  powerCurve,
  workKj,
  computeActivityMetrics,
  computeTrainingLoad,
  findNewBests,
} from './metrics.js';

// ─── Normalized Power ───────────────────────────────────────────────────────

describe('normalizedPower', () => {
  it('returns null for streams shorter than 30 samples', () => {
    expect(normalizedPower([200, 210, 205])).toBeNull();
    expect(normalizedPower(Array(29).fill(200))).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(normalizedPower(null)).toBeNull();
    expect(normalizedPower(undefined)).toBeNull();
  });

  it('returns the same value as avg for constant power', () => {
    // Constant 250W for 60 seconds — NP should equal avg power
    const watts = Array(60).fill(250);
    expect(normalizedPower(watts)).toBe(250);
  });

  it('NP is higher than average for variable power', () => {
    // Blocks of low/high power (long enough for 30s rolling to capture variability)
    const watts = [
      ...Array(60).fill(150),
      ...Array(60).fill(350),
      ...Array(60).fill(150),
      ...Array(60).fill(350),
    ];
    const np = normalizedPower(watts);
    const avg = watts.reduce((s, v) => s + v, 0) / watts.length;
    expect(np).toBeGreaterThan(avg);
  });

  it('calculates NP correctly with known data', () => {
    // 60 seconds at 200W then 60 seconds at 300W
    const watts = [...Array(60).fill(200), ...Array(60).fill(300)];
    const np = normalizedPower(watts);
    // NP should be between 250 (avg) and 300 (max), closer to avg due to rolling
    expect(np).toBeGreaterThan(245);
    expect(np).toBeLessThan(305);
  });

  it('handles sample rate adjustment', () => {
    // 30 samples at 2s sample rate = 60 seconds = enough for 30s window
    const watts = Array(60).fill(200);
    const np = normalizedPower(watts, 2);
    // With 2s sample rate, window is 15 samples
    expect(np).toBe(200);
  });
});

// ─── Intensity Factor ───────────────────────────────────────────────────────

describe('intensityFactor', () => {
  it('returns null when NP or FTP is missing', () => {
    expect(intensityFactor(null, 298)).toBeNull();
    expect(intensityFactor(245, null)).toBeNull();
    expect(intensityFactor(0, 298)).toBeNull();
  });

  it('calculates IF = NP / FTP', () => {
    expect(intensityFactor(298, 298)).toBe(1.0);
    expect(intensityFactor(245, 298)).toBeCloseTo(0.822, 2);
    expect(intensityFactor(149, 298)).toBeCloseTo(0.5, 1);
  });

  it('can exceed 1.0 for above-FTP efforts', () => {
    expect(intensityFactor(350, 298)).toBeGreaterThan(1.0);
  });
});

// ─── Training Stress Score ──────────────────────────────────────────────────

describe('trainingStressScore', () => {
  it('returns null when any input is missing', () => {
    expect(trainingStressScore(null, 245, 0.822, 298)).toBeNull();
    expect(trainingStressScore(3600, null, 0.822, 298)).toBeNull();
    expect(trainingStressScore(3600, 245, null, 298)).toBeNull();
    expect(trainingStressScore(3600, 245, 0.822, null)).toBeNull();
  });

  it('calculates TSS for 1 hour at FTP = 100', () => {
    // 1 hour at exactly FTP: TSS should be 100
    const tss = trainingStressScore(3600, 298, 1.0, 298);
    expect(tss).toBe(100);
  });

  it('calculates TSS correctly for known values', () => {
    // NP=287, FTP=298, IF=287/298=0.963, duration=5400s
    const np = 287;
    const ftp = 298;
    const ifVal = np / ftp;
    const duration = 5400;
    const expected = (duration * np * ifVal) / (ftp * 3600) * 100;
    const tss = trainingStressScore(duration, np, ifVal, ftp);
    expect(tss).toBeCloseTo(expected, 0);
  });

  it('TSS scales linearly with duration', () => {
    const tss1h = trainingStressScore(3600, 245, 0.822, 298);
    const tss2h = trainingStressScore(7200, 245, 0.822, 298);
    // Allow ±1 for rounding (both values are Math.round'd independently)
    expect(Math.abs(tss2h - tss1h * 2)).toBeLessThanOrEqual(1);
  });
});

// ─── Variability Index ──────────────────────────────────────────────────────

describe('variabilityIndex', () => {
  it('returns null when inputs are missing', () => {
    expect(variabilityIndex(null, 200)).toBeNull();
    expect(variabilityIndex(220, null)).toBeNull();
  });

  it('returns 1.0 for constant power (NP = avg)', () => {
    expect(variabilityIndex(200, 200)).toBe(1.0);
  });

  it('is > 1.0 when NP > avg power', () => {
    expect(variabilityIndex(275, 240)).toBeGreaterThan(1.0);
    expect(variabilityIndex(275, 240)).toBeCloseTo(1.146, 2);
  });
});

// ─── Efficiency Factor ──────────────────────────────────────────────────────

describe('efficiencyFactor', () => {
  it('returns null when inputs are missing', () => {
    expect(efficiencyFactor(null, 155)).toBeNull();
    expect(efficiencyFactor(287, null)).toBeNull();
  });

  it('calculates EF = NP / avgHR', () => {
    expect(efficiencyFactor(287, 155)).toBeCloseTo(1.85, 2);
    expect(efficiencyFactor(245, 142)).toBeCloseTo(1.73, 2);
  });
});

// ─── HR Drift ───────────────────────────────────────────────────────────────

describe('hrDrift', () => {
  it('returns null for streams shorter than 60 samples', () => {
    expect(hrDrift(Array(30).fill(200), Array(30).fill(140))).toBeNull();
  });

  it('returns null for null inputs', () => {
    expect(hrDrift(null, [140, 141])).toBeNull();
    expect(hrDrift([200, 210], null)).toBeNull();
  });

  it('returns 0 for perfectly even effort', () => {
    const watts = Array(120).fill(200);
    const hr = Array(120).fill(140);
    expect(hrDrift(watts, hr)).toBe(0);
  });

  it('positive drift when HR rises relative to power', () => {
    // Same power, but HR higher in second half
    const watts = Array(120).fill(200);
    const hr = [...Array(60).fill(140), ...Array(60).fill(150)];
    const drift = hrDrift(watts, hr);
    expect(drift).toBeGreaterThan(0);
  });

  it('negative drift when HR drops relative to power', () => {
    // Same power, HR lower in second half (unlikely but tests formula)
    const watts = Array(120).fill(200);
    const hr = [...Array(60).fill(150), ...Array(60).fill(140)];
    const drift = hrDrift(watts, hr);
    expect(drift).toBeLessThan(0);
  });
});

// ─── Zone Distribution ──────────────────────────────────────────────────────

describe('zoneDistribution', () => {
  it('returns null for null inputs', () => {
    expect(zoneDistribution(null, 298)).toBeNull();
    expect(zoneDistribution([200], null)).toBeNull();
  });

  it('correctly bins constant power into a single zone', () => {
    // 100W at FTP 298 = 33.6% FTP → Z1 (<55%)
    const watts = Array(60).fill(100);
    const zones = zoneDistribution(watts, 298);
    expect(zones.z1).toBe(60);
    expect(zones.z2).toBe(0);
  });

  it('distributes across multiple zones', () => {
    const ftp = 200;
    const watts = [
      ...Array(10).fill(80),   // 40% FTP → Z1
      ...Array(10).fill(120),  // 60% FTP → Z2
      ...Array(10).fill(170),  // 85% FTP → Z3
      ...Array(10).fill(200),  // 100% FTP → Z4
      ...Array(10).fill(230),  // 115% FTP → Z5
      ...Array(10).fill(280),  // 140% FTP → Z6
      ...Array(10).fill(320),  // 160% FTP → Z7
    ];
    const zones = zoneDistribution(watts, ftp);
    expect(zones.z1).toBe(10);
    expect(zones.z2).toBe(10);
    expect(zones.z3).toBe(10);
    expect(zones.z4).toBe(10);
    expect(zones.z5).toBe(10);
    expect(zones.z6).toBe(10);
    expect(zones.z7).toBe(10);
  });

  it('respects sample rate', () => {
    const watts = Array(30).fill(100); // Z1 at FTP 298
    const zones = zoneDistribution(watts, 298, 2);
    expect(zones.z1).toBe(60); // 30 samples × 2s = 60 seconds
  });
});

// ─── Power Curve ────────────────────────────────────────────────────────────

describe('powerCurve', () => {
  it('returns null for very short streams', () => {
    expect(powerCurve([200, 210])).toBeNull();
    expect(powerCurve(null)).toBeNull();
  });

  it('finds max average power for each duration', () => {
    // 120 samples: first 60 at 200W, then 60 at 300W
    const watts = [...Array(60).fill(200), ...Array(60).fill(300)];
    const curve = powerCurve(watts);
    expect(curve['5s']).toBe(300);  // Best 5s is in the 300W block
    expect(curve['30s']).toBe(300); // Best 30s is in the 300W block
    expect(curve['1m']).toBe(300);  // Best 60s is the full 300W block
    expect(curve['5m']).toBeNull(); // Not enough data for 5 minutes
  });

  it('returns null for durations longer than stream', () => {
    const watts = Array(60).fill(200);
    const curve = powerCurve(watts);
    expect(curve['5m']).toBeNull();
    expect(curve['20m']).toBeNull();
    expect(curve['60m']).toBeNull();
  });
});

// ─── Work (kJ) ──────────────────────────────────────────────────────────────

describe('workKj', () => {
  it('returns null for null input', () => {
    expect(workKj(null)).toBeNull();
  });

  it('calculates work correctly', () => {
    // 200W for 3600s = 720,000 J = 720 kJ
    const watts = Array(3600).fill(200);
    expect(workKj(watts)).toBe(720);
  });

  it('respects sample rate', () => {
    // 1800 samples at 2s interval, 200W each = 200 * 2 * 1800 / 1000 = 720 kJ
    const watts = Array(1800).fill(200);
    expect(workKj(watts, 2)).toBe(720);
  });
});

// ─── computeActivityMetrics (integration) ───────────────────────────────────

describe('computeActivityMetrics', () => {
  it('computes all metrics from stream data', () => {
    const watts = Array(120).fill(250);
    const heartrate = Array(120).fill(150);
    const cadence = Array(120).fill(90);
    const time = Array.from({ length: 120 }, (_, i) => i);

    const streams = {
      watts: { data: watts },
      heartrate: { data: heartrate },
      cadence: { data: cadence },
      time: { data: time },
    };

    const result = computeActivityMetrics(streams, 120, 298);

    expect(result.avg_power_watts).toBe(250);
    expect(result.max_power_watts).toBe(250);
    expect(result.normalized_power_watts).toBe(250);
    expect(result.avg_hr_bpm).toBe(150);
    expect(result.max_hr_bpm).toBe(150);
    expect(result.avg_cadence_rpm).toBe(90);
    expect(result.intensity_factor).toBeCloseTo(0.839, 2);
    expect(result.variability_index).toBe(1.0);
    expect(result.efficiency_factor).toBeCloseTo(1.67, 1);
    expect(result.hr_drift_pct).toBe(0);
    expect(result.work_kj).toBe(30); // 250W × 120s / 1000
    expect(result.zone_distribution).toBeDefined();
    expect(result.power_curve).toBeDefined();
  });

  it('handles missing power stream gracefully', () => {
    const streams = {
      heartrate: { data: Array(120).fill(150) },
      time: { data: Array.from({ length: 120 }, (_, i) => i) },
    };

    const result = computeActivityMetrics(streams, 120, 298);
    expect(result.avg_power_watts).toBeNull();
    expect(result.normalized_power_watts).toBeNull();
    expect(result.tss).toBeNull();
    expect(result.avg_hr_bpm).toBe(150);
  });

  it('handles missing HR stream gracefully', () => {
    const streams = {
      watts: { data: Array(120).fill(250) },
      time: { data: Array.from({ length: 120 }, (_, i) => i) },
    };

    const result = computeActivityMetrics(streams, 120, 298);
    expect(result.avg_power_watts).toBe(250);
    expect(result.avg_hr_bpm).toBeNull();
    expect(result.efficiency_factor).toBeNull();
    expect(result.hr_drift_pct).toBeNull();
  });
});

// ─── Training Load (CTL/ATL/TSB) ────────────────────────────────────────────

describe('computeTrainingLoad', () => {
  it('returns empty array for empty input', () => {
    expect(computeTrainingLoad([])).toEqual([]);
  });

  it('computes CTL/ATL/TSB from daily TSS', () => {
    const dailyTss = [
      { date: '2025-01-01', tss: 100 },
      { date: '2025-01-02', tss: 0 },
      { date: '2025-01-03', tss: 80 },
    ];

    const result = computeTrainingLoad(dailyTss);
    expect(result).toHaveLength(3);

    // Day 1: CTL = 0 + (100 - 0) * (1/42) ≈ 2.38
    expect(result[0].ctl).toBeCloseTo(2.4, 0);
    // Day 1: ATL = 0 + (100 - 0) * (1/7) ≈ 14.29
    expect(result[0].atl).toBeCloseTo(14.3, 0);
    // TSB = CTL - ATL
    expect(result[0].tsb).toBeCloseTo(result[0].ctl - result[0].atl, 1);
  });

  it('ATL responds faster than CTL (shorter time constant)', () => {
    const dailyTss = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      tss: 100,
    }));

    const result = computeTrainingLoad(dailyTss);
    // After 10 days of 100 TSS, ATL should be higher than CTL
    const last = result[result.length - 1];
    expect(last.atl).toBeGreaterThan(last.ctl);
  });

  it('computes ramp rate starting from day 8', () => {
    const dailyTss = Array.from({ length: 14 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      tss: 100,
    }));

    const result = computeTrainingLoad(dailyTss);
    // First 7 days should have null ramp rate
    for (let i = 0; i < 7; i++) {
      expect(result[i].ramp_rate).toBeNull();
    }
    // Day 8+ should have ramp rate
    expect(result[7].ramp_rate).toBeDefined();
    expect(result[7].ramp_rate).not.toBeNull();
  });

  it('handles null/zero TSS gracefully', () => {
    const dailyTss = [
      { date: '2025-01-01', tss: null },
      { date: '2025-01-02', tss: 0 },
      { date: '2025-01-03', tss: 50 },
    ];

    const result = computeTrainingLoad(dailyTss);
    expect(result).toHaveLength(3);
    expect(result[0].daily_tss).toBe(0);
    expect(result[1].daily_tss).toBe(0);
    expect(result[2].daily_tss).toBe(50);
  });
});

// ─── Find New Bests ─────────────────────────────────────────────────────────

describe('findNewBests', () => {
  it('returns null when no new bests', () => {
    const newCurve = { '5s': 600, '1m': 400 };
    const existing = { best_5s_watts: 700, best_1m_watts: 450 };
    expect(findNewBests(newCurve, existing, 57)).toBeNull();
  });

  it('returns null for null inputs', () => {
    expect(findNewBests(null, {}, 57)).toBeNull();
    expect(findNewBests({}, null, 57)).toBeNull();
  });

  it('detects new bests', () => {
    const newCurve = { '5s': 800, '1m': 400 };
    const existing = { best_5s_watts: 700, best_1m_watts: 450 };
    const bests = findNewBests(newCurve, existing, 57);

    expect(bests).not.toBeNull();
    expect(bests.best_5s_watts).toBe(800);
    expect(bests.best_5s_wkg).toBeCloseTo(14.04, 1);
    // 1m should NOT be in bests (400 < 450)
    expect(bests.best_1m_watts).toBeUndefined();
  });

  it('handles empty existing profile (first activity)', () => {
    const newCurve = { '5s': 600, '30s': 450, '1m': 380 };
    const existing = {};
    const bests = findNewBests(newCurve, existing, 57);

    expect(bests).not.toBeNull();
    expect(bests.best_5s_watts).toBe(600);
    expect(bests.best_30s_watts).toBe(450);
    expect(bests.best_1m_watts).toBe(380);
  });

  it('computes W/kg when weight provided', () => {
    const newCurve = { '20m': 300 };
    const existing = { best_20m_watts: 280 };
    const bests = findNewBests(newCurve, existing, 60);

    expect(bests.best_20m_wkg).toBeCloseTo(5.0, 1);
  });

  it('skips W/kg when no weight', () => {
    const newCurve = { '20m': 300 };
    const existing = { best_20m_watts: 280 };
    const bests = findNewBests(newCurve, existing, null);

    expect(bests.best_20m_watts).toBe(300);
    expect(bests.best_20m_wkg).toBeUndefined();
  });
});

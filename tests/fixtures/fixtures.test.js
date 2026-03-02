/**
 * Validate that all mock fixtures are well-formed and consistent with each other.
 * Ensures test data matches the database schema relationships.
 */
import { describe, it, expect } from 'vitest';
import mockProfile from './mock-profile.json';
import mockActivities from './mock-activities.json';
import mockDailyMetrics from './mock-daily-metrics.json';
import mockPowerProfile from './mock-power-profile.json';
import mockStravaActivity from './mock-strava-activity.json';
import mockStravaStreams from './mock-strava-streams.json';
import mockBloodPanel from './mock-blood-panel.json';
import mockClaudeAnalysis from './mock-claude-analysis.json';

const TEST_USER_ID = 'test-user-uuid-1234';

describe('fixture validation — profile', () => {
  it('has required fields', () => {
    expect(mockProfile.id).toBe(TEST_USER_ID);
    expect(mockProfile.full_name).toBeTruthy();
    expect(mockProfile.ftp_watts).toBeGreaterThan(0);
    expect(mockProfile.max_hr_bpm).toBeGreaterThan(0);
    expect(mockProfile.weight_kg).toBeGreaterThan(0);
  });

  it('has consent fields for legal compliance', () => {
    expect(mockProfile.terms_accepted_at).toBeTruthy();
    expect(mockProfile.privacy_accepted_at).toBeTruthy();
    expect(mockProfile.health_data_consent_at).toBeTruthy();
    expect(mockProfile.is_deleted).toBe(false);
  });

  it('has completed onboarding', () => {
    expect(mockProfile.onboarding_completed).toBe(true);
  });
});

describe('fixture validation — activities', () => {
  it('has 5 activities from multiple sources', () => {
    expect(mockActivities).toHaveLength(5);
    const sources = [...new Set(mockActivities.map(a => a.source))];
    expect(sources.length).toBeGreaterThan(1);
  });

  it('all reference the test user', () => {
    mockActivities.forEach(act => {
      expect(act.user_id).toBe(TEST_USER_ID);
    });
  });

  it('each activity has core metric fields', () => {
    mockActivities.forEach(act => {
      expect(act.id).toBeTruthy();
      expect(act.source).toBeTruthy();
      expect(act.source_id).toBeTruthy();
      expect(act.started_at).toBeTruthy();
      expect(act.duration_seconds).toBeGreaterThan(0);
    });
  });

  it('activities are sorted by date descending', () => {
    for (let i = 1; i < mockActivities.length; i++) {
      const prev = new Date(mockActivities[i - 1].started_at);
      const curr = new Date(mockActivities[i].started_at);
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
    }
  });

  it('TSS values are reasonable', () => {
    mockActivities.forEach(act => {
      if (act.tss != null) {
        expect(act.tss).toBeGreaterThan(0);
        expect(act.tss).toBeLessThan(500);
      }
    });
  });

  it('intensity factors are between 0 and 2', () => {
    mockActivities.forEach(act => {
      if (act.intensity_factor != null) {
        expect(act.intensity_factor).toBeGreaterThan(0);
        expect(act.intensity_factor).toBeLessThan(2);
      }
    });
  });
});

describe('fixture validation — daily metrics', () => {
  it('has 7 days of data', () => {
    expect(mockDailyMetrics).toHaveLength(7);
  });

  it('all reference the test user', () => {
    mockDailyMetrics.forEach(dm => {
      expect(dm.user_id).toBe(TEST_USER_ID);
    });
  });

  it('dates are valid and sequential', () => {
    const dates = mockDailyMetrics.map(dm => new Date(dm.date));
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1].getTime()).toBeGreaterThan(dates[i].getTime());
    }
  });

  it('CTL/ATL/TSB values are present and reasonable', () => {
    mockDailyMetrics.forEach(dm => {
      if (dm.ctl != null) {
        expect(dm.ctl).toBeGreaterThan(0);
        expect(dm.ctl).toBeLessThan(200);
      }
      if (dm.atl != null) {
        expect(dm.atl).toBeGreaterThan(0);
        expect(dm.atl).toBeLessThan(200);
      }
      // TSB can be negative
      if (dm.tsb != null) {
        expect(dm.tsb).toBeGreaterThan(-100);
        expect(dm.tsb).toBeLessThan(100);
      }
    });
  });
});

describe('fixture validation — power profile', () => {
  it('references the test user', () => {
    expect(mockPowerProfile.user_id).toBe(TEST_USER_ID);
  });

  it('has best efforts at all durations', () => {
    expect(mockPowerProfile.best_5s_watts).toBeGreaterThan(0);
    expect(mockPowerProfile.best_30s_watts).toBeGreaterThan(0);
    expect(mockPowerProfile.best_1m_watts).toBeGreaterThan(0);
    expect(mockPowerProfile.best_5m_watts).toBeGreaterThan(0);
    expect(mockPowerProfile.best_20m_watts).toBeGreaterThan(0);
    expect(mockPowerProfile.best_60m_watts).toBeGreaterThan(0);
  });

  it('power decreases with duration (expected pattern)', () => {
    expect(mockPowerProfile.best_5s_watts).toBeGreaterThan(mockPowerProfile.best_30s_watts);
    expect(mockPowerProfile.best_30s_watts).toBeGreaterThan(mockPowerProfile.best_1m_watts);
    expect(mockPowerProfile.best_1m_watts).toBeGreaterThan(mockPowerProfile.best_5m_watts);
    expect(mockPowerProfile.best_5m_watts).toBeGreaterThan(mockPowerProfile.best_20m_watts);
    expect(mockPowerProfile.best_20m_watts).toBeGreaterThan(mockPowerProfile.best_60m_watts);
  });

  it('W/kg values are consistent with watts and weight', () => {
    const weight = mockProfile.weight_kg;
    expect(mockPowerProfile.best_5s_wkg).toBeCloseTo(mockPowerProfile.best_5s_watts / weight, 1);
    expect(mockPowerProfile.best_20m_wkg).toBeCloseTo(mockPowerProfile.best_20m_watts / weight, 1);
  });
});

describe('fixture validation — strava API response', () => {
  it('has required Strava fields', () => {
    expect(mockStravaActivity.id).toBeTruthy();
    expect(mockStravaActivity.name).toBeTruthy();
    expect(mockStravaActivity.type).toBe('Ride');
    expect(mockStravaActivity.start_date).toBeTruthy();
    expect(mockStravaActivity.moving_time).toBeGreaterThan(0);
    expect(mockStravaActivity.distance).toBeGreaterThan(0);
  });

  it('streams have matching lengths', () => {
    const wattsLen = mockStravaStreams.watts.data.length;
    const hrLen = mockStravaStreams.heartrate.data.length;
    const cadenceLen = mockStravaStreams.cadence.data.length;
    const timeLen = mockStravaStreams.time.data.length;

    expect(wattsLen).toBe(timeLen);
    expect(hrLen).toBe(timeLen);
    expect(cadenceLen).toBe(timeLen);
  });

  it('time stream is sequential', () => {
    const time = mockStravaStreams.time.data;
    for (let i = 1; i < time.length; i++) {
      expect(time[i]).toBeGreaterThan(time[i - 1]);
    }
  });
});

describe('fixture validation — blood panel', () => {
  it('references the test user', () => {
    expect(mockBloodPanel.user_id).toBe(TEST_USER_ID);
  });

  it('has athlete-relevant biomarkers', () => {
    expect(mockBloodPanel.ferritin_ng_ml).toBeGreaterThan(0);
    expect(mockBloodPanel.hemoglobin_g_dl).toBeGreaterThan(0);
    expect(mockBloodPanel.vitamin_d_ng_ml).toBeGreaterThan(0);
  });

  it('ferritin is in athlete-optimal range (>50)', () => {
    expect(mockBloodPanel.ferritin_ng_ml).toBeGreaterThan(50);
  });
});

describe('fixture validation — Claude analysis output', () => {
  it('matches expected AI output format', () => {
    expect(mockClaudeAnalysis.summary).toBeTruthy();
    expect(Array.isArray(mockClaudeAnalysis.insights)).toBe(true);
    expect(Array.isArray(mockClaudeAnalysis.dataGaps)).toBe(true);
  });

  it('summary starts with athlete first name', () => {
    expect(mockClaudeAnalysis.summary).toMatch(/^Kristen,/);
  });

  it('insights have required fields', () => {
    mockClaudeAnalysis.insights.forEach(insight => {
      expect(['insight', 'positive', 'warning', 'action']).toContain(insight.type);
      expect(insight.icon).toBeTruthy();
      expect(['performance', 'body', 'recovery', 'training', 'nutrition', 'environment', 'health']).toContain(insight.category);
      expect(insight.title).toBeTruthy();
      expect(insight.body).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(insight.confidence);
    });
  });

  it('has 3+ insights', () => {
    expect(mockClaudeAnalysis.insights.length).toBeGreaterThanOrEqual(3);
  });

  it('dataGaps suggest additional integrations', () => {
    expect(mockClaudeAnalysis.dataGaps.length).toBeGreaterThanOrEqual(1);
  });
});

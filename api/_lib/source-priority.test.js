/**
 * Unit tests for source priority and cross-source deduplication.
 */
import { describe, it, expect } from 'vitest';
import {
  getSourcePriority,
  isHigherPriority,
  findCrossSourceDuplicate,
  findDuplicate,
} from './source-priority.js';

describe('getSourcePriority', () => {
  it('returns correct priority for known sources', () => {
    expect(getSourcePriority('strava')).toBe(1);
    expect(getSourcePriority('trainingpeaks')).toBe(2);
    expect(getSourcePriority('wahoo')).toBe(3);
    expect(getSourcePriority('hammerhead')).toBe(3);
    expect(getSourcePriority('garmin')).toBe(3);
  });

  it('returns 0 for unknown sources', () => {
    expect(getSourcePriority('unknown')).toBe(0);
    expect(getSourcePriority('')).toBe(0);
  });
});

describe('isHigherPriority', () => {
  it('device > trainingpeaks > strava', () => {
    expect(isHigherPriority('wahoo', 'strava')).toBe(true);
    expect(isHigherPriority('trainingpeaks', 'strava')).toBe(true);
    expect(isHigherPriority('wahoo', 'trainingpeaks')).toBe(true);
  });

  it('lower or equal priority returns false', () => {
    expect(isHigherPriority('strava', 'wahoo')).toBe(false);
    expect(isHigherPriority('strava', 'trainingpeaks')).toBe(false);
    expect(isHigherPriority('strava', 'strava')).toBe(false);
    expect(isHigherPriority('wahoo', 'wahoo')).toBe(false);
  });
});

describe('findCrossSourceDuplicate', () => {
  const existingActivities = [
    {
      id: 'act-1',
      source: 'strava',
      started_at: '2025-03-01T08:00:00Z',
      duration_seconds: 3600,
    },
    {
      id: 'act-2',
      source: 'wahoo',
      started_at: '2025-02-28T14:00:00Z',
      duration_seconds: 5400,
    },
  ];

  it('finds duplicate within 2-min time window', () => {
    // 1 minute off from act-1, same-ish duration, different source
    const match = findCrossSourceDuplicate(
      existingActivities,
      '2025-03-01T08:01:00Z',
      3650,
      'wahoo'
    );
    expect(match).not.toBeNull();
    expect(match.id).toBe('act-1');
  });

  it('now matches same-source duplicates (delegates to findDuplicate)', () => {
    const match = findCrossSourceDuplicate(
      existingActivities,
      '2025-03-01T08:00:00Z',
      3600,
      'strava' // same source as act-1 — now matches
    );
    expect(match).not.toBeNull();
    expect(match.id).toBe('act-1');
  });

  it('matches within 5-min window (widened from 2 min)', () => {
    const match = findCrossSourceDuplicate(
      existingActivities,
      '2025-03-01T08:04:00Z', // 4 min off but within ±5min
      3600,
      'wahoo'
    );
    expect(match).not.toBeNull();
    expect(match.id).toBe('act-1');
  });

  it('returns null when duration difference > 5%', () => {
    const match = findCrossSourceDuplicate(
      existingActivities,
      '2025-03-01T08:00:00Z',
      3000, // 16.7% shorter than 3600
      'wahoo'
    );
    expect(match).toBeNull();
  });

  it('returns null for empty existing activities', () => {
    const match = findCrossSourceDuplicate(
      [],
      '2025-03-01T08:00:00Z',
      3600,
      'wahoo'
    );
    expect(match).toBeNull();
  });
});

describe('findDuplicate', () => {
  const existing = [
    {
      id: 'a1', source: 'strava', source_id: '111',
      started_at: '2025-03-01T08:00:00Z', duration_seconds: 3600, distance_meters: 40000,
    },
    {
      id: 'a2', source: 'wahoo', source_id: '222',
      started_at: '2025-02-28T14:00:00Z', duration_seconds: 5400, distance_meters: 70000,
    },
  ];

  // Layer 1: exact source_id match
  it('matches exact same source + source_id regardless of time', () => {
    const match = findDuplicate(existing, '2025-06-01T00:00:00Z', 9999, 'strava', '111');
    expect(match?.id).toBe('a1');
  });

  // Layer 2: same-source fuzzy match with different source_id (key fix!)
  it('catches same-source duplicate with different source_id', () => {
    const match = findDuplicate(
      existing, '2025-03-01T08:00:30Z', 3620, 'strava', '999', { distanceMeters: 40100 }
    );
    expect(match?.id).toBe('a1');
  });

  // Cross-source match by time + duration (tight window)
  it('finds cross-source duplicate within 2min by duration alone', () => {
    const match = findDuplicate(existing, '2025-03-01T08:01:00Z', 3650, 'wahoo');
    expect(match?.id).toBe('a1');
  });

  // Cross-source match in wider window needs both signals
  it('matches at 3min offset when duration AND distance both confirm', () => {
    const match = findDuplicate(
      existing, '2025-03-01T08:03:00Z', 3620, 'wahoo', null, { distanceMeters: 40200 }
    );
    expect(match?.id).toBe('a1');
  });

  // Wider window with only one signal available still works (min(2,1)=1)
  it('matches at 3min offset when only duration available (1 signal)', () => {
    const noDist = [{ id: 'a1', source: 'strava', source_id: '111', started_at: '2025-03-01T08:00:00Z', duration_seconds: 3600 }];
    const match = findDuplicate(noDist, '2025-03-01T08:03:00Z', 3620, 'wahoo');
    expect(match?.id).toBe('a1');
  });

  // Wider window with two signals available but only one matches → reject
  it('rejects at 3min offset when both signals available but only duration matches', () => {
    const match = findDuplicate(
      existing, '2025-03-01T08:03:00Z', 3620, 'wahoo', null, { distanceMeters: 20000 }
    );
    expect(match).toBeNull(); // distance >30% different = hard reject
  });

  // Hard rejection: duration >30% different
  it('rejects when duration differs by >30% even within tight window', () => {
    const match = findDuplicate(existing, '2025-03-01T08:01:00Z', 2000, 'wahoo', null, { distanceMeters: 40000 });
    expect(match).toBeNull();
  });

  // Hard rejection: distance >30% different
  it('rejects when distance differs by >30% even within tight window', () => {
    const match = findDuplicate(existing, '2025-03-01T08:01:00Z', 3610, 'wahoo', null, { distanceMeters: 20000 });
    expect(match).toBeNull();
  });

  // Outside time window entirely
  it('returns null when time difference > 5 minutes', () => {
    const match = findDuplicate(existing, '2025-03-01T08:10:00Z', 3600, 'wahoo', null, { distanceMeters: 40000 });
    expect(match).toBeNull();
  });

  // No confirming signals at all
  it('returns null when neither duration nor distance available', () => {
    const noDuration = [{ id: 'a1', source: 'strava', source_id: '111', started_at: '2025-03-01T08:00:00Z' }];
    const match = findDuplicate(noDuration, '2025-03-01T08:01:00Z', null, 'wahoo');
    expect(match).toBeNull();
  });

  // Empty list
  it('returns null for empty list', () => {
    expect(findDuplicate([], '2025-03-01T08:00:00Z', 3600, 'strava')).toBeNull();
  });

  // Indoor trainer (zero distance) — dedup on duration only
  it('matches indoor rides (zero distance) on time + duration', () => {
    const indoor = [{ id: 'a1', source: 'strava', source_id: '111', started_at: '2025-03-01T08:00:00Z', duration_seconds: 3600, distance_meters: 0 }];
    const match = findDuplicate(indoor, '2025-03-01T08:01:00Z', 3610, 'wahoo', null, { distanceMeters: 0 });
    expect(match?.id).toBe('a1');
  });

  // Symmetric normalization: moving_time (shorter) incoming vs elapsed_time (longer) existing
  // e.g. Strava moving_time=12300s (3:25) vs TP elapsed_time=13560s (3:46) = 9.3% diff
  it('matches when shorter moving_time is incoming against longer elapsed_time existing', () => {
    const tpActivity = [{
      id: 'tp1', source: 'trainingpeaks', source_id: 'tp_abc',
      started_at: '2025-03-04T14:00:00Z', duration_seconds: 13560, distance_meters: 95000,
    }];
    const match = findDuplicate(
      tpActivity, '2025-03-04T14:00:30Z', 12300, 'strava', null, { distanceMeters: 95200 }
    );
    expect(match?.id).toBe('tp1');
  });

  // Backward compat: deprecated wrapper still works
  it('findCrossSourceDuplicate still works as deprecated wrapper', () => {
    const match = findCrossSourceDuplicate(existing, '2025-03-01T08:01:00Z', 3650, 'wahoo');
    expect(match?.id).toBe('a1');
  });
});

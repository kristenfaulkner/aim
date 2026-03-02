/**
 * Unit tests for source priority and cross-source deduplication.
 */
import { describe, it, expect } from 'vitest';
import {
  getSourcePriority,
  isHigherPriority,
  findCrossSourceDuplicate,
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

  it('skips activities from the same source', () => {
    const match = findCrossSourceDuplicate(
      existingActivities,
      '2025-03-01T08:00:00Z',
      3600,
      'strava' // same source as act-1
    );
    expect(match).toBeNull();
  });

  it('returns null when time difference > 2 minutes', () => {
    const match = findCrossSourceDuplicate(
      existingActivities,
      '2025-03-01T08:05:00Z', // 5 min off
      3600,
      'wahoo'
    );
    expect(match).toBeNull();
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

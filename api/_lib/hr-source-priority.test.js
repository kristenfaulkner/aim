/**
 * Unit tests for HR source prioritization engine.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULTS,
  SOURCE_DISPLAY_NAMES,
  getConfidence,
  detectDeviceType,
  resolveHRSource,
  getDisplayName,
  getProviderContexts,
  getConfidenceNote,
} from './hr-source-priority.js';

// ── DEFAULTS ──

describe('DEFAULTS', () => {
  it('has all 3 contexts defined', () => {
    expect(DEFAULTS.exercise).toBeDefined();
    expect(DEFAULTS.sleep).toBeDefined();
    expect(DEFAULTS.resting).toBeDefined();
  });

  it('exercise prioritizes chest strap highest', () => {
    expect(DEFAULTS.exercise[0]).toBe('chest_strap');
  });

  it('sleep prioritizes oura highest', () => {
    expect(DEFAULTS.sleep[0]).toBe('oura');
  });

  it('resting prioritizes oura highest', () => {
    expect(DEFAULTS.resting[0]).toBe('oura');
  });
});

// ── getConfidence ──

describe('getConfidence', () => {
  it('returns high for chest strap in exercise', () => {
    expect(getConfidence('chest_strap', 'exercise')).toBe('high');
  });

  it('returns low for oura in exercise (override)', () => {
    expect(getConfidence('oura', 'exercise')).toBe('low');
  });

  it('returns high for oura in sleep (override)', () => {
    expect(getConfidence('oura', 'sleep')).toBe('high');
  });

  it('returns high for oura in resting (override)', () => {
    expect(getConfidence('oura', 'resting')).toBe('high');
  });

  it('returns medium for strava_stream', () => {
    expect(getConfidence('strava_stream', 'exercise')).toBe('medium');
  });

  it('returns low for wrist optical in exercise', () => {
    expect(getConfidence('wrist_optical', 'exercise')).toBe('low');
  });

  it('returns low for unknown source', () => {
    expect(getConfidence('unknown_device', 'exercise')).toBe('low');
  });

  it('defaults to base confidence when no context override', () => {
    expect(getConfidence('wahoo', 'exercise')).toBe('high');
    expect(getConfidence('eightsleep', 'sleep')).toBe('high');
  });
});

// ── detectDeviceType ──

describe('detectDeviceType', () => {
  it('returns unknown for null activity', () => {
    const result = detectDeviceType(null);
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe('low');
  });

  it('detects Wahoo source as device_file with high confidence', () => {
    const result = detectDeviceType({ source: 'wahoo', source_data: {} });
    expect(result.type).toBe('device_file');
    expect(result.confidence).toBe('high');
  });

  it('detects Garmin source as device_file with high confidence', () => {
    const result = detectDeviceType({ source: 'garmin', source_data: {} });
    expect(result.type).toBe('device_file');
    expect(result.confidence).toBe('high');
  });

  it('detects Wahoo TICKR from device name as chest_strap', () => {
    const result = detectDeviceType({
      source: 'wahoo',
      source_data: { device_name: 'Wahoo TICKR X' },
    });
    expect(result.type).toBe('chest_strap');
    expect(result.confidence).toBe('high');
  });

  it('detects Garmin HRM from device name as chest_strap', () => {
    const result = detectDeviceType({
      source: 'garmin',
      source_data: { device_name: 'Garmin HRM-Pro Plus' },
    });
    expect(result.type).toBe('chest_strap');
    expect(result.confidence).toBe('high');
  });

  it('detects Polar H10 from Strava device name as chest_strap', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: 'Polar H10' },
    });
    expect(result.type).toBe('chest_strap');
    expect(result.confidence).toBe('high');
  });

  it('detects Apple Watch from Strava as wrist_optical', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: 'Apple Watch Series 9' },
    });
    expect(result.type).toBe('wrist_optical');
    expect(result.confidence).toBe('medium');
  });

  it('detects Garmin Fenix from Strava as wrist_optical', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: 'Garmin Fenix 7' },
    });
    expect(result.type).toBe('wrist_optical');
    expect(result.confidence).toBe('medium');
  });

  it('detects Wahoo ELEMNT from Strava as device_file', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: 'Wahoo ELEMNT BOLT' },
    });
    expect(result.type).toBe('device_file');
    expect(result.confidence).toBe('high');
  });

  it('detects Garmin Edge from Strava as device_file', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: 'Garmin Edge 540' },
    });
    expect(result.type).toBe('device_file');
    expect(result.confidence).toBe('high');
  });

  it('detects Hammerhead Karoo from Strava as device_file', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: 'Hammerhead Karoo 2' },
    });
    expect(result.type).toBe('device_file');
    expect(result.confidence).toBe('high');
  });

  it('falls back to strava_stream for unknown Strava device', () => {
    const result = detectDeviceType({
      source: 'strava',
      source_data: { device_name: '' },
    });
    expect(result.type).toBe('strava_stream');
    expect(result.confidence).toBe('medium');
  });

  it('detects TrainingPeaks as device_file', () => {
    const result = detectDeviceType({ source: 'trainingpeaks', source_data: {} });
    expect(result.type).toBe('device_file');
    expect(result.confidence).toBe('high');
  });

  it('returns unknown for unrecognized source', () => {
    const result = detectDeviceType({ source: 'randomapp', source_data: {} });
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe('low');
  });
});

// ── resolveHRSource ──

describe('resolveHRSource', () => {
  it('returns null for empty available sources', () => {
    expect(resolveHRSource('exercise', [])).toBeNull();
    expect(resolveHRSource('exercise', null)).toBeNull();
  });

  it('picks chest_strap over strava_stream for exercise', () => {
    const sources = [
      { type: 'strava_stream', hasData: true },
      { type: 'chest_strap', hasData: true },
    ];
    const result = resolveHRSource('exercise', sources);
    expect(result.source.type).toBe('chest_strap');
    expect(result.confidence).toBe('high');
  });

  it('picks oura over whoop for sleep', () => {
    const sources = [
      { type: 'whoop', hasData: true },
      { type: 'oura', hasData: true },
    ];
    const result = resolveHRSource('sleep', sources);
    expect(result.source.type).toBe('oura');
  });

  it('picks oura over eightsleep for resting', () => {
    const sources = [
      { type: 'eightsleep', hasData: true },
      { type: 'oura', hasData: true },
    ];
    const result = resolveHRSource('resting', sources);
    expect(result.source.type).toBe('oura');
  });

  it('skips sources without data', () => {
    const sources = [
      { type: 'chest_strap', hasData: false },
      { type: 'strava_stream', hasData: true },
    ];
    const result = resolveHRSource('exercise', sources);
    expect(result.source.type).toBe('strava_stream');
  });

  it('falls back to any available source when none match priority list', () => {
    const sources = [
      { type: 'some_unknown_device', hasData: true },
    ];
    const result = resolveHRSource('exercise', sources);
    expect(result.source.type).toBe('some_unknown_device');
    expect(result.confidence).toBe('low');
  });

  it('respects user config override', () => {
    const sources = [
      { type: 'oura', hasData: true },
      { type: 'whoop', hasData: true },
    ];
    // User prefers whoop over oura for sleep
    const userConfig = { provider_priority: ['whoop', 'oura'] };
    const result = resolveHRSource('sleep', sources, userConfig);
    expect(result.source.type).toBe('whoop');
  });

  it('uses source-level confidence when available', () => {
    const sources = [
      { type: 'strava_stream', hasData: true, confidence: 'high' },
    ];
    const result = resolveHRSource('exercise', sources);
    expect(result.confidence).toBe('high');
  });
});

// ── getDisplayName ──

describe('getDisplayName', () => {
  it('returns correct display names', () => {
    expect(getDisplayName('chest_strap')).toBe('Chest Strap');
    expect(getDisplayName('oura')).toBe('Oura Ring');
    expect(getDisplayName('whoop')).toBe('Whoop');
    expect(getDisplayName('eightsleep')).toBe('Eight Sleep');
  });

  it('returns source type for unknown sources', () => {
    expect(getDisplayName('random')).toBe('random');
  });

  it('returns Unknown for null/undefined', () => {
    expect(getDisplayName(null)).toBe('Unknown');
    expect(getDisplayName(undefined)).toBe('Unknown');
  });
});

// ── getProviderContexts ──

describe('getProviderContexts', () => {
  it('strava covers exercise only', () => {
    const ctx = getProviderContexts('strava');
    expect(ctx.exercise).toContain('strava_stream');
    expect(ctx.sleep).toHaveLength(0);
    expect(ctx.resting).toHaveLength(0);
  });

  it('oura covers sleep and resting', () => {
    const ctx = getProviderContexts('oura');
    expect(ctx.exercise).toContain('ring');
    expect(ctx.sleep).toContain('oura');
    expect(ctx.resting).toContain('oura');
  });

  it('whoop covers exercise, sleep, and resting', () => {
    const ctx = getProviderContexts('whoop');
    expect(ctx.exercise).toContain('wrist_optical');
    expect(ctx.sleep).toContain('whoop');
    expect(ctx.resting).toContain('whoop');
  });

  it('eightsleep covers sleep and resting only', () => {
    const ctx = getProviderContexts('eightsleep');
    expect(ctx.exercise).toHaveLength(0);
    expect(ctx.sleep).toContain('eightsleep');
    expect(ctx.resting).toContain('eightsleep');
  });

  it('unknown provider returns empty arrays', () => {
    const ctx = getProviderContexts('randomapp');
    expect(ctx.exercise).toHaveLength(0);
    expect(ctx.sleep).toHaveLength(0);
    expect(ctx.resting).toHaveLength(0);
  });
});

// ── getConfidenceNote ──

describe('getConfidenceNote', () => {
  it('returns context-specific note for chest strap during exercise', () => {
    const note = getConfidenceNote('chest_strap', 'high', 'exercise');
    expect(note).toContain('gold standard');
  });

  it('returns context-specific note for oura during sleep', () => {
    const note = getConfidenceNote('oura', 'high', 'sleep');
    expect(note).toContain('overnight');
  });

  it('returns fallback for unknown source', () => {
    const note = getConfidenceNote('random_device', 'low', 'exercise');
    expect(note).toContain('low');
  });
});

/**
 * Tests for design tokens — validates all required tokens exist and have valid values.
 */
import { describe, it, expect } from 'vitest';
import { T, font, mono, catColors, breakpoints, touchMin } from './tokens';

describe('design tokens', () => {
  it('has all required color tokens', () => {
    expect(T.bg).toBe('#05060a');
    expect(T.surface).toBe('#0c0d14');
    expect(T.card).toBe('#111219');
    expect(T.accent).toBe('#00e5a0');
    expect(T.text).toBeTruthy();
    expect(T.textSoft).toBeTruthy();
    expect(T.textDim).toBeTruthy();
  });

  it('has gradient token', () => {
    expect(T.gradient).toContain('linear-gradient');
    expect(T.gradient).toContain('#00e5a0');
    expect(T.gradient).toContain('#3b82f6');
  });

  it('has semantic color tokens', () => {
    expect(T.danger).toBeTruthy();
    expect(T.warn).toBeTruthy();
    expect(T.blue).toBeTruthy();
    expect(T.green).toBeTruthy();
  });

  it('exports font families', () => {
    expect(font).toContain('Outfit');
    expect(mono).toContain('JetBrains Mono');
  });

  it('exports category colors for boosters', () => {
    expect(catColors.supplement).toBe(T.accent);
    expect(catColors.protocol).toBeTruthy();
    expect(catColors.training).toBeTruthy();
    expect(catColors.nutrition).toBeTruthy();
    expect(catColors.recovery).toBeTruthy();
  });

  it('exports responsive breakpoints', () => {
    expect(breakpoints.mobile).toBe(768);
    expect(breakpoints.tablet).toBe(1024);
  });

  it('exports WCAG touch minimum', () => {
    expect(touchMin).toBe(44);
  });
});

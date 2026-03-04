/**
 * HR Source Prioritization Engine
 *
 * Automatically selects the most accurate HR source when an athlete has
 * multiple HR-capable devices. Three contexts (exercise/sleep/resting)
 * each have their own default priority stack based on device accuracy research.
 *
 * Extends the existing source-priority.js pattern (activity-level dedup)
 * with finer-grained HR-specific resolution.
 */

// Default priority stacks — ordered highest to lowest accuracy per context
export const DEFAULTS = {
  exercise: ['chest_strap', 'device_file', 'strava_stream', 'wrist_optical', 'ring'],
  sleep:    ['oura', 'eightsleep', 'whoop', 'garmin_watch', 'apple_watch'],
  resting:  ['oura', 'whoop', 'garmin_watch', 'apple_watch', 'eightsleep'],
};

// Human-readable display names for source badges
export const SOURCE_DISPLAY_NAMES = {
  chest_strap:    'Chest Strap',
  device_file:    'Device File',
  strava_stream:  'Strava',
  wrist_optical:  'Wrist Optical',
  ring:           'Ring',
  oura:           'Oura Ring',
  eightsleep:     'Eight Sleep',
  whoop:          'Whoop',
  garmin_watch:   'Garmin Watch',
  apple_watch:    'Apple Watch',
  wahoo:          'Wahoo',
  garmin:         'Garmin',
  strava:         'Strava',
  withings:       'Withings',
};

// Confidence levels by source type
const CONFIDENCE_MAP = {
  chest_strap:    'high',
  device_file:    'high',
  wahoo:          'high',
  garmin:         'high',
  oura:           'high',     // high for sleep/resting, low for exercise
  strava_stream:  'medium',
  strava:         'medium',
  eightsleep:     'medium',
  whoop:          'medium',
  garmin_watch:   'medium',
  apple_watch:    'medium',
  wrist_optical:  'low',
  ring:           'low',
};

// Confidence overrides per context
const CONFIDENCE_OVERRIDES = {
  exercise: { oura: 'low', ring: 'low', wrist_optical: 'low' },
  sleep:    { oura: 'high', eightsleep: 'high', whoop: 'medium' },
  resting:  { oura: 'high', whoop: 'high' },
};

/**
 * Get confidence level for a source in a given context.
 * @param {string} sourceType - e.g. 'chest_strap', 'oura', 'whoop'
 * @param {string} context - 'exercise' | 'sleep' | 'resting'
 * @returns {'high'|'medium'|'low'}
 */
export function getConfidence(sourceType, context = 'exercise') {
  const override = CONFIDENCE_OVERRIDES[context]?.[sourceType];
  if (override) return override;
  return CONFIDENCE_MAP[sourceType] || 'low';
}

/**
 * Detect the HR device type from an activity's metadata.
 * Infers source from FIT metadata, integration provider, or device_name.
 *
 * @param {object} activity - Activity record with source, source_data, etc.
 * @returns {{ type: string, name: string, confidence: string }}
 */
export function detectDeviceType(activity) {
  if (!activity) return { type: 'unknown', name: 'Unknown', confidence: 'low' };

  const source = activity.source;
  const sourceData = activity.source_data || {};

  // Check for FIT file HR source metadata (Wahoo/Garmin device files)
  if (source === 'wahoo' || source === 'garmin') {
    // Device files from Wahoo/Garmin typically have chest strap HR
    // FIT metadata: device_manufacturer + hr_source fields
    const deviceName = sourceData.device_name
      || sourceData.device?.manufacturer
      || sourceData.workout_summary?.device?.type
      || '';
    const deviceLower = String(deviceName).toLowerCase();

    // Check for explicit HR monitor indicators
    if (deviceLower.includes('tickr') || deviceLower.includes('hrm')
        || deviceLower.includes('h10') || deviceLower.includes('h9')
        || deviceLower.includes('chest')) {
      return { type: 'chest_strap', name: formatDeviceName(deviceName), confidence: 'high' };
    }

    // Device file from Wahoo/Garmin head unit — likely has paired chest strap
    return { type: 'device_file', name: source === 'wahoo' ? 'Wahoo' : 'Garmin', confidence: 'high' };
  }

  // TrainingPeaks — original FIT files
  if (source === 'trainingpeaks') {
    return { type: 'device_file', name: 'TrainingPeaks', confidence: 'high' };
  }

  // Strava — could be from any device
  if (source === 'strava') {
    const deviceName = sourceData.device_name || '';
    const deviceLower = deviceName.toLowerCase();

    // Check for known chest strap keywords
    if (deviceLower.includes('tickr') || deviceLower.includes('hrm')
        || deviceLower.includes('h10') || deviceLower.includes('h9')) {
      return { type: 'chest_strap', name: formatDeviceName(deviceName), confidence: 'high' };
    }

    // Check for known wrist optical devices
    if (deviceLower.includes('apple watch') || deviceLower.includes('fenix')
        || deviceLower.includes('forerunner') || deviceLower.includes('venu')
        || deviceLower.includes('vivoactive')) {
      return { type: 'wrist_optical', name: formatDeviceName(deviceName), confidence: 'medium' };
    }

    // Check for head units (Wahoo ELEMNT, Garmin Edge, Hammerhead)
    if (deviceLower.includes('elemnt') || deviceLower.includes('edge')
        || deviceLower.includes('karoo') || deviceLower.includes('hammerhead')) {
      return { type: 'device_file', name: formatDeviceName(deviceName), confidence: 'high' };
    }

    // Generic Strava stream — unknown device
    return { type: 'strava_stream', name: 'Strava', confidence: 'medium' };
  }

  return { type: 'unknown', name: 'Unknown', confidence: 'low' };
}

/**
 * Resolve the best HR source from multiple available sources for a given context.
 *
 * @param {string} context - 'exercise' | 'sleep' | 'resting'
 * @param {Array<{ type: string, hasData: boolean, confidence?: string, name?: string }>} availableSources
 * @param {object|null} userConfig - User's custom priority from hr_source_config table
 * @returns {{ source: object, confidence: string }}
 */
export function resolveHRSource(context, availableSources, userConfig = null) {
  if (!availableSources || availableSources.length === 0) {
    return null;
  }

  const priority = userConfig?.provider_priority || DEFAULTS[context];
  if (!priority) return { source: availableSources[0], confidence: 'low' };

  // Find highest-priority source that has data
  for (const sourceType of priority) {
    const match = availableSources.find(s => s.type === sourceType && s.hasData);
    if (match) {
      return {
        source: match,
        confidence: match.confidence || getConfidence(sourceType, context),
      };
    }
  }

  // Fallback: use whatever has data
  const withData = availableSources.find(s => s.hasData);
  if (withData) {
    return { source: withData, confidence: 'low' };
  }

  return null;
}

/**
 * Get the display name for a source type.
 * @param {string} sourceType
 * @returns {string}
 */
export function getDisplayName(sourceType) {
  return SOURCE_DISPLAY_NAMES[sourceType] || sourceType || 'Unknown';
}

/**
 * Map an integration provider name to the HR source types it covers.
 * Used to build the list of available sources for a user's connected integrations.
 *
 * @param {string} provider - Integration provider name
 * @returns {{ exercise: string[], sleep: string[], resting: string[] }}
 */
export function getProviderContexts(provider) {
  const map = {
    strava:   { exercise: ['strava_stream'], sleep: [], resting: [] },
    wahoo:    { exercise: ['device_file'], sleep: [], resting: [] },
    garmin:   { exercise: ['device_file'], sleep: ['garmin_watch'], resting: ['garmin_watch'] },
    oura:     { exercise: ['ring'], sleep: ['oura'], resting: ['oura'] },
    whoop:    { exercise: ['wrist_optical'], sleep: ['whoop'], resting: ['whoop'] },
    eightsleep: { exercise: [], sleep: ['eightsleep'], resting: ['eightsleep'] },
    withings: { exercise: [], sleep: [], resting: [] },
  };
  return map[provider] || { exercise: [], sleep: [], resting: [] };
}

/**
 * Format a confidence note explaining why a source was chosen.
 * @param {string} sourceType
 * @param {string} confidence
 * @param {string} context
 * @returns {string}
 */
export function getConfidenceNote(sourceType, confidence, context) {
  const notes = {
    exercise: {
      chest_strap: 'Chest strap — gold standard for exercise HR',
      device_file: 'Device file — typically paired with chest strap',
      strava_stream: 'Strava stream — device type uncertain',
      wrist_optical: 'Wrist optical — may have motion artifacts during exercise',
      ring: 'Ring sensor — not designed for exercise HR',
    },
    sleep: {
      oura: 'Oura Ring — optimized for overnight HR from the finger',
      eightsleep: 'Eight Sleep — mattress-based BCG sensor',
      whoop: 'Whoop — continuous wrist optical overnight',
      garmin_watch: 'Garmin watch — wrist optical during sleep',
      apple_watch: 'Apple Watch — wrist optical during sleep',
    },
    resting: {
      oura: 'Oura Ring — standardized end-of-sleep RHR measurement',
      whoop: 'Whoop — morning RHR from overnight recording',
      garmin_watch: 'Garmin — first-beat RHR measurement',
      apple_watch: 'Apple Watch — lowest resting HR during rest periods',
      eightsleep: 'Eight Sleep — derived from overnight BCG',
    },
  };
  return notes[context]?.[sourceType] || `${getDisplayName(sourceType)} (${confidence} confidence)`;
}

// ── Internal helpers ──

function formatDeviceName(name) {
  if (!name) return 'Unknown';
  // Clean up common device name formats
  return String(name).trim().replace(/\s+/g, ' ');
}

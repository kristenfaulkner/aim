/**
 * Travel Detection Library — pure functions, no DB calls.
 *
 * Detects travel events by comparing GPS coordinates between consecutive
 * activities. Provides jet lag estimation and altitude power penalty calculations.
 */

// ============================================================
// Haversine Distance
// ============================================================

/**
 * Calculate great-circle distance between two points in km.
 * @param {number} lat1 - Origin latitude
 * @param {number} lng1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lng2 - Destination longitude
 * @returns {number} Distance in km
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// ============================================================
// Travel Detection
// ============================================================

const TRAVEL_DISTANCE_MIN_KM = 200;
const ALTITUDE_CHANGE_MIN_M = 500;
const TIMEZONE_CHANGE_MIN_HOURS = 2;

/**
 * Detect travel between two consecutive activities.
 *
 * @param {object} newActivity - The newer activity (must have start_lat, start_lng, timezone_iana, started_at, elevation_gain_meters)
 * @param {object} lastActivity - The previous activity (same fields)
 * @returns {object|null} Travel event data, or null if no significant travel detected
 */
export function detectTravel(newActivity, lastActivity) {
  if (!newActivity || !lastActivity) return null;

  // Need GPS on both activities
  if (
    newActivity.start_lat == null || newActivity.start_lng == null ||
    lastActivity.start_lat == null || lastActivity.start_lng == null
  ) {
    return null;
  }

  const distance = haversineDistance(
    lastActivity.start_lat, lastActivity.start_lng,
    newActivity.start_lat, newActivity.start_lng
  );

  if (distance < TRAVEL_DISTANCE_MIN_KM) return null;

  // Timezone shift
  const tzShift = getTimezoneOffsetDiff(newActivity.timezone_iana, lastActivity.timezone_iana);

  // Altitude change (use elevation if available, otherwise null)
  const newAlt = newActivity.elevation_gain_meters != null ? estimateStartAltitude(newActivity) : null;
  const lastAlt = lastActivity.elevation_gain_meters != null ? estimateStartAltitude(lastActivity) : null;
  const altitudeChange = (newAlt != null && lastAlt != null) ? newAlt - lastAlt : null;

  // Infer travel type from distance and time gap
  const newStart = new Date(newActivity.started_at).getTime();
  const lastEnd = lastActivity.started_at
    ? new Date(lastActivity.started_at).getTime() + (lastActivity.duration_seconds || 0) * 1000
    : null;
  const hoursBetween = lastEnd ? (newStart - lastEnd) / 3600000 : null;
  const impliedSpeedKph = hoursBetween && hoursBetween > 0 ? distance / hoursBetween : null;

  let travelType = "unknown";
  if (impliedSpeedKph != null) {
    if (impliedSpeedKph > 300) travelType = "flight_likely";
    else if (impliedSpeedKph > 60) travelType = "drive_likely";
  }

  // Only create event if at least one threshold is met
  const significantTz = Math.abs(tzShift) >= TIMEZONE_CHANGE_MIN_HOURS;
  const significantAlt = altitudeChange != null && Math.abs(altitudeChange) >= ALTITUDE_CHANGE_MIN_M;

  // Distance alone (>200km) is enough to create an event
  return {
    origin_lat: lastActivity.start_lat,
    origin_lng: lastActivity.start_lng,
    origin_timezone: lastActivity.timezone_iana || null,
    origin_altitude_m: lastAlt,
    dest_lat: newActivity.start_lat,
    dest_lng: newActivity.start_lng,
    dest_timezone: newActivity.timezone_iana || null,
    dest_altitude_m: newAlt,
    distance_km: Math.round(distance * 10) / 10,
    timezone_shift_hours: tzShift,
    altitude_change_m: altitudeChange != null ? Math.round(altitudeChange) : null,
    travel_type: travelType,
    last_activity_before: lastActivity.id,
    first_activity_after: newActivity.id,
    has_significant_tz: significantTz,
    has_significant_altitude: significantAlt,
  };
}

// ============================================================
// Jet Lag & Altitude Estimations
// ============================================================

/**
 * Estimate jet lag recovery days (~1 day per timezone crossed).
 * @param {number} timezoneShiftHours - Signed timezone shift
 * @returns {number} Estimated recovery days
 */
export function estimateJetLagRecoveryDays(timezoneShiftHours) {
  return Math.ceil(Math.abs(timezoneShiftHours));
}

/**
 * Estimate altitude power penalty as a percentage.
 * Based on sports science literature:
 * - ~1% per 300m above 1000m (simplified linear model)
 * - Acclimation reduces penalty by ~50% over 14 days
 *
 * @param {number} altitudeM - Current altitude in meters
 * @param {number} acclimationDay - Days at this altitude (0 = just arrived)
 * @returns {number} Power penalty as percentage (e.g., 7.0 means expect 7% less power)
 */
export function estimateAltitudePowerPenalty(altitudeM, acclimationDay = 0) {
  if (altitudeM == null || altitudeM < 1000) return 0;

  // Base penalty: ~1% per 300m above 1000m
  const basePenalty = ((altitudeM - 1000) / 300) * 1;

  // Acclimation factor: reduces penalty over 14 days (linear)
  const acclimationFactor = Math.max(0.5, 1 - (acclimationDay / 28));

  return Math.round(basePenalty * acclimationFactor * 10) / 10;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Get timezone offset difference in hours between two IANA timezones.
 * @param {string} tz1 - IANA timezone (e.g., "America/New_York")
 * @param {string} tz2 - IANA timezone
 * @returns {number} Signed difference in hours (positive = traveled east)
 */
function getTimezoneOffsetDiff(tz1, tz2) {
  if (!tz1 || !tz2) return 0;
  try {
    const now = new Date();
    const offset1 = getOffsetMinutes(now, tz1);
    const offset2 = getOffsetMinutes(now, tz2);
    return (offset1 - offset2) / 60;
  } catch {
    return 0;
  }
}

function getOffsetMinutes(date, tz) {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  return (tzDate - utcDate) / 60000;
}

/**
 * Rough altitude estimate from activity start. Uses elevation_gain as a proxy
 * if no direct altitude data is available. Returns null if no data.
 */
function estimateStartAltitude(activity) {
  // If we have direct altitude data from weather enrichment, use it
  if (activity.activity_weather?.altitude_m != null) {
    return activity.activity_weather.altitude_m;
  }
  // If we have start elevation from source data
  if (activity.source_data?.elev_low != null) {
    return activity.source_data.elev_low;
  }
  return null;
}

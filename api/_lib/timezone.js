/**
 * Activity timezone resolution utility.
 * Determines timezone from GPS coordinates (primary) or user profile (fallback),
 * then computes local start time.
 */
import { find as findTimezone } from "geo-tz";

/**
 * Resolve an activity's timezone and compute its local start time.
 *
 * Priority chain:
 * 1. GPS coordinate → geo-tz reverse lookup (most accurate, handles travel)
 * 2. Strava timezone string (pre-parsed IANA)
 * 3. User profile timezone (fallback for indoor/GPS-less activities)
 *
 * @param {string} utcIsoString - UTC ISO 8601 timestamp (e.g., "2026-03-02T23:30:00.000Z")
 * @param {number|null} lat - Start latitude in decimal degrees
 * @param {number|null} lng - Start longitude in decimal degrees
 * @param {string} [fallbackTimezone="America/Los_Angeles"] - IANA timezone from user profile
 * @returns {{ timezone_iana: string, start_time_local: string }}
 */
export function resolveActivityTimezone(utcIsoString, lat, lng, fallbackTimezone = "America/Los_Angeles") {
  let timezone_iana = fallbackTimezone;

  // GPS-based lookup (primary — handles travel correctly)
  if (lat != null && lng != null && isValidCoordinate(lat, lng)) {
    try {
      const results = findTimezone(lat, lng);
      if (results && results.length > 0) {
        timezone_iana = results[0];
      }
    } catch (err) {
      console.error("geo-tz lookup failed:", err.message);
    }
  }

  const start_time_local = computeLocalTime(utcIsoString, timezone_iana);

  return { timezone_iana, start_time_local };
}

/**
 * Convert a UTC ISO string to a local time string in the given IANA timezone.
 * Returns ISO 8601-like string without timezone suffix: "2026-03-02T15:30:00"
 *
 * @param {string} utcIsoString - UTC ISO timestamp
 * @param {string} timezoneIana - IANA timezone (e.g., "America/Los_Angeles")
 * @returns {string} Local time as "YYYY-MM-DDTHH:MM:SS"
 */
export function computeLocalTime(utcIsoString, timezoneIana) {
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;

    // Use Intl.DateTimeFormat to get local date/time components
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezoneIana,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || "00";

    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  } catch (err) {
    console.error("computeLocalTime failed:", err.message);
    return utcIsoString;
  }
}

/**
 * Parse IANA timezone from Strava's timezone string.
 * Strava format: "(GMT-08:00) America/Los_Angeles"
 *
 * @param {string} stravaTimezone - Strava timezone string
 * @returns {string|null} IANA timezone or null if unparseable
 */
export function parseStravaTimezone(stravaTimezone) {
  if (!stravaTimezone) return null;
  // Strip the "(GMT±HH:MM) " prefix
  const match = stravaTimezone.match(/\)\s*(.+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Validate that coordinates are sensible decimal degrees.
 */
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    // Filter out zero-zero (null island) which is a common default/error value
    !(lat === 0 && lng === 0)
  );
}

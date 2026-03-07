/**
 * Timezone-aware activity time formatting utilities.
 * Uses start_time_local + timezone_iana when available,
 * falls back to browser timezone for older activities.
 */

/**
 * Get a Date object representing the activity's local start time.
 * When start_time_local is available, creates a Date from that wall-clock string.
 * Otherwise falls back to converting started_at via the browser timezone.
 */
function getLocalDate(activity) {
  if (activity.start_time_local) {
    // start_time_local is a wall-clock string like "2026-03-02T15:30:00"
    // new Date() interprets it as browser-local, which gives us the right display values
    return new Date(activity.start_time_local);
  }
  return new Date(activity.started_at);
}

/**
 * Format an activity's date for display (timezone-aware).
 * @param {object} activity - Activity with started_at, and optionally start_time_local/timezone_iana
 * @param {object} [options] - Intl.DateTimeFormat options (month, day, weekday, year, etc.)
 * @returns {string}
 */
export function formatActivityDate(activity, options = {}) {
  return getLocalDate(activity).toLocaleDateString("en-US", options);
}

/**
 * Format an activity's time for display (timezone-aware).
 * @param {object} activity - Activity with started_at, and optionally start_time_local/timezone_iana
 * @param {object} [options] - Intl.DateTimeFormat options (hour, minute, etc.)
 * @param {string} [timeFormat="12h"] - "12h" or "24h"
 * @returns {string}
 */
export function formatActivityTime(activity, options = {}, timeFormat = "12h") {
  const is24 = timeFormat === "24h";
  const merged = { ...options, hour12: !is24 };
  return getLocalDate(activity).toLocaleTimeString("en-US", merged);
}

/**
 * Format a time string like "23:15" or "07:30" for display.
 * @param {string} timeStr - "HH:MM" format
 * @param {string} [timeFormat="12h"] - "12h" or "24h"
 * @returns {string}
 */
export function formatClockTime(timeStr, timeFormat = "12h") {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (timeFormat === "24h") {
    return `${String(hour).padStart(2, "0")}:${m}`;
  }
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Get the timezone abbreviation for an activity (e.g., "PST", "EDT").
 * Returns null if no timezone_iana is available.
 */
export function getActivityTimezoneAbbrev(activity) {
  if (!activity.timezone_iana) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: activity.timezone_iana,
      timeZoneName: "short",
    }).formatToParts(new Date(activity.started_at));
    return parts.find(p => p.type === "timeZoneName")?.value || null;
  } catch {
    return null;
  }
}

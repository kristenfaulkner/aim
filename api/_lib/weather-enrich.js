/**
 * Per-activity weather enrichment using Open-Meteo Historical API.
 *
 * Fetches weather conditions at the activity's start time and location.
 * Free API, no key required: https://archive-api.open-meteo.com/v1/archive
 */

/**
 * Extract lat/lng from a Strava activity's source_data.
 * Strava provides start_latlng as [lat, lng] array.
 *
 * @param {object} activity - Activity record with source_data
 * @returns {{ lat: number, lng: number }|null}
 */
export function extractLocationFromActivity(activity) {
  // Try Strava source_data
  const stravaData = activity.source_data?.strava || activity.source_data;
  if (stravaData?.start_latlng?.length === 2) {
    const [lat, lng] = stravaData.start_latlng;
    if (lat && lng) return { lat, lng };
  }

  // Try direct lat/lng fields
  if (activity.start_lat && activity.start_lng) {
    return { lat: activity.start_lat, lng: activity.start_lng };
  }

  return null;
}

/**
 * Fetch historical weather for a specific time and location.
 * Uses Open-Meteo Archive API (free, no key needed).
 *
 * @param {string} startedAt - ISO datetime string
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {object|null} Weather data object
 */
export async function fetchActivityWeather(startedAt, lat, lng) {
  if (!startedAt || !lat || !lng) return null;

  const date = new Date(startedAt);
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const hour = date.getUTCHours();

  // Open-Meteo requires dates at least 5 days in the past for archive API
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
  const useArchive = date < fiveDaysAgo;

  const baseUrl = useArchive
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start_date: dateStr,
    end_date: dateStr,
    hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,precipitation,apparent_temperature",
    timezone: "auto",
  });

  try {
    const resp = await fetch(`${baseUrl}?${params}`);
    if (!resp.ok) return null;

    const data = await resp.json();
    const hourly = data.hourly;
    if (!hourly?.time?.length) return null;

    // Find the closest hour to the activity start
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < hourly.time.length; i++) {
      const h = new Date(hourly.time[i]).getHours();
      const diff = Math.abs(h - hour);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    return {
      temp_c: hourly.temperature_2m?.[bestIdx] ?? null,
      humidity_pct: hourly.relative_humidity_2m?.[bestIdx] ?? null,
      dew_point_c: hourly.dew_point_2m?.[bestIdx] ?? null,
      wind_speed_mps: hourly.wind_speed_10m?.[bestIdx] != null
        ? Math.round(hourly.wind_speed_10m[bestIdx] / 3.6 * 10) / 10  // km/h → m/s
        : null,
      wind_direction_deg: hourly.wind_direction_10m?.[bestIdx] ?? null,
      precip_mm: hourly.precipitation?.[bestIdx] ?? null,
      apparent_temp_c: hourly.apparent_temperature?.[bestIdx] ?? null,
      source: useArchive ? "open_meteo_archive" : "open_meteo_forecast",
    };
  } catch (err) {
    console.error("Weather enrichment failed:", err.message);
    return null;
  }
}

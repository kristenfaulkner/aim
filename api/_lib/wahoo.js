import { supabaseAdmin } from "./supabase.js";

// Map Wahoo workout_type_id integers to our activity_type strings.
// https://cloud-api.wahooligan.com/#workouts
export const WAHOO_WORKOUT_TYPE_MAP = {
  0: "ride",            // Cycling (outdoor)
  1: "run",             // Running
  2: "ride",            // Mountain Biking
  3: "nordic_ski",      // Cross Country Skiing
  4: "ice_skate",       // Nordic Skating
  5: "ice_skate",       // Skating
  6: "swim",            // Swimming (pool)
  7: "workout",         // Wheelchair
  8: "weight_training", // Strength Training
  9: "yoga",            // Yoga
  10: "workout",        // Pilates
  11: "workout",        // HIIT
  12: "workout",        // Barre
  13: "workout",        // Dance
  14: "rowing",         // Rowing
  15: "elliptical",     // Elliptical
  16: "workout",        // Stair Climber
  17: "run",            // Treadmill Running
  18: "ride",           // Indoor Cycling / Trainer
  19: "swim",           // Open Water Swimming
  20: "workout",        // Triathlon
  21: "hike",           // Hiking
  22: "walk",           // Walking
};

export function wahooActivityType(workoutTypeId) {
  if (workoutTypeId == null) return "workout";
  return WAHOO_WORKOUT_TYPE_MAP[workoutTypeId] ?? "workout";
}

/**
 * Get a valid Wahoo access token for a user, refreshing if expired.
 * Returns { accessToken, integration } or null if not connected.
 */
export async function getWahooToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "wahoo")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Check if token is expired (with 5-min buffer)
  const expiresAt = new Date(integration.token_expires_at).getTime();
  const now = Date.now();

  if (now < expiresAt - 5 * 60 * 1000) {
    return { accessToken: integration.access_token, integration };
  }

  // Refresh the token
  const res = await fetch("https://api.wahooligan.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.WAHOO_CLIENT_ID,
      client_secret: process.env.WAHOO_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  if (!res.ok) {
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: "Token refresh failed" })
      .eq("id", integration.id);
    return null;
  }

  const data = await res.json();

  // Update stored tokens — Wahoo returns expires_in (seconds from now)
  await supabaseAdmin
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || integration.refresh_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", integration.id);

  return { accessToken: data.access_token, integration: { ...integration, access_token: data.access_token } };
}

/**
 * Make an authenticated Wahoo API request.
 */
export async function wahooFetch(accessToken, path) {
  const res = await fetch(`https://api.wahooligan.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    throw new Error("Wahoo rate limit exceeded");
  }

  if (!res.ok) {
    throw new Error(`Wahoo API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Map Wahoo workout + workout_summary to an activity record with correct DB column names.
 * Pure function — no DB calls.
 *
 * @param {string} userId
 * @param {object} workout - Wahoo workout object (id, starts, workout_type_id, latitude, longitude, name)
 * @param {object} ws - Wahoo workout_summary object
 * @param {{ timezone_iana: string, start_time_local: string }} tz - pre-resolved timezone
 * @returns {object} activity record ready for upsert
 */
/**
 * Download a Wahoo FIT file from the CDN URL.
 * Returns a Buffer or null on failure (graceful — caller falls back to summary-only).
 */
export async function downloadWahooFit(fitUrl, timeoutMs = 15000) {
  if (!fitUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(fitUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function mapWahooToActivity(userId, workout, ws, tz) {
  const durationSec = parseFloat(ws.duration_active_accum || 0);
  const distanceM = parseFloat(ws.distance_accum || 0);
  const workAccum = parseFloat(ws.work_accum || 0);

  return {
    user_id: userId,
    source: "wahoo",
    source_id: String(ws.id || workout?.id || ""),
    activity_type: wahooActivityType(workout?.workout_type_id),
    name: ws.name || workout?.name || "Wahoo Workout",
    started_at: workout?.starts || ws.created_at,
    duration_seconds: Math.round(durationSec),
    distance_meters: Math.round(distanceM),
    elevation_gain_meters: parseFloat(ws.ascent_accum || 0) || null,
    avg_speed_mps: parseFloat(ws.speed_avg || 0) || null,
    avg_hr_bpm: parseFloat(ws.heart_rate_avg || 0) || null,
    avg_cadence_rpm: parseFloat(ws.cadence_avg || 0) || null,
    avg_power_watts: parseFloat(ws.power_avg || 0) || null,
    normalized_power_watts: parseFloat(ws.power_bike_np_last || 0) || null,
    calories: Math.round(parseFloat(ws.calories_accum || 0)) || null,
    tss: parseFloat(ws.power_bike_tss_last || 0) || null,
    work_kj: workAccum > 0 ? Math.round(workAccum / 1000) : null,
    start_lat: workout?.latitude ? parseFloat(workout.latitude) : null,
    start_lng: workout?.longitude ? parseFloat(workout.longitude) : null,
    timezone_iana: tz.timezone_iana,
    start_time_local: tz.start_time_local,
    source_data: {
      wahoo_workout_id: workout?.id,
      wahoo_summary_id: ws.id,
      workout_type_id: workout?.workout_type_id,
      duration_paused: parseFloat(ws.duration_paused_accum || 0),
      duration_total: parseFloat(ws.duration_total_accum || 0),
      work_accum: workAccum,
      manual: ws.manual,
      fit_file_url: ws.file?.url || null,
    },
  };
}

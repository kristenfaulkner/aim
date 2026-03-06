import { supabaseAdmin } from "./supabase.js";

// Convert ISO timestamp to local time "HH:MM:SS" string in the given IANA timezone.
function toLocalTime(isoTimestamp, timezone) {
  if (!isoTimestamp) return null;
  try {
    return new Date(isoTimestamp).toLocaleTimeString("en-GB", { timeZone: timezone || "UTC", hour12: false });
  } catch {
    return new Date(isoTimestamp).toTimeString().slice(0, 8);
  }
}

const BASE_URL = "https://api.prod.whoop.com/developer";

/**
 * Get a valid Whoop access token for a user, refreshing if expired.
 * Whoop access tokens expire in ~1 hour. Refresh tokens are also single-use.
 * Returns { accessToken, integration } or null if not connected.
 */
export async function getWhoopToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "whoop")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Check if token is still valid (5-min buffer)
  const expiresAt = new Date(integration.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return { accessToken: integration.access_token, integration };
  }

  // Refresh the token
  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
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

  // Store both new tokens (refresh token is single-use)
  await supabaseAdmin
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    })
    .eq("id", integration.id);

  return { accessToken: data.access_token, integration: { ...integration, access_token: data.access_token } };
}

/**
 * Make an authenticated Whoop API v2 request.
 */
export async function whoopFetch(accessToken, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    throw new Error("Whoop rate limit exceeded");
  }

  if (!res.ok) {
    throw new Error(`Whoop API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch all pages from a paginated Whoop endpoint.
 * Whoop uses `nextToken` cursor-based pagination.
 */
async function fetchAllPages(accessToken, path, params = {}) {
  const allRecords = [];
  let nextToken = null;

  do {
    const searchParams = new URLSearchParams(params);
    if (nextToken) searchParams.set("nextToken", nextToken);
    const sep = path.includes("?") ? "&" : "?";
    const data = await whoopFetch(accessToken, `${path}${sep}${searchParams}`);
    if (data.records) allRecords.push(...data.records);
    nextToken = data.next_token || null;
  } while (nextToken);

  return allRecords;
}

/**
 * Fetch Whoop recovery, sleep, and body measurement data for a date range.
 */
export async function fetchWhoopData(accessToken, startDate, endDate) {
  const start = `${startDate}T00:00:00.000Z`;
  const end = `${endDate}T23:59:59.999Z`;
  const params = { start, end };

  const [recovery, sleep, body] = await Promise.allSettled([
    fetchAllPages(accessToken, "/v2/recovery", params),
    fetchAllPages(accessToken, "/v2/activity/sleep", params),
    whoopFetch(accessToken, "/v2/user/measurement/body").catch(() => null),
  ]);

  return {
    recovery: recovery.status === "fulfilled" ? recovery.value : [],
    sleep: sleep.status === "fulfilled" ? sleep.value : [],
    body: body.status === "fulfilled" ? body.value : null,
  };
}

/**
 * Map Whoop data for a single day to partial daily_metrics columns.
 * Groups recovery + sleep by date.
 */
export function mapWhoopToMetrics(dayDate, whoopData, timezone) {
  const metrics = {};

  // ── Recovery ──
  // Recovery records are linked to cycles; find one whose created_at matches the day
  const recovery = whoopData.recovery?.find(r => {
    const d = r.created_at?.slice(0, 10);
    return d === dayDate && r.score_state === "SCORED";
  });
  if (recovery?.score) {
    if (recovery.score.recovery_score != null) metrics.recovery_score = recovery.score.recovery_score;
    if (recovery.score.resting_heart_rate != null) metrics.resting_hr_bpm = recovery.score.resting_heart_rate;
    if (recovery.score.hrv_rmssd_milli != null) metrics.hrv_ms = recovery.score.hrv_rmssd_milli;
    if (recovery.score.spo2_percentage != null) metrics.blood_oxygen_pct = recovery.score.spo2_percentage;
    if (recovery.score.skin_temp_celsius != null) {
      // Store deviation from 33°C baseline (typical wrist skin temp)
      metrics.skin_temperature_deviation = Math.round((recovery.score.skin_temp_celsius - 33) * 10) / 10;
    }
  }

  // ── Sleep ──
  // Find the main sleep (not nap) for this day
  const sleepRecord = whoopData.sleep?.find(s => {
    const d = s.end?.slice(0, 10);
    return d === dayDate && !s.nap && s.score_state === "SCORED";
  });
  if (sleepRecord?.score) {
    const sc = sleepRecord.score;
    const stages = sc.stage_summary;
    if (stages) {
      if (stages.total_in_bed_time_milli != null) {
        const totalSleep = (stages.total_in_bed_time_milli - (stages.total_awake_time_milli || 0)) / 1000;
        metrics.total_sleep_seconds = Math.round(totalSleep);
      }
      if (stages.total_slow_wave_sleep_time_milli != null) {
        metrics.deep_sleep_seconds = Math.round(stages.total_slow_wave_sleep_time_milli / 1000);
      }
      if (stages.total_rem_sleep_time_milli != null) {
        metrics.rem_sleep_seconds = Math.round(stages.total_rem_sleep_time_milli / 1000);
      }
      if (stages.total_light_sleep_time_milli != null) {
        metrics.light_sleep_seconds = Math.round(stages.total_light_sleep_time_milli / 1000);
      }
    }
    if (sc.sleep_efficiency_percentage != null) metrics.sleep_efficiency_pct = sc.sleep_efficiency_percentage;
    if (sc.sleep_performance_percentage != null) metrics.sleep_score = sc.sleep_performance_percentage;
    if (sc.respiratory_rate != null) metrics.respiratory_rate = sc.respiratory_rate;

    // Extract bed/wake times (in user's local timezone)
    if (sleepRecord.start) {
      try { metrics.sleep_onset_time = toLocalTime(sleepRecord.start, timezone); } catch {}
    }
    if (sleepRecord.end) {
      try { metrics.wake_time = toLocalTime(sleepRecord.end, timezone); } catch {}
    }
  }

  // ── Body measurements (not date-specific, just latest) ──
  if (whoopData.body) {
    if (whoopData.body.weight_kilogram != null) metrics.weight_kg = whoopData.body.weight_kilogram;
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Build an extended metrics object for source_data.whoop_extended.
 */
export function extractWhoopExtended(dayDate, whoopData) {
  const extended = {};

  const recovery = whoopData.recovery?.find(r => {
    return r.created_at?.slice(0, 10) === dayDate && r.score_state === "SCORED";
  });
  if (recovery?.score) {
    extended.recovery_score = recovery.score.recovery_score;
    extended.resting_heart_rate = recovery.score.resting_heart_rate;
    extended.hrv_rmssd_milli = recovery.score.hrv_rmssd_milli;
    extended.spo2_percentage = recovery.score.spo2_percentage;
    extended.skin_temp_celsius = recovery.score.skin_temp_celsius;
    extended.user_calibrating = recovery.score.user_calibrating;
  }

  const sleepRecord = whoopData.sleep?.find(s => {
    return s.end?.slice(0, 10) === dayDate && !s.nap && s.score_state === "SCORED";
  });
  if (sleepRecord?.score) {
    extended.sleep_performance_percentage = sleepRecord.score.sleep_performance_percentage;
    extended.sleep_consistency_percentage = sleepRecord.score.sleep_consistency_percentage;
    extended.sleep_efficiency_percentage = sleepRecord.score.sleep_efficiency_percentage;
    extended.respiratory_rate = sleepRecord.score.respiratory_rate;
    extended.stage_summary = sleepRecord.score.stage_summary;
    extended.sleep_needed = sleepRecord.score.sleep_needed;
    extended.disturbance_count = sleepRecord.score.stage_summary?.disturbance_count;
  }

  if (whoopData.body) {
    extended.weight_kilogram = whoopData.body.weight_kilogram;
    extended.height_meter = whoopData.body.height_meter;
    extended.max_heart_rate = whoopData.body.max_heart_rate;
  }

  return Object.keys(extended).length > 0 ? extended : null;
}

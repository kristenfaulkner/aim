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

const BASE_URL = "https://api.ouraring.com";

/**
 * Get a valid Oura access token for a user, refreshing if expired.
 * IMPORTANT: Oura refresh tokens are single-use — the old refresh token
 * is invalidated after each use, so we must store the new one immediately.
 * Returns { accessToken, integration } or null if not connected.
 */
export async function getOuraToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "oura")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Check if token is still valid (5-min buffer)
  const expiresAt = new Date(integration.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return { accessToken: integration.access_token, integration };
  }

  // Refresh the token
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET,
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

  // Store BOTH new access_token and new refresh_token (single-use refresh tokens)
  await supabaseAdmin
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString(),
    })
    .eq("id", integration.id);

  return { accessToken: data.access_token, integration: { ...integration, access_token: data.access_token } };
}

/**
 * Make an authenticated Oura API v2 request.
 */
export async function ouraFetch(accessToken, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    throw new Error("Oura rate limit exceeded");
  }

  if (!res.ok) {
    throw new Error(`Oura API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch all pages from a paginated Oura v2 endpoint.
 * Oura uses `next_token` cursor-based pagination.
 */
async function fetchAllPages(accessToken, path, params = {}) {
  const allData = [];
  let nextToken = null;

  do {
    const searchParams = new URLSearchParams(params);
    if (nextToken) searchParams.set("next_token", nextToken);
    const sep = path.includes("?") ? "&" : "?";
    const data = await ouraFetch(accessToken, `${path}${sep}${searchParams}`);
    if (data.data) allData.push(...data.data);
    nextToken = data.next_token || null;
  } while (nextToken);

  return allData;
}

/**
 * Fetch Oura sleep, readiness, activity, HR, and SpO2 data for a date range.
 */
export async function fetchOuraData(accessToken, startDate, endDate) {
  const params = { start_date: startDate, end_date: endDate };

  // Fetch all endpoints in parallel
  const [sleep, dailySleep, readiness, activity, spo2] = await Promise.allSettled([
    fetchAllPages(accessToken, "/v2/usercollection/sleep", params),
    fetchAllPages(accessToken, "/v2/usercollection/daily_sleep", params),
    fetchAllPages(accessToken, "/v2/usercollection/daily_readiness", params),
    fetchAllPages(accessToken, "/v2/usercollection/daily_activity", params),
    fetchAllPages(accessToken, "/v2/usercollection/daily_spo2", params),
  ]);

  return {
    sleep: sleep.status === "fulfilled" ? sleep.value : [],
    dailySleep: dailySleep.status === "fulfilled" ? dailySleep.value : [],
    readiness: readiness.status === "fulfilled" ? readiness.value : [],
    activity: activity.status === "fulfilled" ? activity.value : [],
    spo2: spo2.status === "fulfilled" ? spo2.value : [],
  };
}

/**
 * Map Oura data for a single day to partial daily_metrics columns.
 * Combines sleep, readiness, activity, and SpO2 data.
 */
export function mapOuraToMetrics(dayDate, ouraData, timezone) {
  const metrics = {};

  // ── Sleep (detailed period) ──
  // Find the primary "long_sleep" for this day
  const sleepPeriod = ouraData.sleep?.find(s => s.day === dayDate && s.type === "long_sleep")
    || ouraData.sleep?.find(s => s.day === dayDate);
  if (sleepPeriod) {
    if (sleepPeriod.total_sleep_duration != null) metrics.total_sleep_seconds = sleepPeriod.total_sleep_duration;
    if (sleepPeriod.deep_sleep_duration != null) metrics.deep_sleep_seconds = sleepPeriod.deep_sleep_duration;
    if (sleepPeriod.rem_sleep_duration != null) metrics.rem_sleep_seconds = sleepPeriod.rem_sleep_duration;
    if (sleepPeriod.light_sleep_duration != null) metrics.light_sleep_seconds = sleepPeriod.light_sleep_duration;
    if (sleepPeriod.latency != null) metrics.sleep_latency_seconds = sleepPeriod.latency;
    if (sleepPeriod.efficiency != null) metrics.sleep_efficiency_pct = sleepPeriod.efficiency;
    if (sleepPeriod.average_heart_rate != null) metrics.resting_hr_bpm = sleepPeriod.average_heart_rate;
    if (sleepPeriod.average_hrv != null) metrics.hrv_overnight_avg_ms = sleepPeriod.average_hrv;
    if (sleepPeriod.average_breath != null) metrics.respiratory_rate = sleepPeriod.average_breath;

    // Extract bed/wake times (in user's local timezone)
    if (sleepPeriod.bedtime_start) {
      try { metrics.sleep_onset_time = toLocalTime(sleepPeriod.bedtime_start, timezone); } catch {}
    }
    if (sleepPeriod.bedtime_end) {
      try { metrics.wake_time = toLocalTime(sleepPeriod.bedtime_end, timezone); } catch {}
    }
  }

  // ── Daily sleep score ──
  const dailySleep = ouraData.dailySleep?.find(s => s.day === dayDate);
  if (dailySleep?.score != null) metrics.sleep_score = dailySleep.score;

  // ── Readiness ──
  const readiness = ouraData.readiness?.find(r => r.day === dayDate);
  if (readiness?.score != null) metrics.readiness_score = readiness.score;
  if (readiness?.temperature_deviation != null) {
    metrics.skin_temperature_deviation = readiness.temperature_deviation;
  }

  // ── SpO2 ──
  const spo2 = ouraData.spo2?.find(s => s.day === dayDate);
  if (spo2?.spo2_percentage?.average != null) {
    metrics.blood_oxygen_pct = spo2.spo2_percentage.average;
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Build an extended metrics object for source_data.oura_extended.
 */
export function extractOuraExtended(dayDate, ouraData) {
  const extended = {};

  // Sleep contributors
  const dailySleep = ouraData.dailySleep?.find(s => s.day === dayDate);
  if (dailySleep?.contributors) {
    extended.sleep_contributors = dailySleep.contributors;
    extended.sleep_score = dailySleep.score;
  }

  // Readiness contributors
  const readiness = ouraData.readiness?.find(r => r.day === dayDate);
  if (readiness?.contributors) {
    extended.readiness_contributors = readiness.contributors;
    extended.readiness_score = readiness.score;
    extended.temperature_deviation = readiness.temperature_deviation;
    extended.temperature_trend_deviation = readiness.temperature_trend_deviation;
  }

  // Activity
  const activity = ouraData.activity?.find(a => a.day === dayDate);
  if (activity) {
    extended.activity_score = activity.score;
    extended.steps = activity.steps;
    extended.active_calories = activity.active_calories;
    extended.activity_contributors = activity.contributors;
  }

  // SpO2
  const spo2 = ouraData.spo2?.find(s => s.day === dayDate);
  if (spo2) {
    extended.spo2 = spo2.spo2_percentage;
  }

  return Object.keys(extended).length > 0 ? extended : null;
}

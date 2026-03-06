import { supabaseAdmin } from "./supabase.js";
import { decrypt } from "./crypto.js";

// Convert ISO timestamp to local time "HH:MM:SS" string in the given IANA timezone.
// Falls back to UTC toTimeString() if timezone is invalid.
function toLocalTime(isoTimestamp, timezone) {
  if (!isoTimestamp) return null;
  try {
    return new Date(isoTimestamp).toLocaleTimeString("en-GB", { timeZone: timezone || "UTC", hour12: false });
  } catch {
    return new Date(isoTimestamp).toTimeString().slice(0, 8);
  }
}

const AUTH_URL = "https://auth-api.8slp.net/v1/tokens";
const BASE_URL = "https://client-api.8slp.net/v1";
const DEFAULT_CLIENT_ID = "0894c7f33bb94800a03f1f4df13a4f38";
const DEFAULT_CLIENT_SECRET = "f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76";

/**
 * Authenticate with Eight Sleep using email/password.
 * Uses the V2 OAuth2 password grant (baked client creds from Android APK).
 * Falls back to legacy login endpoint if V2 fails.
 */
export async function authenticateEightSleep(email, password) {
  const clientId = process.env.EIGHTSLEEP_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.EIGHTSLEEP_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;

  // Try V2 OAuth2 password grant
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "okhttp/4.9.3" },
    body: JSON.stringify({
      grant_type: "password",
      username: email,
      password,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
      userId: data.userId || data.user_id,
    };
  }

  // Fallback to legacy login endpoint
  const legacyRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "okhttp/4.9.3" },
    body: JSON.stringify({ email, password }),
  });

  if (!legacyRes.ok) {
    const errText = await legacyRes.text().catch(() => "");
    throw new Error(`Eight Sleep authentication failed: ${legacyRes.status} ${errText}`);
  }

  const legacy = await legacyRes.json();
  const session = legacy.session || legacy;
  return {
    accessToken: session.token,
    expiresIn: session.expirationDate
      ? Math.floor((new Date(session.expirationDate).getTime() - Date.now()) / 1000)
      : 3600,
    userId: session.userId,
  };
}

/**
 * Get a valid Eight Sleep access token for a user, re-authenticating if expired.
 * Returns { accessToken, integration } or null if not connected.
 */
export async function getEightSleepToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "eightsleep")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Check if token is still valid (5-min buffer)
  const expiresAt = new Date(integration.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return { accessToken: integration.access_token, integration };
  }

  // Re-authenticate using stored credentials (no refresh token mechanism)
  const creds = integration.metadata;
  if (!creds?.email || !creds?.password) {
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: "Missing stored credentials for token refresh" })
      .eq("id", integration.id);
    return null;
  }

  // Decrypt credentials if they were stored encrypted
  const email = creds.encrypted ? decrypt(creds.email) : creds.email;
  const password = creds.encrypted ? decrypt(creds.password) : creds.password;

  try {
    const auth = await authenticateEightSleep(email, password);
    await supabaseAdmin
      .from("integrations")
      .update({
        access_token: auth.accessToken,
        token_expires_at: new Date(Date.now() + auth.expiresIn * 1000).toISOString(),
      })
      .eq("id", integration.id);

    return { accessToken: auth.accessToken, integration: { ...integration, access_token: auth.accessToken } };
  } catch (err) {
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: `Token refresh failed: ${err.message}` })
      .eq("id", integration.id);
    return null;
  }
}

/**
 * Make an authenticated Eight Sleep API request.
 */
export async function eightSleepFetch(accessToken, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "okhttp/4.9.3",
    },
  });

  if (res.status === 429) {
    throw new Error("Eight Sleep rate limit exceeded — try again in a few minutes");
  }

  if (!res.ok) {
    throw new Error(`Eight Sleep API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch sleep trend data for a date range.
 */
export async function fetchSleepData(accessToken, eightSleepUserId, fromDate, toDate, timezone = "America/New_York") {
  const params = new URLSearchParams({
    tz: timezone,
    from: fromDate,
    to: toDate,
    "include-main": "false",
    "include-all-sessions": "true",
    "model-version": "v2",
  });

  const data = await eightSleepFetch(accessToken, `/users/${eightSleepUserId}/trends?${params}`);
  return data.days || [];
}

/**
 * Map a single Eight Sleep trends day to partial daily_metrics columns.
 *
 * Eight Sleep trends endpoint returns:
 *   score, tnt, presenceStart/End, presenceDuration, sleepDuration,
 *   lightDuration, deepDuration, remDuration, latencyAsleepSeconds,
 *   latencyOutSeconds, respiratoryRate, heartRate, processing,
 *   sleepQualityScore: { total, sleepDurationSeconds.score,
 *     hrv: { score, current, average, minimum, maximum },
 *     respiratoryRate: { score, current, average },
 *     heartRate: { score, average, minimum, maximum },
 *     tempBedC: { average }, tempRoomC: { average } },
 *   sleepRoutineScore: { total, latencyAsleepSeconds.score, latencyOutSeconds.score, wakeupConsistency.score },
 *   sleepFitnessScore: { total },
 *   sessions[]: { stages[]: { stage, duration }, timeseries: { heartRate, tempBedC, tempRoomC } }
 */
export function mapEightSleepToMetrics(dayData, timezone) {
  if (!dayData) return null;

  const sq = dayData.sleepQualityScore || {};
  const totalSleep = dayData.sleepDuration ?? null;
  const presenceDuration = dayData.presenceDuration ?? null;

  // Sleep efficiency: time asleep / total time in bed
  let sleepEfficiency = null;
  if (totalSleep != null && presenceDuration != null && presenceDuration > 0) {
    sleepEfficiency = Math.round((totalSleep / presenceDuration) * 100 * 10) / 10;
  }

  // Extract bed/wake times from presence timestamps (in user's local timezone)
  let sleepOnset = null;
  let wakeTime = null;
  if (dayData.presenceStart) {
    try { sleepOnset = toLocalTime(dayData.presenceStart, timezone); } catch {}
  }
  if (dayData.presenceEnd) {
    try { wakeTime = toLocalTime(dayData.presenceEnd, timezone); } catch {}
  }

  const metrics = {};

  // ── Core sleep metrics ──
  if (dayData.score != null) metrics.sleep_score = dayData.score;
  if (totalSleep != null) metrics.total_sleep_seconds = totalSleep;
  if (dayData.deepDuration != null) metrics.deep_sleep_seconds = dayData.deepDuration;
  if (dayData.remDuration != null) metrics.rem_sleep_seconds = dayData.remDuration;
  if (dayData.lightDuration != null) metrics.light_sleep_seconds = dayData.lightDuration;
  if (dayData.latencyAsleepSeconds != null) metrics.sleep_latency_seconds = Math.round(dayData.latencyAsleepSeconds);
  if (sleepEfficiency != null) metrics.sleep_efficiency_pct = sleepEfficiency;
  if (sleepOnset) metrics.sleep_onset_time = sleepOnset;
  if (wakeTime) metrics.wake_time = wakeTime;

  // ── Heart rate ──
  // Prefer detailed average from sleepQualityScore, fall back to top-level
  const hrAvg = sq.heartRate?.average ?? dayData.heartRate;
  if (hrAvg != null) metrics.resting_hr_bpm = hrAvg;

  // ── HRV (actual ms values from Eight Sleep sensors) ──
  if (sq.hrv?.average != null) metrics.hrv_overnight_avg_ms = sq.hrv.average;
  if (sq.hrv?.current != null) metrics.hrv_ms = sq.hrv.current;

  // ── Respiratory rate ──
  const rrAvg = sq.respiratoryRate?.average ?? dayData.respiratoryRate;
  if (rrAvg != null) metrics.respiratory_rate = rrAvg;

  // ── Temperature ──
  if (sq.tempBedC?.average != null) metrics.bed_temperature_celsius = sq.tempBedC.average;
  // Room temp deviation from typical (~20°C baseline)
  if (sq.tempRoomC?.average != null) {
    metrics.skin_temperature_deviation = Math.round((sq.tempRoomC.average - 20) * 10) / 10;
  }

  return metrics;
}

/**
 * Build an extended metrics object with all Eight Sleep data that doesn't fit
 * in standard daily_metrics columns. Stored in source_data.eightsleep_extended.
 */
export function extractExtendedMetrics(dayData) {
  if (!dayData) return null;

  const sq = dayData.sleepQualityScore || {};
  const sr = dayData.sleepRoutineScore || {};
  const sf = dayData.sleepFitnessScore || {};

  return {
    // Scores breakdown
    sleep_quality_score: sq.total ?? null,
    sleep_routine_score: sr.total ?? null,
    sleep_fitness_score: sf.total ?? null,
    sleep_duration_score: sq.sleepDurationSeconds?.score ?? null,
    latency_asleep_score: sr.latencyAsleepSeconds?.score ?? null,
    latency_out_score: sr.latencyOutSeconds?.score ?? null,
    wakeup_consistency_score: sr.wakeupConsistency?.score ?? null,
    hrv_score: sq.hrv?.score ?? null,
    respiratory_rate_score: sq.respiratoryRate?.score ?? null,

    // HRV detailed
    hrv_current_ms: sq.hrv?.current ?? null,
    hrv_avg_ms: sq.hrv?.average ?? null,
    hrv_min_ms: sq.hrv?.minimum ?? null,
    hrv_max_ms: sq.hrv?.maximum ?? null,

    // Heart rate detailed
    hr_avg_bpm: sq.heartRate?.average ?? null,
    hr_min_bpm: sq.heartRate?.minimum ?? null,
    hr_max_bpm: sq.heartRate?.maximum ?? null,

    // Respiratory rate detailed
    rr_current: sq.respiratoryRate?.current ?? null,
    rr_avg: sq.respiratoryRate?.average ?? null,

    // Temperature
    bed_temp_avg_c: sq.tempBedC?.average ?? null,
    room_temp_avg_c: sq.tempRoomC?.average ?? null,

    // Disruptions
    toss_and_turns: dayData.tnt ?? null,

    // Timing
    presence_start: dayData.presenceStart ?? null,
    presence_end: dayData.presenceEnd ?? null,
    presence_duration_seconds: dayData.presenceDuration ?? null,
    latency_asleep_seconds: dayData.latencyAsleepSeconds ?? null,
    latency_out_seconds: dayData.latencyOutSeconds ?? null,
  };
}

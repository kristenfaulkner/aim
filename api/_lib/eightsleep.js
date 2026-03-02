import { supabaseAdmin } from "./supabase.js";

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

  try {
    const auth = await authenticateEightSleep(creds.email, creds.password);
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
 * Extract duration for a specific sleep stage from the stages array.
 */
function extractStageDuration(stages, stageName) {
  if (!stages || !Array.isArray(stages)) return null;
  const stage = stages.find(s => s.stage?.toLowerCase() === stageName);
  return stage?.duration ?? null;
}

/**
 * Map a single Eight Sleep sleep day to partial daily_metrics columns.
 */
export function mapEightSleepToMetrics(dayData) {
  if (!dayData) return null;

  const deep = extractStageDuration(dayData.stages, "deep");
  const rem = extractStageDuration(dayData.stages, "rem");
  const light = extractStageDuration(dayData.stages, "light");
  const awake = extractStageDuration(dayData.stages, "awake");
  const totalSleep = dayData.sleepDurationSeconds ?? null;

  // Compute sleep efficiency: time asleep / (time asleep + time awake)
  let sleepEfficiency = null;
  if (totalSleep != null && awake != null && (totalSleep + awake) > 0) {
    sleepEfficiency = Math.round((totalSleep / (totalSleep + awake)) * 100 * 10) / 10;
  }

  const metrics = {};

  if (dayData.score != null) metrics.sleep_score = dayData.score;
  if (totalSleep != null) metrics.total_sleep_seconds = totalSleep;
  if (deep != null) metrics.deep_sleep_seconds = deep;
  if (rem != null) metrics.rem_sleep_seconds = rem;
  if (light != null) metrics.light_sleep_seconds = light;
  if (dayData.latencyAsleepSeconds != null) metrics.sleep_latency_seconds = dayData.latencyAsleepSeconds;
  if (sleepEfficiency != null) metrics.sleep_efficiency_pct = sleepEfficiency;
  if (dayData.heartRate != null) metrics.resting_hr_bpm = dayData.heartRate;
  if (dayData.respiratoryRate != null) metrics.respiratory_rate = dayData.respiratoryRate;

  return metrics;
}

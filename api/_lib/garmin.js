import OAuth from "oauth-1.0a";
import { createHmac } from "crypto";
import { supabaseAdmin } from "./supabase.js";
import { encrypt, decrypt } from "./crypto.js";

// Convert epoch timestamp (seconds) to local time "HH:MM:SS" string in the given IANA timezone.
function toLocalTime(epochSeconds, timezone) {
  if (!epochSeconds) return null;
  try {
    return new Date(epochSeconds * 1000).toLocaleTimeString("en-GB", { timeZone: timezone || "UTC", hour12: false });
  } catch {
    return new Date(epochSeconds * 1000).toTimeString().slice(0, 8);
  }
}

// ── Garmin Health API Base URLs ──
const BASE_URL = "https://apis.garmin.com";
const REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
const AUTHORIZE_URL = "https://connect.garmin.com/oauthConfirm";
const ACCESS_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/access_token";

// ── OAuth 1.0a instance ──
function createOAuth() {
  return new OAuth({
    consumer: {
      key: process.env.GARMIN_CONSUMER_KEY,
      secret: process.env.GARMIN_CONSUMER_SECRET,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

/**
 * Step 1: Get a request token from Garmin.
 * Returns { oauth_token, oauth_token_secret }.
 */
export async function getRequestToken(callbackUrl) {
  const oauth = createOAuth();
  const requestData = {
    url: REQUEST_TOKEN_URL,
    method: "POST",
    data: { oauth_callback: callbackUrl },
  };

  const res = await fetch(REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      ...oauth.toHeader(oauth.authorize(requestData)),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ oauth_callback: callbackUrl }),
  });

  if (!res.ok) {
    throw new Error(`Garmin request token failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const params = new URLSearchParams(text);
  return {
    oauth_token: params.get("oauth_token"),
    oauth_token_secret: params.get("oauth_token_secret"),
  };
}

/**
 * Get the Garmin authorization URL for the user to visit.
 */
export function getAuthorizeUrl(oauthToken) {
  return `${AUTHORIZE_URL}?oauth_token=${oauthToken}`;
}

/**
 * Step 3: Exchange the request token + verifier for an access token.
 * Returns { oauth_token, oauth_token_secret }.
 */
export async function getAccessToken(oauthToken, oauthTokenSecret, oauthVerifier) {
  const oauth = createOAuth();
  const token = { key: oauthToken, secret: oauthTokenSecret };
  const requestData = {
    url: ACCESS_TOKEN_URL,
    method: "POST",
    data: { oauth_verifier: oauthVerifier },
  };

  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      ...oauth.toHeader(oauth.authorize(requestData, token)),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ oauth_verifier: oauthVerifier }),
  });

  if (!res.ok) {
    throw new Error(`Garmin access token exchange failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const params = new URLSearchParams(text);
  return {
    oauth_token: params.get("oauth_token"),
    oauth_token_secret: params.get("oauth_token_secret"),
  };
}

/**
 * Make an OAuth 1.0a signed request to the Garmin Health API.
 * Every Garmin API call must be signed (no Bearer token).
 */
export async function garminFetch(accessToken, tokenSecret, path, method = "GET") {
  const oauth = createOAuth();
  const url = `${BASE_URL}${path}`;
  const token = { key: accessToken, secret: tokenSecret };
  const requestData = { url, method };

  const res = await fetch(url, {
    method,
    headers: oauth.toHeader(oauth.authorize(requestData, token)),
  });

  if (res.status === 429) {
    throw new Error("Garmin rate limit exceeded");
  }

  if (!res.ok) {
    throw new Error(`Garmin API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Download a FIT file from a Garmin-provided URL using OAuth-signed request.
 * Returns a Buffer of the FIT file data.
 */
export async function downloadFitFile(fileUrl, accessToken, tokenSecret) {
  const oauth = createOAuth();
  const token = { key: accessToken, secret: tokenSecret };
  const requestData = { url: fileUrl, method: "GET" };

  const res = await fetch(fileUrl, {
    headers: oauth.toHeader(oauth.authorize(requestData, token)),
  });

  if (!res.ok) {
    throw new Error(`Garmin FIT download failed: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get a valid Garmin token for a user.
 * Garmin tokens don't refresh — they expire after ~3 months, requiring re-auth.
 * Returns { accessToken, tokenSecret, integration } or null.
 */
export async function getGarminToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "garmin")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Garmin tokens expire after ~3 months. Check token_expires_at if set.
  if (integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at).getTime();
    if (Date.now() > expiresAt) {
      await supabaseAdmin
        .from("integrations")
        .update({ sync_status: "error", sync_error: "Token expired — re-authorization required" })
        .eq("id", integration.id);
      return null;
    }
  }

  // Decrypt token_secret from metadata
  let tokenSecret = null;
  try {
    if (integration.metadata?.token_secret_encrypted) {
      tokenSecret = decrypt(integration.metadata.token_secret_encrypted);
    } else if (integration.metadata?.token_secret) {
      // Legacy unencrypted fallback
      tokenSecret = integration.metadata.token_secret;
    }
  } catch {
    console.error(`[Garmin] Failed to decrypt token_secret for user ${userId}`);
    return null;
  }

  if (!tokenSecret) return null;

  return {
    accessToken: integration.access_token,
    tokenSecret,
    integration,
  };
}

// ── Garmin Sport Type Mapping ──
const GARMIN_SPORT_MAP = {
  CYCLING: "ride",
  ROAD_BIKING: "ride",
  MOUNTAIN_BIKING: "ride",
  GRAVEL_CYCLING: "ride",
  INDOOR_CYCLING: "ride",
  VIRTUAL_RIDE: "virtualride",
  RUNNING: "run",
  TRAIL_RUNNING: "run",
  TREADMILL_RUNNING: "run",
  SWIMMING: "swim",
  LAP_SWIMMING: "swim",
  OPEN_WATER_SWIMMING: "swim",
  WALKING: "walk",
  HIKING: "hike",
  STRENGTH_TRAINING: "weighttraining",
  YOGA: "yoga",
  MULTI_SPORT: "multisport",
};

/**
 * Map a Garmin activity summary to our activities table format.
 * Garmin webhook pushes full activity summaries.
 */
export function mapGarminActivity(garminActivity) {
  const sportType = garminActivity.activityType?.toUpperCase() || "";
  return {
    source: "garmin",
    source_id: String(garminActivity.activityId || garminActivity.summaryId || ""),
    activity_type: GARMIN_SPORT_MAP[sportType] || "workout",
    name: garminActivity.activityName || garminActivity.activityType || "Garmin Activity",
    started_at: garminActivity.startTimeInSeconds
      ? new Date(garminActivity.startTimeInSeconds * 1000).toISOString()
      : null,
    duration_seconds: garminActivity.durationInSeconds || null,
    distance_meters: garminActivity.distanceInMeters || null,
    elevation_gain_meters: garminActivity.totalElevationGainInMeters || null,
    avg_power_watts: garminActivity.averagePowerInWatts || null,
    normalized_power_watts: garminActivity.normalizedPowerInWatts || null,
    max_power_watts: garminActivity.maxPowerInWatts || null,
    avg_hr_bpm: garminActivity.averageHeartRateInBeatsPerMinute || null,
    max_hr_bpm: garminActivity.maxHeartRateInBeatsPerMinute || null,
    avg_cadence_rpm: garminActivity.averageBikeCadenceInRoundsPerMinute
      || garminActivity.averageRunCadenceInStepsPerMinute
      || null,
    avg_speed_mps: garminActivity.averageSpeedInMetersPerSecond || null,
    max_speed_mps: garminActivity.maxSpeedInMetersPerSecond || null,
    calories: garminActivity.activeKilocalories || garminActivity.totalKilocalories || null,
    work_kj: garminActivity.averagePowerInWatts && garminActivity.durationInSeconds
      ? Math.round(garminActivity.averagePowerInWatts * garminActivity.durationInSeconds / 1000)
      : null,
    start_lat: garminActivity.startingLatitudeInDegree || null,
    start_lng: garminActivity.startingLongitudeInDegree || null,
    source_data: garminActivity,
  };
}

/**
 * Map Garmin daily summary data to partial daily_metrics columns.
 * Garmin sends separate payloads: dailies, sleep, body comp, stress, pulse ox.
 */
export function mapGarminDaily(dailySummary) {
  const metrics = {};

  // ── Daily summary fields ──
  if (dailySummary.restingHeartRateInBeatsPerMinute != null) {
    metrics.resting_hr_bpm = dailySummary.restingHeartRateInBeatsPerMinute;
  }
  if (dailySummary.maxHeartRateInBeatsPerMinute != null) {
    metrics.max_hr_bpm = dailySummary.maxHeartRateInBeatsPerMinute;
  }
  if (dailySummary.averageStressLevel != null) {
    // Garmin stress: 0-100, higher = more stress. Map to strain_score.
    metrics.strain_score = dailySummary.averageStressLevel;
  }
  if (dailySummary.stepsGoal != null) {
    metrics.steps = dailySummary.totalSteps || null;
  } else if (dailySummary.totalSteps != null) {
    metrics.steps = dailySummary.totalSteps;
  }
  if (dailySummary.activeKilocalories != null) {
    metrics.active_calories = dailySummary.activeKilocalories;
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Map Garmin sleep data to daily_metrics columns.
 */
export function mapGarminSleep(sleepData, timezone) {
  const metrics = {};

  if (sleepData.durationInSeconds != null) {
    metrics.total_sleep_seconds = sleepData.durationInSeconds;
  }
  if (sleepData.deepSleepDurationInSeconds != null) {
    metrics.deep_sleep_seconds = sleepData.deepSleepDurationInSeconds;
  }
  if (sleepData.lightSleepDurationInSeconds != null) {
    metrics.light_sleep_seconds = sleepData.lightSleepDurationInSeconds;
  }
  if (sleepData.remSleepInSeconds != null) {
    metrics.rem_sleep_seconds = sleepData.remSleepInSeconds;
  }
  if (sleepData.awakeDurationInSeconds != null && sleepData.durationInSeconds != null) {
    const total = sleepData.durationInSeconds;
    const awake = sleepData.awakeDurationInSeconds;
    if (total > 0) {
      metrics.sleep_efficiency_pct = Math.round(((total - awake) / total) * 100 * 10) / 10;
    }
  }
  if (sleepData.overallSleepScore?.value != null) {
    metrics.sleep_score = sleepData.overallSleepScore.value;
  }
  if (sleepData.averageRespirationValue != null) {
    metrics.respiratory_rate = sleepData.averageRespirationValue;
  }
  if (sleepData.averageSpO2Value != null) {
    metrics.blood_oxygen_pct = sleepData.averageSpO2Value;
  }
  if (sleepData.lowestSpO2Value != null) {
    metrics.resting_spo2 = sleepData.lowestSpO2Value;
  }

  // Bed/wake times (in user's local timezone)
  if (sleepData.startTimeInSeconds) {
    try { metrics.sleep_onset_time = toLocalTime(sleepData.startTimeInSeconds, timezone); } catch {}
  }
  if (sleepData.startTimeInSeconds && sleepData.durationInSeconds) {
    try { metrics.wake_time = toLocalTime(sleepData.startTimeInSeconds + sleepData.durationInSeconds, timezone); } catch {}
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Map Garmin Body Battery to recovery metrics.
 * Body Battery: 5-100 (higher = more energy). Maps well to recovery_score.
 */
export function mapGarminBodyBattery(stressData) {
  const metrics = {};

  // Body Battery is in the stress detail payload
  if (stressData.bodyBatteryChargedValue != null) {
    metrics.recovery_score = stressData.bodyBatteryChargedValue;
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Map Garmin body composition data.
 */
export function mapGarminBodyComp(bodyComp) {
  const metrics = {};

  if (bodyComp.weightInGrams != null) {
    metrics.weight_kg = Math.round(bodyComp.weightInGrams / 10) / 100;
  }
  if (bodyComp.bodyFatPercentage != null) {
    metrics.body_fat_pct = bodyComp.bodyFatPercentage;
  }
  if (bodyComp.muscleMassInGrams != null) {
    metrics.muscle_mass_kg = Math.round(bodyComp.muscleMassInGrams / 10) / 100;
  }
  if (bodyComp.boneMassInGrams != null) {
    metrics.bone_mass_kg = Math.round(bodyComp.boneMassInGrams / 10) / 100;
  }
  if (bodyComp.bodyWaterPercentage != null) {
    metrics.body_water_pct = bodyComp.bodyWaterPercentage;
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Map Garmin Pulse Ox (SpO2) data.
 */
export function mapGarminPulseOx(pulseOxData) {
  const metrics = {};

  if (pulseOxData.averageSPO2 != null) {
    metrics.blood_oxygen_pct = pulseOxData.averageSPO2;
  }
  if (pulseOxData.lowestSPO2 != null) {
    metrics.resting_spo2 = pulseOxData.lowestSPO2;
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Build extended metrics object for source_data.garmin_extended.
 */
export function extractGarminExtended(garminData) {
  const extended = {};

  if (garminData.daily) {
    extended.resting_heart_rate = garminData.daily.restingHeartRateInBeatsPerMinute;
    extended.average_stress = garminData.daily.averageStressLevel;
    extended.max_stress = garminData.daily.maxStressLevel;
    extended.stress_duration = garminData.daily.stressDurationInSeconds;
    extended.rest_stress_duration = garminData.daily.restStressDurationInSeconds;
    extended.total_steps = garminData.daily.totalSteps;
    extended.total_distance = garminData.daily.totalDistanceInMeters;
    extended.floors_climbed = garminData.daily.floorsClimbed;
    extended.intensity_minutes = garminData.daily.moderateIntensityDurationInSeconds;
    extended.vigorous_minutes = garminData.daily.vigorousIntensityDurationInSeconds;
  }

  if (garminData.bodyBattery) {
    extended.body_battery_high = garminData.bodyBattery.bodyBatteryChargedValue;
    extended.body_battery_low = garminData.bodyBattery.bodyBatteryDrainedValue;
  }

  if (garminData.sleep) {
    extended.sleep_score = garminData.sleep.overallSleepScore?.value;
    extended.sleep_quality = garminData.sleep.overallSleepScore?.qualifierKey;
    extended.average_respiration = garminData.sleep.averageRespirationValue;
    extended.avg_spo2 = garminData.sleep.averageSpO2Value;
    extended.lowest_spo2 = garminData.sleep.lowestSpO2Value;
    extended.hrv_status = garminData.sleep.hrvStatus;
    extended.sleep_start = garminData.sleep.startTimeInSeconds;
    extended.sleep_end = garminData.sleep.startTimeInSeconds && garminData.sleep.durationInSeconds
      ? garminData.sleep.startTimeInSeconds + garminData.sleep.durationInSeconds
      : null;
  }

  if (garminData.pulseOx) {
    extended.avg_spo2 = garminData.pulseOx.averageSPO2;
    extended.lowest_spo2 = garminData.pulseOx.lowestSPO2;
  }

  // Remove undefined/null values
  for (const key of Object.keys(extended)) {
    if (extended[key] == null) delete extended[key];
  }

  return Object.keys(extended).length > 0 ? extended : null;
}

/**
 * Extract the calendar date (YYYY-MM-DD) from a Garmin summary.
 * Garmin uses startTimeInSeconds (epoch) + startTimeOffsetInSeconds (TZ offset).
 */
export function extractGarminDate(summary) {
  if (summary.calendarDate) return summary.calendarDate;
  if (summary.startTimeInSeconds) {
    const offset = summary.startTimeOffsetInSeconds || 0;
    const localEpoch = (summary.startTimeInSeconds + offset) * 1000;
    return new Date(localEpoch).toISOString().slice(0, 10);
  }
  return null;
}

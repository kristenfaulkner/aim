import { supabaseAdmin } from "./supabase.js";

const TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const MEASURE_URL = "https://wbsapi.withings.net/measure";
const MEASURE_V2_URL = "https://wbsapi.withings.net/v2/measure";
const SLEEP_URL = "https://wbsapi.withings.net/v2/sleep";
const NOTIFY_URL = "https://wbsapi.withings.net/notify";

// Withings notification categories (appli values)
const NOTIFY_APPLI = {
  WEIGHT: 1,      // Weight & body comp
  ACTIVITY: 16,   // Steps, distance, calories
  SLEEP: 44,      // Sleep data
};

/**
 * Get a valid Withings access token for a user, refreshing if expired.
 * Withings access tokens expire in 3 hours. Refresh tokens last 1 year.
 * Returns { accessToken, integration } or null if not connected.
 */
export async function getWithingsToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "withings")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Check if token is still valid (5-min buffer)
  const expiresAt = new Date(integration.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return { accessToken: integration.access_token, integration };
  }

  // Refresh the token — Withings uses non-standard wrapped response
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET,
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

  const json = await res.json();
  if (json.status !== 0) {
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: `Token refresh error: status ${json.status}` })
      .eq("id", integration.id);
    return null;
  }

  const data = json.body;

  await supabaseAdmin
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(Date.now() + (data.expires_in || 10800) * 1000).toISOString(),
    })
    .eq("id", integration.id);

  return { accessToken: data.access_token, integration: { ...integration, access_token: data.access_token } };
}

/**
 * Make an authenticated Withings API POST request.
 * Withings uses POST for all API calls with form-encoded params.
 */
async function withingsPost(accessToken, url, params = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: new URLSearchParams(params),
  });

  if (res.status === 429) {
    throw new Error("Withings rate limit exceeded");
  }

  if (!res.ok) {
    throw new Error(`Withings API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.status !== 0) {
    throw new Error(`Withings API error: status ${json.status}`);
  }

  return json.body;
}

/**
 * Decode a Withings measurement value.
 * Withings encodes values as value * 10^unit.
 * e.g. { value: 68500, unit: -3 } → 68.5
 */
function decodeMeasValue(value, unit) {
  return value * Math.pow(10, unit);
}

// Withings meastype codes
const MEAS_TYPES = {
  1: "weight_kg",
  5: "fat_free_mass_kg",
  6: "body_fat_pct",
  8: "fat_mass_kg",
  76: "muscle_mass_kg",
  77: "hydration_kg",
  88: "bone_mass_kg",
  11: "heart_pulse_bpm",
  54: "spo2_pct",
  170: "visceral_fat",
};

/**
 * Fetch body measurements for a date range.
 * Returns measurement groups with decoded values.
 */
export async function fetchWithingsMeasurements(accessToken, startDate, endDate) {
  const startTs = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const endTs = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000);

  const body = await withingsPost(accessToken, MEASURE_URL, {
    action: "getmeas",
    meastype: "1,5,6,8,76,77,88,11,54,170",
    category: "1", // Real measurements only
    startdate: String(startTs),
    enddate: String(endTs),
  });

  return body.measuregrps || [];
}

/**
 * Fetch daily activity data for a date range.
 */
export async function fetchWithingsActivity(accessToken, startDate, endDate) {
  const body = await withingsPost(accessToken, MEASURE_V2_URL, {
    action: "getactivity",
    startdateymd: startDate,
    enddateymd: endDate,
    data_fields: "steps,distance,calories,totalcalories,hr_average,hr_min,hr_max,active,soft,moderate,intense",
  });

  return body.activities || [];
}

/**
 * Fetch sleep summary data for a date range.
 */
export async function fetchWithingsSleep(accessToken, startDate, endDate) {
  const body = await withingsPost(accessToken, SLEEP_URL, {
    action: "getsummary",
    startdateymd: startDate,
    enddateymd: endDate,
    data_fields: "deepsleepduration,lightsleepduration,remsleepduration,sleep_score,hr_average,hr_min,hr_max,rr_average,wakeupcount,wakeupduration,durationtosleep,snoring",
  });

  return body.series || [];
}

/**
 * Fetch all Withings data for a date range.
 */
export async function fetchWithingsData(accessToken, startDate, endDate) {
  const [measurements, activity, sleep] = await Promise.allSettled([
    fetchWithingsMeasurements(accessToken, startDate, endDate),
    fetchWithingsActivity(accessToken, startDate, endDate),
    fetchWithingsSleep(accessToken, startDate, endDate),
  ]);

  return {
    measurements: measurements.status === "fulfilled" ? measurements.value : [],
    activity: activity.status === "fulfilled" ? activity.value : [],
    sleep: sleep.status === "fulfilled" ? sleep.value : [],
  };
}

/**
 * Group Withings measurement groups by date.
 * Returns { "2026-03-03": { weight_kg: 68.5, body_fat_pct: 21.5, ... }, ... }
 */
function groupMeasurementsByDate(measureGroups) {
  const byDate = {};

  for (const grp of measureGroups) {
    // Only use device measurements (attrib 0) and manual entries (attrib 1)
    if (grp.attrib > 1) continue;

    const date = new Date(grp.date * 1000).toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = {};

    for (const m of grp.measures) {
      const fieldName = MEAS_TYPES[m.type];
      if (fieldName) {
        byDate[date][fieldName] = Math.round(decodeMeasValue(m.value, m.unit) * 100) / 100;
      }
    }
  }

  return byDate;
}

/**
 * Map Withings data for a single day to partial daily_metrics columns.
 */
export function mapWithingsToMetrics(dayDate, withingsData) {
  const metrics = {};

  // ── Body measurements ──
  const measByDate = groupMeasurementsByDate(withingsData.measurements);
  const dayMeas = measByDate[dayDate];
  if (dayMeas) {
    if (dayMeas.weight_kg != null) metrics.weight_kg = dayMeas.weight_kg;
    if (dayMeas.body_fat_pct != null) metrics.body_fat_pct = dayMeas.body_fat_pct;
    if (dayMeas.muscle_mass_kg != null) metrics.muscle_mass_kg = dayMeas.muscle_mass_kg;
    if (dayMeas.bone_mass_kg != null) metrics.bone_mass_kg = dayMeas.bone_mass_kg;
    if (dayMeas.hydration_kg != null) {
      // Convert hydration kg to % of body weight
      if (dayMeas.weight_kg) {
        metrics.hydration_pct = Math.round((dayMeas.hydration_kg / dayMeas.weight_kg) * 100 * 10) / 10;
      }
    }
    if (dayMeas.spo2_pct != null) metrics.blood_oxygen_pct = dayMeas.spo2_pct;
    if (dayMeas.heart_pulse_bpm != null) metrics.resting_hr_bpm = dayMeas.heart_pulse_bpm;
  }

  // ── Sleep ──
  const sleepDay = withingsData.sleep?.find(s => s.date === dayDate);
  if (sleepDay) {
    if (sleepDay.data?.sleep_score != null) metrics.sleep_score = sleepDay.data.sleep_score;
    if (sleepDay.data?.deepsleepduration != null) metrics.deep_sleep_seconds = sleepDay.data.deepsleepduration;
    if (sleepDay.data?.lightsleepduration != null) metrics.light_sleep_seconds = sleepDay.data.lightsleepduration;
    if (sleepDay.data?.remsleepduration != null) metrics.rem_sleep_seconds = sleepDay.data.remsleepduration;
    if (sleepDay.data?.durationtosleep != null) metrics.sleep_latency_seconds = sleepDay.data.durationtosleep;
    if (sleepDay.data?.hr_average != null) metrics.resting_hr_bpm = sleepDay.data.hr_average;
    if (sleepDay.data?.rr_average != null) metrics.respiratory_rate = sleepDay.data.rr_average;

    // Calculate total sleep from stages
    const deep = sleepDay.data?.deepsleepduration || 0;
    const light = sleepDay.data?.lightsleepduration || 0;
    const rem = sleepDay.data?.remsleepduration || 0;
    if (deep + light + rem > 0) {
      metrics.total_sleep_seconds = deep + light + rem;
    }

    // Sleep efficiency from duration vs wake time
    const totalSleep = metrics.total_sleep_seconds;
    const wakeTime = sleepDay.data?.wakeupduration || 0;
    if (totalSleep && (totalSleep + wakeTime) > 0) {
      metrics.sleep_efficiency_pct = Math.round((totalSleep / (totalSleep + wakeTime)) * 100 * 10) / 10;
    }

    // Bed/wake times from timestamps
    if (sleepDay.startdate) {
      try { metrics.sleep_onset_time = new Date(sleepDay.startdate * 1000).toTimeString().slice(0, 8); } catch {}
    }
    if (sleepDay.enddate) {
      try { metrics.wake_time = new Date(sleepDay.enddate * 1000).toTimeString().slice(0, 8); } catch {}
    }
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Build an extended metrics object for source_data.withings_extended.
 */
export function extractWithingsExtended(dayDate, withingsData) {
  const extended = {};

  // Body comp details
  const measByDate = groupMeasurementsByDate(withingsData.measurements);
  const dayMeas = measByDate[dayDate];
  if (dayMeas) {
    extended.body = { ...dayMeas };
  }

  // Activity
  const actDay = withingsData.activity?.find(a => a.date === dayDate);
  if (actDay) {
    extended.activity = {
      steps: actDay.steps,
      distance: actDay.distance,
      calories: actDay.calories,
      totalcalories: actDay.totalcalories,
      hr_average: actDay.hr_average,
      hr_min: actDay.hr_min,
      hr_max: actDay.hr_max,
      active_seconds: actDay.active,
      soft_seconds: actDay.soft,
      moderate_seconds: actDay.moderate,
      intense_seconds: actDay.intense,
    };
  }

  // Sleep details
  const sleepDay = withingsData.sleep?.find(s => s.date === dayDate);
  if (sleepDay?.data) {
    extended.sleep = {
      ...sleepDay.data,
      startdate: sleepDay.startdate,
      enddate: sleepDay.enddate,
    };
  }

  return Object.keys(extended).length > 0 ? extended : null;
}

/**
 * Subscribe to Withings webhook notifications for a user.
 * Must be called with the user's access token after OAuth connect.
 * Subscribes to weight/body comp (1), activity (16), and sleep (44).
 */
export async function subscribeWithingsNotifications(accessToken) {
  const baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "aimfitness.ai"}`;
  const callbackUrl = `${baseUrl}/api/webhooks/withings`;

  const results = [];
  for (const [name, appli] of Object.entries(NOTIFY_APPLI)) {
    try {
      const res = await fetch(NOTIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${accessToken}`,
        },
        body: new URLSearchParams({
          action: "subscribe",
          callbackurl: callbackUrl,
          appli: String(appli),
          comment: `AIM ${name.toLowerCase()} notifications`,
        }),
      });
      const json = await res.json();
      results.push({ appli: name, status: json.status });
    } catch (err) {
      results.push({ appli: name, error: err.message });
    }
  }
  return results;
}

/**
 * Update the user's profile weight with the latest Withings measurement.
 * Keeps W/kg, FTP/kg, and body-comp AI insights current automatically.
 */
export async function updateProfileWeight(userId, weightKg) {
  if (weightKg == null) return;
  await supabaseAdmin
    .from("profiles")
    .update({ weight_kg: weightKg })
    .eq("id", userId);
}

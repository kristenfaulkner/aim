import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";
import { matchActivitiesToContext, computeAllModels, formatModelsForAI } from "../_lib/performance-models.js";
import { extractLocationFromActivity, fetchActivityWeather, fetchWeatherForecast } from "../_lib/weather-enrich.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 60 };

// ── HISTORICAL PATTERN ANALYSIS ──
// Pre-compute recovery patterns from 90 days of data so Claude can reference
// the athlete's personal history instead of giving generic advice.

function computeHistoricalPatterns(activities90d, dailyMetrics90d) {
  if (!activities90d?.length || activities90d.length < 10) return null;

  const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10 : null;

  // Build date→metrics lookup
  const metricsMap = {};
  for (const m of (dailyMetrics90d || [])) metricsMap[m.date] = m;

  // Group activities by ISO week (Monday start)
  const weeklyBlocks = {};
  for (const a of activities90d) {
    const date = a.started_at.split("T")[0];
    const d = new Date(date + "T00:00:00Z");
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    const weekKey = monday.toISOString().split("T")[0];

    if (!weeklyBlocks[weekKey]) {
      weeklyBlocks[weekKey] = { weekStart: weekKey, tss: 0, rides: 0, activityDates: new Set() };
    }
    weeklyBlocks[weekKey].tss += a.tss || 0;
    weeklyBlocks[weekKey].rides += 1;
    weeklyBlocks[weekKey].activityDates.add(date);
  }

  // Sort weeks chronologically and compute rest days + end-of-week metrics
  const weeks = Object.values(weeklyBlocks)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(w => {
      let restDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(w.weekStart + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        if (!w.activityDates.has(d.toISOString().split("T")[0])) restDays++;
      }
      const endDate = new Date(w.weekStart + "T00:00:00Z");
      endDate.setUTCDate(endDate.getUTCDate() + 6);
      const endMetrics = metricsMap[endDate.toISOString().split("T")[0]];
      return {
        week: w.weekStart,
        tss: Math.round(w.tss),
        rides: w.rides,
        restDays,
        endTSB: endMetrics?.tsb != null ? Math.round(endMetrics.tsb) : null,
      };
    });

  // Identify high-load weeks (top quartile by TSS)
  const tssSorted = weeks.map(w => w.tss).filter(t => t > 0).sort((a, b) => a - b);
  const highLoadThreshold = tssSorted[Math.floor(tssSorted.length * 0.75)] || 800;

  // For each high-load week, analyze what followed (recovery trajectory)
  const highLoadRecovery = [];
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].tss < highLoadThreshold) continue;
    const nextWeek = weeks[i + 1];
    if (!nextWeek) continue;

    // Count consecutive rest days starting from end of high-load week
    const weekEnd = new Date(weeks[i].week + "T00:00:00Z");
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    let consecutiveRestDays = 0;
    for (let d = 0; d < 5; d++) {
      const checkDate = new Date(weekEnd);
      checkDate.setUTCDate(checkDate.getUTCDate() + d);
      const dateStr = checkDate.toISOString().split("T")[0];
      const hadActivity = activities90d.some(a => a.started_at.startsWith(dateStr));
      if (!hadActivity) consecutiveRestDays++;
      else break;
    }

    // HRV trajectory in days after the high-load week
    const hrvAfter = [];
    for (let d = 0; d < 5; d++) {
      const checkDate = new Date(weekEnd);
      checkDate.setUTCDate(checkDate.getUTCDate() + d);
      const m = metricsMap[checkDate.toISOString().split("T")[0]];
      const hrv = m?.hrv_overnight_avg_ms || m?.hrv_ms;
      if (hrv) hrvAfter.push({ day: d + 1, hrv: Math.round(hrv) });
    }

    highLoadRecovery.push({
      weekOf: weeks[i].week,
      weekTSS: weeks[i].tss,
      restDaysAfter: consecutiveRestDays,
      nextWeekTSS: nextWeek.tss,
      tsbAtEnd: weeks[i].endTSB,
      hrvRecovery: hrvAfter.length > 0 ? hrvAfter : undefined,
    });
  }

  // HR drift correlation with rest: group rides by days off before the ride
  const activitiesWithDrift = [...activities90d]
    .filter(a => a.hr_drift_pct != null)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));

  const driftBuckets = { consecutive: [], after1Rest: [], after2PlusRest: [] };
  for (let i = 1; i < activitiesWithDrift.length; i++) {
    const curr = activitiesWithDrift[i];
    const prev = activitiesWithDrift[i - 1];
    const daysBetween = Math.round(
      (new Date(curr.started_at) - new Date(prev.started_at)) / 86400000
    );
    if (daysBetween <= 1) driftBuckets.consecutive.push(curr.hr_drift_pct);
    else if (daysBetween === 2) driftBuckets.after1Rest.push(curr.hr_drift_pct);
    else driftBuckets.after2PlusRest.push(curr.hr_drift_pct);
  }

  // EF (efficiency factor) correlation with rest — same bucketing
  const efBuckets = { consecutive: [], after1Rest: [], after2PlusRest: [] };
  const activitiesWithEF = [...activities90d]
    .filter(a => a.efficiency_factor != null)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  for (let i = 1; i < activitiesWithEF.length; i++) {
    const curr = activitiesWithEF[i];
    const prev = activitiesWithEF[i - 1];
    const daysBetween = Math.round(
      (new Date(curr.started_at) - new Date(prev.started_at)) / 86400000
    );
    if (daysBetween <= 1) efBuckets.consecutive.push(curr.efficiency_factor);
    else if (daysBetween === 2) efBuckets.after1Rest.push(curr.efficiency_factor);
    else efBuckets.after2PlusRest.push(curr.efficiency_factor);
  }

  return {
    weeklyBlocks: weeks.slice(-12),
    highLoadThresholdTSS: Math.round(highLoadThreshold),
    highLoadRecovery: highLoadRecovery.length > 0 ? highLoadRecovery : undefined,
    hrDriftByRecovery: {
      consecutiveDays: { avg: avg(driftBuckets.consecutive), n: driftBuckets.consecutive.length },
      after1RestDay: { avg: avg(driftBuckets.after1Rest), n: driftBuckets.after1Rest.length },
      after2PlusRestDays: { avg: avg(driftBuckets.after2PlusRest), n: driftBuckets.after2PlusRest.length },
    },
    efficiencyByRecovery: {
      consecutiveDays: { avg: avg(efBuckets.consecutive), n: efBuckets.consecutive.length },
      after1RestDay: { avg: avg(efBuckets.after1Rest), n: efBuckets.after1Rest.length },
      after2PlusRestDays: { avg: avg(efBuckets.after2PlusRest), n: efBuckets.after2PlusRest.length },
    },
  };
}

// ── NEW AI-FIRST OUTPUT FORMAT ──
// All modes return the same shape for the Today page.

const SHARED_FORMAT = `
Return valid JSON matching this exact shape:
{
  "briefing": "2-4 sentence AI narrative paragraph. References readiness, key metrics, planned workout or ride results, conditions. Written in second person, warm but specific.",
  "insights": [
    {
      "type": "positive|warning|action|insight",
      "icon": "emoji",
      "headline": "Short, specific title with a key number",
      "takeaway": "1-2 sentences: what to DO about this. Always actionable. Always visible.",
      "narrative": "Full paragraph with evidence, comparisons, historical context.",
      "evidence": [
        { "label": "HRV today", "value": "123ms", "color": "green" },
        { "label": "90-day avg", "value": "94ms", "color": "dim" }
      ],
      "crossDomain": "Which sources contributed and why only AIM can connect them. Null if single-source insight.",
      "sources": ["Oura", "Wahoo"],
      "dataGap": "Contextual prompt to connect a missing data source. Null if no gap."
    }
  ],
  "contextCards": [
    { "icon": "emoji", "label": "17C", "sub": "Contextual note about this metric", "color": "blue|green|dim" }
  ],
  "collapsedMorning": "Single-line summary of morning briefing. Only for POST_RIDE mode, null otherwise.",
  "dataGaps": [
    { "source": "Blood Panel", "lastUpdated": "9 months ago", "prompt": "Specific reason to upload/connect." }
  ]
}`;

const SHARED_RULES = `
INSIGHT FORMAT RULES:
- Every insight MUST have a "takeaway" that tells the athlete what to DO. No insight exists without an action or decision.
- Headlines should contain a specific number and be understandable without reading anything else.
- The "narrative" field is the full evidence paragraph — specific numbers, historical comparisons, model references.
- The "crossDomain" field should explain which data sources contributed and why this insight requires AIM. Set to null for single-source insights.
- The "dataGap" field should ONLY appear when a missing data source would have added specific value to THIS insight.
- Include "evidence" array with 3-5 key data points that support the insight. Use color hints: "green" for good, "red" for bad, "yellow" for caution, "dim" for reference values.
- Limit to 3-5 insights. Rank by importance — the most actionable and cross-domain insights first.
- ALWAYS reference the personal heat model if temperature data and performanceModels are present.
- ALWAYS connect sleep data to performance outcomes when sleep data exists.
- The "lastNightSleep" object (if present) contains the most recent night's sleep data pre-extracted from daily_metrics. If this field exists, sleep data IS available — do NOT generate a data gap about missing sleep. Sleep may be stored under yesterday's date depending on the provider.

DATA GAP RULES:
- Include a top-level "dataGaps" array (0-3 items) for major disconnected sources that would unlock new insight categories.
- Each data gap should reference the athlete's specific situation — not generic.
- If a blood panel or DEXA is older than 6 months, flag it with the date.
- Frame every gap as unlocking intelligence, never as a requirement.
- **Check \`connectedSources\` before suggesting any integration.** Eight Sleep, Oura, and Whoop all provide sleep stages, HRV, resting HR, and respiratory rate. If ANY of these is connected, do NOT suggest the others for sleep/HRV data they already have. Only suggest truly incremental metrics: e.g., if Eight Sleep is connected but not Oura/Whoop, the only incremental data would be SpO2, a holistic readiness/recovery score, and true body temperature deviation. Never use generic language like "connecting a recovery tracker would give AIM your nightly HRV" when the athlete already has HRV from another device.

WEATHER & FORECAST RULES:
- When "weatherForecast" is present, use it to provide proactive weather-aware coaching.
- "weatherForecast.current" has real-time conditions (temp_c, apparent_temp_c, humidity_pct, wind_speed_kmh).
- "weatherForecast.daily" is a 7-day forecast array with temp_max_c, temp_min_c, apparent_max_c, precip_mm, wind_max_kmh, uv_index_max per day.
- Flag upcoming heat-risk days (apparent_max_c > 30C) with expected performance impact using the heat model if available.
- Flag rain days (precip_mm > 5) and high wind days (wind_max_kmh > 40) as conditions to plan around.
- For morning modes, reference today's forecast in the briefing and contextCards (temp, conditions, UV).
- For post-ride mode, compare actual ride weather to the forecast if both are available.
- Include a contextCard for current weather when forecast data is present.
- When the heat model is available, predict expected EF/HR adjustments for upcoming hot days.

GENERAL RULES:
- When CTL, ATL, and TSB values are present in dailyMetrics, state them as computed facts, not estimates. These are calculated values (CTL = 42-day fitness, ATL = 7-day fatigue, TSB = CTL − ATL). Never say "likely", "probably", or "estimated" about values you have actual data for.
- ALWAYS address the athlete by their first name (from athlete.first_name). NEVER use the word "Athlete" as a name or greeting — use their actual first name. If first_name is null or missing, just use "you" naturally without any name.
- Always second person ("your power", "your sleep"). Never "athletes in the bottom quartile".
- Sleep and recovery data is from LAST NIGHT, not tonight. Always say "last night" when referring to the most recent sleep data.
- When performanceModels data is present, reference specific model predictions.
- NEVER HALLUCINATE — every number about past data must come from the actual data provided.
- NEVER give direct medical/supplement advice — use "Research suggests..." language.
- Return ONLY valid JSON, no markdown or explanation.`;

const POST_RIDE_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

Analyze today's ride using the athlete's actual data. Be specific — reference their real numbers.

${SHARED_FORMAT}

${SHARED_RULES}

POST-RIDE SPECIFIC RULES:
- The "briefing" should summarize the ride: what they did, key metrics, how it went relative to expectations.
- Generate the "collapsedMorning" field — a single sentence summarizing this morning's readiness. Example: "This morning: readiness 82, HRV 121ms (top quartile), 6h03m sleep. You were cleared for sweet spot work."
- Post-ride insights should reference the morning's predictions when possible for narrative continuity.
- Connect ride data to recent trends (CTL/ATL/TSB, HRV, sleep).
- Include 2-4 contextCards showing conditions during the ride (weather, elevation, etc.).
- Include recovery-focused takeaways: refueling, hydration, sleep targets.

RIDE-TO-RIDE COMPARISON RULES (when similarSessions data is provided):
- Include at least one comparison insight referencing the most similar past session.
- Compare today's key metrics (EF, NP, HR drift, cadence) to the most similar past session.
- Explain WHAT changed AND WHY using cross-domain context differences.
- After adjusting for conditions, give a NET FITNESS ASSESSMENT.
- If no similar sessions exist, skip comparison insights.`;

const MORNING_WITH_PLAN_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

The athlete has a planned workout today. Brief them on readiness and how to execute.

${SHARED_FORMAT}

Also include a "workout" object in your response:
{
  "workout": {
    "name": "Workout name from the plan",
    "source": "Source of the workout",
    "structure": "Human-readable structure with line breaks",
    "duration_min": 85,
    "target_power": "265-280W",
    "est_tss": 142,
    "fueling": {
      "carbs_per_hour": 80,
      "fluid_ml_per_hour": 750,
      "sodium_mg_per_hour": 600
    }
  }
}

${SHARED_RULES}

MORNING WITH PLAN SPECIFIC RULES:
- The "briefing" MUST reference the specific workout by name and targets.
- Assess readiness AGAINST that specific workout (not generic readiness).
- Set "collapsedMorning" to null.
- If sleep or HRV suggest reduced readiness, recommend adjusted power targets in the takeaway.
- Fueling recommendations should scale to workout duration and intensity.
- Include contextCards for weather conditions and how they interact with the heat model.
- Tips should reference their actual FTP and power targets: "Target 265-280W" not "ride at threshold".`;

const MORNING_RECOVERY_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

No ride today and no planned workout. Provide daily coaching guidance.

${SHARED_FORMAT}

${SHARED_RULES}

MORNING RECOVERY / REST DAY SPECIFIC RULES:
- The "briefing" should assess overall state: where they are in training load, recovery status, what today means.
- Set "collapsedMorning" to null.
- Include training load context in insights (CTL/ATL/TSB).
- If TSB is very negative, emphasize rest. If positive, suggest productive training.
- Include recovery-focused insights: sleep optimization, nutrition, mobility.
- contextCards should show current training status (TSB color, sleep trend).
- If they should train, suggest specific workout options in insights with power targets from their FTP.`;

/**
 * Auto-detect intelligence mode based on today's data.
 */
function detectMode(todayActivity, todayPlannedWorkout) {
  if (todayActivity) return "POST_RIDE";
  if (todayPlannedWorkout) return "MORNING_WITH_PLAN";
  return "MORNING_RECOVERY";
}

/**
 * POST /api/dashboard/intelligence
 * AI-powered daily intelligence briefing with auto-detected mode.
 * Uses server-side caching to avoid redundant Claude calls.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { mode: requestedMode, localDate: clientLocalDate } = req.body || {};

  try {
    // Use client's local date if provided, fall back to UTC
    const today = clientLocalDate || new Date().toISOString().split("T")[0];
    // Create generous window for today's activities (covers timezone offsets)
    const todayStart = today + "T00:00:00";
    const todayEnd = new Date(new Date(today + "T00:00:00Z").getTime() + 36 * 3600000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // ── Step 1: Fetch all context in parallel ──
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const [
      profileResult,
      todayActivityResult,
      todayPlannedResult,
      dailyMetricsResult,
      recentActivitiesResult,
      allActivitiesResult,
      nutritionResult,
      travelResult,
      crossTrainingResult,
      goalsResult,
      integrationsResult,
    ] = await Promise.allSettled([
      supabaseAdmin
        .from("profiles")
        .select("full_name, sex, ftp_watts, max_hr_bpm, weight_kg, weekly_hours, date_of_birth, timezone, location_lat, location_lng")
        .eq("id", session.userId)
        .single(),
      supabaseAdmin
        .from("activities")
        .select("id, name, activity_type, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, max_power_watts, tss, intensity_factor, variability_index, efficiency_factor, hr_drift_pct, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm, avg_speed_mps, calories, work_kj, elevation_gain_meters, temperature_celsius, activity_weather, perceived_exertion, gi_comfort, mental_focus, perceived_recovery_pre, description, laps, zone_distribution")
        .eq("user_id", session.userId)
        .gte("started_at", todayStart)
        .lt("started_at", todayEnd)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("training_calendar")
        .select("*")
        .eq("user_id", session.userId)
        .eq("date", today)
        .maybeSingle(),
      supabaseAdmin
        .from("daily_metrics")
        .select("date, ctl, atl, tsb, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, resting_hr, sleep_score, recovery_score, weight_kg, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at, respiratory_rate, resting_spo2")
        .eq("user_id", session.userId)
        .gte("date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0])
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("activities")
        .select("id, activity_type, name, started_at, duration_seconds, distance_meters, tss, normalized_power_watts, avg_power_watts, avg_hr_bpm, max_hr_bpm, intensity_factor, elevation_gain_meters, start_lat, start_lng")
        .eq("user_id", session.userId)
        .order("started_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("activities")
        .select("id, name, activity_type, started_at, duration_seconds, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, hr_drift_pct, variability_index, avg_hr_bpm, max_hr_bpm, calories, work_kj, temperature_celsius, activity_weather, laps")
        .eq("user_id", session.userId)
        .gte("started_at", ninetyDaysAgo)
        .order("started_at", { ascending: false }),
      supabaseAdmin
        .from("nutrition_logs")
        .select("activity_id, date, totals, per_hour")
        .eq("user_id", session.userId)
        .gte("date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]),
      supabaseAdmin
        .from("travel_events")
        .select("detected_at, distance_km, timezone_shift_hours, altitude_change_m, travel_type, altitude_acclimation_day, dest_timezone")
        .eq("user_id", session.userId)
        .gte("detected_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .order("detected_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("cross_training_log")
        .select("date, activity_type, body_region, perceived_intensity, duration_minutes, recovery_impact")
        .eq("user_id", session.userId)
        .gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("working_goals")
        .select("name, current_value, target_value, unit, trend, active")
        .eq("user_id", session.userId)
        .eq("active", true),
      supabaseAdmin
        .from("integrations")
        .select("provider")
        .eq("user_id", session.userId)
        .eq("is_active", true),
    ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;

    const profile = getData(profileResult);
    const todayActivity = getData(todayActivityResult);
    const todayPlannedWorkout = getData(todayPlannedResult);
    const dailyMetrics90d = getData(dailyMetricsResult) || [];
    const dailyMetrics = dailyMetrics90d.filter(d => d.date >= sevenDaysAgo); // 7-day window for context
    const recentActivities = getData(recentActivitiesResult) || [];
    const integrations = getData(integrationsResult) || [];

    // Determine mode
    let mode = requestedMode || detectMode(todayActivity, todayPlannedWorkout);
    if (mode === "PRE_RIDE_PLANNED") mode = "MORNING_WITH_PLAN";
    if (mode === "DAILY_COACH") mode = "MORNING_RECOVERY";

    // ── Step 2: Check server-side cache ──
    // Cache key includes: date, mode, latest activity, latest metrics timestamp, sleep data presence
    const todayDm = dailyMetrics.find(d => d.date === today);
    const sleepFingerprint = todayDm
      ? `${todayDm.total_sleep_seconds || ""}|${todayDm.sleep_score || ""}|${todayDm.hrv_ms || todayDm.hrv_overnight_avg_ms || ""}`
      : "";
    const latestMetricsKey = dailyMetrics[0]
      ? `${dailyMetrics[0].date}|${dailyMetrics[0].checkin_completed_at || ""}|${sleepFingerprint}`
      : "";
    const cacheKey = `${today}|${mode}|${todayActivity?.id || ""}|${latestMetricsKey}`;

    try {
      const { data: cached } = await supabaseAdmin
        .from("intelligence_cache")
        .select("mode, intelligence")
        .eq("user_id", session.userId)
        .eq("cache_key", cacheKey)
        .single();
      if (cached) {
        return res.status(200).json({ mode: cached.mode, intelligence: cached.intelligence, cached: true });
      }
    } catch {
      // Table may not exist yet or no cache hit — continue to generate fresh
    }

    // ── Step 3: Weather + performance models in parallel ──
    let weatherLat = profile?.location_lat;
    let weatherLng = profile?.location_lng;
    if (!weatherLat || !weatherLng) {
      const locActivity = recentActivities.find(a => extractLocationFromActivity(a));
      if (locActivity) {
        const loc = extractLocationFromActivity(locActivity);
        weatherLat = loc.lat;
        weatherLng = loc.lng;
      }
    }

    const allActivities90d = getData(allActivitiesResult) || [];
    const nutritionLogs = getData(nutritionResult) || [];

    // Run weather fetch and model computation concurrently
    const [weatherResult, modelsResult] = await Promise.allSettled([
      weatherLat && weatherLng
        ? fetchWeatherForecast(weatherLat, weatherLng)
        : Promise.resolve(null),
      Promise.resolve(
        allActivities90d.length >= 5
          ? computeAllModels(
              matchActivitiesToContext(allActivities90d, dailyMetrics, nutritionLogs, profile?.weight_kg)
            )
          : null
      ),
    ]);

    const weatherForecast = weatherResult.status === "fulfilled" ? weatherResult.value : null;
    const performanceModels = modelsResult.status === "fulfilled" ? modelsResult.value : null;

    // ── Step 4: Build context for Claude ──
    const firstName = profile?.full_name?.split(" ")[0] || null;
    const profileSafe = profile ? { ...profile, first_name: firstName } : {};
    const modelsText = performanceModels ? formatModelsForAI(performanceModels) : "";

    const todayMetrics = dailyMetrics.find((d) => d.date === today);
    const subjectiveCheckin = todayMetrics?.life_stress_score ? {
      lifeStress: todayMetrics.life_stress_score,
      motivation: todayMetrics.motivation_score,
      muscleSoreness: todayMetrics.muscle_soreness_score,
      mood: todayMetrics.mood_score,
    } : undefined;

    // Extract last night's sleep from today's daily_metrics row.
    // All providers (Oura, Whoop, Eight Sleep) store last night's sleep under today's date.
    const lastNightSleep = (() => {
      const sleepRow = dailyMetrics.find(d =>
        d.date === today &&
        (d.total_sleep_seconds != null || d.sleep_score != null)
      );
      if (!sleepRow) return undefined;
      const s = {};
      if (sleepRow.date) s.date = sleepRow.date;
      if (sleepRow.sleep_score != null) s.sleep_score = sleepRow.sleep_score;
      if (sleepRow.total_sleep_seconds != null) s.total_sleep_hours = Math.round(sleepRow.total_sleep_seconds / 360) / 10;
      if (sleepRow.deep_sleep_seconds != null) s.deep_sleep_hours = Math.round(sleepRow.deep_sleep_seconds / 360) / 10;
      if (sleepRow.rem_sleep_seconds != null) s.rem_sleep_hours = Math.round(sleepRow.rem_sleep_seconds / 360) / 10;
      if (sleepRow.hrv_ms != null) s.hrv_ms = sleepRow.hrv_ms;
      if (sleepRow.hrv_overnight_avg_ms != null) s.hrv_overnight_avg_ms = sleepRow.hrv_overnight_avg_ms;
      if (sleepRow.resting_hr_bpm != null) s.resting_hr_bpm = sleepRow.resting_hr_bpm;
      if (sleepRow.recovery_score != null) s.recovery_score = sleepRow.recovery_score;
      if (sleepRow.respiratory_rate != null) s.respiratory_rate = sleepRow.respiratory_rate;
      if (sleepRow.resting_spo2 != null) s.resting_spo2 = sleepRow.resting_spo2;
      return Object.keys(s).length > 1 ? s : undefined;
    })();

    const travelEvents = getData(travelResult) || [];
    const crossTrainingLog = getData(crossTrainingResult) || [];
    const workingGoals = getData(goalsResult) || [];

    // Compute historical recovery patterns from 90 days of data
    const historicalPatterns = computeHistoricalPatterns(allActivities90d, dailyMetrics90d);

    const context = {
      athlete: profileSafe,
      connectedIntegrations: integrations.map(i => i.provider),
      lastNightSleep,
      dailyMetrics,
      recentActivities,
      performanceModels: modelsText || undefined,
      subjectiveCheckin,
      weatherForecast: weatherForecast || undefined,
      travelEvents: travelEvents.length > 0 ? travelEvents : undefined,
      crossTrainingLog: crossTrainingLog.length > 0 ? crossTrainingLog : undefined,
      workingGoals: workingGoals.length > 0 ? workingGoals : undefined,
      connectedSources: integrations.map((i) => i.provider),
      historicalPatterns: historicalPatterns || undefined,
    };

    let systemPrompt;
    if (mode === "POST_RIDE") {
      context.todayActivity = todayActivity;
      systemPrompt = POST_RIDE_PROMPT;
    } else if (mode === "MORNING_WITH_PLAN") {
      context.plannedWorkout = todayPlannedWorkout;
      systemPrompt = MORNING_WITH_PLAN_PROMPT;
    } else {
      systemPrompt = MORNING_RECOVERY_PROMPT;
    }

    // ── Step 5: Call Claude Opus ──
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: JSON.stringify(context),
      }],
    });
    trackTokenUsage(session.userId, "dashboard_intelligence", "claude-opus-4-6", response.usage);

    const raw = response.content[0].text;

    let intelligence;
    try {
      intelligence = JSON.parse(raw);
    } catch {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { intelligence = JSON.parse(match[1].trim()); } catch { /* fall through */ }
      }
      if (!intelligence) {
        const braceMatch = raw.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try { intelligence = JSON.parse(braceMatch[0]); } catch { /* fall through */ }
        }
      }
      if (!intelligence) {
        console.error("Dashboard intelligence response:", raw.substring(0, 300));
        return res.status(500).json({ error: "Failed to parse AI intelligence response" });
      }
    }

    // ── Step 6: Cache result (fire-and-forget) ──
    supabaseAdmin
      .from("intelligence_cache")
      .upsert({
        user_id: session.userId,
        cache_key: cacheKey,
        mode,
        intelligence,
        created_at: new Date().toISOString(),
      })
      .then(() => {})
      .catch(() => {});

    return res.status(200).json({ mode, intelligence });
  } catch (err) {
    console.error("Dashboard intelligence error:", err);
    const msg = err?.status === 401
      ? "Invalid ANTHROPIC_API_KEY"
      : err?.message || "Failed to generate intelligence";
    return res.status(500).json({ error: msg });
  }
}

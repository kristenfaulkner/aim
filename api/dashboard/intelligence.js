import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";
import { extractLocationFromActivity, fetchWeatherForecast } from "../_lib/weather-enrich.js";
import { getAthleteAnalytics } from "../_lib/athlete-analytics.js";
import { localDate, getUserTimezone } from "../_lib/date-utils.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 60 };

// ── PREP REC OUTPUT FORMAT ──
// Intelligence delivered as actionable PrepRecs, not generic insights.

const SHARED_FORMAT = `
Return valid JSON matching this exact shape:
{
  "briefing": "2-3 sentence synthesis. Short and punchy. Answers: Am I good to go? What is the one big thing?",
  "contextCards": [
    { "icon": "emoji", "label": "value with unit", "sub": "why it matters — reference personal data/models/goals", "color": "blue|green|yellow|purple|dim" }
  ],
  "prepRecs": [
    {
      "icon": "emoji",
      "title": "Complete, specific instruction with numbers — must be standalone readable",
      "action": "WHY — 1-2 sentences explaining the reasoning behind this instruction",
      "evidence": "Deep data: correlations, historical comparisons, model predictions. Null if no supporting data.",
      "pills": [{ "value": "~480g", "label": "Carbs burned" }]
    }
  ],
  "collapsedMorning": null,
  "recoveryRecs": null,
  "dataGaps": [
    { "source": "Blood Panel", "lastUpdated": "9 months ago", "prompt": "Specific reason to upload/connect." }
  ]
}`;

const SHARED_RULES = `
PREP REC FORMAT RULES:
- Every prep rec title MUST be a complete instruction readable on its own. The title IS the recommendation.
- Examples of good titles:
  - "Pre-ride meal: 200g carbs, 30g protein, 20g fat — 2-3 hours before"
  - "Extra 500ml with sodium — you woke up 2% dehydrated"
  - "Reduce power targets 3-5% — it's 12°C above your breakpoint"
  - "Fuel 90g/hr — you're working toward 80g/hr and your fade data backs it"
  - "Lights out by 9:30 — you're working toward 7+ hours and tonight is your 3rd miss"
- Every title must contain SPECIFIC NUMBERS from the athlete's data.
- The "action" field explains WHY — the reasoning behind the instruction.
- The "evidence" field is the deep data — correlations, historical comparisons, model predictions. Set to null if insufficient data.
- Include "pills" array with 2-4 key data points.
- Reference WORKING GOALS inline when relevant. Do not list goals separately — weave them into rec titles:
  - "Fuel 90g/hr — you're working toward 80g/hr"
  - "Lights out by 9:30 — you're working toward 7+ hours and tonight is your 3rd miss"
- Generate 4-7 prep recs per mode. Include when data exists:
  1. Pre-ride nutrition (meal timing, macros based on planned workload)
  2. Hydration (body water %, dehydration risk)
  3. Power/intensity adjustments (heat model, cycle phase, readiness)
  4. Cycle phase (luteal adjustments, follicular opportunity) — only if menstrual data provided
  5. Fueling during ride (carbs/hr target from fade data)
  6. Recovery readiness (HRV signal, rest day impact)
  7. Sleep (tonight's rec, referencing sleep goal)
- NEVER a rec without a specific number. "Hydrate more" is not a rec. "500ml with electrolytes 2 hours before" is a rec.

BRIEFING RULES:
- 2-3 sentences MAX. Answers: "Am I good to go? What is the one big thing?"
- Reference readiness, the workout (or rest day), and the most important caveat.

CONTEXT CARD RULES:
- Return 2-3 cards for conditions modifying today. Priority order:
  1. SLEEP (always show if sleep data exists) — duration + context vs goal
  2. CYCLE PHASE (show only if menstrual data provided) — phase day + what it means
  3. WEATHER (always show if riding today or conditions notable) — temp + wind + heat model reference
- Each: icon + label (the number) + sub (why it matters, referencing personal models/goals).
- Sleep pill should reference sleep goal when one exists in workingGoals.
- Weather pill should reference heat breakpoint from performanceModels.

DATA GAP RULES:
- Include a top-level "dataGaps" array (0-3 items) for major disconnected sources.
- Each data gap should reference the athlete's specific situation — not generic.
- If a blood panel or DEXA is older than 6 months, flag it with the date.
- Frame every gap as unlocking intelligence, never as a requirement.
- **Check \`connectedSources\` before suggesting any integration.** Eight Sleep, Oura, and Whoop all provide sleep stages, HRV, resting HR. If ANY is connected, do NOT suggest the others for sleep/HRV. Only suggest truly incremental metrics.

WEATHER & FORECAST RULES:
- When "weatherForecast" is present, use it to provide proactive weather-aware coaching.
- "weatherForecast.current" has real-time conditions (temp_c, apparent_temp_c, humidity_pct, wind_speed_kmh).
- "weatherForecast.daily" is a 7-day forecast array.
- When the heat model is available, predict expected EF/HR adjustments in prepRecs.
- Include a contextCard for current weather when forecast data is present.

HISTORICAL PATTERN RULES (when "historicalPatterns" is present):
- This is the athlete's PERSONAL recovery data from 90 days. Use it for specific, evidence-backed claims.
- "weeklyBlocks" shows TSS/rides/rest days per week for last 12 weeks.
- "highLoadRecovery" shows recovery patterns after high-TSS weeks.
- "hrDriftByRecovery" shows average HR drift grouped by recovery state.
- "efficiencyByRecovery" shows EF grouped by recovery state.
- ALWAYS include at least one prepRec that references a specific historical pattern.
- When recommending rest or training, cite the athlete's own precedent.

MODEL NARRATIVES:
- When "modelNarratives" is present, USE THESE as foundation. They contain the athlete's real numbers. Synthesize with today's context rather than re-interpreting raw model data. Do not contradict the numbers in them.

GENERAL RULES:
- The "today" field is the athlete's local date (YYYY-MM-DD). Use it for day-of-week and "this week" calculations.
- Check "recentActivities" for actual activity dates. A day is only a rest day if it has passed AND has no activity.
- CTL, ATL, TSB values are computed facts, not estimates. State them directly.
- ALWAYS address the athlete by first name (from athlete.first_name). NEVER use "Athlete" as a name. If missing, use "you".
- Always second person ("your power", "your sleep").
- Sleep/recovery data is from LAST NIGHT. Say "last night" when referring to it.
- The "lastNightSleep" object (if present) means sleep data IS available — do NOT suggest a sleep data gap.
- NEVER HALLUCINATE — every number must come from actual data provided.
- NEVER give direct medical/supplement advice — use "Research suggests..." language.
- "temperatureUnit" indicates preferred unit. Display all temps in that unit.
- Return ONLY valid JSON, no markdown or explanation.`;

const POST_RIDE_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

Analyze today's ride. Generate recovery recommendations as PrepRecs.

${SHARED_FORMAT}

For POST_RIDE mode, also generate:
- "collapsedMorning": a single sentence summarizing this morning's readiness. Example: "This morning: readiness 82, HRV 121ms (top quartile), 6h03m sleep. You were cleared for sweet spot work."
- "recoveryRecs": array of PrepRec objects focused on post-ride recovery:
  1. Immediate refueling (protein + carbs, timing)
  2. Rehydration (estimated sweat loss from duration + temp)
  3. Tonight's sleep (reference sleep goal, Eight Sleep setting if connected)
  4. Tomorrow's plan (workout type, intensity, TSS target based on weekly load)

Set "prepRecs" to an empty array [] for POST_RIDE mode. All recs go in "recoveryRecs".

${SHARED_RULES}

POST-RIDE SPECIFIC RULES:
- The "briefing" should summarize the ride: what they did, key metrics, how it went, ride-to-ride comparison if similar sessions provided.
- Connect ride data to recent trends (CTL/ATL/TSB, HRV, sleep) in the briefing.
- Include 2-3 contextCards showing conditions during the ride (weather, etc.).
- When historicalPatterns is present, use the athlete's personal recovery data to set specific expectations.

RIDE-TO-RIDE COMPARISON (when similarSessions data is provided):
- Reference the most similar past session in the briefing.
- Compare key metrics (EF, NP, HR drift) and explain WHAT changed and WHY.
- Give a NET FITNESS ASSESSMENT after adjusting for conditions.`;

const MORNING_WITH_PLAN_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

The athlete has a planned workout today. Brief them on readiness and generate PrepRecs specific to that workout.

${SHARED_FORMAT}

Also include a "workout" object in your response:
{
  "workout": {
    "name": "Workout name from the plan",
    "source": "Source/coach name",
    "structure": "15' warmup → 3 × 15' @ 262-277W / 5' recovery → 10' cooldown",
    "duration": "1h 45m",
    "targetPower": "262-277W",
    "tss": 90,
    "hasPlannedWorkout": true
  }
}

${SHARED_RULES}

MORNING WITH PLAN SPECIFIC RULES:
- The "briefing" MUST reference the specific workout by name and targets.
- Assess readiness AGAINST that specific workout (not generic readiness).
- Set "collapsedMorning" to null, "recoveryRecs" to null.
- PrepRecs MUST be specific to this workout:
  - Calculate expected calorie/carb burn from planned TSS and duration
  - Adjust power targets using heat model if applicable
  - Adjust for cycle phase if data exists
  - Reference specific workout structure in fueling recs
  - Include go/no-go signal based on readiness
- Include contextCards for weather and how it interacts with the heat model.`;

const MORNING_NO_PLAN_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

No ride detected yet today and no planned workout. Generate general prep recommendations. Do NOT prescribe a specific workout (there is a separate "Get Workout" button for that). Focus on hydration, heat, cycle phase, sleep, and recovery guidance.

${SHARED_FORMAT}

${SHARED_RULES}

MORNING NO PLAN SPECIFIC RULES:
- The "briefing" should assess overall state: training load, recovery status, what today means. If today should be a rest day, say so.
- Set "collapsedMorning" to null, "recoveryRecs" to null.
- PrepRecs should focus on general daily prep: hydration, heat management, cycle phase, sleep tonight, recovery optimization.
- Do NOT include workout-specific recs (no "pre-ride meal" if not riding). Instead: hydration, sleep targets, recovery actions.
- contextCards should show current training status (sleep, weather if notable).
- If TSB is very negative, emphasize rest in the briefing.
- When historicalPatterns is present, at least ONE prepRec MUST reference a specific past recovery episode.
- Compare current weekly TSS to historical blocks with specific numbers.`;

/**
 * Auto-detect intelligence mode based on today's data.
 */
function detectMode(todayActivity, todayPlannedWorkout) {
  if (todayActivity) return "POST_RIDE";
  if (todayPlannedWorkout) return "MORNING_WITH_PLAN";
  return "MORNING_NO_PLAN";
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
    // Use client's local date if provided, fall back to profile timezone
    let today = clientLocalDate;
    if (!today) {
      const tz = await getUserTimezone(supabaseAdmin, session.userId);
      today = localDate(tz);
    }
    // Create generous window for today's activities (covers timezone offsets)
    const todayStart = today + "T00:00:00";
    const todayEnd = new Date(new Date(today + "T00:00:00Z").getTime() + 36 * 3600000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // ── Step 1: Fetch page-specific context in parallel ──
    // NOTE: 90-day analytics (performance models, historical patterns, sleep correlations)
    // are handled by getAthleteAnalytics() in Step 3, not fetched here.
    const [
      profileResult,
      todayActivityResult,
      todayPlannedResult,
      dailyMetricsResult,
      recentActivitiesResult,
      travelResult,
      crossTrainingResult,
      goalsResult,
      integrationsResult,
      settingsResult,
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
        .select("date, ctl, atl, tsb, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, sleep_score, recovery_score, weight_kg, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at, respiratory_rate, resting_spo2")
        .eq("user_id", session.userId)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("activities")
        .select("id, activity_type, name, started_at, duration_seconds, distance_meters, tss, normalized_power_watts, avg_power_watts, avg_hr_bpm, max_hr_bpm, intensity_factor, elevation_gain_meters, start_lat, start_lng")
        .eq("user_id", session.userId)
        .order("started_at", { ascending: false })
        .limit(14),
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
      supabaseAdmin
        .from("user_settings")
        .select("units, temp_unit")
        .eq("user_id", session.userId)
        .single(),
    ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;

    const profile = getData(profileResult);
    const todayActivity = getData(todayActivityResult);
    const todayPlannedWorkout = getData(todayPlannedResult);
    const dailyMetrics = getData(dailyMetricsResult) || [];
    const recentActivities = getData(recentActivitiesResult) || [];
    const integrations = getData(integrationsResult) || [];
    const userSettings = getData(settingsResult);
    const tempUnit = userSettings?.temp_unit || (userSettings?.units === "metric" ? "celsius" : "fahrenheit");

    // Determine mode
    let mode = requestedMode || detectMode(todayActivity, todayPlannedWorkout);
    if (mode === "PRE_RIDE_PLANNED") mode = "MORNING_WITH_PLAN";
    if (mode === "DAILY_COACH" || mode === "MORNING_RECOVERY") mode = "MORNING_NO_PLAN";

    // ── Step 2: Check server-side cache ──
    // Cache key includes: date, mode, latest activity, latest metrics timestamp, sleep data presence
    const todayDm = dailyMetrics.find(d => d.date === today);
    const sleepFingerprint = todayDm
      ? `${todayDm.total_sleep_seconds || ""}|${todayDm.sleep_score || ""}`
      : "";
    const latestMetricsKey = dailyMetrics[0]
      ? `${dailyMetrics[0].date}|${sleepFingerprint}`
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
      // No exact cache hit — continue
    }

    // Stale cache fallback: return any recent intelligence (<6h old) instantly
    // The next page load will regenerate fresh data via SWR
    try {
      const { data: staleCache } = await supabaseAdmin
        .from("intelligence_cache")
        .select("mode, intelligence, created_at")
        .eq("user_id", session.userId)
        .gte("created_at", new Date(Date.now() - 6 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (staleCache) {
        return res.status(200).json({ mode: staleCache.mode, intelligence: staleCache.intelligence, cached: true, stale: true });
      }
    } catch {
      // No stale cache — continue to generate fresh
    }

    // ── Step 3: Weather + cached athlete analytics in parallel ──
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

    // Fetch weather + cached analytics (performance models, historical patterns, etc.) in parallel
    const [weatherResult, analyticsResult] = await Promise.allSettled([
      weatherLat && weatherLng
        ? fetchWeatherForecast(weatherLat, weatherLng)
        : Promise.resolve(null),
      getAthleteAnalytics(session.userId),
    ]);

    const weatherForecast = weatherResult.status === "fulfilled" ? weatherResult.value : null;
    const athleteAnalytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : {};

    // ── Step 4: Build context for Claude ──
    const firstName = profile?.full_name?.split(" ")[0] || null;
    const profileSafe = profile ? { ...profile, first_name: firstName } : {};
    const modelsText = athleteAnalytics.performanceModelsText || "";

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

    const context = {
      today,
      athlete: profileSafe,
      temperatureUnit: tempUnit,
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
      historicalPatterns: athleteAnalytics.historicalPatterns || undefined,
      // Pre-computed AI narratives — Opus can synthesize from these instead of raw model data
      modelNarratives: athleteAnalytics.narratives || undefined,
    };

    let systemPrompt;
    if (mode === "POST_RIDE") {
      context.todayActivity = todayActivity;
      systemPrompt = POST_RIDE_PROMPT;
    } else if (mode === "MORNING_WITH_PLAN") {
      context.plannedWorkout = todayPlannedWorkout;
      systemPrompt = MORNING_WITH_PLAN_PROMPT;
    } else {
      systemPrompt = MORNING_NO_PLAN_PROMPT;
    }

    // ── Step 5: Call Claude Opus (flagship quality — caching ensures this runs rarely) ──
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
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
        console.error("Dashboard intelligence parse failure. Raw response:", raw.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI response. Please retry." });
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

import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { matchActivitiesToContext, computeAllModels, formatModelsForAI } from "../_lib/performance-models.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 60 };

const POST_RIDE_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

Analyze today's ride using the athlete's actual data. Be specific — reference their real numbers.

Return valid JSON:
{
  "summary": "2-3 sentence ride summary with key metrics",
  "actionItems": [
    { "text": "Specific actionable recommendation", "timeframe": "right_now" },
    { "text": "Training adjustment for the week", "timeframe": "this_week" },
    { "text": "Longer-term consideration", "timeframe": "big_picture" }
  ],
  "insights": [
    { "type": "positive|warning|info", "title": "Short title with key number", "body": "Explanation connecting multiple data points with actionable takeaway" }
  ]
}

Rules:
- ALWAYS address the athlete by their first name (from athlete.first_name in the data). NEVER say "Athlete" — use their actual name.
- Reference specific watts, HR, TSS, IF, and zone data from the ride
- Connect ride data to recent trends (CTL/ATL/TSB, HRV, sleep)
- Sleep and recovery data is from LAST NIGHT, not tonight. Always say "last night" when referring to the most recent sleep data.
- actionItems timeframes: "right_now" (recovery window), "this_week" (training adjustments), "big_picture" (periodization/goals)
- 3-5 insights, each connecting 2+ data points
- Be encouraging but honest
- When performanceModels data is present, reference specific model predictions (e.g., "Your heat model predicts..." or "Your HRV readiness threshold...")
- NEVER HALLUCINATE — every number and metric must come from the actual data provided. Do not invent or guess any values.
- Return ONLY valid JSON, no markdown or explanation`;

const PRE_RIDE_PLANNED_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

Brief the athlete on their planned workout. Assess readiness based on recovery data.

Return valid JSON:
{
  "readinessStatement": "1-2 sentence readiness assessment based on HRV, sleep, TSB, and recent training load",
  "fuelingPlan": {
    "calories": 450,
    "carbs_g": 90,
    "fluid_ml": 1500,
    "sodium_mg": 800
  },
  "actionItems": [
    { "text": "Specific pre-ride preparation step", "timeframe": "before_ride" }
  ],
  "tips": [
    "Workout-specific execution tip referencing their power zones",
    "Pacing or fueling strategy for this session type"
  ]
}

Rules:
- ALWAYS address the athlete by their first name (from athlete.first_name in the data). NEVER say "Athlete" — use their actual name.
- Assess readiness using TSB, HRV trend, sleep quality, and recent training stress
- Sleep and recovery data is from LAST NIGHT, not tonight. Always say "last night" when referring to the most recent sleep data.
- Fueling plan should scale to workout duration and intensity
- Action items should be things to do in the next 1-3 hours before the ride
- Tips should reference their actual FTP, zones, and power targets for the planned workout
- Be specific: "Target 265-280W for the intervals" not "ride at threshold"
- When performanceModels data is present, use model predictions in readiness assessment and fueling plan (e.g., "Your HRV is in green zone — your model predicts strong execution today")
- NEVER HALLUCINATE — every number and metric must come from the actual data provided. Do not invent or guess any values.
- Return ONLY valid JSON, no markdown or explanation`;

const DAILY_COACH_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

No ride today and no planned workout. Provide daily coaching guidance.

Return valid JSON:
{
  "headline": "One-line daily coaching headline",
  "sections": {
    "training": "2-3 sentences about where they are in their training load and what today means for recovery/adaptation",
    "nutrition": "1-2 sentences on nutrition focus for a rest/easy day",
    "recovery": "1-2 sentences on recovery activities based on recent load",
    "sleep": "1-2 sentences referencing their recent sleep data if available",
    "supplements": "1 sentence — frame as 'Research suggests...' or 'Consider discussing with your doctor...'. NEVER prescribe."
  },
  "workoutRecommendations": [
    {
      "name": "Easy Spin",
      "type": "recovery",
      "duration_min": 45,
      "tss": 25,
      "why": "Reason based on their current CTL/ATL/TSB",
      "structure": "Brief workout structure with specific power targets based on their FTP"
    }
  ]
}

Rules:
- ALWAYS address the athlete by their first name (from athlete.first_name in the data). NEVER say "Athlete" — use their actual name.
- Reference their actual CTL, ATL, TSB, and recent trends
- Sleep and recovery data is from LAST NIGHT, not tonight. Always say "last night" when referring to the most recent sleep data.
- Workout recommendations should use their real FTP for power targets
- 1-3 workout recommendations appropriate for their current fatigue/fitness balance
- If TSB is very negative, emphasize rest; if positive, suggest productive training
- NEVER give direct medical/supplement advice — use "Research suggests..." language
- When performanceModels data is present, reference model insights in workout recommendations (e.g., "Your durability model shows best performance below 22 kJ/kg — today's easy ride keeps you well under")
- NEVER HALLUCINATE — every number and metric must come from the actual data provided. Do not invent or guess any values.
- Return ONLY valid JSON, no markdown or explanation`;

/**
 * Auto-detect intelligence mode based on today's data.
 */
function detectMode(todayActivity, todayPlannedWorkout) {
  if (todayActivity) return "POST_RIDE";
  if (todayPlannedWorkout) return "PRE_RIDE_PLANNED";
  return "DAILY_COACH";
}

/**
 * POST /api/dashboard/intelligence
 * AI-powered daily intelligence briefing with auto-detected mode.
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

  const { mode: requestedMode } = req.body || {};

  try {
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch all context in parallel
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
    ] = await Promise.allSettled([
      supabaseAdmin
        .from("profiles")
        .select("full_name, sex, ftp_watts, max_hr, weight_kg, weekly_hours, date_of_birth")
        .eq("id", session.userId)
        .single(),
      supabaseAdmin
        .from("activities")
        .select("*")
        .eq("user_id", session.userId)
        .gte("start_date", today)
        .lt("start_date", today + "T23:59:59")
        .order("start_date", { ascending: false })
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
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("activities")
        .select("id, sport_type, name, start_date, duration_seconds, distance_meters, tss, normalized_power, average_power, average_hr, max_hr, intensity_factor, elevation_gain")
        .eq("user_id", session.userId)
        .order("start_date", { ascending: false })
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
    ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;

    const profile = getData(profileResult);
    const todayActivity = getData(todayActivityResult);
    const todayPlannedWorkout = getData(todayPlannedResult);
    const dailyMetrics = getData(dailyMetricsResult) || [];
    const recentActivities = getData(recentActivitiesResult) || [];

    // Compute performance models from 90-day history
    const allActivities90d = getData(allActivitiesResult) || [];
    const nutritionLogs = getData(nutritionResult) || [];
    let performanceModels = null;
    if (allActivities90d.length >= 5) {
      const dailyMetrics90d = getData(dailyMetricsResult) || [];
      const pairs = matchActivitiesToContext(allActivities90d, dailyMetrics90d, nutritionLogs, profile?.weight_kg);
      performanceModels = computeAllModels(pairs);
    }

    // Determine mode
    const mode = requestedMode || detectMode(todayActivity, todayPlannedWorkout);

    // Build context for Claude
    const firstName = profile?.full_name?.split(" ")[0] || "Athlete";
    const profileSafe = profile ? { ...profile, first_name: firstName } : { first_name: "Athlete" };
    const modelsText = performanceModels ? formatModelsForAI(performanceModels) : "";
    // Subjective check-in from today's daily metrics
    const todayMetrics = dailyMetrics.find((d) => d.date === today);
    const subjectiveCheckin = todayMetrics?.life_stress_score ? {
      lifeStress: todayMetrics.life_stress_score,
      motivation: todayMetrics.motivation_score,
      muscleSoreness: todayMetrics.muscle_soreness_score,
      mood: todayMetrics.mood_score,
    } : undefined;

    const travelEvents = getData(travelResult) || [];
    const crossTrainingLog = getData(crossTrainingResult) || [];

    const context = {
      athlete: profileSafe,
      dailyMetrics,
      recentActivities,
      performanceModels: modelsText || undefined,
      subjectiveCheckin,
      travelEvents: travelEvents.length > 0 ? travelEvents : undefined,
      crossTrainingLog: crossTrainingLog.length > 0 ? crossTrainingLog : undefined,
    };

    // Add mode-specific context
    let systemPrompt;
    if (mode === "POST_RIDE") {
      context.todayActivity = todayActivity;
      systemPrompt = POST_RIDE_PROMPT;
    } else if (mode === "PRE_RIDE_PLANNED") {
      context.plannedWorkout = todayPlannedWorkout;
      systemPrompt = PRE_RIDE_PLANNED_PROMPT;
    } else {
      systemPrompt = DAILY_COACH_PROMPT;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: JSON.stringify(context),
      }],
    });

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

    return res.status(200).json({ mode, intelligence });
  } catch (err) {
    console.error("Dashboard intelligence error:", err);
    const msg = err?.status === 401
      ? "Invalid ANTHROPIC_API_KEY"
      : err?.message || "Failed to generate intelligence";
    return res.status(500).json({ error: msg });
  }
}

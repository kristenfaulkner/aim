import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";
import {
  analyzeProfileGaps,
  selectWorkoutTemplate,
  adjustForConditions,
  countRecentIntensityDays,
  buildPrescriptionContext,
} from "../_lib/prescription.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 60 };

const PRESCRIPTION_SYSTEM_PROMPT = `You are AIM's workout prescription engine, built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

Given the athlete's current state — power profile gaps, readiness, training load, weather, and recent history — generate the single best workout for today.

Rules:
1. ALWAYS address the athlete by their first name (from athlete.first_name in the data). NEVER use the word "Athlete" as a name or greeting — use their actual first name. If first_name is missing, just use "you" naturally.
2. NEVER prescribe intensity work on red readiness days (< 45). Always recommend recovery or rest.
3. Limit high-intensity days to 2-3 per week. Check recent history.
4. If TSB < -30, lean toward recovery regardless of readiness.
5. Adjust for weather: reduce intensity targets in extreme heat (>30°C) or cold (<0°C).
6. After lower-body strength session (< 48h), avoid VO2max or sprint work.
7. If athlete has a race within 7 days, switch to taper protocol.
8. Target the highest-priority power profile gap that's appropriate for today's readiness.
9. Use their actual FTP/CP for all power targets — never use generic percentages alone.
10. Power targets MUST be absolute watts (e.g., "310-330W") not just zone labels.
11. Include specific fueling guidance scaled to workout duration and intensity.
12. The alternative workout should always be significantly easier — a true backup plan.
13. NEVER give direct medical advice. Frame supplement/nutrition guidance as "Research suggests..." or "Consider..."
14. Sleep and recovery data is from LAST NIGHT, not tonight.
15. NEVER HALLUCINATE — every number and metric about past data must come from the actual data provided. Do not fabricate data points. Recommendations, estimates, and projections derived from real data (e.g., fueling targets based on actual workout intensity) are encouraged.

Return ONLY valid JSON matching this exact structure:
{
  "workout_name": "VO2max Builder: 5x4min",
  "workout_type": "intervals",
  "rationale": "Your 5-minute power is 8% below model prediction. This session targets VO2max to close the gap.",
  "readiness_check": "green",
  "readiness_note": "Readiness 78 — you're good to go. Full intensity.",
  "duration_minutes": 75,
  "tss_estimate": 85,
  "structure": [
    { "name": "Warm-up", "duration_min": 15, "target": "Z1-Z2", "power_watts": null },
    { "name": "Main Set", "sets": 5, "work_min": 4, "rest_min": 4, "target": "108-115% CP", "power_watts": [310, 330], "hr_ceiling": 175 },
    { "name": "Cool-down", "duration_min": 10, "target": "Z1", "power_watts": null }
  ],
  "fueling": {
    "pre": "Light meal 2h before. 30-50g carbs.",
    "during": "1 bottle with 40g carbs. Sip every 15 min.",
    "post": "30g protein + 60g carbs within 30 min."
  },
  "weather_note": "74°F and sunny. Normal hydration.",
  "alternative": {
    "name": "Z2 Endurance",
    "duration_minutes": 90,
    "tss_estimate": 55,
    "reason": "If you're not feeling it, do 90 min Z2 instead. Still productive.",
    "structure": [
      { "name": "Easy ride", "duration_min": 90, "target": "Z2", "power_watts": [175, 210] }
    ]
  }
}`;

/**
 * GET /api/prescription/next-workout
 *
 * Returns AI-generated next workout prescription based on athlete's
 * power profile gaps, readiness, training load, and conditions.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const userId = session.userId;
    const today = new Date().toISOString().split("T")[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 86400000
    ).toISOString().split("T")[0];

    // Fetch all context in parallel
    const [
      profileResult,
      powerProfileResult,
      recentActivitiesResult,
      dailyMetricsResult,
      todayActivityResult,
      todayPlannedResult,
      crossTrainingResult,
      travelResult,
      racesResult,
      checkinResult,
    ] = await Promise.allSettled([
      supabaseAdmin
        .from("profiles")
        .select(
          "full_name, ftp_watts, max_hr, weight_kg, weekly_hours, sex, date_of_birth"
        )
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("power_profiles")
        .select(
          "best_5s_watts, best_30s_watts, best_1m_watts, best_5m_watts, best_20m_watts, best_60m_watts, cp_watts, w_prime_kj, pmax_watts, cp_model_r_squared, durability_score"
        )
        .eq("user_id", userId)
        .order("computed_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("activities")
        .select(
          "id, name, started_at, start_date, tss, duration_seconds, intensity_factor, activity_type"
        )
        .eq("user_id", userId)
        .gte("started_at", fourteenDaysAgo)
        .order("started_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("daily_metrics")
        .select(
          "date, ctl, atl, tsb, recovery_score, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, sleep_score, total_sleep_seconds, life_stress_score, motivation_score, muscle_soreness_score, mood_score, weather_data"
        )
        .eq("user_id", userId)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false })
        .limit(7),
      // Check if already rode today
      supabaseAdmin
        .from("activities")
        .select("id")
        .eq("user_id", userId)
        .gte("started_at", today + "T00:00:00")
        .lt("started_at", today + "T23:59:59")
        .limit(1),
      // Check if workout already planned today
      supabaseAdmin
        .from("training_calendar")
        .select("id, title")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle(),
      supabaseAdmin
        .from("cross_training_log")
        .select(
          "date, activity_type, body_region, perceived_intensity, duration_minutes, recovery_impact"
        )
        .eq("user_id", userId)
        .gte(
          "date",
          new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0]
        )
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("travel_events")
        .select(
          "detected_at, timezone_shift_hours, altitude_change_m, altitude_acclimation_day"
        )
        .eq("user_id", userId)
        .gte("detected_at", new Date(Date.now() - 14 * 86400000).toISOString())
        .order("detected_at", { ascending: false })
        .limit(3),
      supabaseAdmin
        .from("races")
        .select("name, date, distance_km, race_type")
        .eq("user_id", userId)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(1),
      supabaseAdmin
        .from("daily_metrics")
        .select(
          "life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at"
        )
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle(),
    ]);

    const getData = (r) => (r.status === "fulfilled" ? r.value.data : null);

    const profile = getData(profileResult);
    const powerProfile = getData(powerProfileResult);
    const recentActivities = getData(recentActivitiesResult) || [];
    const dailyMetrics = getData(dailyMetricsResult) || [];
    const todayActivities = getData(todayActivityResult) || [];
    const todayPlanned = getData(todayPlannedResult);
    const crossTraining = getData(crossTrainingResult) || [];
    const travelEvents = getData(travelResult) || [];
    const races = getData(racesResult) || [];
    const todayCheckin = getData(checkinResult);

    // Already rode today — no prescription needed
    if (todayActivities.length > 0) {
      return res.status(200).json({
        prescription: null,
        reason: "already_rode",
        message: "You already trained today. Check your post-ride analysis instead.",
      });
    }

    // Already have a planned workout — no AI prescription
    if (todayPlanned) {
      return res.status(200).json({
        prescription: null,
        reason: "workout_planned",
        message: `You have "${todayPlanned.title}" planned for today.`,
        plannedWorkout: todayPlanned,
      });
    }

    // Need power profile for gap analysis
    if (!powerProfile) {
      return res.status(200).json({
        prescription: null,
        reason: "insufficient_data",
        message:
          "We need more ride data to analyze your power profile. Sync a few more activities to unlock personalized prescriptions.",
      });
    }

    // Build CP model object
    const cpModel =
      powerProfile.cp_watts && powerProfile.w_prime_kj
        ? {
            cp_watts: powerProfile.cp_watts,
            w_prime_kj: powerProfile.w_prime_kj,
            pmax_watts: powerProfile.pmax_watts,
          }
        : null;

    // Analyze gaps (use FTP-based estimation if no CP model)
    let gaps = [];
    if (cpModel) {
      gaps = analyzeProfileGaps(powerProfile, cpModel);
    }

    // Get latest daily metrics for readiness
    const latestMetrics = dailyMetrics[0] || null;
    const recoveryScore = latestMetrics?.recovery_score ?? null;
    const tsb = latestMetrics?.tsb ?? null;

    // Check for upcoming races
    const nextRace = races[0] || null;
    let raceInDays = null;
    if (nextRace?.date) {
      const raceDate = new Date(nextRace.date);
      raceInDays = Math.ceil(
        (raceDate - new Date(today)) / 86400000
      );
    }

    // Check for recent lower-body strength
    const recentLowerBody = crossTraining.some(
      (ct) =>
        ct.body_region === "lower_body" &&
        ct.recovery_impact !== "none" &&
        new Date(ct.date) >= new Date(Date.now() - 48 * 3600000)
    );

    // Select workout template
    const readiness = {
      recoveryScore,
      tsb,
      raceInDays,
      recentLowerBodyStrength: recentLowerBody,
      muscleSoreness: todayCheckin?.muscle_soreness_score,
      motivation: todayCheckin?.motivation_score,
    };

    const selected = selectWorkoutTemplate(gaps, readiness, recentActivities);

    // Get weather
    const weather = latestMetrics?.weather_data || null;

    // Adjust for conditions
    const adjusted = adjustForConditions(
      selected,
      recoveryScore,
      weather ? { temp_c: weather.temp_c, humidity_pct: weather.humidity_pct } : null
    );

    // Build AI context
    const context = buildPrescriptionContext({
      profile,
      powerProfile,
      cpModel,
      gaps,
      selectedTemplate: selected,
      readiness,
      weather,
      recentActivities,
      dailyMetrics: latestMetrics,
      crossTraining,
      travelEvents,
      races,
    });

    // If readiness is red and we already have a recovery template, skip AI call
    if (selected.readinessCheck === "red" && selected.template.type === "rest") {
      return res.status(200).json({
        prescription: {
          workout_name: selected.template.name,
          workout_type: selected.template.type,
          rationale: selected.reason,
          readiness_check: "red",
          readiness_note: selected.reason,
          duration_minutes: 0,
          tss_estimate: 0,
          structure: [],
          fueling: null,
          weather_note: null,
          alternative: null,
        },
        gaps: gaps.slice(0, 3),
        readiness: {
          score: recoveryScore,
          check: "red",
          tsb,
        },
      });
    }

    // Call Claude for detailed prescription
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      system: PRESCRIPTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
    });
    trackTokenUsage(userId, "prescription", "claude-opus-4-6", response.usage);

    const raw = response.content[0].text;

    let prescription;
    try {
      prescription = JSON.parse(raw);
    } catch {
      // Try extracting JSON from markdown code blocks
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          prescription = JSON.parse(match[1].trim());
        } catch {
          /* fall through */
        }
      }
      if (!prescription) {
        const braceMatch = raw.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            prescription = JSON.parse(braceMatch[0]);
          } catch {
            /* fall through */
          }
        }
      }
      if (!prescription) {
        console.error(
          "[prescription/next-workout] parse error:",
          raw.substring(0, 300)
        );
        return res
          .status(500)
          .json({ error: "Failed to parse AI prescription response" });
      }
    }

    return res.status(200).json({
      prescription,
      gaps: gaps.slice(0, 3),
      readiness: {
        score: recoveryScore,
        check: selected.readinessCheck,
        tsb,
      },
    });
  } catch (err) {
    console.error("[prescription/next-workout]", err);
    return res.status(500).json({ error: "Failed to generate workout prescription" });
  }
}

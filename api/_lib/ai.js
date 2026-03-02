import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `You are the AI analysis engine for AIM, a performance intelligence platform for endurance athletes. You were built by Kristen Faulkner, 2x Olympic Gold Medalist in cycling.

You will receive a JSON payload containing:
- The current activity data (power, HR, cadence, zones, metrics)
- The athlete's profile (FTP, weight, goals, level)
- Their recent training history (14 days)
- Their fitness/fatigue trend (CTL/ATL/TSB over 90 days)
- Their power profile with category classifications
- Their recovery data (sleep, HRV) from the last 48 hours
- Their blood work results (if available)
- Their DEXA scan results (if available)

Generate a structured analysis with these sections:

1. **WORKOUT SUMMARY** (2-3 sentences) — What was this ride? How did it go relative to expectations?

2. **KEY INSIGHTS** (2-4 bullet points) — The most important things the athlete should know. Focus on CROSS-DOMAIN insights that connect different data sources (e.g., sleep → power, HRV → cardiac drift, blood work → endurance). These should be insights they CANNOT get from Strava or any single app alone.

3. **WHAT'S WORKING** (1-2 bullet points) — Positive trends or achievements to reinforce.

4. **WATCH OUT** (1-2 bullet points, if applicable) — Warning signs: overtraining risk, declining HRV trend, poor sleep pattern, biomarker concerns.

5. **RECOMMENDATION** (1 specific, actionable item) — Exactly what to do next. Not vague ("rest more") but specific ("Take tomorrow off, do a 90-min Z2 ride Thursday, target HRV above 55ms before your next intensity session").

Rules:
- Be specific with numbers. Say "Your NP was 287W (96% of FTP)" not "Your power was good."
- Always connect multiple data domains when possible. The whole point of AIM is cross-domain intelligence.
- Use the athlete's actual data — reference specific dates, specific rides, specific trends.
- Match the tone to the data: celebrate genuine breakthroughs, be honest about concerning trends.
- If blood work or DEXA data is available, reference it when relevant.
- Every analysis must end with ONE specific, actionable recommendation.
- Keep total response under 400 words. Dense, not verbose.`;

/**
 * Build the full athlete context payload for AI analysis.
 */
export async function buildAnalysisContext(userId, activityId) {
  // Fetch activity
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .eq("user_id", userId)
    .single();

  if (!activity) return null;

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, ftp_watts, weight_kg, height_cm, sex, date_of_birth, riding_level, weekly_hours, goals, uses_cycle_tracking")
    .eq("id", userId)
    .single();

  // Fetch recent 14 days of activities (excluding the current one)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentActivities } = await supabaseAdmin
    .from("activities")
    .select("name, activity_type, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, avg_hr_bpm, max_hr_bpm, efficiency_factor, hr_drift_pct, zone_distribution, power_curve")
    .eq("user_id", userId)
    .neq("id", activityId)
    .gte("started_at", fourteenDaysAgo)
    .order("started_at", { ascending: false })
    .limit(20);

  // Fetch 90 days of daily metrics
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: dailyMetrics } = await supabaseAdmin
    .from("daily_metrics")
    .select("date, daily_tss, ctl, atl, tsb, ramp_rate, sleep_score, total_sleep_seconds, deep_sleep_seconds, hrv_ms, resting_hr_bpm, recovery_score, readiness_score, strain_score, weight_kg, body_fat_pct, cycle_day, cycle_phase")
    .eq("user_id", userId)
    .gte("date", ninetyDaysAgo)
    .order("date", { ascending: false });

  // Fetch latest power profile
  const { data: powerProfile } = await supabaseAdmin
    .from("power_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("computed_date", { ascending: false })
    .limit(1)
    .single();

  // Fetch last 48h recovery data (most recent 2 daily_metrics)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: recoveryData } = await supabaseAdmin
    .from("daily_metrics")
    .select("date, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, recovery_score, readiness_score, strain_score, blood_oxygen_pct, skin_temperature_deviation")
    .eq("user_id", userId)
    .gte("date", twoDaysAgo)
    .order("date", { ascending: false });

  // Fetch latest blood panel (if any)
  const { data: bloodWork } = await supabaseAdmin
    .from("blood_panels")
    .select("test_date, ferritin_ng_ml, hemoglobin_g_dl, iron_mcg_dl, vitamin_d_ng_ml, vitamin_b12_pg_ml, testosterone_ng_dl, cortisol_mcg_dl, crp_mg_l, hba1c_pct, tsh_miu_l, free_t3_pg_ml, free_t4_ng_dl, magnesium_mg_dl, zinc_mcg_dl")
    .eq("user_id", userId)
    .order("test_date", { ascending: false })
    .limit(1)
    .single();

  // Fetch latest DEXA scan (if any)
  const { data: dexa } = await supabaseAdmin
    .from("dexa_scans")
    .select("scan_date, total_body_fat_pct, lean_mass_kg, fat_mass_kg, bone_mineral_density, visceral_fat_area_cm2, regional_data")
    .eq("user_id", userId)
    .order("scan_date", { ascending: false })
    .limit(1)
    .single();

  // Strip source_data from the activity to keep the payload manageable
  const { source_data, ...activityClean } = activity;

  return {
    activity: activityClean,
    profile: profile || {},
    recentActivities: recentActivities || [],
    dailyMetrics: dailyMetrics || [],
    powerProfile: powerProfile || null,
    recoveryData: recoveryData || [],
    bloodWork: bloodWork || null,
    dexa: dexa || null,
  };
}

/**
 * Generate AI analysis for an activity using Claude.
 */
export async function generateAnalysis(context) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });

  return response.content[0].text;
}

/**
 * Run the full analysis pipeline: build context → call Claude → store result.
 */
export async function analyzeActivity(userId, activityId) {
  const context = await buildAnalysisContext(userId, activityId);
  if (!context) throw new Error("Activity not found");

  const analysis = await generateAnalysis(context);

  // Store the analysis
  await supabaseAdmin
    .from("activities")
    .update({
      ai_analysis: analysis,
      ai_analysis_generated_at: new Date().toISOString(),
    })
    .eq("id", activityId)
    .eq("user_id", userId);

  return analysis;
}

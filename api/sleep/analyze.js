import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import {
  matchSleepToActivities,
  computeCorrelations,
  computeQuartileAnalysis,
  computeAdjustedCorrelations,
  detectSleepPatterns,
  findBestAndWorstRides,
  computeDoseResponse,
} from "../_lib/sleep-correlations.js";

export const config = {
  api: { bodyParser: true },
  maxDuration: 120,
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SLEEP_PERFORMANCE_PROMPT = `You are the sleep-performance analysis engine for AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

You will receive PRE-COMPUTED statistical summaries showing how this athlete's sleep correlates with their cycling performance. Your job is to INTERPRET these statistics into actionable, athlete-friendly insights.

## OUTPUT FORMAT
Return valid JSON:
{
  "summary": "[First name], [2-3 sentence overview of their sleep-performance relationship with key numbers]",
  "insights": [
    {
      "type": "insight" | "positive" | "warning" | "action",
      "icon": "emoji",
      "category": "sleep_duration" | "sleep_quality" | "sleep_architecture" | "recovery" | "consistency" | "environment" | "optimization",
      "title": "Short title with key number",
      "body": "Explanation with specific numbers from their data. End with actionable takeaway.",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "dataGaps": ["suggestions for additional data or integrations"]
}

## INSIGHT CATEGORIES TO ANALYZE

### Sleep Duration → Performance
- Total sleep vs next-day EF, NP, HR drift (use correlations and quartile data)
- Rolling 7-night averages vs performance (cumulative sleep debt effect)
- Dose-response: how much extra sleep translates to how much EF/NP gain
- Diminishing returns point (their personal optimal sleep hours)

### Sleep Architecture → Performance
- Deep sleep % vs NP and EF
- REM sleep % vs pacing quality (variability index)
- Best rides: what was their deep/REM like the night before?

### Sleep Quality → Performance
- Sleep score vs next-day performance
- Sleep efficiency vs EF
- Sleep latency and toss & turns as stress/overtraining signals

### HRV & Recovery
- Overnight HRV vs next-day EF and HR drift (their personal thresholds)
- HRV recovery trajectory after hard training days (how many days to bounce back)
- RHR elevation as early warning for performance decline

### Consistency & Timing
- Bedtime consistency (std dev) vs performance stability
- Weekday vs weekend sleep patterns and Monday performance
- Optimal sleep window (what bedtime produces their best rides)

### Environment
- Bed temperature vs deep sleep % (Eight Sleep optimization)
- Seasonal or temperature patterns

### Optimization Recommendations
- Specific bedtime target based on their data
- Sleep duration target from dose-response curve
- Temperature recommendation from their deep sleep data
- Pre-competition sleep protocol based on best-ride sleep patterns

## RULES
1. Use ACTUAL pre-computed statistics. Quote r-values, quartile splits, specific numbers from the data.
2. Explain what the correlation MEANS for training — don't just say "r=0.42".
3. Compare adjusted vs unadjusted correlations. If TSB explains the relationship, say so honestly.
4. Confidence: high if |r| > 0.3 with n > 20, medium if |r| > 0.2 or n < 20, low if |r| < 0.2.
5. If a confounder explains the correlation, SAY SO. Honesty > impressive-sounding insights.
6. Include the dose-response translation: "every additional hour of sleep ≈ X more watts" or "≈ Y% better EF".
7. Use best/worst ride comparison for maximum impact.
8. NEVER give medical advice. Use "research suggests...", "consider discussing with your doctor..."
9. Be specific: "Your EF averaged 1.82 on nights with >7.5h sleep vs 1.64 on <6h nights" — not generic advice.
10. Generate 6-10 insights total.
11. Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

/**
 * POST /api/sleep/analyze
 * Compute sleep-performance correlations and generate AI insights.
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

  try {
    // Parallel data fetch
    const [profileResult, activitiesResult, metricsResult, powerResult, integrationsResult] =
      await Promise.allSettled([
        supabaseAdmin.from("profiles")
          .select("full_name, ftp_watts, weight_kg, sex, max_hr_bpm")
          .eq("id", session.userId).single(),
        supabaseAdmin.from("activities")
          .select("name, started_at, activity_type, duration_seconds, normalized_power_watts, avg_power_watts, efficiency_factor, hr_drift_pct, intensity_factor, tss, avg_hr_bpm, max_hr_bpm, variability_index, decoupling_pct, temperature_celsius, elevation_gain_meters")
          .eq("user_id", session.userId)
          .order("started_at", { ascending: false })
          .limit(365),
        supabaseAdmin.from("daily_metrics")
          .select("date, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, sleep_latency_seconds, sleep_efficiency_pct, sleep_onset_time, wake_time, bed_temperature_celsius, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, recovery_score, daily_tss, ctl, atl, tsb, ramp_rate")
          .eq("user_id", session.userId)
          .order("date", { ascending: false })
          .limit(365),
        supabaseAdmin.from("power_profiles")
          .select("duration_seconds, watts, watts_per_kg")
          .eq("user_id", session.userId)
          .order("recorded_at", { ascending: false })
          .limit(10),
        supabaseAdmin.from("integrations")
          .select("provider, is_active")
          .eq("user_id", session.userId)
          .eq("is_active", true),
      ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;
    const profile = getData(profileResult) || {};
    const activities = getData(activitiesResult) || [];
    const dailyMetrics = getData(metricsResult) || [];
    const integrations = (getData(integrationsResult) || []).map(i => i.provider);

    // Match sleep to activities
    const matched = matchSleepToActivities(dailyMetrics, activities);

    if (matched.length < 7) {
      return res.status(200).json({
        analysis: {
          summary: `${profile.full_name?.split(" ")[0] || "Athlete"}, we need at least 7 rides with matching sleep data to analyze your sleep-performance patterns. You currently have ${matched.length} matched ride${matched.length !== 1 ? "s" : ""}.`,
          insights: [],
          dataGaps: [
            matched.length === 0 ? "Connect a sleep tracker (Eight Sleep, Oura, or Whoop) to start tracking sleep data" : "Keep training and tracking sleep — we need a few more matched days to find patterns",
            !integrations.includes("eightsleep") && !integrations.includes("oura") && !integrations.includes("whoop")
              ? "Connect Eight Sleep, Oura, or Whoop for automatic sleep tracking"
              : null,
          ].filter(Boolean),
          insufficientData: true,
        },
      });
    }

    // Run all correlation computations
    const correlations = computeCorrelations(matched);
    const quartiles = computeQuartileAnalysis(matched);
    const adjusted = computeAdjustedCorrelations(matched);
    const patterns = detectSleepPatterns(dailyMetrics);
    const bestWorst = findBestAndWorstRides(matched);
    const doseResponse = computeDoseResponse(matched);

    // Recent week for context
    const recentActivities = activities.slice(0, 7).map(a => ({
      date: a.started_at?.split("T")[0],
      name: a.name,
      ef: a.efficiency_factor,
      np: a.normalized_power_watts,
      tss: a.tss,
    }));
    const recentSleep = dailyMetrics.slice(0, 7).map(dm => ({
      date: dm.date,
      hours: dm.total_sleep_seconds ? Math.round(dm.total_sleep_seconds / 360) / 10 : null,
      score: dm.sleep_score,
      hrv: dm.hrv_overnight_avg_ms || dm.hrv_ms,
    }));

    // Build context for Claude
    const context = {
      athlete: {
        name: profile.full_name,
        ftp: profile.ftp_watts,
        weight: profile.weight_kg,
        sex: profile.sex,
      },
      dataRange: {
        totalActivities: activities.length,
        matchedPairs: matched.length,
        sleepNights: dailyMetrics.filter(d => d.total_sleep_seconds != null).length,
      },
      correlations,
      quartiles,
      adjustedCorrelations: adjusted,
      sleepPatterns: patterns,
      bestAndWorstRides: bestWorst,
      doseResponse,
      recentWeek: { activities: recentActivities, sleep: recentSleep },
      connectedSources: integrations,
    };

    // Send to Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SLEEP_PERFORMANCE_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });

    const text = response.content[0].text;

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        analysis = JSON.parse(match[1].trim());
      } else {
        console.error("Sleep analysis parse error:", text.substring(0, 200));
        return res.status(500).json({ error: "Failed to parse AI analysis" });
      }
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    console.error("Sleep analysis error:", err);
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
}

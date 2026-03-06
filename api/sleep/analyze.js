import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";
import { getAthleteAnalytics } from "../_lib/athlete-analytics.js";

export const config = {
  api: { bodyParser: true },
  maxDuration: 120,
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SLEEP_PERFORMANCE_PROMPT = `You are the sleep-performance analysis engine for AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

You will receive PRE-COMPUTED statistical summaries showing how this athlete's sleep correlates with their performance. Your job is to INTERPRET these statistics into actionable, athlete-friendly insights.

## KEY PRINCIPLE: CARDIAC EFFICIENCY OVER RAW OUTPUT

Power/pace are often PRESCRIBED by a coach — athletes do the assigned workout regardless of sleep. This makes raw power/pace correlations misleading. Instead, focus on how the BODY RESPONDED to that prescribed load:

- **Efficiency Factor (EF)** = how much power/pace per heartbeat. Higher EF = body handled the load better.
- **HR Drift %** = cardiac drift over the session. Lower drift = better cardiovascular resilience.
- **Variability Index (VI)** = pacing consistency. Sleep affects focus and execution.

These cardiac response metrics are the TRUE signal of how sleep affects performance. NP/pace correlations are secondary — mention them briefly but don't lead with them.

For CYCLISTS: prioritize EF and HR drift correlations.
For RUNNERS: prioritize EF (pace-to-HR ratio) and HR drift. If pace data is available, note pace efficiency rather than raw pace.

## OUTPUT FORMAT
Return valid JSON with no markdown wrapping:
{
  "summary": "[First name], [2-3 sentence overview focusing on cardiac efficiency findings]",
  "insights": [
    {
      "type": "insight",
      "icon": "emoji",
      "category": "recovery",
      "title": "Short title with key number",
      "body": "Explanation with specific numbers. End with actionable takeaway.",
      "confidence": "high"
    }
  ],
  "dataGaps": ["suggestions for additional data or integrations"]
}

Field values — type: "insight", "positive", "warning", or "action". category: "sleep_duration", "sleep_quality", "sleep_architecture", "recovery", "consistency", "environment", or "optimization". confidence: "high", "medium", or "low".

## INSIGHT PRIORITY ORDER (generate in this order)

### Priority 1: Cardiac Efficiency (ALWAYS include 2-3 of these)
- Sleep duration/quality → EF (the strongest signal of how sleep affects performance)
- Sleep duration/quality → HR drift (cardiac fatigue under load)
- HRV → EF and HR drift (overnight recovery predicting next-day cardiac response)
- Rolling 7-night sleep average → EF (cumulative sleep debt is often stronger than single-night)
- Quartile comparison: EF and HR drift on best-sleep vs worst-sleep nights

### Priority 2: Recovery & Readiness (1-2 insights)
- HRV recovery trajectory after high-TSS days
- RHR elevation patterns as early warning
- Sleep debt accumulation and its dose-response effect on EF
- Best vs worst rides: what did sleep look like the night before?

### Priority 3: Sleep Architecture & Quality (1-2 insights)
- Deep sleep → EF (muscular recovery → cardiac efficiency)
- Sleep score and efficiency → next-day EF
- Sleep latency and toss/turns as overtraining signals

### Priority 4: Consistency & Timing (1 insight)
- Bedtime consistency vs performance stability
- Weekday vs weekend patterns
- Optimal bedtime window from their data

### Priority 5: Environment (0-1 insight, only if data exists)
- Bed temperature → deep sleep % (Eight Sleep optimization)

### Priority 6: Raw Power/Pace (0-1 insight, brief)
- NP or pace correlations with sleep — mention only if genuinely significant (|r| > 0.3)
- Frame as secondary: "While your power is often prescribed, on self-selected effort days..."

### Optimization Recommendations (always include 1 action-type insight)
- Specific, data-backed recommendation (bedtime target, sleep duration target, HRV threshold for intensity decisions)
- Pre-competition sleep protocol based on best-ride sleep patterns

## RULES
1. Use ACTUAL pre-computed statistics. Quote r-values, quartile splits, specific numbers.
2. Explain what the correlation MEANS for training — don't just say "r=0.42".
3. Compare adjusted vs unadjusted correlations. If TSB explains the relationship, say so honestly.
4. Confidence: high if |r| > 0.3 with n > 20, medium if |r| > 0.2 or n < 20, low if |r| < 0.2.
5. If a confounder explains the correlation, SAY SO. Honesty > impressive-sounding insights.
6. Dose-response: translate to practical terms ("every additional hour of sleep ≈ Y% better EF").
7. Use best/worst ride comparison — compare sleep patterns before top-5 vs bottom-5 EF rides.
8. NEVER give medical advice. Use "research suggests...", "consider discussing with your doctor..."
9. Be specific with numbers: "Your EF averaged 1.82 on nights with >7.5h sleep vs 1.64 on <6h nights."
10. Generate 6-10 insights total, following the priority order above.
11. **ORDER INSIGHTS BY WOW FACTOR — the insight that would make the athlete say "I had no idea" MUST come first.** Ranking framework: (1) SURPRISE — a counterintuitive or hidden pattern (e.g., bedtime matters more than duration), (2) ACTIONABILITY — something they can change tonight, (3) ANOMALY — a red flag or milestone, (4) CROSS-DOMAIN DISCOVERY — a connection only AIM can see, (5) STRONG SIGNAL — high correlation or large effect size. A moderate correlation revealing something unexpected beats a strong correlation confirming the obvious. Lead with insight, not just statistics.
12. Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON.`;

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
    // Fetch cached analytics + lightweight profile/integrations in parallel
    const [analyticsResult, profileResult, integrationsResult, recentActivitiesResult, recentMetricsResult] =
      await Promise.allSettled([
        getAthleteAnalytics(session.userId),
        supabaseAdmin.from("profiles")
          .select("full_name, ftp_watts, weight_kg, sex, max_hr_bpm")
          .eq("id", session.userId).single(),
        supabaseAdmin.from("integrations")
          .select("provider, is_active")
          .eq("user_id", session.userId)
          .eq("is_active", true),
        supabaseAdmin.from("activities")
          .select("name, started_at, efficiency_factor, normalized_power_watts, tss")
          .eq("user_id", session.userId)
          .order("started_at", { ascending: false })
          .limit(7),
        supabaseAdmin.from("daily_metrics")
          .select("date, total_sleep_seconds, sleep_score, hrv_ms, hrv_overnight_avg_ms")
          .eq("user_id", session.userId)
          .order("date", { ascending: false })
          .limit(7),
      ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;
    const athleteAnalytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : {};
    const profile = getData(profileResult) || {};
    const integrations = (getData(integrationsResult) || []).map(i => i.provider);
    const sleepPerf = athleteAnalytics.sleepPerformance;

    if (!sleepPerf) {
      return res.status(200).json({
        analysis: {
          summary: `${profile.full_name?.split(" ")[0] || "Hey"}, we need at least 7 rides with matching sleep data to analyze your sleep-performance patterns.`,
          insights: [],
          dataGaps: [
            "Keep training and tracking sleep — we need a few more matched days to find patterns",
            !integrations.includes("eightsleep") && !integrations.includes("oura") && !integrations.includes("whoop")
              ? "Connect Eight Sleep, Oura, or Whoop for automatic sleep tracking"
              : null,
          ].filter(Boolean),
          insufficientData: true,
        },
      });
    }

    // Recent week for context (lightweight queries — not the heavy 365-day fetches)
    const recentActivities = (getData(recentActivitiesResult) || []).map(a => ({
      date: a.started_at?.split("T")[0],
      name: a.name,
      ef: a.efficiency_factor,
      np: a.normalized_power_watts,
      tss: a.tss,
    }));
    const recentSleep = (getData(recentMetricsResult) || []).map(dm => ({
      date: dm.date,
      hours: dm.total_sleep_seconds ? Math.round(dm.total_sleep_seconds / 360) / 10 : null,
      score: dm.sleep_score,
      hrv: dm.hrv_overnight_avg_ms || dm.hrv_ms,
    }));

    // Build context for Claude using cached sleep-performance analytics
    const context = {
      athlete: {
        name: profile.full_name,
        ftp: profile.ftp_watts,
        weight: profile.weight_kg,
        sex: profile.sex,
      },
      dataRange: {
        matchedPairs: sleepPerf.matchedPairs,
        activityCount: athleteAnalytics.activityCount,
        metricsCount: athleteAnalytics.metricsCount,
      },
      correlations: sleepPerf.correlations,
      quartiles: sleepPerf.quartiles,
      adjustedCorrelations: sleepPerf.adjustedCorrelations,
      sleepPatterns: sleepPerf.sleepPatterns,
      bestAndWorstRides: sleepPerf.bestAndWorstRides,
      doseResponse: sleepPerf.doseResponse,
      recentWeek: { activities: recentActivities, sleep: recentSleep },
      connectedSources: integrations,
    };

    // Send to Claude
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: SLEEP_PERFORMANCE_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });
    trackTokenUsage(session.userId, "sleep_analysis", "claude-opus-4-6", response.usage);

    const text = response.content[0].text;

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          analysis = JSON.parse(match[1].trim());
        } catch {
          // Code fence content also wasn't valid JSON
          console.error("Sleep analysis parse error (code fence):", match[1].substring(0, 200));
        }
      }
      // Last resort: try to extract a JSON object from anywhere in the text
      if (!analysis) {
        const braceMatch = text.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            analysis = JSON.parse(braceMatch[0]);
          } catch {
            console.error("Sleep analysis parse error (brace extract):", text.substring(0, 300));
          }
        }
      }
      // Final fallback: wrap raw text as a summary, stripping JSON/markdown artifacts
      if (!analysis) {
        let cleanText = text
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .replace(/^\s*\{\s*"summary"\s*:\s*"?/i, "")
          .replace(/"\s*,?\s*"insights"\s*:[\s\S]*/i, "")
          .replace(/"\s*$/g, "")
          .trim();
        analysis = {
          summary: cleanText.substring(0, 500) || "Sleep analysis is temporarily unavailable. Please try again.",
          insights: [],
          dataGaps: [],
        };
      }
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    console.error("Sleep analysis error:", err);
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
}

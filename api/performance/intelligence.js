import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";
import { getAthleteAnalytics } from "../_lib/athlete-analytics.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 120 };

const SYSTEM_PROMPT = `You are the AI performance analyst inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

You will receive the athlete's full data context: power profile, personal performance models, sleep correlations, blood work, body composition, training history, race calendar, and working goals.

Your job: synthesize this data into a comprehensive performance intelligence report. This is NOT a daily briefing — it's the long-term view. Think like a coach doing a quarterly review.

## CRITICAL RULE — EVERY INSIGHT MUST BE ACTIONABLE

Every insight takeaway MUST contain both the FINDING and a SPECIFIC ACTION. The finding tells the athlete what AIM discovered. The action tells them what to do about it. Both are required.

BAD takeaways — finding only, no action:
- "Your body absorbs single short nights but streaks hurt."
- "The gain is linear up to about 8 hours."

GOOD takeaways — finding + action together:
- "You're at three consecutive short nights — the threshold where your NP drops 8-12%. Protect tonight: lights-out by 9:30 PM, Eight Sleep at -3°C."
- "Each hour of sleep above 6.5h is worth +4.2% EF. Target 7h24m — set a sleep alarm 8 hours before your morning wake time."

The pattern: WHAT AIM found + WHAT to do about it + WHAT outcome to expect.

## OUTPUT FORMAT

Return valid JSON:
{
  "narrative": "2-3 paragraphs synthesizing the athlete's overall performance picture. Reference specific numbers. Connect patterns across domains. Identify the 2-3 biggest levers for improvement right now. Address any working goals. Written in second person, warm but direct.",
  "modelCount": 5,
  "activityCount": 95,
  "dataMonths": 8,
  "categories": [
    {
      "category": "Sleep & Recovery",
      "icon": "emoji",
      "sampleNote": "93 activities with sleep data",
      "confidence": "high",
      "impactRank": 1,
      "insights": [
        {
          "title": "Short title with key number",
          "takeaway": "1-2 sentences: the finding PLUS a specific action.",
          "body": "Full explanation with specific numbers, comparisons, and evidence.",
          "sources": ["Oura", "Eight Sleep", "Strava"]
        }
      ],
      "modelData": {
        "type": "sleep",
        "stats": [
          { "label": "Per-Hour Gain", "value": "+4.2", "unit": "% EF", "sub": "Above 6.5h baseline", "color": "green" }
        ],
        "bins": null,
        "sparklines": null,
        "zones": null,
        "powerBests": null,
        "cpModel": null,
        "custom": null
      }
    }
  ]
}

## CATEGORY SELECTION RULES

Include a category ONLY if the athlete has sufficient data for that category AND the category has at least one insight worth surfacing.

Minimum data thresholds:
- Sleep & Recovery: 7+ sleep-matched activities
- Power & Fitness: 10+ activities with power data
- HRV & Readiness: 10+ activities with HRV data
- Heat & Environment: 10+ activities with weather data
- Nutrition, Fueling & Hydration: 8+ activities with nutrition data OR 5+ Withings hydration readings matched to activities
- Durability & Fatigue: 10+ activities >1 hour
- Body Composition & Weight: 5+ weight measurements + power data
- Menstrual Cycle Patterns: 2+ complete cycles detected. OPT-IN ONLY — never show if athlete hasn't enabled cycle tracking. Use "Research suggests..." for all hormone-related recommendations.
- Training Load & Progression: 30+ days of training data with CTL/ATL/TSB computed
- Blood Work & Biomarkers: 1+ blood panel uploaded. Compare to athlete-optimal ranges (not lab "normal" ranges). If panel is >6 months old, flag it. NEVER give medical advice — use "Consider discussing with your doctor..."
- Interval Execution Trends: 10+ activities with detected intervals across 4+ weeks
- Subjective-Objective Alignment: 20+ daily check-ins matched to activities
- W' Balance & Anaerobic Reserve: CP model established + 5+ activities with W' data
- Segment Performance: 3+ repeated segments

## MODEL DATA RULES

For each category, include a "modelData" object with the raw data the frontend needs to render visualizations. The structure varies by category type:

- **stats**: Array of { label, value, unit, sub, color } for StatCard components. Color must be one of: "green", "red", "yellow", "orange", "blue", "purple", "accent", or null for default.
- **bins**: Object of { "label": { avgEF, avgDrift, count } } for BinTable components
- **zones**: Array of { label, range, ef, drift, color, count } for zone cards (HRV thresholds)
- **sparklines**: Object of { "label": { data: number[], color, trend } } for trend charts
- **powerBests**: Array of { duration, watts, wkg, trend } for power profile
- **cpModel**: { cp, wprime, pmax, r2 }
- **custom**: Any category-specific data structures

Include model data ONLY for categories where AIM has computed models. For categories based purely on AI analysis, modelData can be null.

## RANKING RULES

Rank categories by CURRENT IMPACT — which patterns are most affecting the athlete's performance RIGHT NOW:
1. Patterns causing active performance problems (sleep debt, overtraining, plateau)
2. Patterns with the highest-leverage improvement opportunity
3. Strong models with actionable recommendations
4. Stable positive trends worth reinforcing
5. Informational patterns with lower immediate urgency

Within each category, rank insights by importance. Lead with the most impactful finding.

## INSIGHT QUALITY RULES

- Every insight MUST reference specific numbers from the athlete's data. Never generic.
- Every takeaway MUST contain both a FINDING and an ACTION.
- Cross-domain insights (connecting 2+ data sources) are MORE VALUABLE than single-source insights.
- Reference personal model predictions when available.
- For longitudinal trends, always give direction + magnitude + timeframe.
- Limit to 1-4 insights per category. Quality over quantity.
- NEVER HALLUCINATE. Every number must come from the data provided.

## NARRATIVE RULES

The narrative should:
- Start with the athlete's first name
- Synthesize across ALL available categories
- Identify the 2-3 biggest levers for improvement
- Reference working goals if they exist
- Connect cause and effect across domains
- End with a forward-looking statement
- Be warm, specific, and coaching-oriented
- 2-3 paragraphs, not more

## WHAT NOT TO INCLUDE

- No medical advice. Use "Research suggests..." for health topics.
- No data the athlete hasn't connected
- No categories where the athlete has no relevant data
- No working goals progress bars or goal tracking UI — the AI narrative can REFERENCE goals but should not display goal cards
- ALWAYS address the athlete by their first name. NEVER use the word "Athlete" as a name or greeting.
- Always second person ("your power", "your sleep")
- The "temperatureUnit" field indicates the athlete's preferred temperature display unit ("fahrenheit" or "celsius"). ALWAYS display all temperatures in the athlete's preferred unit.
- Return ONLY valid JSON, no markdown or explanation.`;

/**
 * POST /api/performance/intelligence
 * AI-powered longitudinal performance analysis.
 * Returns structured categories with insights + model data for the Performance page.
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
    // ── Step 1: Fetch all context in parallel ──
    const [
      profileResult,
      analyticsResult,
      powerProfileResult,
      bloodPanelsResult,
      integrationsResult,
      goalsResult,
      racesResult,
      activityCountResult,
      checkinCountResult,
      settingsResult,
    ] = await Promise.allSettled([
      supabaseAdmin
        .from("profiles")
        .select("full_name, sex, ftp_watts, max_hr_bpm, weight_kg, weekly_hours, date_of_birth, timezone, menstrual_cycle_tracking")
        .eq("id", session.userId)
        .single(),
      getAthleteAnalytics(session.userId),
      supabaseAdmin
        .from("power_profiles")
        .select("power_bests, cp_watts, w_prime_joules, pmax_watts, cp_r_squared, durability_score, zones_history, computed_date")
        .eq("user_id", session.userId)
        .order("computed_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("blood_panels")
        .select("test_date, ferritin_ng_ml, hemoglobin_g_dl, vitamin_d_ng_ml, testosterone_ng_dl, cortisol_mcg_dl, crp_mg_l, tsh_miu_l, hba1c_pct, uploaded_at")
        .eq("user_id", session.userId)
        .order("uploaded_at", { ascending: false })
        .limit(3),
      supabaseAdmin
        .from("integrations")
        .select("provider")
        .eq("user_id", session.userId)
        .eq("is_active", true),
      supabaseAdmin
        .from("working_goals")
        .select("name, current_value, target_value, unit, trend, active")
        .eq("user_id", session.userId)
        .eq("active", true),
      supabaseAdmin
        .from("races")
        .select("name, date, distance_km, race_type, priority")
        .eq("user_id", session.userId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(5),
      supabaseAdmin
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.userId),
      supabaseAdmin
        .from("daily_metrics")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.userId)
        .not("checkin_completed_at", "is", null),
      supabaseAdmin
        .from("user_settings")
        .select("units, temp_unit")
        .eq("user_id", session.userId)
        .single(),
    ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;
    const getCount = (r) => r.status === "fulfilled" ? (r.value.count || 0) : 0;

    const profile = getData(profileResult);
    const athleteAnalytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : {};
    const powerProfile = getData(powerProfileResult);
    const bloodPanels = getData(bloodPanelsResult) || [];
    const integrations = getData(integrationsResult) || [];
    const workingGoals = getData(goalsResult) || [];
    const races = getData(racesResult) || [];
    const totalActivities = getCount(activityCountResult);
    const checkinCount = getCount(checkinCountResult);
    const userSettings = getData(settingsResult);
    const tempUnit = userSettings?.temp_unit || (userSettings?.units === "metric" ? "celsius" : "fahrenheit");

    // ── Step 2: Check cache ──
    const cacheFingerprint = `perf|${totalActivities}|${profile?.ftp_watts || 0}|${profile?.weight_kg || 0}|${bloodPanels.length}`;

    try {
      const { data: cached } = await supabaseAdmin
        .from("intelligence_cache")
        .select("intelligence, created_at")
        .eq("user_id", session.userId)
        .eq("cache_key", cacheFingerprint)
        .single();

      if (cached) {
        return res.status(200).json({ ...cached.intelligence, cached: true });
      }
    } catch {
      // No cache hit
    }

    // Stale fallback: any performance cache < 24h old
    try {
      const { data: staleCache } = await supabaseAdmin
        .from("intelligence_cache")
        .select("intelligence, created_at")
        .eq("user_id", session.userId)
        .like("cache_key", "perf|%")
        .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (staleCache) {
        return res.status(200).json({ ...staleCache.intelligence, cached: true, stale: true });
      }
    } catch {
      // No stale cache
    }

    // ── Step 3: Build context for Claude ──
    const firstName = profile?.full_name?.split(" ")[0] || null;

    // Compute data availability
    const connectedProviders = integrations.map(i => i.provider);
    const modelsText = athleteAnalytics.performanceModelsText || "";
    const performanceModels = athleteAnalytics.performanceModels || null;
    const historicalPatterns = athleteAnalytics.historicalPatterns || null;
    const sleepPerformance = athleteAnalytics.sleepPerformance || null;
    const trainingLoad = athleteAnalytics.trainingLoad || null;

    // Earliest activity date for dataMonths calculation
    let dataMonths = 0;
    try {
      const { data: earliest } = await supabaseAdmin
        .from("activities")
        .select("started_at")
        .eq("user_id", session.userId)
        .order("started_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (earliest?.started_at) {
        dataMonths = Math.round((Date.now() - new Date(earliest.started_at).getTime()) / (30 * 86400000));
      }
    } catch { /* ignore */ }

    // Count active models
    let modelCount = 0;
    if (performanceModels) {
      if (performanceModels.heat) modelCount++;
      if (performanceModels.sleepExecution) modelCount++;
      if (performanceModels.hrvReadiness) modelCount++;
      if (performanceModels.fueling) modelCount++;
      if (performanceModels.durability) modelCount++;
    }

    // Empty state check
    if (totalActivities < 10) {
      return res.status(200).json({
        narrative: null,
        modelCount: 0,
        activityCount: totalActivities,
        dataMonths,
        categories: [],
        empty: true,
      });
    }

    const context = {
      athlete: {
        first_name: firstName,
        sex: profile?.sex,
        ftp_watts: profile?.ftp_watts,
        max_hr_bpm: profile?.max_hr_bpm,
        weight_kg: profile?.weight_kg,
        weekly_hours: profile?.weekly_hours,
        date_of_birth: profile?.date_of_birth,
        menstrual_cycle_tracking: profile?.menstrual_cycle_tracking || false,
      },
      temperatureUnit: tempUnit,
      connectedSources: connectedProviders,
      totalActivities,
      dataMonths,
      modelCount,
      checkinCount,
      performanceModels: modelsText || undefined,
      performanceModelsRaw: performanceModels ? {
        heat: performanceModels.heat ? {
          bins: performanceModels.heat.bins,
          breakpointTemp: performanceModels.heat.breakpointTemp,
          humidityEffect: performanceModels.heat.humidityEffect,
          regression: performanceModels.heat.regression,
          confidence: performanceModels.heat.confidence,
          sampleSize: performanceModels.heat.sampleSize,
        } : null,
        sleepExecution: performanceModels.sleepExecution ? {
          quartileAnalysis: performanceModels.sleepExecution.quartileAnalysis,
          correlations: performanceModels.sleepExecution.correlations,
          confidence: performanceModels.sleepExecution.confidence,
          sampleSize: performanceModels.sleepExecution.sampleSize,
        } : null,
        hrvReadiness: performanceModels.hrvReadiness ? {
          thresholds: performanceModels.hrvReadiness.thresholds,
          efDeltaPct: performanceModels.hrvReadiness.efDeltaPct,
          confidence: performanceModels.hrvReadiness.confidence,
          sampleSize: performanceModels.hrvReadiness.sampleSize,
        } : null,
        fueling: performanceModels.fueling ? {
          bins: performanceModels.fueling.bins,
          correlations: performanceModels.fueling.correlations,
          durationInteraction: performanceModels.fueling.durationInteraction,
          confidence: performanceModels.fueling.confidence,
          sampleSize: performanceModels.fueling.sampleSize,
        } : null,
        durability: performanceModels.durability ? {
          bins: performanceModels.durability.bins,
          threshold: performanceModels.durability.threshold,
          correlation: performanceModels.durability.correlation,
          confidence: performanceModels.durability.confidence,
          sampleSize: performanceModels.durability.sampleSize,
        } : null,
        metadata: performanceModels.metadata,
      } : undefined,
      historicalPatterns: historicalPatterns || undefined,
      sleepPerformance: sleepPerformance ? {
        matchedPairs: sleepPerformance.matchedPairs,
        correlations: sleepPerformance.correlations,
        quartiles: sleepPerformance.quartiles,
        doseResponse: sleepPerformance.doseResponse,
        sleepPatterns: sleepPerformance.sleepPatterns,
      } : undefined,
      trainingLoad: trainingLoad || undefined,
      powerProfile: powerProfile ? {
        power_bests: powerProfile.power_bests,
        cp_watts: powerProfile.cp_watts,
        w_prime_joules: powerProfile.w_prime_joules,
        pmax_watts: powerProfile.pmax_watts,
        cp_r_squared: powerProfile.cp_r_squared,
        durability_score: powerProfile.durability_score,
        computed_date: powerProfile.computed_date,
      } : undefined,
      bloodPanels: bloodPanels.length > 0 ? bloodPanels.map(p => ({
        ferritin: p.ferritin_ng_ml,
        hemoglobin: p.hemoglobin_g_dl,
        vitamin_d: p.vitamin_d_ng_ml,
        testosterone: p.testosterone_ng_dl,
        cortisol: p.cortisol_mcg_dl,
        crp: p.crp_mg_l,
        tsh: p.tsh_miu_l,
        hba1c: p.hba1c_pct,
        test_date: p.test_date,
        uploaded_at: p.uploaded_at,
      })) : undefined,
      workingGoals: workingGoals.length > 0 ? workingGoals : undefined,
      races: races.length > 0 ? races : undefined,
    };

    // ── Step 4: Call Claude ──
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: JSON.stringify(context),
      }],
    });
    trackTokenUsage(session.userId, "performance_intelligence", "claude-opus-4-6", response.usage);

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
        console.error("Performance intelligence parse failure. Raw:", raw.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI response. Please retry." });
      }
    }

    // Ensure required fields
    const result = {
      narrative: intelligence.narrative || null,
      modelCount: intelligence.modelCount ?? modelCount,
      activityCount: intelligence.activityCount ?? totalActivities,
      dataMonths: intelligence.dataMonths ?? dataMonths,
      categories: intelligence.categories || [],
    };

    // ── Step 5: Cache result ──
    supabaseAdmin
      .from("intelligence_cache")
      .upsert({
        user_id: session.userId,
        cache_key: cacheFingerprint,
        mode: "PERFORMANCE",
        intelligence: result,
        created_at: new Date().toISOString(),
      })
      .then(() => {})
      .catch(() => {});

    return res.status(200).json(result);
  } catch (err) {
    console.error("Performance intelligence error:", err);
    const msg = err?.status === 401
      ? "Invalid ANTHROPIC_API_KEY"
      : err?.message || "Failed to generate performance intelligence";
    return res.status(500).json({ error: msg });
  }
}

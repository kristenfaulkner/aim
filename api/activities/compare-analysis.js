import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COMPARISON_SYSTEM_PROMPT = `You are comparing two similar cycling/running sessions for the same athlete on AIM, a performance intelligence platform.

Your job: explain WHY performance differed using cross-domain data. The athlete wants to understand what factors drove the difference — not just see the numbers.

## ANALYSIS APPROACH
1. Look at all available cross-domain context for both sessions
2. Identify the most significant differences in conditions (sleep, HRV, recovery, weather, stress, nutrition, training load, cross-training, travel)
3. For each significant factor, estimate the expected performance impact direction (positive/negative) and magnitude (minor/moderate/major)
4. Provide a net assessment: after adjusting for all contextual factors, is the athlete's underlying fitness better, worse, or similar?
5. Give one actionable takeaway

## RULES
- Use second person ("your") throughout
- Be specific with numbers from the data
- Never assume causation without evidence — use "likely contributed to", "may explain"
- If a factor's data is missing for either session, skip it — don't speculate
- Focus on the 2-4 most impactful factors, not every minor difference
- The headline should be conversational and insightful, not just restating numbers
- Never give medical advice — training recommendations are fine

## OUTPUT FORMAT
Return valid JSON only, no markdown fences:
{
  "headline": "Short 1-line comparison summary (conversational, insightful)",
  "factors": [
    {
      "factor": "sleep|hrv|recovery|weather|stress|nutrition|training_load|cross_training|travel",
      "impact": "positive|negative|neutral",
      "magnitude": "minor|moderate|major",
      "detail": "Specific explanation with numbers from both sessions"
    }
  ],
  "adjusted_assessment": "1-2 sentences on underlying fitness trend after adjusting for conditions",
  "takeaway": "One actionable recommendation"
}`;

/**
 * POST /api/activities/compare-analysis
 * Body: { current_activity_id, comparison_activity_id }
 * Returns AI-generated comparison analysis.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { current_activity_id, comparison_activity_id } = req.body || {};
  if (!current_activity_id || !comparison_activity_id) {
    return res.status(400).json({ error: "Both current_activity_id and comparison_activity_id required" });
  }

  try {
    // Fetch both activities
    const { data: activities, error: actErr } = await supabaseAdmin
      .from("activities")
      .select("id, name, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, hr_drift_pct, avg_hr_bpm, max_hr_bpm, work_kj, calories, activity_weather")
      .eq("user_id", session.userId)
      .in("id", [current_activity_id, comparison_activity_id]);

    if (actErr || !activities || activities.length < 2) {
      return res.status(404).json({ error: "One or both activities not found" });
    }

    const currentAct = activities.find((a) => a.id === current_activity_id);
    const compAct = activities.find((a) => a.id === comparison_activity_id);
    if (!currentAct || !compAct) {
      return res.status(404).json({ error: "Activity mismatch" });
    }

    // Fetch profile name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .single();

    // Gather daily metrics for both dates
    const dates = [currentAct, compAct]
      .map((a) => a.started_at?.split("T")[0])
      .filter(Boolean);

    const [metricsResult, nutritionResult, crossTrainResult, travelResult, loadResult] = await Promise.allSettled([
      supabaseAdmin
        .from("daily_metrics")
        .select("date, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, recovery_score, sleep_score, sleep_duration_hours, life_stress_score, motivation_score, muscle_soreness_score, mood_score")
        .eq("user_id", session.userId)
        .in("date", dates),
      supabaseAdmin
        .from("nutrition_logs")
        .select("activity_id, totals, per_hour")
        .eq("user_id", session.userId)
        .in("activity_id", [current_activity_id, comparison_activity_id]),
      supabaseAdmin
        .from("cross_training_log")
        .select("date, activity_type, recovery_impact")
        .eq("user_id", session.userId)
        .in("date", dates),
      supabaseAdmin
        .from("travel_events")
        .select("detected_date, timezone_shift_hours, altitude_change_meters")
        .eq("user_id", session.userId)
        .in("detected_date", dates),
      supabaseAdmin
        .from("power_profiles")
        .select("computed_date, ctl, atl, tsb")
        .eq("user_id", session.userId)
        .order("computed_date", { ascending: false })
        .limit(100),
    ]);

    // Build context maps
    const metricsByDate = {};
    if (metricsResult.status === "fulfilled" && metricsResult.value.data) {
      for (const m of metricsResult.value.data) metricsByDate[m.date] = m;
    }
    const nutritionById = {};
    if (nutritionResult.status === "fulfilled" && nutritionResult.value.data) {
      for (const n of nutritionResult.value.data) nutritionById[n.activity_id] = n;
    }
    const crossTrainByDate = {};
    if (crossTrainResult.status === "fulfilled" && crossTrainResult.value.data) {
      for (const ct of crossTrainResult.value.data) {
        if (!crossTrainByDate[ct.date]) crossTrainByDate[ct.date] = [];
        crossTrainByDate[ct.date].push(ct);
      }
    }
    const travelByDate = {};
    if (travelResult.status === "fulfilled" && travelResult.value.data) {
      for (const t of travelResult.value.data) travelByDate[t.detected_date] = t;
    }
    const loadEntries = loadResult.status === "fulfilled" ? loadResult.value.data || [] : [];

    function buildSessionContext(act) {
      const d = act.started_at?.split("T")[0];
      const dm = d ? metricsByDate[d] : null;
      const nut = nutritionById[act.id];
      const ct = d ? crossTrainByDate[d] : null;
      const tr = d ? travelByDate[d] : null;
      const load = loadEntries.find((p) => p.computed_date <= d);
      return {
        activity: {
          name: act.name,
          date: d,
          duration_seconds: act.duration_seconds,
          distance_meters: act.distance_meters,
          normalized_power_watts: act.normalized_power_watts,
          avg_power_watts: act.avg_power_watts,
          tss: act.tss,
          intensity_factor: act.intensity_factor,
          efficiency_factor: act.efficiency_factor,
          hr_drift_pct: act.hr_drift_pct,
          avg_hr_bpm: act.avg_hr_bpm,
          max_hr_bpm: act.max_hr_bpm,
          weather: act.activity_weather,
        },
        recovery: {
          sleep_score: dm?.sleep_score ?? null,
          sleep_duration_hours: dm?.sleep_duration_hours ?? null,
          hrv_ms: dm?.hrv_ms ?? dm?.hrv_overnight_avg_ms ?? null,
          resting_hr_bpm: dm?.resting_hr_bpm ?? null,
          recovery_score: dm?.recovery_score ?? null,
        },
        subjective: {
          life_stress: dm?.life_stress_score ?? null,
          motivation: dm?.motivation_score ?? null,
          soreness: dm?.muscle_soreness_score ?? null,
          mood: dm?.mood_score ?? null,
        },
        nutrition: nut ? { carbs_per_hour: nut.per_hour?.carbs_g, total_calories: nut.totals?.calories } : null,
        cross_training: ct || null,
        travel: tr || null,
        training_load: load ? { ctl: load.ctl, atl: load.atl, tsb: load.tsb } : null,
      };
    }

    const payload = {
      athlete_name: profile?.full_name || "Athlete",
      current_session: buildSessionContext(currentAct),
      comparison_session: buildSessionContext(compAct),
    };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: COMPARISON_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });

    const text = response.content[0].text;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        parsed = {
          headline: "Unable to generate comparison",
          factors: [],
          adjusted_assessment: text.slice(0, 300),
          takeaway: "Try again with activities that have more context data available.",
        };
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[activities/compare-analysis]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

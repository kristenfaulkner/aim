import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SLEEP_SUMMARY_PROMPT = `You are the sleep coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

You will receive the athlete's sleep data from last night along with their recent sleep history and training context. Generate a personalized morning sleep summary — concise, specific, and actionable.

## OUTPUT FORMAT

Return valid JSON:
{
  "greeting": "Good morning, {name}!",
  "metrics_line": "Sleep Score: 88 · 7h 55m total · Deep: 1h 19m (17%) · REM: 1h 33m (20%) · RHR: 49 bpm · HRV: 92ms",
  "summary": "2-3 sentence personalized narrative about last night's sleep. Compare to their recent averages. Note improvements or concerns. Reference specific numbers.",
  "recommendation": "One specific actionable recommendation for today based on sleep quality — training intensity suggestion, nap timing, bedtime target, etc.",
  "recovery_rating": "green" | "yellow" | "red"
}

## RULES

- Use the athlete's REAL data. Reference specific numbers.
- Compare last night to their 7-day and 30-day averages when available.
- If sleep was poor, suggest considering reduced training intensity with specific zones.
- If sleep was excellent, note it's a good day for harder efforts.
- Note trends: improving, declining, or stable sleep patterns.
- If Eight Sleep data includes bed temperature or toss/turns, reference those.
- Keep the summary to 2-3 sentences max. Dense with data, not verbose.
- Keep the recommendation to 1-2 sentences. Specific, not generic.
- The metrics_line should be a clean, scannable string of key metrics separated by " · ".
- NEVER give direct medical advice. Use "consider", "you might want to", "research suggests" instead of directives like "do this" or "take this".`;

/**
 * POST /api/sleep/summary
 * Generate a Claude-powered morning sleep summary using last night's data.
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
    // Fetch last night's sleep data
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [todayResult, historyResult, profileResult, recentActivitiesResult] = await Promise.allSettled([
      // Today's metrics (or yesterday's — Eight Sleep reports the night before)
      supabaseAdmin
        .from("daily_metrics")
        .select("*")
        .eq("user_id", session.userId)
        .in("date", [today, yesterday])
        .order("date", { ascending: false })
        .limit(2),

      // 30-day sleep history for averages
      supabaseAdmin
        .from("daily_metrics")
        .select("date, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, sleep_latency_seconds, sleep_efficiency_pct, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, respiratory_rate, bed_temperature_celsius, recovery_score, source_data")
        .eq("user_id", session.userId)
        .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("date", { ascending: false }),

      // Athlete profile
      supabaseAdmin
        .from("profiles")
        .select("full_name, ftp_watts, weight_kg")
        .eq("id", session.userId)
        .single(),

      // Recent training load (last 3 days)
      supabaseAdmin
        .from("activities")
        .select("name, started_at, tss, duration_seconds, intensity_factor")
        .eq("user_id", session.userId)
        .gte("started_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

    const getData = (r) => r.status === "fulfilled" ? r.value.data : null;

    const todayMetrics = getData(todayResult);
    const history = getData(historyResult) || [];
    const profile = getData(profileResult) || {};
    const recentActivities = getData(recentActivitiesResult) || [];

    // Find the most recent night with sleep data
    const lastNight = todayMetrics?.find(m => m.sleep_score != null || m.total_sleep_seconds != null);
    if (!lastNight) {
      return res.status(200).json({ summary: null, message: "No sleep data available" });
    }

    // Extract Eight Sleep extended metrics if available
    const extended = lastNight.source_data?.eightsleep_extended || null;

    // Compute 7-day and 30-day averages
    const last7 = history.slice(0, 7).filter(d => d.sleep_score != null);
    const last30 = history.filter(d => d.sleep_score != null);
    const avg = (arr, key) => {
      const vals = arr.map(d => d[key]).filter(v => v != null);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const context = {
      athlete_name: profile.full_name?.split(" ")[0] || "Athlete",
      ftp: profile.ftp_watts,
      last_night: {
        date: lastNight.date,
        sleep_score: lastNight.sleep_score,
        total_sleep_seconds: lastNight.total_sleep_seconds,
        deep_sleep_seconds: lastNight.deep_sleep_seconds,
        rem_sleep_seconds: lastNight.rem_sleep_seconds,
        light_sleep_seconds: lastNight.light_sleep_seconds,
        sleep_latency_seconds: lastNight.sleep_latency_seconds,
        sleep_efficiency_pct: lastNight.sleep_efficiency_pct,
        hrv_ms: lastNight.hrv_ms,
        hrv_overnight_avg_ms: lastNight.hrv_overnight_avg_ms,
        resting_hr_bpm: lastNight.resting_hr_bpm,
        respiratory_rate: lastNight.respiratory_rate,
        bed_temperature_celsius: lastNight.bed_temperature_celsius,
        recovery_score: lastNight.recovery_score,
        // Eight Sleep extras
        toss_and_turns: extended?.toss_and_turns,
        room_temp_avg_c: extended?.room_temp_avg_c,
        hr_min_bpm: extended?.hr_min_bpm,
        hr_max_bpm: extended?.hr_max_bpm,
        hrv_min_ms: extended?.hrv_min_ms,
        hrv_max_ms: extended?.hrv_max_ms,
        sleep_quality_score: extended?.sleep_quality_score,
        sleep_routine_score: extended?.sleep_routine_score,
        sleep_fitness_score: extended?.sleep_fitness_score,
      },
      averages: {
        "7_day": {
          sleep_score: avg(last7, "sleep_score"),
          total_sleep_seconds: avg(last7, "total_sleep_seconds"),
          deep_sleep_seconds: avg(last7, "deep_sleep_seconds"),
          rem_sleep_seconds: avg(last7, "rem_sleep_seconds"),
          hrv_ms: avg(last7, "hrv_ms"),
          resting_hr_bpm: avg(last7, "resting_hr_bpm"),
        },
        "30_day": {
          sleep_score: avg(last30, "sleep_score"),
          total_sleep_seconds: avg(last30, "total_sleep_seconds"),
          deep_sleep_seconds: avg(last30, "deep_sleep_seconds"),
          rem_sleep_seconds: avg(last30, "rem_sleep_seconds"),
          hrv_ms: avg(last30, "hrv_ms"),
          resting_hr_bpm: avg(last30, "resting_hr_bpm"),
        },
      },
      recent_training: recentActivities.map(a => ({
        name: a.name,
        date: a.started_at,
        tss: a.tss,
        duration_min: a.duration_seconds ? Math.round(a.duration_seconds / 60) : null,
        intensity_factor: a.intensity_factor,
      })),
    };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SLEEP_SUMMARY_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(context) }],
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
        parsed = { greeting: `Good morning!`, summary: text, metrics_line: "", recommendation: "", recovery_rating: "yellow" };
      }
    }

    return res.status(200).json({ summary: parsed });
  } catch (err) {
    console.error("Sleep summary error:", err);
    return res.status(500).json({ error: err.message });
  }
}

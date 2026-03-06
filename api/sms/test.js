import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";

export const config = { maxDuration: 30 };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SMS_SYSTEM_PROMPT = `You are the SMS coach for AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist).

Generate a concise, engaging post-workout text message. Use emoji section headers. Keep the ENTIRE message under 1500 characters (SMS limit).

FORMAT:
[Sport emoji] Great [ride/run/swim], [Name]!

[Chart emoji] [Activity name] — [duration] · [distance] · NP: [watts] · TSS: [number]

[Lightbulb emoji] [1-2 key insights connecting multiple data sources — specific numbers]

[Target emoji] Next steps:
• [1 immediate recovery action with specific numbers]
• [1 training focus based on data]

[Optional: if there's a macro recommendation like building VO2max or heat adaptation]
[Muscle emoji] [Macro observation + "Want me to build a plan?"]

Reply with any questions!

RULES:
- Use the athlete's REAL numbers — FTP, NP, TSS, W/kg, CTL, HRV, etc.
- Be specific and data-driven, not generic
- Recovery tips should reference their actual TSB, sleep, and training load
- If offering to build a plan, it should be based on a real gap in their data
- Keep total message under 1500 characters
- Return ONLY the message text, no JSON wrapping`;

/**
 * POST /api/sms/test — Generate and preview a workout SMS (optionally send).
 * Always returns the generated message text. Only sends via Twilio if ?send=true.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const shouldSend = req.query.send === "true";

  try {
    // Get the most recent activity with AI analysis
    const { data: activity, error: actErr } = await supabaseAdmin
      .from("activities")
      .select("id, name, started_at, activity_type, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, max_power_watts, tss, intensity_factor, avg_hr_bpm, max_hr_bpm, efficiency_factor, hr_drift_pct, calories, elevation_gain_meters, ai_analysis")
      .eq("user_id", session.userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (actErr || !activity) {
      return res.status(404).json({ error: "No activities found. Sync Strava first." });
    }

    // Get profile and recent metrics
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone_number, sms_opt_in, full_name")
      .eq("id", session.userId)
      .single();

    const { data: recentMetrics } = await supabaseAdmin
      .from("daily_metrics")
      .select("date, ctl, atl, tsb, hrv_ms, sleep_score, recovery_score")
      .eq("user_id", session.userId)
      .order("date", { ascending: false })
      .limit(7);

    const { data: recentActivities } = await supabaseAdmin
      .from("activities")
      .select("name, started_at, tss, normalized_power_watts")
      .eq("user_id", session.userId)
      .neq("id", activity.id)
      .order("started_at", { ascending: false })
      .limit(5);

    // Generate the SMS text via Claude
    const context = {
      athlete_name: profile?.full_name?.split(" ")[0] || "there",
      activity: {
        name: activity.name,
        type: activity.activity_type,
        duration_seconds: activity.duration_seconds,
        distance_meters: activity.distance_meters,
        avg_power_watts: activity.avg_power_watts,
        normalized_power_watts: activity.normalized_power_watts,
        max_power_watts: activity.max_power_watts,
        tss: activity.tss,
        intensity_factor: activity.intensity_factor,
        avg_hr_bpm: activity.avg_hr_bpm,
        max_hr_bpm: activity.max_hr_bpm,
        efficiency_factor: activity.efficiency_factor,
        hr_drift_pct: activity.hr_drift_pct,
        calories: activity.calories,
        elevation_gain_meters: activity.elevation_gain_meters,
      },
      ai_analysis: activity.ai_analysis,
      recent_metrics: recentMetrics || [],
      recent_activities: recentActivities || [],
    };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SMS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });
    trackTokenUsage(session.userId, "sms_summary", "claude-sonnet-4-6", response.usage);

    const smsText = response.content[0].text;

    // Optionally send via Twilio
    let sendResult = null;
    if (shouldSend && profile?.phone_number && profile?.sms_opt_in) {
      const { sendSMS } = await import("../_lib/twilio.js");
      try {
        sendResult = await sendSMS(profile.phone_number, smsText);
      } catch (sendErr) {
        sendResult = { error: sendErr.message };
      }
    }

    return res.status(200).json({
      activity: { id: activity.id, name: activity.name, date: activity.started_at },
      message: smsText,
      charCount: smsText.length,
      sendResult: shouldSend ? sendResult : "Not sent (preview only). Add ?send=true to send.",
    });
  } catch (err) {
    console.error("SMS test error:", err);
    return res.status(500).json({ error: err.message || "Test failed" });
  }
}

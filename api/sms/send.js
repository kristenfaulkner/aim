import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { sendSMS } from "../_lib/twilio.js";
import Anthropic from "@anthropic-ai/sdk";

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
 * Send a workout SMS to a user after AI analysis completes.
 * Called internally (not a user-facing API).
 */
export async function sendWorkoutSMS(userId, activityId) {
  // Check user has SMS enabled
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("phone_number, sms_opt_in, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.sms_opt_in || !profile?.phone_number) return null;

  // Check notification preference
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("notification_preferences")
    .eq("user_id", userId)
    .single();

  if (settings?.notification_preferences?.sms_workout_summary === false) return null;

  // Get the activity with its AI analysis
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .eq("user_id", userId)
    .single();

  if (!activity) return null;

  // Wait for AI analysis if not yet generated (retry up to 30s)
  let analysisReady = !!activity.ai_analysis;
  let attempts = 0;
  while (!analysisReady && attempts < 6) {
    await new Promise(r => setTimeout(r, 5000));
    const { data: check } = await supabaseAdmin
      .from("activities")
      .select("ai_analysis")
      .eq("id", activityId)
      .single();
    if (check?.ai_analysis) {
      activity.ai_analysis = check.ai_analysis;
      analysisReady = true;
    }
    attempts++;
  }

  // Get recent context for the SMS
  const [metricsResult, recentResult] = await Promise.allSettled([
    supabaseAdmin
      .from("daily_metrics")
      .select("date, ctl, atl, tsb, hrv_ms, sleep_score, recovery_score")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
    supabaseAdmin
      .from("activities")
      .select("name, started_at, tss, normalized_power_watts")
      .eq("user_id", userId)
      .neq("id", activityId)
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const getData = (r) => r.status === "fulfilled" ? r.value.data : null;

  const context = {
    athlete_name: profile.full_name?.split(" ")[0] || "Athlete",
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
    recent_metrics: getData(metricsResult) || [],
    recent_activities: getData(recentResult) || [],
  };

  // Generate SMS-optimized message via Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SMS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });

  const smsText = response.content[0].text;

  // Send via Twilio
  const result = await sendSMS(profile.phone_number, smsText);

  // Store in ai_messages for conversation continuity
  const { data: conversation } = await supabaseAdmin
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: `Workout: ${activity.name}`,
    })
    .select("id")
    .single();

  if (conversation) {
    await supabaseAdmin.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: smsText,
    });
  }

  return result;
}

/**
 * POST /api/sms/send — Internal/admin endpoint to trigger an SMS.
 * Requires authentication. Used for manual testing or future cron triggers.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { type, activityId } = req.body;
  if (!type) return res.status(400).json({ error: "Missing type" });

  try {
    if (type === "workout") {
      if (!activityId) return res.status(400).json({ error: "Missing activityId for workout SMS" });
      const result = await sendWorkoutSMS(session.userId, activityId);
      if (!result) return res.status(200).json({ skipped: true, reason: "SMS not enabled or no phone number" });
      return res.status(200).json({ sent: true, sid: result.sid });
    }

    return res.status(400).json({ error: `Unknown SMS type: ${type}` });
  } catch (err) {
    console.error("SMS send error:", err);
    return res.status(500).json({ error: err.message || "Failed to send SMS" });
  }
}

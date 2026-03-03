import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { sendEmail } from "../_lib/email.js";
import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 30 };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMAIL_SYSTEM_PROMPT = `You are the email coach for AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist).

Generate an HTML email body for a post-workout analysis. The email should feel premium, concise, and actionable.

You will receive the activity data, AI analysis (summary + insights + dataGaps), recent metrics, and recent activities.

FORMAT — return ONLY the inner HTML (no <html>, <head>, <body> tags). Use inline styles. The email has a dark background (#05060a) so all text should be light colored.

Structure:
1. A greeting line using the athlete's first name
2. The AI summary paragraph — the personalized workout narrative. Display it as the opening body text.
3. A metrics grid showing key workout stats (use a 2-column table with gray borders):
   - Duration, Distance (mi), Avg Power, Normalized Power, TSS, IF, Avg HR, Max HR, Calories, Elevation
   - Only include metrics that have non-null values
   - Use font-family: 'JetBrains Mono', monospace for numbers
   - Format duration as h:mm:ss, distance in miles (divide meters by 1609.34)
4. "Key Takeaways" — a SHORT bulleted list (3-5 bullets max) of the most important insights:
   - Each bullet: emoji + one sentence explaining what happened and WHY it matters
   - Pick the most impactful insights — not everything, just what the athlete needs to know
   - Style with left green border (#00e5a0) and subtle card background (#111219)
5. "Before Your Next Workout" — 2-3 specific, actionable todos for the athlete:
   - Concrete actions (e.g., "Focus on fueling — aim for 60g+ carbs/hr on your next long ride")
   - Based on the insights — what should they change, maintain, or watch?
   - Style as a checklist with checkbox emoji (☐) or arrow (→)
6. A brief note: "View Full AI Analysis for the complete breakdown" (the button is below the email)
7. If there are dataGaps, include a brief "Unlock More Insights" line with 1-2 suggestions

Keep the email CONCISE — this is a highlight reel, not the full analysis. The full analysis lives on the website.

STYLE RULES:
- Font: system-ui, -apple-system, sans-serif for body text
- Numbers: 'JetBrains Mono', monospace
- Colors: #ffffff (headings), #c0c0c8 (body text), #00e5a0 (accent/highlights), #888 (dim text)
- Backgrounds: #0c0d14 (card), #111219 (insight cards)
- Keep total HTML under 6000 characters
- All styles must be inline (email clients strip <style> blocks)
- Use tables for layout (not flexbox/grid — email compatibility)
- Return ONLY the HTML, no JSON wrapping, no markdown code fences
- NEVER give direct medical advice in the email. For health-related insights, use "Research suggests...", "Consider discussing with your doctor...", or "Studies show X may help with Y...". Never say "Take X", "Start X protocol", or give any directive health instructions.`;

const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://aimfitness.ai";

/**
 * Wrap inner HTML content in the branded AIM email template.
 */
function wrapEmailHtml(innerHtml, activityUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#05060a;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#05060a;">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="padding:20px 0 24px;text-align:center;">
<span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">
<span style="background:linear-gradient(135deg,#00e5a0,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">AI</span>M
</span>
</td></tr>

<!-- Content -->
<tr><td style="background-color:#0c0d14;border-radius:12px;padding:32px 28px;">
${innerHtml}
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:24px 0;text-align:center;">
<a href="${activityUrl}" style="display:inline-block;background:linear-gradient(135deg,#00e5a0,#3b82f6);color:#05060a;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
View Full AI Analysis
</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#555;">
<p style="margin:0;">AIM — AI-Powered Performance Intelligence</p>
<p style="margin:4px 0 0;">
<a href="${BASE_URL}/settings" style="color:#555;text-decoration:underline;">Manage email preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Generate a fallback HTML email when Claude is unavailable.
 */
function fallbackEmailHtml(activity, athleteName) {
  const fmt = (v, unit = "") => v != null ? `${Math.round(v)}${unit}` : "—";
  const duration = activity.duration_seconds
    ? `${Math.floor(activity.duration_seconds / 3600)}:${String(Math.floor((activity.duration_seconds % 3600) / 60)).padStart(2, "0")}:${String(activity.duration_seconds % 60).padStart(2, "0")}`
    : "—";
  const distance = activity.distance_meters
    ? `${(activity.distance_meters / 1609.34).toFixed(1)} mi`
    : null;

  const metrics = [
    ["Duration", duration],
    distance ? ["Distance", distance] : null,
    activity.normalized_power_watts ? ["Normalized Power", `${fmt(activity.normalized_power_watts)}W`] : null,
    activity.avg_power_watts ? ["Avg Power", `${fmt(activity.avg_power_watts)}W`] : null,
    activity.tss ? ["TSS", fmt(activity.tss)] : null,
    activity.intensity_factor ? ["IF", activity.intensity_factor.toFixed(2)] : null,
    activity.avg_hr_bpm ? ["Avg HR", `${fmt(activity.avg_hr_bpm)} bpm`] : null,
    activity.calories ? ["Calories", fmt(activity.calories)] : null,
  ].filter(Boolean);

  const metricsRows = metrics.map(([label, value]) =>
    `<tr><td style="padding:8px 12px;color:#888;font-size:13px;border-bottom:1px solid #1a1b25;">${label}</td><td style="padding:8px 12px;color:#fff;font-size:13px;font-family:'JetBrains Mono',monospace;text-align:right;border-bottom:1px solid #1a1b25;">${value}</td></tr>`
  ).join("");

  let insightsHtml = "";
  if (activity.ai_analysis?.insights?.length) {
    insightsHtml = `<div style="margin-top:24px;">
<h3 style="color:#00e5a0;font-size:14px;margin:0 0 12px;">AI Insights</h3>
${activity.ai_analysis.insights.map(i => `<div style="background:#111219;border-left:3px solid #00e5a0;padding:12px 14px;margin-bottom:8px;border-radius:0 6px 6px 0;">
<div style="color:#fff;font-size:13px;font-weight:600;">${i.icon || ""} ${i.title}</div>
<div style="color:#c0c0c8;font-size:12px;margin-top:4px;line-height:1.5;">${i.body}</div>
</div>`).join("")}
</div>`;
  }

  const summaryHtml = activity.ai_analysis?.summary
    ? `<p style="color:#c0c0c8;font-size:14px;margin:0 0 20px;line-height:1.6;">${activity.ai_analysis.summary}</p>`
    : `<p style="color:#c0c0c8;font-size:14px;margin:0 0 20px;">Hey ${athleteName}, here's your workout breakdown.</p>`;

  return `<h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 12px;">${activity.name || "Workout"}</h2>
${summaryHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111219;border-radius:8px;overflow:hidden;">
${metricsRows}
</table>
${insightsHtml}`;
}

/**
 * Send a workout email to a user after AI analysis completes.
 * Only sends on the first analysis — skips if email was already sent for this activity.
 */
export async function sendWorkoutEmail(userId, activityId) {
  // Check user has email and preferences allow it
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return null;

  // Check notification preference
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("notification_preferences")
    .eq("user_id", userId)
    .single();

  if (settings?.notification_preferences?.email_workout_summary === false) return null;

  // Get the activity with AI analysis
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .eq("user_id", userId)
    .single();

  if (!activity) return null;

  // Check if we already sent an email for this activity (prevent duplicates on re-analysis)
  const { data: existingConvo } = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .like("title", `Email: %`)
    .limit(100);

  // Check if any conversation references this activity ID in the title
  const alreadySent = existingConvo?.some(c => c.title === `Email: ${activity.name} [${activityId}]`);
  if (alreadySent) return null;

  // Get recent context for richer email content
  const [metricsResult, recentResult] = await Promise.allSettled([
    supabaseAdmin
      .from("daily_metrics")
      .select("date, ctl, atl, tsb, hrv_ms, sleep_score, recovery_score")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
    supabaseAdmin
      .from("activities")
      .select("name, started_at, tss, normalized_power_watts, activity_type")
      .eq("user_id", userId)
      .neq("id", activityId)
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const getData = (r) => r.status === "fulfilled" ? r.value.data : null;
  const athleteName = profile.full_name?.split(" ")[0] || "Athlete";

  const context = {
    athlete_name: athleteName,
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

  // Generate email HTML via Claude (with fallback)
  let innerHtml;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: EMAIL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });
    innerHtml = response.content[0].text;
  } catch (err) {
    console.error("Claude email generation failed, using fallback:", err.message);
    innerHtml = fallbackEmailHtml(activity, athleteName);
  }

  const activityUrl = `${BASE_URL}/activity/${activityId}`;
  const html = wrapEmailHtml(innerHtml, activityUrl);

  // Build subject line
  const subject = activity.name
    ? `${activity.name} — Your AI Analysis is Ready`
    : "Your Workout Analysis is Ready";

  // Send via Resend
  const result = await sendEmail(profile.email, subject, html);

  // Store in ai_conversations for record keeping
  const { data: conversation } = await supabaseAdmin
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: `Email: ${activity.name} [${activityId}]`,
    })
    .select("id")
    .single();

  if (conversation) {
    await supabaseAdmin.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: `Email sent: ${subject}`,
    });
  }

  return result;
}

/**
 * POST /api/email/send — Manual endpoint to trigger a workout email.
 * Requires authentication.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { activityId } = req.body;
  if (!activityId) return res.status(400).json({ error: "Missing activityId" });

  try {
    const result = await sendWorkoutEmail(session.userId, activityId);
    if (!result) return res.status(200).json({ skipped: true, reason: "Email not enabled or already sent" });
    return res.status(200).json({ sent: true, id: result.id });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ error: err.message || "Failed to send email" });
  }
}

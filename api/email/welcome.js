import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { sendEmail } from "../_lib/email.js";

const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://aimfitness.ai";

const PHOTO_URL = `${BASE_URL}/kristen.jpg`;
const LOGO_URL = `${BASE_URL}/logos/aim-logo-2x.png`;

// ─────────────────────────────────────────────────────────────────────────────
// Reusable CTA button HTML
// ─────────────────────────────────────────────────────────────────────────────

function connectButton(text = "Connect Your Devices") {
  return `<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:20px 0 4px;text-align:center;">
<a href="${BASE_URL}/connect" style="display:inline-block;background:linear-gradient(135deg,#10b981,#3b82f6);color:#ffffff;font-weight:700;font-size:13px;padding:12px 32px;border-radius:8px;text-decoration:none;">
${text} &rarr;
</a>
</td></tr>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalized insight examples based on athlete profile
// ─────────────────────────────────────────────────────────────────────────────

function getInsightExamples(profile) {
  const isFemale = profile.sex === "female";
  const level = profile.riding_level || "intermediate";
  const isElite = ["pro", "elite", "cat1", "cat2"].includes(level);
  const examples = [];

  // Everyone gets a cross-domain sleep + performance example
  examples.push({
    icon: "&#128164;",
    label: "Sleep &#8594; Performance",
    title: "Poor Sleep Explained Today's Cardiac Drift",
    body: "Your HRV dropped to 38ms after 5.2 hours of sleep. Historically, when your HRV is below 45ms, cardiac drift averages 8 to 12% vs. 3 to 4% on well-rested days. Today's 9.1% drift confirms the pattern. Your fitness is fine, your recovery wasn't.",
  });

  // Everyone gets a heat/environment example
  examples.push({
    icon: "&#127777;&#65039;",
    label: "Environment &#8594; Power Output",
    title: "Heat Cost You 4.2% Today",
    body: "At 91&deg;F, your Efficiency Factor dropped to 1.68 vs. your cool-weather average of 1.79. Your personal heat model shows EF degrades 0.005 per &deg;F above 65&deg;F. After adjusting for temperature, today's effort was actually equivalent to 285W in ideal conditions. Stronger than it felt.",
  });

  // Elite cyclists get granular power analytics
  if (isElite) {
    examples.push({
      icon: "&#9889;",
      label: "Power Profile &#8594; Race Readiness",
      title: "VO2max is Your Weakest Link: Cat 3 vs. Cat 1 Threshold",
      body: "Your 5-min power classifies two tiers below your 20-min threshold. Your VO2/FTP ratio is 1.19, well below the 1.25 target. You need +19W at 5-min to close the gap. Consider adding 2&times; per week VO2 sessions for 6 to 8 weeks.",
    });
  } else {
    // Recreational/intermediate get a training load example
    examples.push({
      icon: "&#128200;",
      label: "Training Load &#8594; Recovery",
      title: "Your Fitness Is Up 12%, But Watch the Fatigue",
      body: "Your CTL has climbed from 52 to 68 over 6 weeks. Great progress. But your acute:chronic ratio hit 1.4 this week, which historically precedes a performance dip within 5 days. A recovery day tomorrow would protect your gains.",
    });
  }

  // Women get menstrual cycle insight
  if (isFemale) {
    examples.push({
      icon: "&#127800;",
      label: "Cycle Phase &#8594; Performance",
      title: "Luteal Phase: Expect Higher HR at Same Power",
      body: "Based on your Oura temperature data, you're likely in your mid-luteal phase. Your resting HR is 4bpm above your follicular baseline and HRV is 15% lower. This is normal. Your body is working harder at the same effort. Consider shifting today's intervals to tempo/sweet spot instead of VO2.",
    });
  }

  // Everyone gets a nutrition/fueling example
  examples.push({
    icon: "&#127828;",
    label: "Nutrition &#8594; Power Fade",
    title: "Under-Fueled: Power Dropped 11% in Final Hour",
    body: "You consumed ~40g carbs/hr on a 3-hour ride, but your intensity demanded 60 to 80g/hr. Your power in the last 30 minutes averaged 228W vs. 256W in the first hour. Classic glycogen depletion. On your Feb 18 ride where you fueled at 70g/hr, you held power within 3% for the full duration.",
  });

  return examples;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration recommendations
// ─────────────────────────────────────────────────────────────────────────────

const INTEGRATIONS = [
  { name: "Strava", icon: "&#128692;", desc: "Ride data, power, HR, GPS routes" },
  { name: "Wahoo", icon: "&#128690;", desc: "Direct device data with full FIT file analysis" },
  { name: "Oura Ring", icon: "&#128141;", desc: "Sleep stages, HRV, readiness, temperature" },
  { name: "Whoop", icon: "&#128170;", desc: "Recovery score, strain, sleep performance" },
  { name: "Eight Sleep", icon: "&#128716;", desc: "Sleep quality, bed temperature, HRV trends" },
  { name: "Withings", icon: "&#9878;&#65039;", desc: "Weight, body fat, muscle mass, hydration" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HTML builder
// ─────────────────────────────────────────────────────────────────────────────

function buildWelcomeHtml(profile) {
  const firstName = profile.full_name?.split(" ")[0] || "there";
  const examples = getInsightExamples(profile);

  const examplesHtml = examples.map(ex => `
<tr><td style="padding:0 0 12px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:3px solid #10b981;border-radius:0 8px 8px 0;">
<tr><td style="padding:14px 16px;">
<div style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${ex.icon} ${ex.label}</div>
<div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:6px;">${ex.title}</div>
<div style="font-size:12px;color:#4a4a5a;line-height:1.65;">${ex.body}</div>
</td></tr>
</table>
</td></tr>`).join("");

  const connectUrl = `${BASE_URL}/connect`;
  const integrationsHtml = INTEGRATIONS.map(i => `
<tr><td style="padding:6px 0;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px;font-size:16px;vertical-align:middle;">${i.icon}</td>
<td style="vertical-align:middle;">
<span style="font-size:13px;font-weight:700;color:#1a1a2e;">${i.name}</span>
<span style="font-size:12px;color:#6b6b7b;"> &mdash; ${i.desc}</span>
<span style="font-size:11px;"> <a href="${connectUrl}" style="color:#10b981;font-weight:600;text-decoration:none;">Connect &rarr;</a></span>
</td>
</tr></table>
</td></tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8f8fa;font-family:'DM Sans',system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8fa;">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header: Logo -->
<tr><td style="padding:20px 0 24px;text-align:center;">
<img src="${LOGO_URL}" width="80" alt="AIM" style="display:inline-block;" />
</td></tr>

<!-- Founder photo + letter -->
<tr><td style="background-color:#ffffff;border-radius:12px 12px 0 0;padding:36px 32px 0;border:1px solid #e8e8ec;border-bottom:none;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="vertical-align:top;padding-right:20px;" width="90">
<img src="${PHOTO_URL}" width="80" height="80" alt="Kristen Faulkner" style="border-radius:50%;display:block;object-fit:cover;object-position:center 20%;border:2px solid #e8e8ec;" />
</td>
<td style="vertical-align:top;">
<h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 2px;">Welcome to AIM, ${firstName}!</h2>
<div style="font-size:12px;color:#6b6b7b;margin-bottom:16px;">A personal letter from our founder</div>
</td>
</tr>
</table>

<div style="color:#4a4a5a;font-size:14px;line-height:1.75;margin-top:16px;">
<p style="margin:0 0 14px;">Thanks for signing up! I'm Kristen, and I wanted to personally welcome you to AIM.</p>

<p style="margin:0 0 14px;">I've always loved data. As an investor, I spent years building models and looking for patterns. On the bike, I did the same thing, tracking every metric I could get my hands on. Power. Sleep. HRV. Blood work. Body composition. Hormone cycles.</p>

<p style="margin:0 0 14px;">I was overwhelmed with so much data and trying to connect the dots. I didn't need another dashboard. I needed the connections between them.</p>

<p style="margin:0 0 14px;">So I built the tool I wished existed. AIM is everything I learned on the way to two Olympic gold medals: the biomarker patterns, the recovery frameworks, the cross-domain analysis that actually changed how I trained and raced.</p>

<p style="margin:0 0 14px;">Our health is our most valuable asset. I want every athlete to have access to this kind of intelligence, not just professionals.</p>

<p style="margin:0 0 14px;">If you have any questions or feature requests, reply to this email. I read every one. We are here to serve you.</p>

<p style="margin:0 0 14px;">Welcome to the community. Let's aim higher together.</p>

<p style="margin:0;">
<strong>Kristen Faulkner</strong><br/>
<span style="color:#6b6b7b;font-size:12px;">Founder, AIM &bull; 2x Olympic Gold Medalist, Paris 2024</span>
</p>
</div>

${connectButton("Get Started")}
</td></tr>

<!-- Divider -->
<tr><td style="background-color:#ffffff;padding:20px 32px 0;border-left:1px solid #e8e8ec;border-right:1px solid #e8e8ec;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e8e8ec;"></td></tr></table>
</td></tr>

<!-- Get Started Section -->
<tr><td style="background-color:#ffffff;padding:24px 32px;border-left:1px solid #e8e8ec;border-right:1px solid #e8e8ec;">
<h3 style="color:#1a1a2e;font-size:16px;font-weight:700;margin:0 0 16px;">How It Works</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 12px;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:12px;">
<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">1</div>
</td>
<td style="vertical-align:top;">
<div style="font-size:14px;font-weight:700;color:#1a1a2e;">Connect your devices</div>
<div style="font-size:12px;color:#6b6b7b;line-height:1.5;">Link Strava, Wahoo, Oura, Whoop, Eight Sleep, Withings. Whatever you use. Each connection unlocks new cross-domain insights.</div>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:0 0 12px;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:12px;">
<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">2</div>
</td>
<td style="vertical-align:top;">
<div style="font-size:14px;font-weight:700;color:#1a1a2e;">Go ride (or run, or swim)</div>
<div style="font-size:12px;color:#6b6b7b;line-height:1.5;">AIM automatically syncs your data after every workout. Within minutes, you'll have a full AI analysis waiting.</div>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:0;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:12px;">
<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">3</div>
</td>
<td style="vertical-align:top;">
<div style="font-size:14px;font-weight:700;color:#1a1a2e;">Get smarter every day</div>
<div style="font-size:12px;color:#6b6b7b;line-height:1.5;">The more data AIM has, the better it gets. After 2 to 3 weeks, AIM builds your personal performance models: your own dose-response curves for sleep, heat, nutrition, and more.</div>
</td>
</tr></table>
</td></tr>
</table>

${connectButton("Connect Your Devices")}
</td></tr>

<!-- Divider -->
<tr><td style="background-color:#ffffff;padding:0 32px;border-left:1px solid #e8e8ec;border-right:1px solid #e8e8ec;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e8e8ec;"></td></tr></table>
</td></tr>

<!-- The More You Connect Section -->
<tr><td style="background-color:#ffffff;padding:24px 32px;border-left:1px solid #e8e8ec;border-right:1px solid #e8e8ec;">
<h3 style="color:#1a1a2e;font-size:16px;font-weight:700;margin:0 0 4px;">The More You Connect, The Smarter AIM Gets</h3>
<p style="color:#6b6b7b;font-size:13px;margin:0 0 16px;line-height:1.5;">Each device adds a new dimension to your analysis. AIM's power is connecting data <em>across</em> sources, finding patterns no single app can see.</p>
<table width="100%" cellpadding="0" cellspacing="0">
${integrationsHtml}
</table>

${connectButton("Connect Your Devices")}
</td></tr>

<!-- Divider -->
<tr><td style="background-color:#ffffff;padding:0 32px;border-left:1px solid #e8e8ec;border-right:1px solid #e8e8ec;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e8e8ec;"></td></tr></table>
</td></tr>

<!-- Insight Examples Section -->
<tr><td style="background-color:#ffffff;padding:24px 32px 32px;border-radius:0 0 12px 12px;border:1px solid #e8e8ec;border-top:none;">
<h3 style="color:#1a1a2e;font-size:16px;font-weight:700;margin:0 0 4px;">Here's What AIM Can Tell You</h3>
<p style="color:#6b6b7b;font-size:13px;margin:0 0 16px;line-height:1.5;">Real examples of cross-domain insights AIM generates by connecting your data sources:</p>
<table width="100%" cellpadding="0" cellspacing="0">
${examplesHtml}
</table>

${connectButton("Unlock These Insights")}
</td></tr>

<!-- Final CTA Button -->
<tr><td style="padding:28px 0;text-align:center;">
<a href="${BASE_URL}/connect" style="display:inline-block;background:linear-gradient(135deg,#10b981,#3b82f6);color:#ffffff;font-weight:700;font-size:15px;padding:16px 48px;border-radius:10px;text-decoration:none;letter-spacing:-0.01em;">
Connect Your Devices &rarr;
</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 0 8px;text-align:center;font-size:11px;color:#999;">
<p style="margin:0;">AIM &bull; AI-Powered Performance Intelligence</p>
<p style="margin:4px 0 0;">
<a href="${BASE_URL}/settings" style="color:#999;text-decoration:underline;">Manage email preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Send the founder's welcome email to a new user.
 * Idempotent — checks ai_conversations to prevent duplicate sends.
 */
export async function sendWelcomeEmail(userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name, sex, riding_level, weekly_hours, uses_cycle_tracking")
    .eq("id", userId)
    .single();

  if (!profile?.email) return null;

  // Prevent duplicate welcome emails
  const { data: existing } = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("title", "Email: Welcome")
    .limit(1);

  if (existing?.length) return null;

  const html = buildWelcomeHtml(profile);

  const result = await sendEmail(
    profile.email,
    "Welcome to AIM",
    html,
  );

  // Record send to prevent duplicates
  await supabaseAdmin.from("ai_conversations").insert({
    user_id: userId,
    title: "Email: Welcome",
  });

  return result;
}

/**
 * POST /api/email/welcome — Trigger welcome email (called from onboarding).
 * Supports { preview: true } to send a test email to the authenticated user.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { preview } = req.body || {};

  // Preview mode: send directly, skip dedup
  if (preview) {
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, sex, riding_level, weekly_hours, uses_cycle_tracking")
        .eq("id", session.userId)
        .single();

      if (!profile?.email) return res.status(400).json({ error: "No email on profile" });

      const html = buildWelcomeHtml(profile);
      const result = await sendEmail(profile.email, "Welcome to AIM", html);
      return res.status(200).json({ sent: true, id: result.id, preview: true });
    } catch (err) {
      console.error("Welcome email preview error:", err);
      return res.status(500).json({ error: "Failed to send preview" });
    }
  }

  try {
    const result = await sendWelcomeEmail(session.userId);
    if (!result) return res.status(200).json({ skipped: true });
    return res.status(200).json({ sent: true, id: result.id });
  } catch (err) {
    console.error("Welcome email error:", err);
    return res.status(500).json({ error: "Failed to send welcome email" });
  }
}

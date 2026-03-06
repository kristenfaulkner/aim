import Anthropic from "@anthropic-ai/sdk";
import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { trackTokenUsage } from "../_lib/token-tracking.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * POST /api/profile/generate-bio
 * Auto-generate a 2-3 sentence athlete profile description from their activity history.
 * Does NOT save — returns the generated bio for user confirmation.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userId = session.userId;

  // Fetch profile and all activities in parallel
  const [profileResult, activitiesResult] = await Promise.allSettled([
    supabaseAdmin
      .from("profiles")
      .select("full_name, riding_level, weekly_hours, primary_discipline, primary_terrain, goals, ftp_watts, weight_kg, sex, years_cycling")
      .eq("id", userId)
      .single(),
    supabaseAdmin
      .from("activities")
      .select("activity_type, duration_seconds, distance_meters, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(500),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value.data : null;
  const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value.data || [] : [];

  if (activities.length === 0) {
    return res.status(200).json({ bio: null, reason: "No activities found. Connect a device and sync some workouts first." });
  }

  // Compute activity type breakdown
  const typeStats = {};
  let totalHours = 0;
  for (const a of activities) {
    const type = a.activity_type || "workout";
    if (!typeStats[type]) typeStats[type] = { count: 0, hours: 0, distance_km: 0 };
    typeStats[type].count += 1;
    const hours = (a.duration_seconds || 0) / 3600;
    typeStats[type].hours += hours;
    typeStats[type].distance_km += (a.distance_meters || 0) / 1000;
    totalHours += hours;
  }

  // Sort by hours descending
  const sorted = Object.entries(typeStats)
    .map(([type, stats]) => ({ type, ...stats, pct: Math.round((stats.hours / totalHours) * 100) }))
    .sort((a, b) => b.hours - a.hours);

  // Date range
  const oldestActivity = activities[activities.length - 1]?.started_at;
  const newestActivity = activities[0]?.started_at;

  const context = {
    profile: {
      name: profile?.full_name,
      riding_level: profile?.riding_level,
      weekly_hours: profile?.weekly_hours,
      primary_discipline: profile?.primary_discipline,
      primary_terrain: profile?.primary_terrain,
      goals: profile?.goals,
      ftp: profile?.ftp_watts,
      weight_kg: profile?.weight_kg,
      sex: profile?.sex,
      years_cycling: profile?.years_cycling,
    },
    activity_summary: {
      total_activities: activities.length,
      total_hours: Math.round(totalHours),
      date_range: `${oldestActivity?.slice(0, 10)} to ${newestActivity?.slice(0, 10)}`,
      breakdown: sorted,
    },
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: `You are generating a short athlete profile description. Write exactly 2-3 sentences in second person ("You are...").
Be specific about their primary sport, training volume, and cross-training habits based on the activity data.
Use natural, conversational language. Examples of good tone:
- "You're a dedicated cyclist averaging 12 hours per week, with a strong endurance base and regular strength training to complement your riding."
- "You're primarily a road cyclist who cross-trains with occasional runs and yoga sessions for recovery."
Do NOT mention specific numbers like FTP, weight, or exact distances unless they paint a compelling picture.
Do NOT give advice or recommendations — just describe who they are as an athlete.
Keep it to 2-3 sentences max. No markdown formatting.`,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });

    trackTokenUsage(session.userId, "bio_generation", "claude-sonnet-4-6", response.usage);
    const bio = response.content[0].text.trim();
    return res.status(200).json({ bio });
  } catch (err) {
    console.error("[Generate Bio] AI error:", err.message);
    return res.status(500).json({ error: "Failed to generate bio" });
  }
}

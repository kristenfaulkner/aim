/**
 * GET /api/activities/search?tags=vo2_session,hot_conditions&from=2025-12-01&to=2026-03-01
 *
 * Search activities by canonical tags. Returns activities that match ALL specified tags.
 */
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { tags, from, to, limit = "50" } = req.query;
  if (!tags) return res.status(400).json({ error: "Missing tags parameter" });

  const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
  if (tagList.length === 0) return res.status(400).json({ error: "No valid tags provided" });

  try {
    // Find activity IDs that match ALL specified tags
    // For each tag, get the set of activity_ids, then intersect
    let activityIds = null;

    for (const tagId of tagList) {
      const { data: tagRows } = await supabaseAdmin
        .from("activity_tags")
        .select("activity_id")
        .eq("user_id", session.userId)
        .eq("tag_id", tagId);

      const ids = new Set((tagRows || []).map(r => r.activity_id));

      if (activityIds === null) {
        activityIds = ids;
      } else {
        // Intersect
        activityIds = new Set([...activityIds].filter(id => ids.has(id)));
      }

      if (activityIds.size === 0) break;
    }

    if (!activityIds || activityIds.size === 0) {
      return res.status(200).json({ activities: [], total: 0 });
    }

    // Fetch activities
    let query = supabaseAdmin
      .from("activities")
      .select("id, name, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, avg_hr_bpm, hr_drift_pct, activity_weather, laps")
      .eq("user_id", session.userId)
      .in("id", [...activityIds]);

    if (from) query = query.gte("started_at", from);
    if (to) query = query.lte("started_at", to);

    query = query.order("started_at", { ascending: false }).limit(parseInt(limit));

    const { data: activities } = await query;

    // Fetch all tags for these activities
    const { data: allTags } = await supabaseAdmin
      .from("activity_tags")
      .select("activity_id, tag_id, scope, confidence")
      .eq("user_id", session.userId)
      .in("activity_id", [...activityIds]);

    // Group tags by activity
    const tagsByActivity = {};
    for (const t of (allTags || [])) {
      if (!tagsByActivity[t.activity_id]) tagsByActivity[t.activity_id] = [];
      tagsByActivity[t.activity_id].push({ tag_id: t.tag_id, scope: t.scope, confidence: t.confidence });
    }

    const results = (activities || []).map(a => ({
      ...a,
      tags: tagsByActivity[a.id] || [],
    }));

    return res.status(200).json({ activities: results, total: results.length });
  } catch (err) {
    console.error("Tag search error:", err);
    return res.status(500).json({ error: err.message });
  }
}

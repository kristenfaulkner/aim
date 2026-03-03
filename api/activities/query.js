/**
 * POST /api/activities/query
 *
 * Advanced activity search with tag filters, conditions, grouping, and aggregation.
 * Body: {
 *   tags: ["vo2_session", "hot_conditions"],  // AND intersection
 *   excludeTags: ["data_quality_issue"],       // exclude these
 *   from: "2025-12-01",                        // date range
 *   to: "2026-03-01",
 *   minDuration: 3600,                         // seconds
 *   maxDuration: 10800,
 *   minTSS: 50,
 *   maxTSS: 200,
 *   activityType: "Ride",
 *   groupBy: "tag",                            // "tag" | "month" | "week" | null
 *   groupTag: "energy_system",                 // group by tag category
 *   limit: 100,
 *   sort: "started_at",                        // "started_at" | "tss" | "np" | "ef"
 *   sortDir: "desc",
 * }
 */
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const {
    tags = [], excludeTags = [],
    from, to,
    minDuration, maxDuration,
    minTSS, maxTSS,
    activityType,
    groupBy, groupTag,
    limit = 100,
    sort = "started_at", sortDir = "desc",
  } = req.body || {};

  try {
    // Step 1: Find matching activity IDs by tags (AND intersection)
    let activityIds = null;

    if (tags.length > 0) {
      for (const tagId of tags) {
        const { data: tagRows } = await supabaseAdmin
          .from("activity_tags")
          .select("activity_id")
          .eq("user_id", session.userId)
          .eq("tag_id", tagId);

        const ids = new Set((tagRows || []).map(r => r.activity_id));
        activityIds = activityIds === null ? ids : new Set([...activityIds].filter(id => ids.has(id)));
        if (activityIds.size === 0) break;
      }
    }

    // Step 2: Exclude tags
    if (excludeTags.length > 0 && activityIds !== null && activityIds.size > 0) {
      for (const tagId of excludeTags) {
        const { data: tagRows } = await supabaseAdmin
          .from("activity_tags")
          .select("activity_id")
          .eq("user_id", session.userId)
          .eq("tag_id", tagId);

        const excludeIds = new Set((tagRows || []).map(r => r.activity_id));
        activityIds = new Set([...activityIds].filter(id => !excludeIds.has(id)));
      }
    }

    if (activityIds !== null && activityIds.size === 0) {
      return res.status(200).json({ activities: [], total: 0, aggregation: null });
    }

    // Step 3: Build activity query with filters
    const selectFields = "id, name, activity_type, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, avg_hr_bpm, max_hr_bpm, hr_drift_pct, variability_index, avg_cadence_rpm, work_kj, calories, elevation_gain_meters, activity_weather, laps";

    let query = supabaseAdmin
      .from("activities")
      .select(selectFields)
      .eq("user_id", session.userId);

    if (activityIds !== null) {
      query = query.in("id", [...activityIds]);
    }
    if (from) query = query.gte("started_at", from);
    if (to) query = query.lte("started_at", to + "T23:59:59");
    if (minDuration) query = query.gte("duration_seconds", minDuration);
    if (maxDuration) query = query.lte("duration_seconds", maxDuration);
    if (minTSS) query = query.gte("tss", minTSS);
    if (maxTSS) query = query.lte("tss", maxTSS);
    if (activityType) query = query.eq("activity_type", activityType);

    // Sort
    const validSorts = { started_at: "started_at", tss: "tss", np: "normalized_power_watts", ef: "efficiency_factor" };
    const sortCol = validSorts[sort] || "started_at";
    query = query.order(sortCol, { ascending: sortDir === "asc" }).limit(Math.min(parseInt(limit), 200));

    const { data: activities, error } = await query;
    if (error) throw error;

    // Step 4: Fetch all tags for results
    const resultIds = (activities || []).map(a => a.id);
    let tagsByActivity = {};
    if (resultIds.length > 0) {
      const { data: allTags } = await supabaseAdmin
        .from("activity_tags")
        .select("activity_id, tag_id, scope, confidence")
        .eq("user_id", session.userId)
        .in("activity_id", resultIds);

      for (const t of (allTags || [])) {
        if (!tagsByActivity[t.activity_id]) tagsByActivity[t.activity_id] = [];
        tagsByActivity[t.activity_id].push({ tag_id: t.tag_id, scope: t.scope, confidence: t.confidence });
      }
    }

    const results = (activities || []).map(a => ({
      ...a,
      tags: tagsByActivity[a.id] || [],
    }));

    // Step 5: Compute aggregation
    const aggregation = computeAggregation(results);

    // Step 6: Group if requested
    let groups = null;
    if (groupBy === "month") {
      groups = groupByMonth(results);
    } else if (groupBy === "week") {
      groups = groupByWeek(results);
    } else if (groupBy === "tag" && groupTag) {
      groups = groupByTagCategory(results, groupTag);
    }

    return res.status(200).json({
      activities: results,
      total: results.length,
      aggregation,
      groups,
    });
  } catch (err) {
    console.error("Query error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function computeAggregation(activities) {
  if (activities.length === 0) return null;

  const vals = (key) => activities.map(a => a[key]).filter(v => v != null);
  const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 100) / 100 : null;

  return {
    count: activities.length,
    avgTSS: avg(vals("tss")),
    avgNP: Math.round(avg(vals("normalized_power_watts")) || 0),
    avgEF: avg(vals("efficiency_factor")),
    avgHrDrift: avg(vals("hr_drift_pct")),
    avgDuration: Math.round(avg(vals("duration_seconds")) || 0),
    totalWork: Math.round(vals("work_kj").reduce((s, v) => s + v, 0)),
    avgIF: avg(vals("intensity_factor")),
  };
}

function groupByMonth(activities) {
  const groups = {};
  for (const a of activities) {
    const month = a.started_at?.substring(0, 7); // "2026-03"
    if (!month) continue;
    if (!groups[month]) groups[month] = [];
    groups[month].push(a);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, acts]) => ({
      label: month,
      ...computeAggregation(acts),
    }));
}

function groupByWeek(activities) {
  const groups = {};
  for (const a of activities) {
    if (!a.started_at) continue;
    const d = new Date(a.started_at);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const weekKey = monday.toISOString().split("T")[0];
    if (!groups[weekKey]) groups[weekKey] = [];
    groups[weekKey].push(a);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, acts]) => ({
      label: `Week of ${week}`,
      ...computeAggregation(acts),
    }));
}

function groupByTagCategory(activities, category) {
  // Group activities by their tags in a specific category
  const TAG_CATEGORIES = {
    type: ["race_day", "group_ride", "indoor_trainer"],
    energy_system: ["endurance_steady", "tempo_ride", "sweet_spot_session", "threshold_session", "vo2_session", "anaerobic_session", "neuromuscular_session"],
    terrain: ["climbing_focus", "rolling_surge_ride"],
    environment: ["hot_conditions", "cold_conditions", "high_wind_conditions"],
    physiology: ["high_drift", "low_hrv_day", "poor_sleep_day"],
  };

  const categoryTags = TAG_CATEGORIES[category] || [];
  if (categoryTags.length === 0) return null;

  const groups = {};
  for (const a of activities) {
    const matchingTags = (a.tags || []).filter(t => categoryTags.includes(t.tag_id));
    if (matchingTags.length === 0) {
      if (!groups["_other"]) groups["_other"] = [];
      groups["_other"].push(a);
    } else {
      for (const t of matchingTags) {
        if (!groups[t.tag_id]) groups[t.tag_id] = [];
        groups[t.tag_id].push(a);
      }
    }
  }

  return Object.entries(groups)
    .filter(([key]) => key !== "_other")
    .map(([tagId, acts]) => ({
      label: tagId,
      ...computeAggregation(acts),
    }));
}

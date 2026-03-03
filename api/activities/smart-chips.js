/**
 * GET /api/activities/smart-chips
 *
 * Generate suggested query chips based on the athlete's tag distribution,
 * recent activity patterns, and available model data.
 */
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

const TAG_LABELS = {
  race_day: "Race Day", group_ride: "Group Ride", indoor_trainer: "Indoor",
  endurance_steady: "Endurance", tempo_ride: "Tempo", sweet_spot_session: "Sweet Spot",
  threshold_session: "Threshold", vo2_session: "VO2max", anaerobic_session: "Anaerobic",
  neuromuscular_session: "Neuromuscular", climbing_focus: "Climbing", rolling_surge_ride: "Rolling/Surges",
  hot_conditions: "Hot", cold_conditions: "Cold", high_wind_conditions: "Windy",
  high_drift: "High Drift", low_hrv_day: "Low HRV", poor_sleep_day: "Poor Sleep",
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Fetch tag distribution
    const { data: tags } = await supabaseAdmin
      .from("activity_tags")
      .select("tag_id, activity_id")
      .eq("user_id", session.userId)
      .eq("scope", "workout");

    if (!tags || tags.length === 0) {
      return res.status(200).json({ chips: getDefaultChips() });
    }

    // Count tags
    const tagCounts = {};
    const tagActivities = {};
    for (const t of tags) {
      tagCounts[t.tag_id] = (tagCounts[t.tag_id] || 0) + 1;
      if (!tagActivities[t.tag_id]) tagActivities[t.tag_id] = new Set();
      tagActivities[t.tag_id].add(t.activity_id);
    }

    // Find co-occurrences (tags that appear on same activity)
    const coOccurrences = {};
    const activityTags = {};
    for (const t of tags) {
      if (!activityTags[t.activity_id]) activityTags[t.activity_id] = [];
      activityTags[t.activity_id].push(t.tag_id);
    }
    for (const tagList of Object.values(activityTags)) {
      for (let i = 0; i < tagList.length; i++) {
        for (let j = i + 1; j < tagList.length; j++) {
          const key = [tagList[i], tagList[j]].sort().join("+");
          coOccurrences[key] = (coOccurrences[key] || 0) + 1;
        }
      }
    }

    const chips = [];

    // Type-based chips: "All [type] sessions"
    const typeChips = ["vo2_session", "threshold_session", "sweet_spot_session", "endurance_steady", "tempo_ride"];
    for (const tagId of typeChips) {
      if ((tagCounts[tagId] || 0) >= 3) {
        chips.push({
          label: `All ${TAG_LABELS[tagId] || tagId} Sessions`,
          query: { tags: [tagId] },
          count: tagCounts[tagId],
          category: "workout_type",
        });
      }
    }

    // Environment comparison chips
    if ((tagCounts["hot_conditions"] || 0) >= 2) {
      chips.push({
        label: "Hot Conditions Impact",
        query: { tags: ["hot_conditions"] },
        count: tagCounts["hot_conditions"],
        category: "environment",
      });
    }

    // Readiness chips
    if ((tagCounts["low_hrv_day"] || 0) >= 2) {
      chips.push({
        label: "Low HRV Day Performance",
        query: { tags: ["low_hrv_day"] },
        count: tagCounts["low_hrv_day"],
        category: "readiness",
      });
    }
    if ((tagCounts["poor_sleep_day"] || 0) >= 2) {
      chips.push({
        label: "Poor Sleep Impact",
        query: { tags: ["poor_sleep_day"] },
        count: tagCounts["poor_sleep_day"],
        category: "readiness",
      });
    }

    // Co-occurrence comparison chips
    const interestingPairs = [
      { pair: ["vo2_session", "hot_conditions"], label: "VO2 in Heat" },
      { pair: ["threshold_session", "low_hrv_day"], label: "Threshold on Low HRV" },
      { pair: ["endurance_steady", "hot_conditions"], label: "Endurance in Heat" },
      { pair: ["vo2_session", "low_hrv_day"], label: "VO2 on Low HRV" },
      { pair: ["threshold_session", "indoor_trainer"], label: "Indoor Threshold" },
      { pair: ["race_day", "hot_conditions"], label: "Racing in Heat" },
    ];

    for (const { pair, label } of interestingPairs) {
      const key = pair.sort().join("+");
      if ((coOccurrences[key] || 0) >= 2) {
        chips.push({
          label,
          query: { tags: pair },
          count: coOccurrences[key],
          category: "comparison",
        });
      }
    }

    // Race day chip
    if ((tagCounts["race_day"] || 0) >= 1) {
      chips.push({
        label: "All Race Days",
        query: { tags: ["race_day"] },
        count: tagCounts["race_day"],
        category: "special",
      });
    }

    // Time-based chips
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().split("T")[0];
    const ninetyDaysAgo = new Date(now - 90 * 86400000).toISOString().split("T")[0];
    chips.push({
      label: "Last 30 Days",
      query: { from: thirtyDaysAgo },
      category: "time",
    });
    chips.push({
      label: "Last 90 Days",
      query: { from: ninetyDaysAgo },
      category: "time",
    });

    // High-intensity chip
    chips.push({
      label: "High Intensity (TSS > 100)",
      query: { minTSS: 100 },
      category: "intensity",
    });

    // Long rides chip
    chips.push({
      label: "Long Rides (> 3 hours)",
      query: { minDuration: 10800 },
      category: "duration",
    });

    // Sort: workout_type first, then comparison, then environment, etc.
    const categoryOrder = ["workout_type", "comparison", "environment", "readiness", "special", "intensity", "duration", "time"];
    chips.sort((a, b) => {
      const ai = categoryOrder.indexOf(a.category);
      const bi = categoryOrder.indexOf(b.category);
      return ai - bi;
    });

    return res.status(200).json({ chips: chips.slice(0, 20), tagCounts });
  } catch (err) {
    console.error("Smart chips error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function getDefaultChips() {
  const now = new Date();
  return [
    { label: "Last 30 Days", query: { from: new Date(now - 30 * 86400000).toISOString().split("T")[0] }, category: "time" },
    { label: "Last 90 Days", query: { from: new Date(now - 90 * 86400000).toISOString().split("T")[0] }, category: "time" },
    { label: "High Intensity (TSS > 100)", query: { minTSS: 100 }, category: "intensity" },
    { label: "Long Rides (> 3 hours)", query: { minDuration: 10800 }, category: "duration" },
  ];
}

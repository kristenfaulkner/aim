import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * GET /api/segments/list
 * Returns all segments for the authenticated user.
 *
 * Query params:
 *   - activity_id (optional): filter to segments appearing in a specific activity
 *   - limit (optional): max segments to return (default 50)
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { activity_id, limit: limitParam } = req.query;
  const limit = Math.min(parseInt(limitParam, 10) || 50, 100);

  try {
    if (activity_id) {
      // Get segments for a specific activity (with current effort + history)
      const { data: efforts, error: effortsErr } = await supabaseAdmin
        .from("segment_efforts")
        .select(`
          *,
          segment:segments(*)
        `)
        .eq("user_id", session.userId)
        .eq("activity_id", activity_id)
        .order("started_at", { ascending: true });

      if (effortsErr) throw effortsErr;

      // For each segment effort, fetch historical efforts on the same segment
      const segmentsWithHistory = [];
      for (const effort of (efforts || [])) {
        const { data: history } = await supabaseAdmin
          .from("segment_efforts")
          .select("id, elapsed_time_seconds, moving_time_seconds, avg_power_watts, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm, power_hr_ratio, efficiency_factor, started_at, strava_effort_id, adjusted_score, adjustment_factors, is_pr, temperature_c, tsb, hrv_morning_ms, sleep_score")
          .eq("segment_id", effort.segment_id)
          .eq("user_id", session.userId)
          .neq("id", effort.id)
          .order("started_at", { ascending: false })
          .limit(20);

        segmentsWithHistory.push({
          segment: effort.segment,
          currentEffort: effort,
          historicalEfforts: history || [],
          effortCount: (history?.length || 0) + 1,
        });
      }

      return res.status(200).json({ segments: segmentsWithHistory });
    }

    // All segments overview
    const { data: segments, error } = await supabaseAdmin
      .from("segments")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Get effort counts + PR info for each segment
    const segmentIds = (segments || []).map(s => s.id);
    const enrichedSegments = [];

    for (const seg of (segments || [])) {
      const { data: efforts } = await supabaseAdmin
        .from("segment_efforts")
        .select("elapsed_time_seconds, started_at, is_pr, adjusted_score")
        .eq("segment_id", seg.id)
        .eq("user_id", session.userId)
        .order("started_at", { ascending: false });

      const prEffort = efforts?.find(e => e.is_pr) ||
        (efforts?.length > 0 ? efforts.reduce((best, e) =>
          e.elapsed_time_seconds < best.elapsed_time_seconds ? e : best
        , efforts[0]) : null);

      enrichedSegments.push({
        ...seg,
        effort_count: efforts?.length || 0,
        pr_time: prEffort?.elapsed_time_seconds || null,
        pr_date: prEffort?.started_at || null,
        last_effort_date: efforts?.[0]?.started_at || null,
      });
    }

    return res.status(200).json({ segments: enrichedSegments });
  } catch (err) {
    console.error("[segments/list]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * GET /api/segments/detail?id=<segment_id>
 * Returns segment metadata + all efforts with adjusted scores.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const segmentId = req.query.id;
  if (!segmentId) return res.status(400).json({ error: "Segment ID required" });

  try {
    // Fetch segment metadata
    const { data: segment, error: segErr } = await supabaseAdmin
      .from("segments")
      .select("*")
      .eq("id", segmentId)
      .eq("user_id", session.userId)
      .single();

    if (segErr || !segment) {
      return res.status(404).json({ error: "Segment not found" });
    }

    // Fetch all efforts on this segment
    const { data: efforts, error: effErr } = await supabaseAdmin
      .from("segment_efforts")
      .select("*, activity:activities(name, started_at, activity_type)")
      .eq("segment_id", segmentId)
      .eq("user_id", session.userId)
      .order("started_at", { ascending: false });

    if (effErr) throw effErr;

    // Compute trend: adjusted score change over time
    const adjustedScores = (efforts || [])
      .filter(e => e.adjusted_score != null)
      .map(e => ({ date: e.started_at, score: e.adjusted_score }));

    let trend = null;
    if (adjustedScores.length >= 3) {
      const recent = adjustedScores.slice(0, Math.ceil(adjustedScores.length / 2));
      const older = adjustedScores.slice(Math.ceil(adjustedScores.length / 2));
      const recentAvg = recent.reduce((s, e) => s + e.score, 0) / recent.length;
      const olderAvg = older.reduce((s, e) => s + e.score, 0) / older.length;
      trend = {
        direction: recentAvg > olderAvg ? "improving" : recentAvg < olderAvg ? "declining" : "stable",
        pct_change: olderAvg > 0 ? Math.round((recentAvg - olderAvg) / olderAvg * 1000) / 10 : null,
        recent_avg: Math.round(recentAvg * 10) / 10,
        older_avg: Math.round(olderAvg * 10) / 10,
      };
    }

    return res.status(200).json({
      segment,
      efforts: efforts || [],
      effort_count: efforts?.length || 0,
      trend,
    });
  } catch (err) {
    console.error("[segments/detail]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

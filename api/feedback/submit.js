import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * POST /api/feedback/submit — Save thumbs up/down on an AI insight
 *
 * Body: { activity_id, source, insight_index, insight_category, insight_type, insight_title, feedback }
 *   - activity_id: UUID (nullable for non-activity insights like sleep)
 *   - source: 'activity_analysis' | 'dashboard' | 'sleep_summary' | 'chat'
 *   - insight_index: integer position in the insights array
 *   - insight_category: 'performance' | 'body' | 'recovery' | 'training' | 'nutrition' | 'environment' | 'health'
 *   - insight_type: 'insight' | 'positive' | 'warning' | 'action'
 *   - insight_title: string snapshot of the title
 *   - feedback: 1 (thumbs up) or -1 (thumbs down)
 *
 * Upserts on (user_id, activity_id, source, insight_index) — toggling re-submits overwrites.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const {
    activity_id,
    source,
    insight_index,
    insight_category,
    insight_type,
    insight_title,
    feedback,
  } = req.body;

  // Validate required fields
  if (!source || insight_index == null || feedback == null) {
    return res.status(400).json({ error: "source, insight_index, and feedback are required" });
  }
  if (feedback !== 1 && feedback !== -1) {
    return res.status(400).json({ error: "feedback must be 1 (up) or -1 (down)" });
  }
  const validSources = ["activity_analysis", "dashboard", "sleep_summary", "chat"];
  if (!validSources.includes(source)) {
    return res.status(400).json({ error: `source must be one of: ${validSources.join(", ")}` });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_feedback")
    .upsert(
      {
        user_id: session.userId,
        activity_id: activity_id || null,
        source,
        insight_index,
        insight_category: insight_category || null,
        insight_type: insight_type || null,
        insight_title: insight_title || null,
        feedback,
      },
      { onConflict: "user_id,activity_id,source,insight_index" }
    )
    .select("id, feedback, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ feedback: data });
}

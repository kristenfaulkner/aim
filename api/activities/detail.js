import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * GET /api/activities/detail?id=<uuid>
 * Returns full activity data including AI analysis.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing activity id" });

  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  if (error) {
    console.error("Activity detail error:", { id, userId: session.userId, error });
    return res.status(404).json({ error: "Activity not found", detail: error.message });
  }

  // Fetch activity tags (from separate table)
  const { data: tags } = await supabaseAdmin
    .from("activity_tags")
    .select("tag_id, scope, confidence, interval_index")
    .eq("activity_id", id)
    .eq("user_id", session.userId);

  data.activity_tags = tags || [];

  return res.status(200).json(data);
}

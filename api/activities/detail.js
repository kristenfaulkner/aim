import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { getPlannedVsActual } from "../_lib/planned-vs-actual.js";

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

  const [activityResult, profileResult] = await Promise.all([
    supabaseAdmin
      .from("activities")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single(),
    supabaseAdmin
      .from("profiles")
      .select("ftp_watts")
      .eq("id", session.userId)
      .single(),
  ]);

  if (activityResult.error) {
    console.error("Activity detail error:", { id, userId: session.userId, error: activityResult.error });
    return res.status(404).json({ error: "Activity not found", detail: activityResult.error.message });
  }

  const data = activityResult.data;
  const ftp = profileResult.data?.ftp_watts;

  // Fetch activity tags and planned vs actual in parallel
  const [tagsResult, plannedVsActualResult] = await Promise.allSettled([
    supabaseAdmin
      .from("activity_tags")
      .select("tag_id, scope, confidence, interval_index")
      .eq("activity_id", id)
      .eq("user_id", session.userId),
    getPlannedVsActual(session.userId, data, ftp),
  ]);

  data.activity_tags = tagsResult.status === "fulfilled" ? (tagsResult.value.data || []) : [];
  data.planned_vs_actual = plannedVsActualResult.status === "fulfilled" ? plannedVsActualResult.value : null;

  return res.status(200).json(data);
}

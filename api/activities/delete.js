import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { updateDailyMetrics } from "../_lib/training-load.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Missing activity id" });

  // Verify ownership (fetch started_at for metrics recomputation)
  const { data: activity, error: fetchErr } = await supabaseAdmin
    .from("activities")
    .select("id, user_id, started_at")
    .eq("id", id)
    .single();

  if (fetchErr || !activity) return res.status(404).json({ error: "Activity not found" });
  if (activity.user_id !== session.userId) return res.status(403).json({ error: "Forbidden" });

  // Delete related records first (tables that may not have CASCADE)
  await supabaseAdmin.from("activity_tags").delete().eq("activity_id", id);
  await supabaseAdmin.from("ai_feedback").delete().eq("activity_id", id);
  // Nullify travel_events FK references (no CASCADE)
  await supabaseAdmin.from("travel_events").update({ last_activity_before: null }).eq("last_activity_before", id);
  await supabaseAdmin.from("travel_events").update({ first_activity_after: null }).eq("first_activity_after", id);

  // Delete the activity (segment_efforts etc. cascade via FK)
  const { error: deleteErr } = await supabaseAdmin
    .from("activities")
    .delete()
    .eq("id", id);

  if (deleteErr) return res.status(500).json({ error: deleteErr.message });

  // Recompute daily TSS + CTL/ATL/TSB for the affected date
  try {
    await updateDailyMetrics(session.userId, { started_at: activity.started_at });
  } catch (_) {
    // Non-fatal: activity is already deleted, metrics will self-correct on next sync
  }

  return res.status(200).json({ success: true });
}

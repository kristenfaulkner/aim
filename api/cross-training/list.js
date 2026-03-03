import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * GET /api/cross-training/list — List recent cross-training entries
 *
 * Query params: ?days=30 (default 30)
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = parseInt(req.query.days, 10) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("cross_training_log")
    .select("*")
    .eq("user_id", session.userId)
    .gte("date", sinceDate)
    .order("date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ entries: data || [] });
}

/**
 * Backfill computed metrics for activities that have power data but are
 * missing TSS, IF, VI, EF, or work_kj.
 *
 * POST /api/activities/backfill-metrics
 *
 * Auto-triggered after syncs/imports and on dashboard load.
 * Also callable manually from Settings.
 */
import { verifySession, cors } from "../_lib/auth.js";
import { backfillUserMetrics } from "../_lib/backfill.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await backfillUserMetrics(session.userId);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Backfill metrics error:", err);
    return res.status(500).json({ error: err.message });
  }
}

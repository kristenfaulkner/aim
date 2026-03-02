import { verifySession, cors } from "../../_lib/auth.js";
import { backfillStravaSync } from "./strava.js";

/**
 * POST /api/integrations/sync/strava-backfill
 * Re-sync all Strava activities from the last N days (default 90).
 * Ignores last_sync_at — fetches everything with full pagination.
 *
 * Query params:
 *   days=90  — how far back to look (max 365)
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = Math.min(parseInt(req.query.days) || 90, 365);

  try {
    const { results, errors } = await backfillStravaSync(session.userId, days);
    return res.status(200).json({
      synced: results.length,
      failed: errors.length,
      days,
      activities: results.map(r => ({ name: r.name, date: r.started_at, tss: r.tss })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

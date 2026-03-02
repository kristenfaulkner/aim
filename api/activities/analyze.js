import { verifySession, cors } from "../_lib/auth.js";
import { analyzeActivity } from "../_lib/ai.js";

/**
 * POST /api/activities/analyze?id=<uuid>
 * Trigger (or regenerate) AI analysis for an activity.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing activity id" });

  try {
    const analysis = await analyzeActivity(session.userId, id);
    return res.status(200).json({ analysis });
  } catch (err) {
    console.error("AI analysis error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

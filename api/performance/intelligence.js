import { verifySession, cors } from "../_lib/auth.js";
import { getCachedPerformanceIntelligence } from "../_lib/performance-intelligence.js";

export const config = { maxDuration: 120 };

/**
 * POST /api/performance/intelligence
 * Cache-first endpoint for longitudinal performance analysis.
 * Intelligence is pre-computed in the background after data syncs.
 * Falls back to on-demand generation only on first-ever load.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { result, cached, stale, generatedAt } = await getCachedPerformanceIntelligence(session.userId);
    return res.status(200).json({ ...result, cached, stale, generatedAt });
  } catch (err) {
    console.error("Performance intelligence error:", err);
    const msg = err?.status === 401
      ? "Invalid ANTHROPIC_API_KEY"
      : err?.message || "Failed to generate performance intelligence";
    return res.status(500).json({ error: msg });
  }
}

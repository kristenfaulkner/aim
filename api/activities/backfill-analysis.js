import { verifySession, cors } from "../_lib/auth.js";
import { analyzeActivity } from "../_lib/ai.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export const config = { maxDuration: 300 };

/**
 * POST /api/activities/backfill-analysis
 * Generates AI analysis for activities that don't have one yet.
 * Processes up to `limit` activities (default 5) per call.
 * Returns count of processed/failed/remaining so the frontend can call again.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const limit = Math.min(parseInt(req.query.limit) || 5, 20);

  try {
    // Find activities without AI analysis, newest first
    const { data: activities, error: fetchErr } = await supabaseAdmin
      .from("activities")
      .select("id, name, started_at")
      .eq("user_id", session.userId)
      .is("ai_analysis", null)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (fetchErr) throw fetchErr;
    if (!activities || activities.length === 0) {
      return res.status(200).json({ processed: 0, failed: 0, remaining: 0 });
    }

    // Count total remaining
    const { count } = await supabaseAdmin
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .is("ai_analysis", null);

    let processed = 0;
    let failed = 0;

    // Process sequentially to avoid rate limits
    let creditError = false;
    for (const act of activities) {
      try {
        await analyzeActivity(session.userId, act.id);
        processed++;
      } catch (err) {
        console.error(`Backfill analysis failed for ${act.id}:`, err.message);
        failed++;
        // Stop early on credit/auth errors
        if (err.message?.includes("credit balance") || err.message?.includes("authentication")) {
          creditError = true;
          break;
        }
      }
    }

    if (creditError) {
      return res.status(402).json({
        error: "Anthropic API credit balance too low",
        processed,
        failed,
        remaining: Math.max(0, (count || 0) - processed),
      });
    }

    return res.status(200).json({
      processed,
      failed,
      remaining: Math.max(0, (count || 0) - processed),
    });
  } catch (err) {
    console.error("Backfill error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

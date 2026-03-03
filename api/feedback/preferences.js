import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * GET /api/feedback/preferences — Get user's insight category preferences
 *
 * Returns a map of category → { up, down, net } counts derived from all feedback.
 * Also returns the top 3 liked and top 3 disliked categories for AI prompt injection.
 *
 * Response: { categories: { performance: { up: 12, down: 2, net: 10 }, ... }, liked: [...], disliked: [...] }
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabaseAdmin
    .from("ai_feedback")
    .select("insight_category, feedback")
    .eq("user_id", session.userId);

  if (error) return res.status(500).json({ error: error.message });

  // Aggregate by category
  const categories = {};
  for (const row of data || []) {
    const cat = row.insight_category || "unknown";
    if (!categories[cat]) categories[cat] = { up: 0, down: 0, net: 0 };
    if (row.feedback === 1) categories[cat].up++;
    else if (row.feedback === -1) categories[cat].down++;
    categories[cat].net = categories[cat].up - categories[cat].down;
  }

  // Sort by net score — top 3 liked, bottom 3 disliked
  const sorted = Object.entries(categories)
    .map(([cat, counts]) => ({ category: cat, ...counts }))
    .sort((a, b) => b.net - a.net);

  const liked = sorted.filter(c => c.net > 0).slice(0, 3).map(c => c.category);
  const disliked = sorted.filter(c => c.net < 0).slice(0, 3).map(c => c.category);

  return res.status(200).json({ categories, liked, disliked });
}

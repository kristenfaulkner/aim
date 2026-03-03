import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { predictFatiguedPower } from "../_lib/durability.js";

/**
 * GET /api/durability/summary
 * Returns aggregate durability data: score, buckets, trend, recent rides, predictions.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const [profileResult, recentResult] = await Promise.all([
    supabaseAdmin
      .from("power_profiles")
      .select("durability_score, durability_buckets, durability_trend")
      .eq("user_id", session.userId)
      .eq("period_days", 90)
      .order("computed_date", { ascending: false })
      .limit(1)
      .single(),
    supabaseAdmin
      .from("activities")
      .select("id, name, started_at, durability_data")
      .eq("user_id", session.userId)
      .not("durability_data", "is", null)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const powerProfile = profileResult.data;
  const recentRides = (recentResult.data || []).map((a) => ({
    id: a.id,
    name: a.name,
    date: a.started_at,
    total_kj_per_kg: a.durability_data?.total_kj_per_kg,
    score_5m: a.durability_data?.score_5m,
    score_20m: a.durability_data?.score_20m,
  }));

  // Race predictions at common fatigue levels
  const buckets = powerProfile?.durability_buckets || [];
  const predictions = [30, 40, 50].map((kj) => {
    const pred = predictFatiguedPower(buckets, kj, "best_5m");
    return pred ? { kj_per_kg: kj, ...pred } : null;
  }).filter(Boolean);

  return res.status(200).json({
    score: powerProfile?.durability_score ?? null,
    buckets,
    trend: powerProfile?.durability_trend || [],
    recentRides,
    predictions,
  });
}

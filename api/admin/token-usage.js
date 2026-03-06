import { cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export const config = { maxDuration: 30 };

// Model pricing per million tokens (USD)
const PRICING = {
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4 },
};

function computeCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] || PRICING["claude-sonnet-4-6"];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

function verifyAdmin(req) {
  const pw = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD) return false;
  return pw === process.env.ADMIN_PASSWORD;
}

/**
 * GET /api/admin/token-usage
 * Query params: range (7d|30d|month|last_month|all), feature, tier, user_id
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  const { range = "30d", feature, tier, user_id } = req.query;

  // Compute date boundaries
  const now = new Date();
  let startDate;
  if (range === "7d") {
    startDate = new Date(now - 7 * 86400000);
  } else if (range === "30d") {
    startDate = new Date(now - 30 * 86400000);
  } else if (range === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    startDate = new Date("2020-01-01");
  }
  const startISO = startDate.toISOString();

  try {
    // ── 1. Raw rows (with profile join) ──
    let query = supabaseAdmin
      .from("token_usage")
      .select("id, user_id, feature, model, input_tokens, output_tokens, created_at, profiles!inner(full_name, subscription_tier)")
      .gte("created_at", startISO)
      .order("created_at", { ascending: false });

    if (feature) query = query.eq("feature", feature);
    if (user_id) query = query.eq("user_id", user_id);
    if (tier) query = query.eq("profiles.subscription_tier", tier);

    const { data: rows, error } = await query.limit(50000);
    if (error) {
      console.error("[admin/token-usage] query error:", error);
      return res.status(500).json({ error: error.message });
    }

    // ── 2. Compute aggregates ──
    // By feature
    const byFeature = {};
    // By model
    const byModel = {};
    // By user
    const byUser = {};
    // By day
    const byDay = {};
    // By tier
    const byTier = {};
    // Totals
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let totalCalls = 0;

    for (const row of rows) {
      const cost = computeCost(row.model, row.input_tokens, row.output_tokens);
      const day = row.created_at.split("T")[0];
      const userTier = row.profiles?.subscription_tier || "free";
      const userName = row.profiles?.full_name || "Unknown";

      totalInput += row.input_tokens;
      totalOutput += row.output_tokens;
      totalCost += cost;
      totalCalls++;

      // By feature
      if (!byFeature[row.feature]) byFeature[row.feature] = { calls: 0, input: 0, output: 0, cost: 0, model: row.model };
      byFeature[row.feature].calls++;
      byFeature[row.feature].input += row.input_tokens;
      byFeature[row.feature].output += row.output_tokens;
      byFeature[row.feature].cost += cost;

      // By model
      if (!byModel[row.model]) byModel[row.model] = { calls: 0, input: 0, output: 0, cost: 0 };
      byModel[row.model].calls++;
      byModel[row.model].input += row.input_tokens;
      byModel[row.model].output += row.output_tokens;
      byModel[row.model].cost += cost;

      // By user
      if (!byUser[row.user_id]) byUser[row.user_id] = { name: userName, tier: userTier, calls: 0, input: 0, output: 0, cost: 0 };
      byUser[row.user_id].calls++;
      byUser[row.user_id].input += row.input_tokens;
      byUser[row.user_id].output += row.output_tokens;
      byUser[row.user_id].cost += cost;

      // By day
      if (!byDay[day]) byDay[day] = { calls: 0, input: 0, output: 0, cost: 0 };
      byDay[day].calls++;
      byDay[day].input += row.input_tokens;
      byDay[day].output += row.output_tokens;
      byDay[day].cost += cost;

      // By tier
      if (!byTier[userTier]) byTier[userTier] = { users: new Set(), calls: 0, input: 0, output: 0, cost: 0, userCosts: [] };
      byTier[userTier].users.add(row.user_id);
      byTier[userTier].calls++;
      byTier[userTier].input += row.input_tokens;
      byTier[userTier].output += row.output_tokens;
      byTier[userTier].cost += cost;
    }

    // ── 3. Tier stats (avg, median, max, min per user) ──
    const tierRevenue = { free: 0, starter: 19, pro: 49, elite: 99 };
    const tierStats = {};
    for (const [t, data] of Object.entries(byTier)) {
      // Compute per-user costs within this tier
      const userCosts = [];
      for (const [uid, u] of Object.entries(byUser)) {
        if (u.tier === t) userCosts.push({ user_id: uid, name: u.name, cost: u.cost, calls: u.calls });
      }
      userCosts.sort((a, b) => b.cost - a.cost);
      const costs = userCosts.map((u) => u.cost);
      const sum = costs.reduce((a, b) => a + b, 0);
      const sorted = [...costs].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      tierStats[t] = {
        userCount: data.users.size,
        totalCost: data.cost,
        totalCalls: data.calls,
        avgCostPerUser: data.users.size > 0 ? sum / data.users.size : 0,
        medianCostPerUser: median || 0,
        maxCostPerUser: sorted[sorted.length - 1] || 0,
        minCostPerUser: sorted[0] || 0,
        revenuePerUser: tierRevenue[t] || 0,
        marginPerUser: (tierRevenue[t] || 0) - (data.users.size > 0 ? sum / data.users.size : 0),
        users: userCosts,
      };
    }

    // ── 4. User count (total active users in period) ──
    const activeUsers = Object.keys(byUser).length;

    // ── 5. Feature stats ──
    const featureStats = Object.entries(byFeature)
      .map(([f, d]) => ({
        feature: f,
        model: d.model,
        calls: d.calls,
        avgInput: Math.round(d.input / d.calls),
        avgOutput: Math.round(d.output / d.calls),
        totalCost: d.cost,
        avgCostPerCall: d.cost / d.calls,
        pctOfTotal: totalCost > 0 ? (d.cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // ── 6. Daily timeline ──
    const dailyTimeline = Object.entries(byDay)
      .map(([day, d]) => ({ date: day, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── 7. Model breakdown ──
    const modelBreakdown = Object.entries(byModel).map(([m, d]) => ({
      model: m,
      calls: d.calls,
      totalCost: d.cost,
      pctOfCost: totalCost > 0 ? (d.cost / totalCost) * 100 : 0,
    }));

    // ── 8. Top users ──
    const topUsers = Object.entries(byUser)
      .map(([uid, u]) => ({ user_id: uid, ...u }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 50);

    // ── 9. Revenue estimate ──
    const totalRevenue = Object.entries(byUser).reduce((sum, [, u]) => sum + (tierRevenue[u.tier] || 0), 0);

    return res.status(200).json({
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalCalls,
        totalInput,
        totalOutput,
        activeUsers,
        avgCostPerUser: activeUsers > 0 ? Math.round((totalCost / activeUsers) * 100) / 100 : 0,
        estimatedMonthlyRevenue: totalRevenue,
        grossMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100 : 0,
        range,
      },
      dailyTimeline,
      featureStats,
      modelBreakdown,
      tierStats,
      topUsers,
      pricing: PRICING,
    });
  } catch (err) {
    console.error("[admin/token-usage] error:", err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Backfill Critical Power model for users who already have power profiles.
 *
 * POST /api/activities/backfill-cp
 *
 * Auto-triggered on dashboard load (fire-and-forget).
 * Computes CP/W'/Pmax from existing power profile bests.
 */
import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { fitCPModel } from "../_lib/cp-model.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Fetch latest power profile
    const { data: profile } = await supabaseAdmin
      .from("power_profiles")
      .select("*")
      .eq("user_id", session.userId)
      .eq("period_days", 90)
      .order("computed_date", { ascending: false })
      .limit(1)
      .single();

    if (!profile) {
      return res.status(200).json({ message: "No power profile found", updated: false });
    }

    // Skip if CP already computed
    if (profile.cp_watts) {
      return res.status(200).json({ message: "CP already computed", cp_watts: profile.cp_watts, updated: false });
    }

    const cpResult = fitCPModel(profile);
    if (!cpResult) {
      return res.status(200).json({ message: "Insufficient data for CP model", updated: false });
    }

    await supabaseAdmin
      .from("power_profiles")
      .update({
        cp_watts: cpResult.cp_watts,
        w_prime_kj: cpResult.w_prime_kj,
        pmax_watts: cpResult.pmax_watts,
        cp_model_r_squared: cpResult.r_squared,
        cp_model_data: cpResult.model_data,
      })
      .eq("id", profile.id);

    return res.status(200).json({
      message: "CP model computed",
      cp_watts: cpResult.cp_watts,
      w_prime_kj: cpResult.w_prime_kj,
      pmax_watts: cpResult.pmax_watts,
      r_squared: cpResult.r_squared,
      updated: true,
    });
  } catch (err) {
    console.error("Backfill CP error:", err);
    return res.status(500).json({ error: err.message });
  }
}

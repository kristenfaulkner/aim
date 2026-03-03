import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import {
  computeAdaptiveZones,
  applyReadinessAdjustment,
  computeZoneDelta,
} from "../_lib/adaptive-zones.js";

/**
 * GET /api/zones/adaptive
 * Returns current adaptive zones, readiness-adjusted zones, zone delta, and preference.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const [profileResult, powerProfileResult, metricsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("ftp_watts, zone_preference")
      .eq("id", session.userId)
      .single(),
    supabaseAdmin
      .from("power_profiles")
      .select("cp_watts, cp_zones, zones_history")
      .eq("user_id", session.userId)
      .eq("period_days", 90)
      .order("computed_date", { ascending: false })
      .limit(1)
      .single(),
    supabaseAdmin
      .from("daily_metrics")
      .select("recovery_score, tsb")
      .eq("user_id", session.userId)
      .order("date", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const profile = profileResult.data;
  const powerProfile = powerProfileResult.data;
  const todayMetrics = metricsResult.data;

  const cp = powerProfile?.cp_watts || null;
  const ftp = profile?.ftp_watts || null;
  const preference = profile?.zone_preference || "auto";

  const adaptive = computeAdaptiveZones(cp, ftp, preference);
  if (!adaptive) {
    return res.status(200).json({
      zones: null,
      message: "No FTP or CP data available to compute zones",
    });
  }

  const adjusted = applyReadinessAdjustment(
    adaptive.zones,
    todayMetrics?.recovery_score ?? null,
    todayMetrics?.tsb ?? null
  );

  // Zone evolution: compare current to previous snapshot
  const history = powerProfile?.zones_history || [];
  const prevSnapshot = history.length >= 2 ? history[history.length - 2] : null;
  const delta = prevSnapshot ? computeZoneDelta(adaptive.zones, prevSnapshot.zones) : [];

  return res.status(200).json({
    zones: adaptive.zones,
    source: adaptive.source,
    referenceWatts: adaptive.referenceWatts,
    adjustedZones: adjusted.zones,
    adjustmentPct: adjusted.adjustmentPct,
    adjustmentReason: adjusted.reason,
    delta,
    preference,
    history: history.slice(-12), // last 12 snapshots
  });
}

import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * GET /api/segments/compare?segment_id=X&effort_a=Y&effort_b=Z
 * Side-by-side comparison of two efforts on the same segment.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { segment_id, effort_a, effort_b } = req.query;
  if (!segment_id || !effort_a || !effort_b) {
    return res.status(400).json({ error: "segment_id, effort_a, and effort_b required" });
  }

  try {
    // Fetch both efforts in parallel
    const [resA, resB, resSeg] = await Promise.all([
      supabaseAdmin
        .from("segment_efforts")
        .select("*, activity:activities(name, started_at, activity_type)")
        .eq("id", effort_a)
        .eq("user_id", session.userId)
        .single(),
      supabaseAdmin
        .from("segment_efforts")
        .select("*, activity:activities(name, started_at, activity_type)")
        .eq("id", effort_b)
        .eq("user_id", session.userId)
        .single(),
      supabaseAdmin
        .from("segments")
        .select("*")
        .eq("id", segment_id)
        .eq("user_id", session.userId)
        .single(),
    ]);

    if (!resA.data || !resB.data) {
      return res.status(404).json({ error: "One or both efforts not found" });
    }
    if (!resSeg.data) {
      return res.status(404).json({ error: "Segment not found" });
    }

    const a = resA.data;
    const b = resB.data;

    // Compute deltas
    const deltas = {
      elapsed_time: a.elapsed_time_seconds - b.elapsed_time_seconds,
      avg_power: (a.avg_power_watts && b.avg_power_watts)
        ? Math.round((a.avg_power_watts - b.avg_power_watts) * 10) / 10 : null,
      avg_hr: (a.avg_hr_bpm && b.avg_hr_bpm)
        ? Math.round((a.avg_hr_bpm - b.avg_hr_bpm) * 10) / 10 : null,
      power_hr_ratio: (a.power_hr_ratio && b.power_hr_ratio)
        ? Math.round((a.power_hr_ratio - b.power_hr_ratio) * 100) / 100 : null,
      efficiency_factor: (a.efficiency_factor && b.efficiency_factor)
        ? Math.round((a.efficiency_factor - b.efficiency_factor) * 100) / 100 : null,
      adjusted_score: (a.adjusted_score && b.adjusted_score)
        ? Math.round((a.adjusted_score - b.adjusted_score) * 10) / 10 : null,
      temperature: (a.temperature_c != null && b.temperature_c != null)
        ? Math.round((a.temperature_c - b.temperature_c) * 10) / 10 : null,
      tsb: (a.tsb != null && b.tsb != null)
        ? Math.round((a.tsb - b.tsb) * 10) / 10 : null,
      hrv: (a.hrv_morning_ms != null && b.hrv_morning_ms != null)
        ? Math.round((a.hrv_morning_ms - b.hrv_morning_ms) * 10) / 10 : null,
    };

    return res.status(200).json({
      segment: resSeg.data,
      effort_a: a,
      effort_b: b,
      deltas,
    });
  } catch (err) {
    console.error("[segments/compare]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

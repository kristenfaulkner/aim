/**
 * Backfill computed metrics for activities that have power data but are
 * missing TSS, IF, VI, or EF — typically because FTP wasn't set at import
 * time.
 *
 * POST /api/activities/backfill-metrics
 *
 * Recalculates using the user's current FTP:
 *   - Intensity Factor (IF) = NP / FTP
 *   - TSS = (duration × NP × IF) / (FTP × 3600) × 100
 *   - Variability Index (VI) = NP / avg power
 *   - Efficiency Factor (EF) = NP / avg HR
 *
 * Also recomputes daily_metrics training load for affected dates.
 */
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import {
  intensityFactor,
  trainingStressScore,
  variabilityIndex,
  efficiencyFactor,
} from "../_lib/metrics.js";
import { updateDailyMetrics } from "../_lib/training-load.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get user's current FTP
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts")
      .eq("id", session.userId)
      .single();

    const ftp = profile?.ftp_watts;
    if (!ftp) {
      return res.status(400).json({ error: "FTP not set. Please set your FTP in Settings first." });
    }

    // Find activities with power data but missing computed metrics
    const { data: activities, error: fetchErr } = await supabaseAdmin
      .from("activities")
      .select("id, normalized_power_watts, avg_power_watts, avg_hr_bpm, duration_seconds, tss, intensity_factor, variability_index, efficiency_factor, started_at")
      .eq("user_id", session.userId)
      .not("normalized_power_watts", "is", null)
      .gt("normalized_power_watts", 0);

    if (fetchErr) throw fetchErr;

    let updated = 0;
    let skipped = 0;

    for (const act of activities || []) {
      const np = act.normalized_power_watts;
      const avgPower = act.avg_power_watts;
      const avgHr = act.avg_hr_bpm;
      const duration = act.duration_seconds;

      // Compute metrics that are missing or need recalculation
      const newIf = intensityFactor(np, ftp);
      const newTss = trainingStressScore(duration, np, newIf, ftp);
      const newVi = variabilityIndex(np, avgPower);
      const newEf = efficiencyFactor(np, avgHr);

      // Build update object — only update fields that are missing or have changed
      const updates = {};
      if (act.tss == null && newTss != null) updates.tss = newTss;
      if (act.intensity_factor == null && newIf != null) updates.intensity_factor = newIf;
      if (act.variability_index == null && newVi != null) updates.variability_index = newVi;
      if (act.efficiency_factor == null && newEf != null) updates.efficiency_factor = newEf;

      // Also recalculate TSS/IF if FTP changed (existing values computed with old FTP)
      if (act.tss != null && newTss != null && act.tss !== newTss) {
        updates.tss = newTss;
        updates.intensity_factor = newIf;
      }

      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      await supabaseAdmin
        .from("activities")
        .update(updates)
        .eq("id", act.id);

      // Update daily training load if TSS changed
      if (updates.tss) {
        await updateDailyMetrics(session.userId, {
          started_at: act.started_at,
          tss: updates.tss,
        });
      }

      updated++;
    }

    return res.status(200).json({
      updated,
      skipped,
      total: (activities || []).length,
      ftp_used: ftp,
    });
  } catch (err) {
    console.error("Backfill metrics error:", err);
    return res.status(500).json({ error: err.message });
  }
}

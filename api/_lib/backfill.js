/**
 * Shared backfill utility — recalculates derived metrics for activities
 * that have power data but are missing TSS, IF, VI, EF, or work_kj.
 *
 * Called automatically after every sync/import and on dashboard load
 * so metrics are always up-to-date with the user's current FTP.
 */
import { supabaseAdmin } from "./supabase.js";
import {
  intensityFactor,
  trainingStressScore,
  variabilityIndex,
  efficiencyFactor,
} from "./metrics.js";
import { updateDailyMetrics } from "./training-load.js";

/**
 * Backfill computed metrics for a user's activities.
 *
 * @param {string} userId
 * @returns {{ updated: number, skipped: number, total: number, ftp_used: number|null }}
 */
export async function backfillUserMetrics(userId) {
  // Get user's current FTP
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("ftp_watts")
    .eq("id", userId)
    .single();

  const ftp = profile?.ftp_watts;
  if (!ftp) {
    return { updated: 0, skipped: 0, total: 0, ftp_used: null };
  }

  // Find activities with any power data (NP or avg power)
  const { data: activities, error: fetchErr } = await supabaseAdmin
    .from("activities")
    .select("id, normalized_power_watts, avg_power_watts, avg_hr_bpm, duration_seconds, tss, intensity_factor, variability_index, efficiency_factor, work_kj, started_at")
    .eq("user_id", userId)
    .or("normalized_power_watts.gt.0,avg_power_watts.gt.0");

  if (fetchErr) throw fetchErr;

  let updated = 0;
  let skipped = 0;

  for (const act of activities || []) {
    const np = act.normalized_power_watts;
    const avgPower = act.avg_power_watts;
    const avgHr = act.avg_hr_bpm;
    const duration = act.duration_seconds;

    // Use NP when available; fall back to avg_power for TSS estimation
    const powerForCalc = np || avgPower;

    // Compute all derivable metrics
    const newIf = intensityFactor(powerForCalc, ftp);
    const newTss = trainingStressScore(duration, powerForCalc, newIf, ftp);
    const newVi = np ? variabilityIndex(np, avgPower) : null;
    const newEf = np ? efficiencyFactor(np, avgHr) : null;
    // Estimate work_kj from avg power when missing (exact requires stream data)
    const estimatedWorkKj = avgPower && duration
      ? Math.round(avgPower * duration / 1000)
      : null;

    const updates = {};

    // Fill missing fields
    if (act.tss == null && newTss != null) updates.tss = newTss;
    if (act.intensity_factor == null && newIf != null) updates.intensity_factor = newIf;
    if (act.variability_index == null && newVi != null) updates.variability_index = newVi;
    if (act.efficiency_factor == null && newEf != null) updates.efficiency_factor = newEf;
    if (act.work_kj == null && estimatedWorkKj != null) updates.work_kj = estimatedWorkKj;

    // Recalculate TSS/IF if FTP changed (stored value differs from computed)
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
      await updateDailyMetrics(userId, {
        started_at: act.started_at,
        tss: updates.tss,
      });
    }

    updated++;
  }

  return { updated, skipped, total: (activities || []).length, ftp_used: ftp };
}

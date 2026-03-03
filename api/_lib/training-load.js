/**
 * Shared training load functions — used by Strava sync, TrainingPeaks import,
 * and any future activity import pipeline.
 */
import { supabaseAdmin } from "./supabase.js";
import { computeTrainingLoad, findNewBests } from "./metrics.js";
import { fitCPModel } from "./cp-model.js";

/**
 * Update daily_metrics with TSS and recompute CTL/ATL/TSB.
 */
export async function updateDailyMetrics(userId, activity) {
  const activityDate = new Date(activity.started_at).toISOString().split("T")[0];

  // Get or create daily_metrics row for this date
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, daily_tss")
    .eq("user_id", userId)
    .eq("date", activityDate)
    .single();

  const newTss = (existing?.daily_tss || 0) + (activity.tss || 0);

  if (existing) {
    await supabaseAdmin
      .from("daily_metrics")
      .update({ daily_tss: newTss })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("daily_metrics")
      .insert({ user_id: userId, date: activityDate, daily_tss: newTss });
  }

  // Recompute CTL/ATL/TSB for the last 90 days
  const { data: dailyData } = await supabaseAdmin
    .from("daily_metrics")
    .select("date, daily_tss")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .limit(365);

  if (dailyData && dailyData.length > 0) {
    const loadData = computeTrainingLoad(
      dailyData.map(d => ({ date: d.date, tss: d.daily_tss || 0 }))
    );

    // Update the most recent 7 days (where values might have changed)
    const recentLoad = loadData.slice(-7);
    for (const day of recentLoad) {
      await supabaseAdmin
        .from("daily_metrics")
        .update({
          ctl: day.ctl,
          atl: day.atl,
          tsb: day.tsb,
          ramp_rate: day.ramp_rate,
        })
        .eq("user_id", userId)
        .eq("date", day.date);
    }
  }
}

/**
 * Check and update power profile with any new personal bests.
 */
export async function updatePowerProfile(userId, newCurve, weightKg) {
  const today = new Date().toISOString().split("T")[0];

  // Get or create current power profile (90-day rolling)
  const { data: existing } = await supabaseAdmin
    .from("power_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("period_days", 90)
    .order("computed_date", { ascending: false })
    .limit(1)
    .single();

  const bests = findNewBests(newCurve, existing || {}, weightKg);

  if (bests) {
    if (existing && existing.computed_date === today) {
      // Update today's profile
      await supabaseAdmin
        .from("power_profiles")
        .update(bests)
        .eq("id", existing.id);
    } else {
      // Create new profile entry
      await supabaseAdmin
        .from("power_profiles")
        .upsert({
          user_id: userId,
          computed_date: today,
          period_days: 90,
          ...(existing ? {
            best_5s_watts: existing.best_5s_watts,
            best_30s_watts: existing.best_30s_watts,
            best_1m_watts: existing.best_1m_watts,
            best_5m_watts: existing.best_5m_watts,
            best_20m_watts: existing.best_20m_watts,
            best_60m_watts: existing.best_60m_watts,
            best_5s_wkg: existing.best_5s_wkg,
            best_30s_wkg: existing.best_30s_wkg,
            best_1m_wkg: existing.best_1m_wkg,
            best_5m_wkg: existing.best_5m_wkg,
            best_20m_wkg: existing.best_20m_wkg,
            best_60m_wkg: existing.best_60m_wkg,
          } : {}),
          ...bests,
        }, { onConflict: "user_id,computed_date,period_days" });
    }
  }

  // Recompute CP model from the full profile (fire-and-forget)
  try {
    const { data: profile } = await supabaseAdmin
      .from("power_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("period_days", 90)
      .order("computed_date", { ascending: false })
      .limit(1)
      .single();

    if (profile) {
      const cpResult = fitCPModel(profile);
      if (cpResult) {
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
      }
    }
  } catch (err) {
    console.error("CP model update failed (non-blocking):", err.message);
  }
}

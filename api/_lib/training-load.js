/**
 * Shared training load functions — used by Strava sync, TrainingPeaks import,
 * and any future activity import pipeline.
 */
import { supabaseAdmin } from "./supabase.js";
import { computeTrainingLoad, findNewBests } from "./metrics.js";
import { fitCPModel, computeCPZones } from "./cp-model.js";
import { buildZonesSnapshot } from "./adaptive-zones.js";
import { aggregateDurability } from "./durability.js";

/**
 * Update daily_metrics with TSS and recompute CTL/ATL/TSB.
 * Idempotent: always recomputes daily_tss from all activities on that date.
 */
export async function updateDailyMetrics(userId, activity) {
  const activityDate = new Date(activity.started_at).toISOString().split("T")[0];

  // Compute daily TSS by summing all activities on this date (idempotent)
  const { data: dayActivities } = await supabaseAdmin
    .from("activities")
    .select("tss")
    .eq("user_id", userId)
    .gte("started_at", activityDate + "T00:00:00Z")
    .lt("started_at", activityDate + "T23:59:59.999Z");

  const newTss = (dayActivities || []).reduce((sum, a) => sum + (a.tss || 0), 0);

  // Get or create daily_metrics row for this date
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id")
    .eq("user_id", userId)
    .eq("date", activityDate)
    .single();

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
        // Auto-compute CP zones and append to zone history
        const cpZones = computeCPZones(cpResult.cp_watts);
        const snapshot = buildZonesSnapshot(cpResult.cp_watts, cpZones, today);
        const existingHistory = profile.zones_history || [];
        const updatedHistory = [...existingHistory, snapshot].slice(-52); // keep ~1 year

        await supabaseAdmin
          .from("power_profiles")
          .update({
            cp_watts: cpResult.cp_watts,
            w_prime_kj: cpResult.w_prime_kj,
            pmax_watts: cpResult.pmax_watts,
            cp_model_r_squared: cpResult.r_squared,
            cp_model_data: cpResult.model_data,
            cp_zones: cpZones,
            zones_history: updatedHistory,
          })
          .eq("id", profile.id);
      }

      // Aggregate durability from recent activities (fire-and-forget)
      try {
        const { data: recentDurability } = await supabaseAdmin
          .from("activities")
          .select("started_at, durability_data")
          .eq("user_id", userId)
          .not("durability_data", "is", null)
          .gte("started_at", new Date(Date.now() - 90 * 86400000).toISOString())
          .order("started_at", { ascending: false })
          .limit(50);

        if (recentDurability?.length >= 3) {
          const agg = aggregateDurability(
            recentDurability.map((a) => ({
              date: a.started_at.split("T")[0],
              durability_data: a.durability_data,
            }))
          );
          if (agg) {
            await supabaseAdmin
              .from("power_profiles")
              .update({
                durability_score: agg.avgScore,
                durability_buckets: agg.bestBuckets,
                durability_trend: agg.trend,
              })
              .eq("id", profile.id);
          }
        }
      } catch (err) {
        console.error("Durability aggregation failed (non-blocking):", err.message);
      }
    }
  } catch (err) {
    console.error("CP model update failed (non-blocking):", err.message);
  }
}

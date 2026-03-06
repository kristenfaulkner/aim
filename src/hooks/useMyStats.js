import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Custom hook that fetches all athlete stats data in parallel.
 * RLS handles auth scoping — no manual user_id filters needed on most queries.
 */
export function useMyStats() {
  const { user, profile } = useAuth();
  const [powerProfile, setPowerProfile] = useState(null);
  const [latestMetrics, setLatestMetrics] = useState(null);
  const [latestRecovery, setLatestRecovery] = useState(null);
  const [recentMetrics, setRecentMetrics] = useState([]);
  const [latestDexa, setLatestDexa] = useState(null);
  const [observedMaxHR, setObservedMaxHR] = useState(null);
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [
        powerProfileResult,
        latestMetricsResult,
        latestRecoveryResult,
        recentMetricsResult,
        dexaResult,
        maxHRResult,
        modelsResult,
      ] = await Promise.allSettled([
        // Latest power profile (bests + CP model)
        supabase
          .from("power_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("computed_date", { ascending: false })
          .limit(1)
          .single(),

        // Latest daily metrics with training load (CTL/ATL/TSB)
        supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", user.id)
          .not("ctl", "is", null)
          .order("date", { ascending: false })
          .limit(1)
          .single(),

        // Latest daily metrics row (for recovery data — may not have CTL)
        supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .single(),

        // Last 30 days for averages
        supabase
          .from("daily_metrics")
          .select("date, hrv_ms, resting_hr_bpm, sleep_score, total_sleep_seconds, deep_sleep_seconds, recovery_score")
          .eq("user_id", user.id)
          .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
          .order("date", { ascending: false }),

        // Latest DEXA scan (optional)
        supabase
          .from("dexa_scans")
          .select("*")
          .eq("user_id", user.id)
          .order("scan_date", { ascending: false })
          .limit(1)
          .single(),

        // Observed max HR from activities (fallback if profile.max_hr_bpm not set)
        supabase
          .from("activities")
          .select("max_hr_bpm")
          .eq("user_id", user.id)
          .not("max_hr_bpm", "is", null)
          .order("max_hr_bpm", { ascending: false })
          .limit(1)
          .single(),

        // Performance models
        apiFetch("/models/summary").catch(() => null),
      ]);

      if (powerProfileResult.status === "fulfilled" && powerProfileResult.value.data) {
        setPowerProfile(powerProfileResult.value.data);
      }
      if (latestMetricsResult.status === "fulfilled" && latestMetricsResult.value.data) {
        setLatestMetrics(latestMetricsResult.value.data);
      }
      if (latestRecoveryResult.status === "fulfilled" && latestRecoveryResult.value.data) {
        setLatestRecovery(latestRecoveryResult.value.data);
      }
      if (recentMetricsResult.status === "fulfilled" && recentMetricsResult.value.data) {
        setRecentMetrics(recentMetricsResult.value.data);
      }
      if (dexaResult.status === "fulfilled" && dexaResult.value.data) {
        setLatestDexa(dexaResult.value.data);
      }
      if (maxHRResult.status === "fulfilled" && maxHRResult.value.data?.max_hr_bpm) {
        setObservedMaxHR(Math.round(maxHRResult.value.data.max_hr_bpm));
      }
      if (modelsResult.status === "fulfilled" && modelsResult.value) {
        setModels(modelsResult.value.models || null);
      }
    } catch (err) {
      console.error("MyStats data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute 30-day averages
  const averages = computeAverages(recentMetrics);

  return {
    profile,
    powerProfile,
    latestMetrics,
    latestRecovery,
    latestDexa,
    observedMaxHR,
    averages,
    models,
    loading,
  };
}

function computeAverages(metrics) {
  if (!metrics || metrics.length === 0) return null;

  const avg = (arr) => {
    const valid = arr.filter((v) => v != null);
    return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
  };

  return {
    hrv: avg(metrics.map((m) => m.hrv_ms)),
    rhr: avg(metrics.map((m) => m.resting_hr_bpm)),
    sleepScore: avg(metrics.map((m) => m.sleep_score)),
    sleepTotal: avg(metrics.map((m) => m.total_sleep_seconds)),
    deepSleep: avg(metrics.map((m) => m.deep_sleep_seconds)),
    recoveryScore: avg(metrics.map((m) => m.recovery_score)),
    days: metrics.length,
  };
}

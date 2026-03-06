import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export function usePerformanceData() {
  const { user, profile } = useAuth();
  const [powerProfile, setPowerProfile] = useState(null);
  const [models, setModels] = useState(null);
  const [durabilityScore, setDurabilityScore] = useState(null);
  const [latestMetrics, setLatestMetrics] = useState(null);
  const [activityCount, setActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    try {
      const [ppResult, metricsResult, countResult, modelsResult, durResult] = await Promise.allSettled([
        supabase
          .from("power_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("computed_date", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        apiFetch("/models/summary"),
        apiFetch("/durability/summary").catch(() => null),
      ]);

      if (ppResult.status === "fulfilled" && ppResult.value.data) setPowerProfile(ppResult.value.data);
      if (metricsResult.status === "fulfilled" && metricsResult.value.data) setLatestMetrics(metricsResult.value.data);
      if (countResult.status === "fulfilled") setActivityCount(countResult.value.count || 0);
      if (modelsResult.status === "fulfilled") setModels(modelsResult.value?.models || null);
      if (durResult.status === "fulfilled" && durResult.value?.score != null) setDurabilityScore(durResult.value.score);
    } catch (err) {
      console.error("Performance data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { profile, powerProfile, models, durabilityScore, latestMetrics, activityCount, loading };
}

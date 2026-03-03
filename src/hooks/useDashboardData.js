import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Custom hook that fetches all dashboard data in parallel from Supabase.
 * RLS handles auth scoping — no need for manual user_id filters on most queries.
 */
export function useDashboardData(selectedActivityId = null) {
  const { user, profile } = useAuth();
  const backfillRan = useRef(false);
  const [activity, setActivity] = useState(null);
  const [dailyMetrics, setDailyMetrics] = useState(null);
  const [fitnessHistory, setFitnessHistory] = useState([]);
  const [powerProfile, setPowerProfile] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build activity query — either specific activity or latest
      const activityQuery = selectedActivityId
        ? supabase
            .from("activities")
            .select("*")
            .eq("id", selectedActivityId)
            .single()
        : supabase
            .from("activities")
            .select("*")
            .eq("user_id", user.id)
            .order("started_at", { ascending: false })
            .limit(1)
            .single();

      // Run all queries in parallel
      const [
        activityResult,
        dailyMetricsResult,
        fitnessResult,
        powerProfileResult,
        recentResult,
        integrationsResult,
      ] = await Promise.allSettled([
        // Query 1: Activity (latest or selected)
        activityQuery,

        // Query 2: Latest daily_metrics
        supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .single(),

        // Query 3: Last 12 weeks daily_metrics for fitness chart
        supabase
          .from("daily_metrics")
          .select("date, daily_tss, ctl, atl, tsb")
          .eq("user_id", user.id)
          .gte("date", new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          .order("date", { ascending: true }),

        // Query 4: Latest power_profiles
        supabase
          .from("power_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("computed_date", { ascending: false })
          .limit(1)
          .single(),

        // Query 5: Recent activities (last 7 days for weekly TSS)
        supabase
          .from("activities")
          .select("id, name, started_at, tss, duration_seconds")
          .eq("user_id", user.id)
          .gte("started_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("started_at", { ascending: true }),

        // Query 6: Connected integrations
        supabase
          .from("integrations")
          .select("provider")
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);

      // Process results — use data if fulfilled, null/[] if rejected
      if (activityResult.status === "fulfilled" && activityResult.value.data) {
        setActivity(activityResult.value.data);
      } else {
        setActivity(null);
      }

      if (dailyMetricsResult.status === "fulfilled" && dailyMetricsResult.value.data) {
        setDailyMetrics(dailyMetricsResult.value.data);
      } else {
        setDailyMetrics(null);
      }

      if (fitnessResult.status === "fulfilled" && fitnessResult.value.data) {
        setFitnessHistory(fitnessResult.value.data);
      } else {
        setFitnessHistory([]);
      }

      if (powerProfileResult.status === "fulfilled" && powerProfileResult.value.data) {
        setPowerProfile(powerProfileResult.value.data);
      } else {
        setPowerProfile(null);
      }

      if (recentResult.status === "fulfilled" && recentResult.value.data) {
        setRecentActivities(recentResult.value.data);
      } else {
        setRecentActivities([]);
      }

      if (integrationsResult.status === "fulfilled" && integrationsResult.value.data) {
        setConnectedIntegrations(integrationsResult.value.data.map(i => i.provider));
      } else {
        setConnectedIntegrations([]);
      }
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user, selectedActivityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-backfill derived metrics once per mount (fire-and-forget)
  useEffect(() => {
    if (user && !backfillRan.current) {
      backfillRan.current = true;
      apiFetch("/activities/backfill-metrics", { method: "POST" }).catch(() => {});
      apiFetch("/activities/backfill-cp", { method: "POST" }).catch(() => {});
      apiFetch("/activities/backfill-wbal", { method: "POST" }).catch(() => {});
    }
  }, [user]);

  return {
    activity,
    profile,
    dailyMetrics,
    fitnessHistory,
    powerProfile,
    recentActivities,
    connectedIntegrations,
    loading,
    error,
    refetch: fetchData,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const PERIOD_DAYS = { "7d": 7, "30d": 30, "90d": 90, "1y": 365, all: null };

/**
 * Custom hook that fetches sleep data from daily_metrics.
 * Returns history, latest night, and computed averages for the selected period.
 */
export function useSleepData(period = "30d") {
  const { user } = useAuth();
  const [sleepHistory, setSleepHistory] = useState([]);
  const [latestNight, setLatestNight] = useState(null);
  const [averages, setAverages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("daily_metrics")
        .select("date, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, sleep_latency_seconds, sleep_efficiency_pct, sleep_onset_time, wake_time, bed_temperature_celsius, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, respiratory_rate, blood_oxygen_pct, recovery_score, readiness_score, source_data, hrv_source, rhr_source, sleep_hr_source")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      const days = PERIOD_DAYS[period];
      if (days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          .toISOString().split("T")[0];
        query = query.gte("date", cutoff);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      // Filter to rows that actually have sleep data
      const sleepRows = (data || []).filter(
        r => r.sleep_score != null || r.total_sleep_seconds != null
      );

      setSleepHistory(sleepRows);
      setLatestNight(sleepRows.length > 0 ? sleepRows[sleepRows.length - 1] : null);

      // Compute averages
      if (sleepRows.length > 0) {
        const avg = (key) => {
          const vals = sleepRows.map(r => r[key]).filter(v => v != null);
          return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
        };
        setAverages({
          sleep_score: avg("sleep_score"),
          total_sleep_seconds: avg("total_sleep_seconds"),
          deep_sleep_seconds: avg("deep_sleep_seconds"),
          rem_sleep_seconds: avg("rem_sleep_seconds"),
          light_sleep_seconds: avg("light_sleep_seconds"),
          sleep_efficiency_pct: avg("sleep_efficiency_pct"),
          hrv_ms: avg("hrv_ms"),
          hrv_overnight_avg_ms: avg("hrv_overnight_avg_ms"),
          resting_hr_bpm: avg("resting_hr_bpm"),
          respiratory_rate: avg("respiratory_rate"),
        });
      } else {
        setAverages(null);
      }
    } catch (err) {
      console.error("Sleep data fetch error:", err);
      setError(err.message || "Failed to load sleep data");
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { sleepHistory, latestNight, averages, loading, error, refetch: fetchData };
}

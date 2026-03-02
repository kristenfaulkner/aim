import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 50;

/**
 * Hook for the Activity Browser — fetches activities with cursor-based pagination
 * and time/year/month filtering. Only fetches when `enabled` is true.
 */
export function useActivityBrowser({ enabled = false, initialTimePeriod = "month" }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [timePeriod, setTimePeriod] = useState(initialTimePeriod);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed
  const [searchQuery, setSearchQuery] = useState("");
  const [oldestYear, setOldestYear] = useState(new Date().getFullYear());
  const cursorRef = useRef(null);
  const fetchingRef = useRef(false);

  // Fetch the oldest activity year on mount
  useEffect(() => {
    if (!user || !enabled) return;
    supabase
      .from("activities")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOldestYear(new Date(data[0].started_at).getFullYear());
        }
      });
  }, [user, enabled]);

  /** Returns { start, end } ISO strings for the current filter, or null for "all" */
  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (timePeriod) {
      case "week": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return { start: d.toISOString(), end: null };
      }
      case "month": {
        const start = new Date(selectedYear, selectedMonth, 1);
        const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
      }
      case "year": {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
      }
      default:
        return { start: null, end: null };
    }
  }, [timePeriod, selectedYear, selectedMonth]);

  const fetchPage = useCallback(async (reset = false, search = "") => {
    if (!user || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      let query = supabase
        .from("activities")
        .select("id, name, started_at, tss, duration_seconds, distance_meters, avg_power_watts, activity_type, elevation_gain_meters")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(PAGE_SIZE);

      // When searching, query across all time; otherwise apply date range
      if (search) {
        query = query.ilike("name", `%${search}%`);
      } else {
        const range = getDateRange();
        if (range.start) {
          query = query.gte("started_at", range.start);
        }
        if (range.end) {
          query = query.lte("started_at", range.end);
        }
      }

      if (!reset && cursorRef.current) {
        query = query.lt("started_at", cursorRef.current);
      }

      const { data } = await query;

      if (data) {
        if (reset) {
          setActivities(data);
        } else {
          setActivities(prev => [...prev, ...data]);
        }
        cursorRef.current = data.length > 0 ? data[data.length - 1].started_at : cursorRef.current;
        setHasMore(data.length === PAGE_SIZE);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, getDateRange]);

  // Reset and fetch when filters change or browser opens
  useEffect(() => {
    if (enabled && user) {
      cursorRef.current = null;
      setActivities([]);
      setHasMore(true);
      fetchPage(true, searchQuery);
    }
  }, [timePeriod, selectedYear, selectedMonth, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced server-side search — re-fetches when query changes
  useEffect(() => {
    if (!enabled || !user) return;
    const timer = setTimeout(() => {
      cursorRef.current = null;
      setActivities([]);
      setHasMore(true);
      fetchPage(true, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    activities,
    loading,
    hasMore,
    timePeriod,
    setTimePeriod,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    oldestYear,
    searchQuery,
    setSearchQuery,
    loadMore: () => fetchPage(false, searchQuery),
  };
}

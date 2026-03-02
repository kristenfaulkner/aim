import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 50;

/**
 * Hook for the Activity Browser — fetches activities with cursor-based pagination
 * and time period filtering. Only fetches when `enabled` is true.
 */
export function useActivityBrowser({ enabled = false }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [timePeriod, setTimePeriod] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");
  const cursorRef = useRef(null);
  const fetchingRef = useRef(false);

  const getDateThreshold = useCallback((period) => {
    const now = new Date();
    switch (period) {
      case "week": {
        const d = new Date(now);
        const day = d.getDay();
        d.setDate(d.getDate() - ((day + 6) % 7)); // Monday
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      }
      case "month":
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case "year":
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return null;
    }
  }, []);

  const fetchPage = useCallback(async (reset = false) => {
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

      const threshold = getDateThreshold(timePeriod);
      if (threshold) {
        query = query.gte("started_at", threshold);
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
  }, [user, timePeriod, getDateThreshold]);

  // Reset and fetch when time period changes or browser opens
  useEffect(() => {
    if (enabled && user) {
      cursorRef.current = null;
      setActivities([]);
      setHasMore(true);
      fetchPage(true);
    }
  }, [timePeriod, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    activities,
    loading,
    hasMore,
    timePeriod,
    setTimePeriod,
    searchQuery,
    setSearchQuery,
    loadMore: () => fetchPage(false),
  };
}

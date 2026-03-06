import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const CACHE_KEY = "aim_today_intelligence";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function loadCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

/**
 * Hook to fetch AI dashboard intelligence (briefing, insights, contextCards, workout).
 * Uses stale-while-revalidate: returns cached data instantly, revalidates in background.
 * Accepts an optional requestedMode to override the auto-detected mode.
 */
export function useTodayIntelligence(requestedMode = null) {
  const { user } = useAuth();
  const cached = useRef(loadCached());
  const [data, setData] = useState(cached.current);
  const [loading, setLoading] = useState(!cached.current);
  const [error, setError] = useState(null);

  const fetchIntelligence = useCallback(async () => {
    if (!user) return;
    // Only show loading spinner if we have no cached data
    if (!cached.current) setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const body = { localDate, ...(requestedMode ? { mode: requestedMode } : {}) };
      const result = await apiFetch("/dashboard/intelligence", {
        method: "POST",
        body: JSON.stringify(body),
      });
      cached.current = result;
      setData(result);
      saveCache(result);
    } catch (err) {
      // Only set error if we have no cached data to show
      if (!cached.current) {
        setError(err.message || "Failed to load intelligence");
      }
    } finally {
      setLoading(false);
    }
  }, [user, requestedMode]);

  useEffect(() => {
    // Always revalidate in background, even if showing cached data
    fetchIntelligence();
  }, [fetchIntelligence]);

  return { data, loading, error, refetch: fetchIntelligence };
}

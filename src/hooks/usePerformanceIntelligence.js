import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const CACHE_KEY = "aim_performance_intelligence";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — this data changes slowly

function loadCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    // Don't serve cached empty states — they may be stale errors
    if (data?.empty) return null;
    if (Date.now() - timestamp < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    // Don't cache empty states
    if (data?.empty) return;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

/**
 * Hook to fetch AI performance intelligence (narrative, categories, model data).
 * Uses stale-while-revalidate: returns cached data instantly, revalidates in background.
 */
export function usePerformanceIntelligence() {
  const { user } = useAuth();
  const cached = useRef(loadCached());
  const [data, setData] = useState(cached.current);
  const [loading, setLoading] = useState(!cached.current);
  const [error, setError] = useState(null);

  const fetchIntelligence = useCallback(async () => {
    if (!user) return;
    if (!cached.current) setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/performance/intelligence", {
        method: "POST",
        body: JSON.stringify({}),
      });
      cached.current = result;
      setData(result);
      saveCache(result);
    } catch (err) {
      // Show error if no real cached data (empty states don't count)
      if (!cached.current || cached.current.empty) {
        setError(err.message || "Failed to load performance intelligence");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  return { data, loading, error, refetch: fetchIntelligence };
}

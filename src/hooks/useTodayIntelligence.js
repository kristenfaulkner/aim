import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch AI dashboard intelligence (briefing, insights, contextCards, workout).
 * Caches in a ref so navigating away and back doesn't refetch.
 * Accepts an optional requestedMode to override the auto-detected mode.
 */
export function useTodayIntelligence(requestedMode = null) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(null);

  const fetchIntelligence = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const body = requestedMode ? { mode: requestedMode } : {};
      const result = await apiFetch("/dashboard/intelligence", {
        method: "POST",
        body: JSON.stringify(body),
      });
      cacheRef.current = result;
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load intelligence");
    } finally {
      setLoading(false);
    }
  }, [user, requestedMode]);

  useEffect(() => {
    // Use cached data if available (avoids refetch on nav-away/back)
    if (cacheRef.current) {
      setData(cacheRef.current);
      return;
    }
    fetchIntelligence();
  }, [fetchIntelligence]);

  return { data, loading, error, refetch: fetchIntelligence };
}

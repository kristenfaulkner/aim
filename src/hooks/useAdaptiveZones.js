import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch adaptive training zones with readiness adjustment.
 */
export function useAdaptiveZones() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch("/zones/adaptive");
      setData(data);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, loading, refetch: fetch };
}

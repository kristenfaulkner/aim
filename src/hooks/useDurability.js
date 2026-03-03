import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch durability summary (aggregate score, buckets, trend, predictions).
 */
export function useDurability() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/durability/summary");
      if (res.ok) {
        setData(await res.json());
      }
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

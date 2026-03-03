import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch W'bal stream + summary for a single activity.
 * Lazy-loads from /api/activities/wbal (computes on demand if not cached).
 */
export function useWbalData(activityId) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWbal = useCallback(async () => {
    if (!user || !activityId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/activities/wbal?id=${activityId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // non-blocking — W'bal is supplemental
    } finally {
      setLoading(false);
    }
  }, [user, activityId]);

  useEffect(() => {
    fetchWbal();
  }, [fetchWbal]);

  return { data, loading, refetch: fetchWbal };
}

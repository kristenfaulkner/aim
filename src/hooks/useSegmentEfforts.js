import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch segment efforts for a single activity.
 * Lazy-loads from /api/segments/list?activity_id=X.
 */
export function useSegmentEfforts(activityId) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSegments = useCallback(async () => {
    if (!user || !activityId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/segments/list?activity_id=${activityId}`);
      setData(res);
    } catch {
      // non-blocking — segment efforts are supplemental
    } finally {
      setLoading(false);
    }
  }, [user, activityId]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  return { data, loading, refetch: fetchSegments };
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch similar sessions for a single activity.
 * Lazy-loads from /api/activities/similar.
 */
export function useSimilarSessions(activityId) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSimilar = useCallback(async () => {
    if (!user || !activityId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/activities/similar?id=${activityId}`);
      setData(res);
    } catch {
      // non-blocking — similar sessions are supplemental
    } finally {
      setLoading(false);
    }
  }, [user, activityId]);

  useEffect(() => {
    fetchSimilar();
  }, [fetchSimilar]);

  return { data, loading, refetch: fetchSimilar };
}

/**
 * Fetches AI comparison analysis between two activities.
 * Returns a promise — call on-demand when user expands a comparison card.
 */
export async function fetchCompareAnalysis(currentId, comparisonId) {
  return apiFetch("/activities/compare-analysis", {
    method: "POST",
    body: JSON.stringify({
      current_activity_id: currentId,
      comparison_activity_id: comparisonId,
    }),
  });
}

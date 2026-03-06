import { useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

/**
 * Hook to fetch the next workout prescription from the AI engine.
 * Lazy — does NOT auto-fetch. Call refetch() to trigger.
 * Returns prescription, gaps, readiness, loading state, and error.
 */
export function usePrescription() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrescription = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/prescription/next-workout");
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCalendar = useCallback(
    async (prescription) => {
      const today = new Date().toISOString().split("T")[0];
      const calendarData = {
        date: today,
        title: prescription.workout_name,
        description: prescription.rationale,
        workout_type: prescription.workout_type || "prescribed",
        duration_minutes: prescription.duration_minutes,
        tss_target: prescription.tss_estimate,
        structure: prescription.structure
          ? { intervals: prescription.structure }
          : null,
        nutrition_plan: prescription.fueling || null,
        source: "ai_prescription",
      };

      await apiFetch("/calendar/upsert", {
        method: "POST",
        body: JSON.stringify(calendarData),
      });
    },
    []
  );

  return {
    prescription: data?.prescription || null,
    gaps: data?.gaps || null,
    readiness: data?.readiness || null,
    reason: data?.reason || null,
    message: data?.message || null,
    loading,
    error,
    refetch: fetchPrescription,
    addToCalendar,
  };
}

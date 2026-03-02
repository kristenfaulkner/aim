import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

/**
 * Hook to fetch a paginated list of recent activities for the ride selector dropdown.
 */
export function useActivities(limit = 20) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from("activities")
        .select("id, name, started_at, tss, duration_seconds, distance_meters")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(limit);

      setActivities(data || []);
      setLoading(false);
    }

    fetch();
  }, [user, limit]);

  return { activities, loading };
}

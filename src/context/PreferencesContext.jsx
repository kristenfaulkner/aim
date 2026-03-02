import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const [units, setUnitsState] = useState("imperial");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoaded(false);
      return;
    }
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
          .from("user_settings")
          .select("units")
          .eq("user_id", user.id)
          .single();
        if (data?.units) setUnitsState(data.units);
      } catch (e) {
        // default to imperial
      } finally {
        setLoaded(true);
      }
    })();
  }, [user]);

  const setUnits = async (newUnits) => {
    setUnitsState(newUnits);
    if (!user) return;
    try {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, units: newUnits }, { onConflict: "user_id" });
    } catch (e) {
      console.error("Failed to save units preference:", e);
    }
  };

  return (
    <PreferencesContext.Provider value={{ units, setUnits, prefsLoaded: loaded }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

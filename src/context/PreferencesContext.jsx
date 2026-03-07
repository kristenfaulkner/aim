import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const [units, setUnitsState] = useState("imperial");
  const [tempUnit, setTempUnitState] = useState("fahrenheit");
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
          .select("units, temp_unit")
          .eq("user_id", user.id)
          .single();
        if (data?.units) setUnitsState(data.units);
        if (data?.temp_unit) setTempUnitState(data.temp_unit);
        else if (data?.units === "metric") setTempUnitState("celsius");
      } catch (e) {
        // default to imperial / fahrenheit
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

  const setTempUnit = async (newTempUnit) => {
    setTempUnitState(newTempUnit);
    if (!user) return;
    try {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, temp_unit: newTempUnit }, { onConflict: "user_id" });
    } catch (e) {
      console.error("Failed to save temp unit preference:", e);
    }
  };

  return (
    <PreferencesContext.Provider value={{ units, setUnits, tempUnit, setTempUnit, prefsLoaded: loaded }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";

/**
 * Integration provider registry — tracks what data each provider supplies.
 * When adding a new integration, add it here so on-demand sync picks it up.
 *
 * tracks: what data categories this provider supplies
 * endpoint: sync API route (called with ?days=2 on page load)
 */
const INTEGRATION_PROVIDERS = [
  { key: "eightsleep", tracks: ["sleep"], endpoint: "/integrations/sync/eightsleep" },
  { key: "oura", tracks: ["sleep", "recovery", "activity"], endpoint: "/integrations/sync/oura" },
  { key: "whoop", tracks: ["sleep", "recovery"], endpoint: "/integrations/sync/whoop" },
  { key: "withings", tracks: ["body_comp"], endpoint: "/integrations/sync/withings" },
  // { key: "garmin", tracks: ["sleep", "activity", "recovery", "body_comp"], endpoint: "/integrations/sync/garmin" },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    return data;
  }

  useEffect(() => {
    // Use getSession() as the primary session restoration method.
    // This is the most reliable approach — it reads from localStorage
    // synchronously and returns the cached session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip INITIAL_SESSION — we handle that with getSession() above
        if (event === "INITIAL_SESSION") return;

        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchProfile(u.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // On-demand sleep provider sync — once per day when any page loads.
  // Uses INTEGRATION_PROVIDERS registry filtered by tracks: "sleep".
  // Blocks loading state so sleep data is fresh before any page renders.
  // If a provider is still processing (synced === 0), retries after 10 min.
  const sleepSyncRan = useRef(false);
  const sleepRetryTimers = useRef([]);
  useEffect(() => {
    if (!user || sleepSyncRan.current) return;
    sleepSyncRan.current = true;

    const today = new Date().toISOString().split("T")[0];
    const sleepProviders = INTEGRATION_PROVIDERS.filter((p) =>
      p.tracks.includes("sleep")
    );

    // Check which providers need syncing today
    const needsSync = sleepProviders.filter(
      (p) => localStorage.getItem(`aim_${p.key}_sync_date`) !== today
    );
    if (needsSync.length === 0) return;

    // Check which of those are actually connected
    setLoading(true);
    supabase
      .from("integrations")
      .select("provider")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", needsSync.map((p) => p.key))
      .then(({ data: connected }) => {
        if (!connected || connected.length === 0) {
          setLoading(false);
          return;
        }

        const connectedKeys = new Set(connected.map((c) => c.provider));
        const toSync = needsSync.filter((p) => connectedKeys.has(p.key));

        function trySync(provider, isRetry) {
          return apiFetch(`${provider.endpoint}?days=2`, { method: "POST" })
            .then((result) => {
              if (result.synced > 0) {
                localStorage.setItem(`aim_${provider.key}_sync_date`, today);
              } else if (!isRetry) {
                const timer = setTimeout(() => trySync(provider, true), 10 * 60 * 1000);
                sleepRetryTimers.current.push(timer);
              }
            })
            .catch(() => {});
        }

        Promise.all(toSync.map((p) => trySync(p, false))).finally(() =>
          setLoading(false)
        );
      })
      .catch(() => setLoading(false));

    return () => {
      sleepRetryTimers.current.forEach((t) => clearTimeout(t));
    };
  }, [user]);

  async function signup(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }

  async function signin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/connect` },
    });
    if (error) throw error;
    return data;
  }

  async function signInWithApple() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/connect` },
    });
    if (error) throw error;
    return data;
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/today` },
    });
    if (error) throw error;
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function signout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }

  async function updateProfile(updates) {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signup,
        signin,
        signInWithGoogle,
        signInWithApple,
        signInWithMagicLink,
        resetPassword,
        updatePassword,
        signout,
        updateProfile,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

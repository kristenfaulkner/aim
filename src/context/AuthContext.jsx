import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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
    let initialLoad = true;

    // Listen for auth changes — this must be registered before getSession()
    // because Supabase v2 fires INITIAL_SESSION through this listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;

        // On SIGNED_OUT, clear everything
        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          if (initialLoad) {
            initialLoad = false;
            setLoading(false);
          }
          return;
        }

        // For all other events with a user, update state
        if (u) {
          setUser(u);
          // Use setTimeout(0) to avoid Supabase deadlock where getSession()
          // is called inside onAuthStateChange before it has finished updating
          setTimeout(() => {
            fetchProfile(u.id).finally(() => {
              if (initialLoad) {
                initialLoad = false;
                setLoading(false);
              }
            });
          }, 0);
        } else if (event === "INITIAL_SESSION") {
          // No session on initial load — user is not logged in
          setUser(null);
          setProfile(null);
          if (initialLoad) {
            initialLoad = false;
            setLoading(false);
          }
        }
        // Ignore TOKEN_REFRESHED with null session — it's transient
      }
    );

    // Safety timeout — if nothing fires within 5 seconds, stop loading
    const timeout = setTimeout(() => {
      if (initialLoad) {
        initialLoad = false;
        setLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

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
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
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

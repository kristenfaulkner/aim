import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useResponsive } from "../hooks/useResponsive";
import { useAuth } from "../context/AuthContext";
import { Check, ArrowRight, MessageCircle, Eye, EyeOff, ExternalLink, Menu, X, LogOut, Settings, User } from "lucide-react";
import { integrations, catLabels, catIcons } from "../data/integrations";
import { supabase } from "../lib/supabase";
import UniversalUpload from "../components/UniversalUpload";
import TrainingPeaksImport from "../components/TrainingPeaksImport";

// Apps that support real OAuth connect
const OAUTH_APPS = {
  Strava: "/api/auth/connect/strava",
  Whoop: "/api/auth/connect/whoop",
  "Oura Ring": "/api/auth/connect/oura",
  Withings: "/api/auth/connect/withings",
};

// Apps that use email/password credentials instead of OAuth
const CREDENTIAL_APPS = {
  EightSleep: "/api/auth/connect/eightsleep",
};

// Apps that use file import (no API, user exports data manually)
const FILE_IMPORT_APPS = {
  TrainingPeaks: true,
};

// Map display names to provider keys in the database
const NAME_TO_PROVIDER = { Strava: "strava", Whoop: "whoop", "Oura Ring": "oura", Withings: "withings", EightSleep: "eightsleep", TrainingPeaks: "trainingpeaks" };

// ── APP CARD COMPONENT ──
function AppCard({ app, isConnected, onToggle }) {
  const [hover, setHover] = useState(false);
  const isOAuth = !!OAUTH_APPS[app.name];
  const isCredential = !!CREDENTIAL_APPS[app.name];
  const isFileImport = !!FILE_IMPORT_APPS[app.name];
  const isConnectable = isOAuth || isCredential || isFileImport;
  const isUnavailable = !!app.note;
  const showDisconnect = isConnected && isConnectable && hover && !isFileImport;
  const showUploadMore = isConnected && isFileImport && hover;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: isConnected ? "rgba(16,185,129,0.04)" : T.card, border: `1px solid ${isConnected ? "rgba(16,185,129,0.2)" : T.border}`, borderRadius: 14, transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseOver={e => { if (!isConnected) e.currentTarget.style.borderColor = T.borderHover; }}
      onMouseOut={e => { if (!isConnected) e.currentTarget.style.borderColor = T.border; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img src={app.logo} alt={`${app.name} logo`} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain" }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{app.name}</span>
          </div>
          <span style={{ fontSize: 12, color: T.textDim }}>{app.desc}</span>
        </div>
      </div>
      {!isUnavailable && (
        <button onClick={onToggle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: showDisconnect ? "rgba(239,68,68,0.08)" : showUploadMore ? T.accentDim : isConnected ? "rgba(16,185,129,0.12)" : T.accentDim,
            border: `1px solid ${showDisconnect ? "rgba(239,68,68,0.2)" : showUploadMore ? T.accentMid : isConnected ? "rgba(16,185,129,0.3)" : T.accentMid}`,
            color: showDisconnect ? "#ef4444" : showUploadMore ? T.accent : isConnected ? T.accent : T.accent,
            fontFamily: font, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
          }}>
          {showDisconnect ? "Disconnect" : showUploadMore ? "Upload More Files" : isConnected ? <><Check size={14} /> Connected</> : isFileImport ? "Import" : "Connect"}
        </button>
      )}
    </div>
  );
}

export default function ConnectApps() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const { signout, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connected, setConnected] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [toast, setToast] = useState("");
  const [showCredentialModal, setShowCredentialModal] = useState(null);
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showImportModal, setShowImportModal] = useState(null);

  // Handle OAuth return query params
  useEffect(() => {
    const justConnected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (justConnected) {
      setToast(`${justConnected.charAt(0).toUpperCase() + justConnected.slice(1)} connected successfully!`);
      setSearchParams({}, { replace: true });
    } else if (error) {
      setToast(`Connection failed: ${error.replace(/_/g, " ")}`);
      setSearchParams({}, { replace: true });
    }
    if (justConnected || error) {
      const timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Load saved integrations on mount
  useEffect(() => {
    supabase.from("integrations")
      .select("provider")
      .eq("is_active", true)
      .then(({ data }) => {
        const map = {};
        // Map provider names back to display names
        const providerToName = { strava: "Strava", wahoo: "Wahoo", whoop: "Whoop", oura: "Oura Ring", withings: "Withings", eightsleep: "EightSleep", trainingpeaks: "TrainingPeaks" };
        (data || []).forEach(row => {
          const display = providerToName[row.provider] || row.provider;
          map[display] = true;
        });
        setConnected(map);
      });
  }, []);

  const handleCredentialSubmit = async () => {
    if (!credEmail || !credPassword) return;
    setCredLoading(true);
    setCredError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CREDENTIAL_APPS[showCredentialModal], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: credEmail, password: credPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCredError(data.error || "Connection failed");
        return;
      }
      setConnected(prev => ({ ...prev, [showCredentialModal]: true }));
      setShowCredentialModal(null);
      setCredEmail("");
      setCredPassword("");
      setToast(`${showCredentialModal} connected successfully!`);
      setTimeout(() => setToast(""), 4000);
    } catch (err) {
      setCredError(err.message || "Network error");
    } finally {
      setCredLoading(false);
    }
  };

  const toggleConnect = async (name) => {
    const isOAuth = !!OAUTH_APPS[name];
    const isCredential = !!CREDENTIAL_APPS[name];
    const isFileImport = !!FILE_IMPORT_APPS[name];
    const isCurrentlyConnected = !!connected[name];

    // File import apps: always open import modal (whether connected or not)
    if (isFileImport) {
      setShowImportModal(name);
      return;
    }

    // Credential-based apps: open modal
    if (isCredential && !isCurrentlyConnected) {
      setShowCredentialModal(name);
      setCredEmail("");
      setCredPassword("");
      setCredError("");
      setShowPassword(false);
      return;
    }

    // Credential-based apps: disconnect
    if (isCredential && isCurrentlyConnected) {
      const provider = NAME_TO_PROVIDER[name];
      if (!provider) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/user/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ provider }),
        });
        setConnected(prev => ({ ...prev, [name]: false }));
        setToast(`${name} disconnected`);
        setTimeout(() => setToast(""), 3000);
      } catch {
        setToast("Failed to disconnect");
        setTimeout(() => setToast(""), 3000);
      }
      return;
    }

    if (isOAuth && !isCurrentlyConnected) {
      // Connect: redirect to OAuth
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.error("Session error:", sessionErr);
          setToast("Session error — please sign in again");
          setTimeout(() => setToast(""), 4000);
          return;
        }
        const token = session?.access_token;
        if (!token) {
          setToast("No active session — please sign in again");
          setTimeout(() => setToast(""), 4000);
          return;
        }
        window.location.href = `${OAUTH_APPS[name]}?token=${encodeURIComponent(token)}`;
      } catch (err) {
        console.error("Connect error:", err);
        setToast("Connection failed — please try again");
        setTimeout(() => setToast(""), 4000);
      }
      return;
    }

    if (isOAuth && isCurrentlyConnected) {
      // Disconnect: call API to revoke and remove
      const provider = NAME_TO_PROVIDER[name];
      if (!provider) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/user/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ provider }),
        });
        setConnected(prev => ({ ...prev, [name]: false }));
        setToast(`${name} disconnected`);
        setTimeout(() => setToast(""), 3000);
      } catch {
        setToast("Failed to disconnect");
        setTimeout(() => setToast(""), 3000);
      }
      return;
    }

    // Non-OAuth apps: not yet available
    setToast(`${name} integration coming soon`);
    setTimeout(() => setToast(""), 3000);
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;

  const handleContinue = () => {
    navigate("/dashboard");
  };

  const isConnectable = (app) => !!OAUTH_APPS[app.name] || !!CREDENTIAL_APPS[app.name] || !!FILE_IMPORT_APPS[app.name];

  const filtered = integrations.filter(app => {
    const matchesCat = filter === "all" || app.category === filter;
    const matchesSearch = !search || app.name.toLowerCase().includes(search.toLowerCase()) || app.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const availableApps = filtered.filter(isConnectable);
  const comingSoonApps = filtered.filter(app => !isConnectable(app));

  const groupedAvailable = {};
  availableApps.forEach(app => {
    if (!groupedAvailable[app.category]) groupedAvailable[app.category] = [];
    groupedAvailable[app.category].push(app);
  });

  const groupedComingSoon = {};
  comingSoonApps.forEach(app => {
    if (!groupedComingSoon[app.category]) groupedComingSoon[app.category] = [];
    groupedComingSoon[app.category].push(app);
  });

  const handleSignout = async () => { await signout(); navigate("/"); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav bar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 12px" : "0 24px", height: isMobile ? 48 : 52, borderBottom: `1px solid ${T.border}`, background: `${T.card}ee`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.white, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {[{ label: "Dashboard", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "Connect" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: item.label === "Connect" ? T.accent : T.textSoft,
                  cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4,
                }}>{item.label}</button>
              ))}
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ position: "relative" }}>
            <div onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white, cursor: "pointer" }}>
              {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
            </div>
            {userMenuOpen && (<>
              <div onClick={() => setUserMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 149 }} />
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 160, zIndex: 150, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <User size={14} /> Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <Settings size={14} /> Settings
                </button>
                <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                <button onClick={() => { setUserMenuOpen(false); handleSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>)}
          </div>
        )}
      </nav>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.card, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white }}>
                {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name || "Athlete"}</span>
            </div>
            {[{ label: "Dashboard", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Profile", path: "/profile" }, { label: "Settings", path: "/settings" }].map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Connect" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Connect" ? T.accent : T.textSoft,
                cursor: "pointer", fontFamily: font, textAlign: "left",
              }}>{item.label}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 100,
          background: toast.includes("failed") ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
          border: `1px solid ${toast.includes("failed") ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          color: toast.includes("failed") ? "#ef4444" : T.accent }}>
          {toast}
        </div>
      )}

      {/* Credential modal (for Eight Sleep etc.) */}
      {showCredentialModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,6,10,0.8)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) { setShowCredentialModal(null); } }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "24px" : "32px", maxWidth: isMobile ? "calc(100% - 32px)" : 420, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              {(() => {
                const app = integrations.find(a => a.name === showCredentialModal);
                return app ? <img src={app.logo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} /> : null;
              })()}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Connect {showCredentialModal}</div>
                <div style={{ fontSize: 12, color: T.textDim }}>Enter your account credentials</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                value={credEmail}
                onChange={e => setCredEmail(e.target.value)}
                placeholder="Email address"
                style={{ ...inputStyle, padding: "12px 16px", fontSize: 13 }}
                autoFocus
              />
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={credPassword}
                  onChange={e => setCredPassword(e.target.value)}
                  placeholder="Password"
                  onKeyDown={e => { if (e.key === "Enter") handleCredentialSubmit(); }}
                  style={{ ...inputStyle, padding: "12px 40px 12px 16px", fontSize: 13, width: "100%", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: T.textDim }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {credError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                  {credError}
                </div>
              )}
              <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                Your credentials are encrypted at rest and used only to sync your sleep data. We never share your login with third parties.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowCredentialModal(null)}
                  style={{ ...btn(false), flex: 1, padding: "10px 20px", fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={handleCredentialSubmit} disabled={credLoading || !credEmail || !credPassword}
                  style={{ ...btn(true), flex: 1, padding: "10px 20px", fontSize: 13, opacity: credLoading ? 0.7 : 1 }}>
                  {credLoading ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TrainingPeaks import modal */}
      {showImportModal === "TrainingPeaks" && (
        <TrainingPeaksImport
          onClose={() => setShowImportModal(null)}
          onComplete={(results) => {
            setShowImportModal(null);
            setConnected(prev => ({ ...prev, TrainingPeaks: true }));
            const parts = [];
            if (results.imported) parts.push(`${results.imported} imported`);
            if (results.merged) parts.push(`${results.merged} merged`);
            if (results.skipped) parts.push(`${results.skipped} skipped`);
            setToast(`TrainingPeaks: ${parts.join(", ") || "No new activities"}`);
            setTimeout(() => setToast(""), 5000);
          }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, padding: isMobile ? "20px" : "40px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
            Connect your <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>data sources</span>
          </h1>
          <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 4px" }}>The more you connect, the smarter AIM gets. You can always add more later.</p>
          <p style={{ fontSize: 12, color: T.textDim }}>🔒 Your data is encrypted and never sold. See our <a href="/privacy" style={{ color: T.accent, textDecoration: "none" }}>Privacy Policy</a>.</p>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, marginBottom: 28, alignItems: isMobile ? "stretch" : "center" }}>
          <div style={{ position: "relative", flex: isMobile ? undefined : 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.textDim }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps..."
              style={{ ...inputStyle, padding: "12px 16px 12px 40px", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: isMobile ? "auto" : undefined, flexWrap: isMobile ? "nowrap" : undefined, WebkitOverflowScrolling: isMobile ? "touch" : undefined }}>
            {Object.entries(catLabels).map(([key, label]) => {
              const isActive = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  style={{ padding: "8px 14px", background: isActive ? T.accentDim : T.card, border: `1px solid ${isActive ? T.accentMid : T.border}`, borderRadius: 10, fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.textDim, cursor: "pointer", fontFamily: font, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {key !== "all" && <span style={{ marginRight: 4 }}>{catIcons[key]}</span>}{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Available apps */}
        {availableApps.length > 0 && (
          filter === "all" ? (
            Object.entries(groupedAvailable).map(([cat, apps]) => (
              <div key={cat} style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>{catIcons[cat]}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{catLabels[cat]}</h3>
                  <span style={{ fontSize: 11, color: T.textDim }}>({apps.length})</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
                  {apps.map(app => (
                    <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 10, marginBottom: 28 }}>
              {availableApps.map(app => (
                <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
              ))}
            </div>
          )
        )}

        {/* Universal File Upload */}
        <div style={{ marginTop: 28, padding: "24px", background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📁</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Upload Files</h3>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => navigate("/health-lab")} style={{
                background: "none", border: `1px solid ${T.border}`, padding: "5px 12px", borderRadius: 7,
                fontSize: 11, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font,
                display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
              }}>
                Health Lab <ExternalLink size={11} />
              </button>
              <button onClick={() => navigate("/dashboard")} style={{
                background: "none", border: `1px solid ${T.border}`, padding: "5px 12px", borderRadius: 7,
                fontSize: 11, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font,
                display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
              }}>
                Dashboard <ExternalLink size={11} />
              </button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.6 }}>
            Upload blood labs, body scans, .FIT workouts, or any health data. AI detects the file type automatically and adds it to your profile.
          </p>
          <UniversalUpload compact />
        </div>

        {/* Coming Soon section */}
        {comingSoonApps.length > 0 && (
          <div style={{ marginTop: availableApps.length > 0 ? 48 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 20 }}>🚀</span>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.textSoft }}>Coming Soon</h3>
              <span style={{ fontSize: 13, color: T.textDim }}>({comingSoonApps.length})</span>
            </div>
            {filter === "all" ? (
              Object.entries(groupedComingSoon).map(([cat, apps]) => (
                <div key={cat} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>{catIcons[cat]}</span>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{catLabels[cat]}</h3>
                    <span style={{ fontSize: 11, color: T.textDim }}>({apps.length})</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
                    {apps.map(app => (
                      <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
                {comingSoonApps.map(app => (
                  <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: T.textSoft }}>No apps match your search.</p>
          </div>
        )}

        {/* Request integration */}
        <div style={{ marginTop: 32, padding: "24px", background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, textAlign: "center" }}>
          {!showRequest ? (
            <div>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 12px" }}>Device or app not listed?</p>
              <button onClick={() => setShowRequest(true)} style={{ ...btn(false), fontSize: 13, padding: "10px 24px" }}>
                <MessageCircle size={16} /> Request an Integration
              </button>
            </div>
          ) : requestSent ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: T.accent, margin: "0 0 4px" }}>Request sent!</p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: 0 }}>We'll review your suggestion and get back to you.</p>
            </div>
          ) : (
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Request an Integration</p>
              <p style={{ fontSize: 12, color: T.textSoft, margin: "0 0 16px" }}>Tell us which app or device you'd like to see connected to AIM.</p>
              <textarea value={requestText} onChange={e => setRequestText(e.target.value)}
                placeholder="e.g. 'Polar H10 heart rate monitor' or 'Fuelin nutrition app'"
                style={{ ...inputStyle, padding: "14px 16px", height: 80, resize: "vertical", fontFamily: font }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
                <button onClick={() => setShowRequest(false)} style={{ ...btn(false), fontSize: 13, padding: "10px 20px" }}>Cancel</button>
                <button onClick={async () => {
                  if (!requestText.trim()) return;
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    await supabase.from("integration_requests").insert({
                      user_id: session.user.id,
                      request_text: requestText.trim(),
                    });
                  }
                  setRequestSent(true);
                }} style={{ ...btn(true), fontSize: 13, padding: "10px 20px" }}>
                  Submit Request <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useResponsive } from "../hooks/useResponsive";
import { Check, ArrowRight, MessageCircle, Eye, EyeOff, ExternalLink, Menu, X } from "lucide-react";
import { integrations, catLabels, catIcons } from "../data/integrations";
import { supabase } from "../lib/supabase";
import BloodPanelUpload from "../components/BloodPanelUpload";
import TrainingPeaksImport from "../components/TrainingPeaksImport";

// Apps that support real OAuth connect
const OAUTH_APPS = {
  Strava: "/api/auth/connect/strava",
  Wahoo: "/api/auth/connect/wahoo",
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
const NAME_TO_PROVIDER = { Strava: "strava", Wahoo: "wahoo", Whoop: "whoop", "Oura Ring": "oura", Withings: "withings", EightSleep: "eightsleep", TrainingPeaks: "trainingpeaks" };

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: isConnected ? "rgba(0,229,160,0.04)" : T.card, border: `1px solid ${isConnected ? "rgba(0,229,160,0.2)" : T.border}`, borderRadius: 14, transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
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
      <button onClick={onToggle} disabled={isUnavailable}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: isUnavailable ? "not-allowed" : "pointer",
          background: showDisconnect ? "rgba(239,68,68,0.08)" : showUploadMore ? T.accentDim : isConnected ? "rgba(0,229,160,0.12)" : isUnavailable ? T.surface : T.accentDim,
          border: `1px solid ${showDisconnect ? "rgba(239,68,68,0.2)" : showUploadMore ? T.accentMid : isConnected ? "rgba(0,229,160,0.3)" : isUnavailable ? T.border : T.accentMid}`,
          color: showDisconnect ? "#ef4444" : showUploadMore ? T.accent : isConnected ? T.accent : isUnavailable ? T.textDim : T.accent,
          fontFamily: font, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
          opacity: isUnavailable ? 0.5 : 1,
        }}>
        {showDisconnect ? "Disconnect" : showUploadMore ? "Upload More Files" : isConnected ? <><Check size={14} /> Connected</> : (isUnavailable || !isConnectable) ? "Coming Soon" : isFileImport ? "Import" : "Connect"}
      </button>
    </div>
  );
}

export default function ConnectApps() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connected, setConnected] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const filtered = integrations.filter(app => {
    const matchesCat = filter === "all" || app.category === filter;
    const matchesSearch = !search || app.name.toLowerCase().includes(search.toLowerCase()) || app.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const grouped = {};
  filtered.forEach(app => {
    if (!grouped[app.category]) grouped[app.category] = [];
    grouped[app.category].push(app);
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: isMobile ? "0 12px" : "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
        {isMobile ? (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
        )}
        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["Create Account", "Connect Apps", "Set Up Profile"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: i <= 1 ? T.accent : T.surface, border: `1px solid ${i <= 1 ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i <= 1 ? T.bg : T.textDim }}>
                  {i < 1 ? <Check size={12} /> : i + 1}
                </div>
                {!isMobile && <span style={{ fontSize: 12, color: i <= 1 ? T.text : T.textDim, fontWeight: i === 1 ? 700 : 400 }}>{step}</span>}
              </div>
              {i < 2 && <div style={{ width: isMobile ? 16 : 32, height: 1, background: T.border }} />}
            </div>
          ))}
        </div>
        <button onClick={handleContinue}
          style={{ ...btn(connectedCount > 0), padding: isMobile ? "8px 14px" : "10px 24px", fontSize: 13 }}>
          {connectedCount > 0 ? (isMobile ? `Continue (${connectedCount})` : `Continue (${connectedCount} connected)`) : "Skip"} <ArrowRight size={16} />
        </button>
      </div>

      {/* Mobile slide-out drawer */}
      {isMobile && menuOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }} onClick={() => setMenuOpen(false)} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: T.surface, borderRight: `1px solid ${T.border}`, zIndex: 999, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => { navigate("/"); setMenuOpen(false); }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
              </div>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={20} />
              </button>
            </div>
            <button onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 400, background: "transparent", color: T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
              Dashboard
            </button>
            <button onClick={() => { navigate("/settings"); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 400, background: "transparent", color: T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
              Settings
            </button>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 100,
          background: toast.includes("failed") ? "rgba(239,68,68,0.12)" : "rgba(0,229,160,0.12)",
          border: `1px solid ${toast.includes("failed") ? "rgba(239,68,68,0.3)" : "rgba(0,229,160,0.3)"}`,
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

        {/* Apps grouped by category */}
        {filter === "all" ? (
          Object.entries(grouped).map(([cat, apps]) => (
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
            {filtered.map(app => (
              <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: T.textSoft }}>No apps match your search.</p>
          </div>
        )}

        {/* Blood Panel Upload */}
        <div style={{ marginTop: 28, padding: "24px", background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🩸</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Blood Panels</h3>
            </div>
            <button onClick={() => navigate("/health-lab")} style={{
              background: "none", border: `1px solid ${T.border}`, padding: "5px 12px", borderRadius: 7,
              fontSize: 11, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font,
              display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
            }}>
              View All <ExternalLink size={11} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.6 }}>
            Upload lab results (PDF or photo) and AI will automatically extract all biomarkers, flag abnormal values using athlete-optimal ranges, and track trends over time.
          </p>
          <BloodPanelUpload onUploadComplete={() => {}} compact />
        </div>

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

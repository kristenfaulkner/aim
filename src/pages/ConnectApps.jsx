import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { integrations, catLabels, catIcons } from "../data/integrations";
import { supabase } from "../lib/supabase";

// Apps that support real OAuth connect
const OAUTH_APPS = {
  Strava: "/api/auth/connect/strava",
  Whoop: "/api/auth/connect/whoop",
  "Oura Ring": "/api/auth/connect/oura",
  Withings: "/api/auth/connect/withings",
};

// Map display names to provider keys in the database
const NAME_TO_PROVIDER = { Strava: "strava", Whoop: "whoop", "Oura Ring": "oura", Withings: "withings" };

// ── APP CARD COMPONENT ──
function AppCard({ app, isConnected, onToggle }) {
  const [hover, setHover] = useState(false);
  const isOAuth = !!OAUTH_APPS[app.name];
  const showDisconnect = isConnected && isOAuth && hover;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: isConnected ? "rgba(0,229,160,0.04)" : T.card, border: `1px solid ${isConnected ? "rgba(0,229,160,0.2)" : T.border}`, borderRadius: 14, transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseOver={e => { if (!isConnected) e.currentTarget.style.borderColor = T.borderHover; }}
      onMouseOut={e => { if (!isConnected) e.currentTarget.style.borderColor = T.border; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${app.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${app.color}30` }}>
          {app.icon}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{app.name}</span>
            {app.note && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(139,92,246,0.1)", color: T.purple, fontWeight: 600 }}>COMING SOON</span>}
          </div>
          <span style={{ fontSize: 12, color: T.textDim }}>{app.desc}</span>
        </div>
      </div>
      <button onClick={onToggle} disabled={!!app.note}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: app.note ? "not-allowed" : "pointer",
          background: showDisconnect ? "rgba(239,68,68,0.08)" : isConnected ? "rgba(0,229,160,0.12)" : app.note ? T.surface : T.accentDim,
          border: `1px solid ${showDisconnect ? "rgba(239,68,68,0.2)" : isConnected ? "rgba(0,229,160,0.3)" : app.note ? T.border : T.accentMid}`,
          color: showDisconnect ? "#ef4444" : isConnected ? T.accent : app.note ? T.textDim : T.accent,
          fontFamily: font, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
          opacity: app.note ? 0.5 : 1,
        }}>
        {showDisconnect ? "Disconnect" : isConnected ? <><Check size={14} /> Connected</> : app.note ? "Soon" : "Connect"}
      </button>
    </div>
  );
}

export default function ConnectApps() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connected, setConnected] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [toast, setToast] = useState("");

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
        const providerToName = { strava: "Strava", whoop: "Whoop", oura: "Oura Ring", withings: "Withings" };
        (data || []).forEach(row => {
          const display = providerToName[row.provider] || row.provider;
          map[display] = true;
        });
        setConnected(map);
      });
  }, []);

  const toggleConnect = async (name) => {
    const isOAuth = !!OAUTH_APPS[name];
    const isCurrentlyConnected = !!connected[name];

    if (isOAuth && !isCurrentlyConnected) {
      // Connect: redirect to OAuth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        window.location.href = `${OAUTH_APPS[name]}?token=${encodeURIComponent(token)}`;
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

    // Non-OAuth apps: just toggle locally
    setConnected(prev => ({ ...prev, [name]: !prev[name] }));
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
      <div style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>
        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["Create Account", "Connect Apps", "Set Up Profile"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: i <= 1 ? T.accent : T.surface, border: `1px solid ${i <= 1 ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i <= 1 ? T.bg : T.textDim }}>
                  {i < 1 ? <Check size={12} /> : i + 1}
                </div>
                <span style={{ fontSize: 12, color: i <= 1 ? T.text : T.textDim, fontWeight: i === 1 ? 700 : 400 }}>{step}</span>
              </div>
              {i < 2 && <div style={{ width: 32, height: 1, background: T.border }} />}
            </div>
          ))}
        </div>
        <button onClick={handleContinue}
          style={{ ...btn(connectedCount > 0), padding: "10px 24px", fontSize: 13 }}>
          {connectedCount > 0 ? `Continue (${connectedCount} connected)` : "Skip for now"} <ArrowRight size={16} />
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 100,
          background: toast.includes("failed") ? "rgba(239,68,68,0.12)" : "rgba(0,229,160,0.12)",
          border: `1px solid ${toast.includes("failed") ? "rgba(239,68,68,0.3)" : "rgba(0,229,160,0.3)"}`,
          color: toast.includes("failed") ? "#ef4444" : T.accent }}>
          {toast}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, padding: "40px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
            Connect your <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>data sources</span>
          </h1>
          <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 4px" }}>The more you connect, the smarter AIM gets. You can always add more later.</p>
          <p style={{ fontSize: 12, color: T.textDim }}>🔒 Your data is encrypted and never sold. See our <a href="/privacy" style={{ color: T.accent, textDecoration: "none" }}>Privacy Policy</a>.</p>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.textDim }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps..."
              style={{ ...inputStyle, padding: "12px 16px 12px 40px", fontSize: 13 }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(catLabels).map(([key, label]) => {
              const isActive = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  style={{ padding: "8px 14px", background: isActive ? T.accentDim : T.card, border: `1px solid ${isActive ? T.accentMid : T.border}`, borderRadius: 10, fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.textDim, cursor: "pointer", fontFamily: font, transition: "all 0.2s", whiteSpace: "nowrap" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {apps.map(app => (
                  <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
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
                <button onClick={() => setRequestSent(true)} style={{ ...btn(true), fontSize: 13, padding: "10px 20px" }}>
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

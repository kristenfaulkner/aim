import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { usePerformanceIntelligence } from "../hooks/usePerformanceIntelligence";
import CategorySection from "../components/performance/CategorySection";
import AskClaude from "../components/today/AskClaude";
import SEO from "../components/SEO";
import { LogOut, Menu, X, User, Settings } from "lucide-react";

// ── NAV ──

const NAV_LINKS = [
  { label: "Today", path: "/today" },
  { label: "Activities", path: "/activities" },
  { label: "Performance", path: "/performance" },
  { label: "My Stats", path: "/my-stats" },
  { label: "Sleep", path: "/sleep" },
  { label: "Health Lab", path: "/health-lab" },
  { label: "Connect", path: "/connect" },
];

const NAV_LINKS_MOBILE = [
  ...NAV_LINKS,
  { label: "Profile", path: "/profile" },
  { label: "Settings", path: "/settings" },
];

// ── LOADING SKELETON ──

function LoadingSkeleton() {
  const pulseStyle = {
    background: `linear-gradient(90deg, ${T.surface} 25%, ${T.card} 50%, ${T.surface} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 10,
  };

  return (
    <div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {/* Narrative skeleton */}
      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: T.gradient, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...pulseStyle, height: 16, width: "90%", marginBottom: 10 }} />
            <div style={{ ...pulseStyle, height: 16, width: "100%", marginBottom: 10 }} />
            <div style={{ ...pulseStyle, height: 16, width: "75%", marginBottom: 10 }} />
            <div style={{ ...pulseStyle, height: 16, width: "85%", marginBottom: 10 }} />
            <div style={{ ...pulseStyle, height: 16, width: "60%" }} />
          </div>
        </div>
      </div>
      {/* Category skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ ...pulseStyle, width: 24, height: 24, borderRadius: 8 }} />
            <div style={{ ...pulseStyle, height: 16, width: 160 }} />
          </div>
          <div style={{ ...pulseStyle, height: 14, width: "80%", marginBottom: 12 }} />
          <div style={{ ...pulseStyle, height: 14, width: "65%", marginBottom: 12 }} />
          <div style={{ ...pulseStyle, height: 14, width: "50%" }} />
        </div>
      ))}
    </div>
  );
}

// ── MAIN PAGE ──

export default function Performance() {
  const navigate = useNavigate();
  const { signout, profile } = useAuth();
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data, loading, error, refetch } = usePerformanceIntelligence();

  const handleSignout = async () => { await signout(); navigate("/"); };

  const narrative = data?.narrative;
  const categories = data?.categories || [];
  const activityCount = data?.activityCount || 0;
  const dataMonths = data?.dataMonths || 0;
  const modelCount = data?.modelCount || 0;
  const isEmpty = data?.empty;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font }}>
      <SEO title="Performance | AIM" description="AI-powered longitudinal performance intelligence — patterns, models, and insights from your training data" />

      {/* ── NAV BAR ── */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                {menuOpen ? <X size={20} color={T.text} /> : <Menu size={20} color={T.text} />}
              </button>
            )}
            <span onClick={() => navigate("/today")} style={{ fontSize: 18, fontWeight: 800, cursor: "pointer", background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIM</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {NAV_LINKS.map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "Performance" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 12, fontWeight: 600, color: item.label === "Performance" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font,
                }}>{item.label}</button>
              ))}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <User size={16} color={T.textSoft} />
              {!isMobile && <span style={{ fontSize: 12, color: T.textSoft }}>{profile?.full_name || ""}</span>}
            </button>
            {userMenuOpen && (
              <div style={{ position: "absolute", right: 0, top: 36, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, minWidth: 150, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <User size={14} /> Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <Settings size={14} /> Settings
                </button>
                <button onClick={handleSignout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.danger, cursor: "pointer", fontFamily: font }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, top: 52, background: T.card, zIndex: 99, padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_LINKS_MOBILE.map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Performance" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Performance" ? T.accent : T.text, cursor: "pointer", textAlign: "left", fontFamily: font,
              }}>{item.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 32px" }}>

        {/* Header */}
        <div style={{ marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: "-0.03em" }}>Performance</h1>
          <p style={{ fontSize: 13, color: T.textDim, marginTop: 4 }}>
            {activityCount > 0 ? `${activityCount} activities` : ""}
            {dataMonths > 0 ? ` \u00B7 ${dataMonths} months of data` : ""}
            {modelCount > 0 ? ` \u00B7 ${modelCount} personal model${modelCount !== 1 ? "s" : ""} active` : ""}
          </p>
        </div>

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Error */}
        {!loading && error && (
          <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 40, textAlign: "center", margin: "20px 0" }}>
            <p style={{ fontSize: 14, color: T.textSoft, marginBottom: 14 }}>{error}</p>
            <button
              onClick={refetch}
              style={{
                background: T.accent, color: T.white, border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}
            >Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && isEmpty && (
          <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 40, textAlign: "center", margin: "20px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Building Your Performance Models</h3>
            <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6, maxWidth: 440, margin: "0 auto" }}>
              AIM needs 10+ activities to start building your personal performance models. Keep training and syncing — your longitudinal insights will appear here once there's enough data to find meaningful patterns.
            </p>
          </div>
        )}

        {/* AI Narrative (hero) */}
        {!loading && !error && narrative && (
          <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, margin: "16px 0 20px" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                background: T.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: T.white, fontSize: 12, fontWeight: 700 }}>✦</span>
              </div>
              <div>
                {narrative.split("\n\n").map((para, i) => (
                  <p key={i} style={{
                    fontSize: i < narrative.split("\n\n").length - 1 ? 14 : 13,
                    color: i < narrative.split("\n\n").length - 1 ? T.text : T.textSoft,
                    lineHeight: i < narrative.split("\n\n").length - 1 ? 1.7 : 1.5,
                    fontWeight: i < narrative.split("\n\n").length - 1 ? 500 : 400,
                    marginBottom: i < narrative.split("\n\n").length - 1 ? 12 : 0,
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Sections */}
        {!loading && !error && categories.length > 0 && (
          <>
            {categories
              .sort((a, b) => (a.impactRank || 99) - (b.impactRank || 99))
              .map((cat, i) => (
                <CategorySection
                  key={cat.category || i}
                  category={cat.category}
                  icon={cat.icon}
                  sampleNote={cat.sampleNote}
                  confidence={cat.confidence}
                  insights={cat.insights || []}
                  modelData={cat.modelData}
                />
              ))
            }
          </>
        )}

        {/* Ask Claude */}
        {!loading && !error && !isEmpty && (
          <div style={{ marginTop: 8 }}>
            <AskClaude mode="MORNING_RECOVERY" isMobile={isMobile} />
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { usePerformanceData } from "../hooks/usePerformanceData";
import { supabase } from "../lib/supabase";
import { FormattedText } from "../lib/formatText.jsx";
import SEO from "../components/SEO";
import { LogOut, Menu, X, User, Settings, Thermometer, Heart, Zap, Flame, Moon } from "lucide-react";

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

// ── HELPERS ──

const Card = ({ children, style }) => (
  <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", ...style }}>{children}</div>
);

const DomainPill = ({ domain }) => {
  const colors = { nutrition: T.amber, recovery: T.blue, performance: T.accent, sleep: T.purple, health: T.red, training: T.orange, environment: T.blue };
  const c = colors[domain] || T.textDim;
  return <span style={{ padding: "2px 7px", borderRadius: 9999, fontSize: 9, fontWeight: 600, background: `${c}10`, color: c, textTransform: "capitalize" }}>{domain}</span>;
};

// ── POWER CURVE SVG ──

function PowerCurve({ powerProfile, isMobile }) {
  if (!powerProfile) return null;

  const bests = [
    { sec: 5, watts: powerProfile.best_5s_watts },
    { sec: 30, watts: powerProfile.best_30s_watts },
    { sec: 60, watts: powerProfile.best_1m_watts },
    { sec: 300, watts: powerProfile.best_5m_watts },
    { sec: 1200, watts: powerProfile.best_20m_watts },
    { sec: 3600, watts: powerProfile.best_60m_watts },
  ].filter(b => b.watts != null);

  if (bests.length < 3) return null;

  const w = isMobile ? 340 : 480;
  const h = 160;
  const pad = { top: 16, right: 20, bottom: 30, left: 44 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;

  const maxW = Math.max(...bests.map(b => b.watts)) * 1.1;
  const minW = Math.min(...bests.map(b => b.watts)) * 0.7;
  const maxT = Math.log(bests[bests.length - 1].sec);
  const minT = Math.log(bests[0].sec);
  const toX = (s) => pad.left + ((Math.log(s) - minT) / (maxT - minT)) * pw;
  const toY = (watts) => pad.top + ph - ((watts - minW) / (maxW - minW)) * ph;

  const pathD = bests.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.sec)},${toY(p.watts)}`).join(" ");
  const areaD = pathD + ` L ${toX(bests[bests.length - 1].sec)},${pad.top + ph} L ${toX(bests[0].sec)},${pad.top + ph} Z`;

  // Grid lines
  const wRange = maxW - minW;
  const gridStep = wRange > 800 ? 200 : wRange > 400 ? 100 : 50;
  const gridLines = [];
  for (let wt = Math.ceil(minW / gridStep) * gridStep; wt < maxW; wt += gridStep) {
    gridLines.push(wt);
  }

  const highlights = [
    { sec: 60, label: "1'", color: T.red },
    { sec: 300, label: "5'", color: T.orange },
    { sec: 1200, label: "20'", color: T.purple },
    { sec: 3600, label: "60'", color: T.blue },
  ].filter(hl => bests.some(b => b.sec === hl.sec));

  const timeLabels = [
    { s: 5, l: "5s" }, { s: 30, l: "30s" }, { s: 60, l: "1'" },
    { s: 300, l: "5'" }, { s: 1200, l: "20'" }, { s: 3600, l: "1hr" },
  ].filter(t => bests.some(b => b.sec === t.s));

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", maxWidth: "100%" }}>
      {gridLines.map(wt => (
        <g key={wt}>
          <line x1={pad.left} y1={toY(wt)} x2={w - pad.right} y2={toY(wt)} stroke={T.border} strokeDasharray="3,3" />
          <text x={pad.left - 6} y={toY(wt) + 3} textAnchor="end" fill={T.textDim} fontSize={9} fontFamily={mono}>{wt}</text>
        </g>
      ))}
      {timeLabels.map(t => (
        <text key={t.s} x={toX(t.s)} y={h - 4} textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily={font}>{t.l}</text>
      ))}
      <path d={areaD} fill={`${T.accent}08`} />
      <path d={pathD} fill="none" stroke={T.accent} strokeWidth={2} strokeLinecap="round" />
      {highlights.map(pt => {
        const b = bests.find(x => x.sec === pt.sec);
        if (!b) return null;
        return (
          <g key={pt.label}>
            <circle cx={toX(b.sec)} cy={toY(b.watts)} r={4} fill={T.card} stroke={pt.color} strokeWidth={2} />
            <text x={toX(b.sec)} y={toY(b.watts) - 10} textAnchor="middle" fill={pt.color} fontSize={10} fontWeight={700} fontFamily={mono}>{b.watts}W</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SIDEBAR INSIGHT ──

function SidebarInsight({ insight, activityId, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
        background: T.card, cursor: "pointer", marginBottom: 8, transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>{insight.icon || "\u2726"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.4, fontFamily: font }}>{insight.title}</div>
          {expanded && (
            <div>
              <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6, marginTop: 8, fontFamily: font }}>
                <FormattedText text={insight.body} />
              </div>
              {insight.domains && (
                <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                  {insight.domains.map(d => <DomainPill key={d} domain={d} />)}
                </div>
              )}
              {insight.cat_label && !insight.domains && (
                <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                  <DomainPill domain={insight.category || "performance"} />
                </div>
              )}
            </div>
          )}
        </div>
        <svg width={12} height={12} style={{ flexShrink: 0, marginTop: 2, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ── PERFORMANCE MODELS (inline) ──

const MODEL_ICONS = {
  heat: <Thermometer size={14} />,
  hrv: <Heart size={14} />,
  durability: <Zap size={14} />,
  fueling: <Flame size={14} />,
  sleep: <Moon size={14} />,
};

function buildModelTiles(models, durabilityScore) {
  if (!models) return [];
  const tiles = [];

  if (models.heat) {
    const m = models.heat;
    let headline = null;
    if (m.breakpointTemp != null) headline = `${m.breakpointTemp}\u00B0C breakpoint`;
    else if (m.bins) {
      const cool = m.bins["Cool (<15\u00B0C)"];
      const hot = m.bins["Hot (>25\u00B0C)"];
      if (cool?.avgEF && hot?.avgEF) headline = `${((hot.avgEF - cool.avgEF) / cool.avgEF * 100).toFixed(1)}% EF in heat`;
    }
    tiles.push({ key: "heat", icon: MODEL_ICONS.heat, label: "HEAT MODEL", headline, sub: m.summary?.split(";")[0] || null, confidence: m.confidence });
  }

  if (models.hrvReadiness) {
    const m = models.hrvReadiness;
    let headline = m.efDeltaPct != null ? `${m.efDeltaPct > 0 ? "+" : ""}${m.efDeltaPct}% EF delta` : null;
    const greenRange = m.thresholds?.green?.hrvRange;
    const redRange = m.thresholds?.red?.hrvRange;
    const sub = greenRange && redRange ? `Green: ${greenRange} / Red: ${redRange}` : m.summary?.split(";")[0] || null;
    tiles.push({ key: "hrv", icon: MODEL_ICONS.hrv, label: "HRV READINESS", headline, sub, confidence: m.confidence });
  }

  if (models.durability) {
    const m = models.durability;
    let headline = durabilityScore != null ? `${Math.round(durabilityScore * 100)}% retention` : m.threshold != null ? `${m.threshold} kJ/kg threshold` : null;
    tiles.push({ key: "durability", icon: MODEL_ICONS.durability, label: "DURABILITY", headline, sub: m.summary?.split(";")[0] || null, confidence: m.confidence });
  }

  if (models.fueling) {
    const m = models.fueling;
    let headline = null;
    const under = m.bins?.["Under-fueled (<40g/hr)"];
    const well = m.bins?.["Well-fueled (>60g/hr)"];
    if (under?.avgEF && well?.avgEF) headline = `${((well.avgEF - under.avgEF) / under.avgEF * 100).toFixed(1)}% EF well-fueled`;
    tiles.push({ key: "fueling", icon: MODEL_ICONS.fueling, label: "FUELING IMPACT", headline, sub: m.summary?.split(";")[0] || null, confidence: m.confidence });
  }

  if (models.sleepExecution) {
    const m = models.sleepExecution;
    let headline = null;
    const qa = m.quartileAnalysis;
    if (qa?.highHRV?.avgCV != null && qa?.lowHRV?.avgCV != null) {
      headline = `${(qa.lowHRV.avgCV - qa.highHRV.avgCV).toFixed(1)}% better consistency`;
    }
    tiles.push({ key: "sleep", icon: MODEL_ICONS.sleep, label: "SLEEP \u2192 EXECUTION", headline, sub: m.summary?.split(";")[0] || null, confidence: m.confidence });
  }

  return tiles;
}

const CONFIDENCE_COLORS = { high: T.accent, medium: T.amber, low: T.textDim };

// ── MAIN PAGE ──

export default function Performance() {
  const navigate = useNavigate();
  const { signout } = useAuth();
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("insights");
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatTyping, setChatTyping] = useState(false);
  const chatRef = useRef(null);
  const insightsFetched = useRef(false);

  const { profile, powerProfile, models, durabilityScore, latestMetrics, activityCount, loading } = usePerformanceData();

  const handleSignout = async () => { await signout(); navigate("/"); };

  // Fetch performance insights via dashboard intelligence (DAILY_COACH mode)
  useEffect(() => {
    if (insightsFetched.current) return;
    insightsFetched.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setInsightsLoading(false); return; }
        const res = await fetch("/api/dashboard/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ mode: "DAILY_COACH" }),
        });
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
        }
      } catch { /* silent */ }
      finally { setInsightsLoading(false); }
    })();
  }, []);

  // Chat handler
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: userMsg, history: chatMessages }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", text: data.reply || data.error || "Sorry, I couldn't process that." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally { setChatTyping(false); }
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, chatTyping]);

  // Power bests
  const powerBests = powerProfile ? [
    { duration: "5s", watts: powerProfile.best_5s_watts, wkg: powerProfile.best_5s_wkg },
    { duration: "30s", watts: powerProfile.best_30s_watts, wkg: powerProfile.best_30s_wkg },
    { duration: "1'", watts: powerProfile.best_1m_watts, wkg: powerProfile.best_1m_wkg },
    { duration: "5'", watts: powerProfile.best_5m_watts, wkg: powerProfile.best_5m_wkg },
    { duration: "20'", watts: powerProfile.best_20m_watts, wkg: powerProfile.best_20m_wkg },
    { duration: "60'", watts: powerProfile.best_60m_watts, wkg: powerProfile.best_60m_wkg },
  ].filter(b => b.watts != null) : [];

  // CP model
  const cp = powerProfile?.cp_watts;
  const wPrime = powerProfile?.w_prime_kj;
  const pmax = powerProfile?.pmax_watts;
  const rSquared = powerProfile?.cp_model_r_squared;
  const fitLabel = rSquared >= 0.98 ? "Excellent" : rSquared >= 0.95 ? "Good" : rSquared >= 0.90 ? "Fair" : "Low";
  const fitColor = rSquared >= 0.95 ? T.accent : rSquared >= 0.90 ? T.amber : T.red;
  const cpFtpDelta = cp && profile?.ftp_watts ? cp - profile.ftp_watts : null;

  // Model tiles
  const modelTiles = buildModelTiles(models, durabilityScore);

  // Parse AI insights
  const aiInsights = insights?.insights || [];

  // Training form from latest metrics
  const tsb = latestMetrics?.tsb;
  const ctl = latestMetrics?.ctl;
  const atl = latestMetrics?.atl;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: T.textSoft, fontSize: 14, fontFamily: font }}>Loading performance data...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font }}>
      <SEO title="Performance | AIM" description="Your power profile, critical power model, and AI performance insights" />

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
              {!isMobile && <span style={{ fontSize: 12, color: T.textSoft }}>{profile?.full_name || "Athlete"}</span>}
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
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: "-0.03em" }}>Performance</h1>
          <p style={{ fontSize: 13, color: T.textDim, marginTop: 4 }}>
            90-day rolling {activityCount > 0 ? `\u00B7 ${activityCount} activities` : ""} {powerProfile ? "\u00B7 Updated today" : ""}
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 24, alignItems: "start" }}>

          {/* ═══ LEFT COLUMN — DATA ═══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Power Profile Card */}
            <Card style={{ padding: isMobile ? "16px" : "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Power Profile</h2>
              </div>

              {powerProfile ? (
                <>
                  <PowerCurve powerProfile={powerProfile} isMobile={isMobile} />
                  {/* Bests row */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : `repeat(${powerBests.length}, 1fr)`,
                    gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`,
                  }}>
                    {powerBests.map(pb => (
                      <div key={pb.duration} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{pb.duration}</div>
                        <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: T.text }}>
                          {pb.watts}<span style={{ fontSize: 10, color: T.textDim }}>W</span>
                        </div>
                        {pb.wkg != null && (
                          <div style={{ fontFamily: mono, fontSize: 11, color: T.textSoft }}>{pb.wkg} W/kg</div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: T.textSoft, fontSize: 13 }}>
                  Sync activities with power data to see your power profile.
                </div>
              )}
            </Card>

            {/* CP Model + Performance Models */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              {/* CP Model */}
              <Card style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Critical Power Model</h3>
                  {rSquared != null && (
                    <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 9, fontWeight: 600, background: `${fitColor}15`, color: fitColor }}>
                      R\u00B2 {rSquared}
                    </span>
                  )}
                </div>
                {cp ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[
                        { label: "CP", value: cp, unit: "W", sub: "Aerobic Ceiling" },
                        { label: "W'", value: wPrime, unit: "kJ", sub: "Anaerobic Reserve" },
                        { label: "Pmax", value: pmax, unit: "W", sub: "Sprint Power" },
                      ].map(m => (
                        <div key={m.label} style={{ padding: 12, borderRadius: 8, background: T.surface }}>
                          <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>{m.label}</div>
                          <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: T.text, marginTop: 3 }}>
                            {m.value ?? "\u2014"}<span style={{ fontSize: 10, color: T.textDim }}> {m.unit}</span>
                          </div>
                          <div style={{ fontSize: 10, color: T.textSoft, marginTop: 2 }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>
                    {cpFtpDelta != null && (
                      <div style={{ textAlign: "center", fontSize: 11, color: T.textDim, marginTop: 10 }}>
                        CP is {Math.abs(cpFtpDelta)}W {cpFtpDelta >= 0 ? "above" : "below"} FTP
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: 16, textAlign: "center", color: T.textSoft, fontSize: 12 }}>
                    Need more ride data to build your CP model.
                  </div>
                )}
              </Card>

              {/* Performance Models */}
              <Card style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Performance Models</h3>
                  {modelTiles.length > 0 && (
                    <span style={{ fontSize: 10, color: T.textDim }}>{modelTiles.length} active</span>
                  )}
                </div>
                {modelTiles.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {modelTiles.map(m => (
                      <div key={m.key} style={{ padding: 12, borderRadius: 8, background: T.surface }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ color: T.accent, opacity: 0.7 }}>{m.icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</span>
                          </div>
                          {m.confidence && (
                            <span style={{ padding: "1px 6px", borderRadius: 9999, fontSize: 8, fontWeight: 700, background: `${CONFIDENCE_COLORS[m.confidence] || T.textDim}15`, color: CONFIDENCE_COLORS[m.confidence] || T.textDim, textTransform: "uppercase" }}>
                              {m.confidence}
                            </span>
                          )}
                        </div>
                        {m.headline && <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: T.text }}>{m.headline}</div>}
                        {m.sub && <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{m.sub}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 16, textAlign: "center", color: T.textSoft, fontSize: 12 }}>
                    Building your performance models...
                    <br />
                    <span style={{ fontSize: 11 }}>Need 10+ activities with weather, HRV, or nutrition data</span>
                  </div>
                )}
                {models?.metadata && (
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 10, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                    <span>{models.metadata.totalActivities} activities</span>
                    {models.metadata.activitiesWithWeather > 0 && <span>{models.metadata.activitiesWithWeather} weather</span>}
                    {models.metadata.activitiesWithSleep > 0 && <span>{models.metadata.activitiesWithSleep} sleep</span>}
                  </div>
                )}
              </Card>
            </div>

            {/* Training Load Summary */}
            {(ctl != null || atl != null || tsb != null) && (
              <Card style={{ padding: "18px 20px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Training Load</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { label: "Fitness (CTL)", value: ctl != null ? Math.round(ctl) : null, color: T.accent },
                    { label: "Fatigue (ATL)", value: atl != null ? Math.round(atl) : null, color: T.orange },
                    { label: "Form (TSB)", value: tsb != null ? Math.round(tsb) : null, color: tsb > 15 ? T.accent : tsb > -10 ? T.blue : tsb > -30 ? T.amber : T.red },
                  ].map(m => (
                    <div key={m.label} style={{ padding: 12, borderRadius: 8, background: T.surface }}>
                      <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: m.color || T.text, marginTop: 3 }}>
                        {m.value ?? "\u2014"}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ═══ RIGHT COLUMN — AI SIDEBAR ═══ */}
          <div style={{ position: isMobile ? "static" : "sticky", top: 80 }}>
            <Card style={{ overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: T.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: T.white, fontSize: 11 }}>{"\u2726"}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Performance Intelligence</div>
                </div>
                {/* Tabs */}
                <div style={{ display: "flex", gap: 2, padding: 2, background: T.surface, borderRadius: 6 }}>
                  {[
                    { key: "insights", label: "Insights" },
                    { key: "chat", label: "Ask Claude" },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setSidebarTab(tab.key)} style={{
                      flex: 1, padding: "5px 0", borderRadius: 5, border: "none",
                      background: sidebarTab === tab.key ? T.card : "transparent",
                      boxShadow: sidebarTab === tab.key ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
                      color: sidebarTab === tab.key ? T.text : T.textDim,
                      fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font,
                    }}>{tab.label}</button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "12px 12px 6px", maxHeight: isMobile ? "none" : 540, overflowY: "auto" }}>
                {sidebarTab === "insights" && (
                  <>
                    {insightsLoading ? (
                      <div style={{ padding: 20, textAlign: "center", color: T.textDim, fontSize: 12 }}>
                        Analyzing your performance patterns...
                      </div>
                    ) : aiInsights.length > 0 ? (
                      <>
                        <div style={{ padding: "0 2px", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <div style={{ width: 5, height: 5, borderRadius: 3, background: T.accent }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>What AIM has learned</span>
                          </div>
                          <p style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                            Patterns from {activityCount} activities and your connected data sources
                          </p>
                        </div>
                        {aiInsights.map((insight, i) => (
                          <SidebarInsight key={i} insight={insight} index={i} />
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: 20, textAlign: "center", color: T.textDim, fontSize: 12 }}>
                        Sync more activities to unlock AI performance insights.
                      </div>
                    )}
                  </>
                )}

                {sidebarTab === "chat" && (
                  <div style={{ display: "flex", flexDirection: "column", height: 460 }}>
                    <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
                      {chatMessages.length === 0 && (
                        <div style={{ padding: "16px 0", textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>Ask about your performance, training, or trends.</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {["What's my biggest power limiter?", "How far am I from Cat 1?", "Give me a VO2max workout plan"].map(q => (
                              <button key={q} onClick={() => { setChatInput(q); }} style={{
                                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                                padding: "8px 12px", fontSize: 11, color: T.textSoft, cursor: "pointer",
                                textAlign: "left", fontFamily: font,
                              }}>{q}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} style={{
                          alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                          background: msg.role === "user" ? T.accent : T.surface,
                          color: msg.role === "user" ? T.white : T.text,
                          padding: "8px 12px", borderRadius: 10, maxWidth: "85%",
                          fontSize: 12, lineHeight: 1.5,
                        }}>
                          {msg.role === "assistant" ? <FormattedText text={msg.text} /> : msg.text}
                        </div>
                      ))}
                      {chatTyping && (
                        <div style={{ alignSelf: "flex-start", background: T.surface, padding: "8px 12px", borderRadius: 10, fontSize: 12, color: T.textDim }}>
                          Thinking...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendChat()}
                    placeholder="Ask about your performance..."
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.surface, fontSize: 12, color: T.text, fontFamily: font,
                      outline: "none",
                    }}
                  />
                  <button onClick={handleSendChat} disabled={!chatInput.trim() || chatTyping} style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    background: chatInput.trim() ? T.gradient : T.surface,
                    color: chatInput.trim() ? T.white : T.textDim,
                    cursor: chatInput.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                  }}>{"\u2191"}</button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

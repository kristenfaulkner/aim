import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useSleepData } from "../hooks/useSleepData";
import { useResponsive } from "../hooks/useResponsive";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { LogOut, Settings, Menu, X, Moon, ChevronDown, ChevronUp, User } from "lucide-react";
import SEO from "../components/SEO";
import SourceBadge from "../components/SourceBadge";
import SleepAIPanel from "../components/sleep/SleepAIPanel";
import { FormattedText } from "../lib/formatText.jsx";

// ── Helpers ──

function formatSleepHours(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function scoreColor(score) {
  if (score == null) return T.textDim;
  if (score >= 70) return T.accent;
  if (score >= 50) return T.amber;
  return T.danger;
}

const PERIODS = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "1y", label: "1 Year" },
  { id: "all", label: "All" },
];

// ── Sparkline ──

function Sparkline({ data, width = 80, height = 28, color = T.accent }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const id = `spark-${color.replace("#", "")}-${data.length}`;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`
  ).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ── Summary Card ──

function SummaryCard({ label, value, unit, color = T.text, sparkData, sparkColor, badge }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>{label}{badge}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 700, fontFamily: mono, color }}>{value}</span>
          {unit && <span style={{ fontSize: 11, color: T.textSoft }}>{unit}</span>}
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColor || color} />}
      </div>
    </div>
  );
}

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ color: T.textSoft, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: T.textSoft }}>{p.name}:</span>
          <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Nightly Row ──

function NightlyRow({ row, expanded, onToggle, isMobile }) {
  const ext = row.source_data?.eightsleep_extended;
  const date = new Date(row.date + "T12:00:00");
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", transition: "all 0.2s" }}
      onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 14px" : "10px 16px", background: "none", border: "none", cursor: "pointer", color: T.text, fontFamily: font, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: isMobile ? "auto" : 100 }}>{dateStr}</span>
          <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: scoreColor(row.sleep_score) }}>
            {row.sleep_score != null ? row.sleep_score : "—"}
          </span>
          <span style={{ fontSize: 12, color: T.textSoft }}>{formatSleepHours(row.total_sleep_seconds)}</span>
          {!isMobile && row.deep_sleep_seconds && (
            <span style={{ fontSize: 11, color: T.textDim }}>Deep: {Math.round(row.deep_sleep_seconds / 60)}m</span>
          )}
          {!isMobile && row.rem_sleep_seconds && (
            <span style={{ fontSize: 11, color: T.textDim }}>REM: {Math.round(row.rem_sleep_seconds / 60)}m</span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} color={T.textDim} /> : <ChevronDown size={16} color={T.textDim} />}
      </button>
      {expanded && (
        <div style={{ padding: isMobile ? "0 14px 14px" : "0 16px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, paddingTop: 12 }}>
            <MiniStat label="Total Sleep" value={formatSleepHours(row.total_sleep_seconds)} />
            <MiniStat label="Deep Sleep" value={row.deep_sleep_seconds ? `${Math.round(row.deep_sleep_seconds / 60)}m` : "—"} />
            <MiniStat label="REM Sleep" value={row.rem_sleep_seconds ? `${Math.round(row.rem_sleep_seconds / 60)}m` : "—"} />
            <MiniStat label="Light Sleep" value={row.light_sleep_seconds ? `${Math.round(row.light_sleep_seconds / 60)}m` : "—"} />
            <MiniStat label="Efficiency" value={row.sleep_efficiency_pct != null ? `${Math.round(row.sleep_efficiency_pct)}%` : "—"} />
            <MiniStat label="Latency" value={row.sleep_latency_seconds != null ? `${Math.round(row.sleep_latency_seconds / 60)}m` : "—"} />
            <MiniStat label="Bedtime" value={formatTime(row.sleep_onset_time)} />
            <MiniStat label="Wake Time" value={formatTime(row.wake_time)} />
            <MiniStat label="HRV" value={row.hrv_overnight_avg_ms != null ? `${Math.round(row.hrv_overnight_avg_ms)}ms` : row.hrv_ms != null ? `${Math.round(row.hrv_ms)}ms` : "—"} />
            <MiniStat label="Resting HR" value={row.resting_hr_bpm != null ? `${Math.round(row.resting_hr_bpm)} bpm` : "—"} />
            <MiniStat label="Resp. Rate" value={row.respiratory_rate != null ? `${row.respiratory_rate.toFixed(1)} br/m` : "—"} />
            <MiniStat label="SpO2" value={row.blood_oxygen_pct != null ? `${row.blood_oxygen_pct}%` : "—"} />
            {row.bed_temperature_celsius != null && <MiniStat label="Bed Temp" value={`${row.bed_temperature_celsius.toFixed(1)}°C`} />}
            {ext?.toss_and_turns != null && <MiniStat label="Toss & Turns" value={ext.toss_and_turns} />}
            {ext?.room_temp_avg_c != null && <MiniStat label="Room Temp" value={`${ext.room_temp_avg_c.toFixed(1)}°C`} />}
            {ext?.sleep_quality_score != null && <MiniStat label="Quality Score" value={ext.sleep_quality_score} />}
            {ext?.sleep_routine_score != null && <MiniStat label="Routine Score" value={ext.sleep_routine_score} />}
            {ext?.sleep_fitness_score != null && <MiniStat label="Fitness Score" value={ext.sleep_fitness_score} />}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: mono, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// ── Main Page ──

export default function Sleep() {
  const navigate = useNavigate();
  const { signout, profile } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [expandedNight, setExpandedNight] = useState(null);
  const { sleepHistory, latestNight, averages, loading } = useSleepData(period);

  // AI Morning Summary (same pattern as Dashboard)
  const [sleepSummary, setSleepSummary] = useState(null);
  const [sleepSummaryLoading, setSleepSummaryLoading] = useState(false);
  const sleepSummaryFetchedRef = useRef(false);

  useEffect(() => {
    if (sleepSummaryFetchedRef.current || sleepSummaryLoading) return;
    if (!latestNight?.sleep_score && !latestNight?.total_sleep_seconds) return;
    sleepSummaryFetchedRef.current = true;
    setSleepSummaryLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/sleep/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        });
        const data = await res.json();
        if (res.ok && data.summary) setSleepSummary(data.summary);
      } catch {} finally {
        setSleepSummaryLoading(false);
      }
    })();
  }, [latestNight?.sleep_score, latestNight?.total_sleep_seconds]);

  // Sleep-Performance AI Analysis
  const [sleepAnalysis, setSleepAnalysis] = useState(null);
  const [sleepAnalysisLoading, setSleepAnalysisLoading] = useState(false);
  const [sleepAnalysisError, setSleepAnalysisError] = useState(null);
  const [sleepAnalysisCachedAt, setSleepAnalysisCachedAt] = useState(null);
  const sleepAnalysisFetchedRef = useRef(false);

  const triggerSleepAnalysis = useCallback(async (force = false) => {
    // Check localStorage cache (24h TTL)
    if (!force) {
      try {
        const cached = localStorage.getItem("aim_sleep_analysis");
        if (cached) {
          const { analysis, timestamp } = JSON.parse(cached);
          if (analysis && analysis.summary !== "undefined" && Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            setSleepAnalysis(analysis);
            setSleepAnalysisCachedAt(timestamp);
            return;
          } else {
            localStorage.removeItem("aim_sleep_analysis");
          }
        }
      } catch { /* ignore cache errors */ }
    }

    setSleepAnalysisLoading(true);
    setSleepAnalysisError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSleepAnalysisError("Not signed in"); return; }
      const res = await fetch("/api/sleep/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(res.status === 504 ? "Analysis timed out — try again (this is faster on retry)" : `Server error (${res.status})`); }
      if (res.ok && data.analysis) {
        setSleepAnalysis(data.analysis);
        const now = Date.now();
        setSleepAnalysisCachedAt(now);
        try {
          localStorage.setItem("aim_sleep_analysis", JSON.stringify({ analysis: data.analysis, timestamp: now }));
        } catch { /* storage full */ }
      } else {
        setSleepAnalysisError(data.error || `Analysis failed (${res.status})`);
      }
    } catch (err) {
      setSleepAnalysisError(err.message || "Network error");
    } finally {
      setSleepAnalysisLoading(false);
    }
  }, []);

  // Auto-trigger sleep analysis when enough data exists
  useEffect(() => {
    if (sleepAnalysisFetchedRef.current || sleepAnalysisLoading) return;
    if (sleepHistory.length < 7) return;
    sleepAnalysisFetchedRef.current = true;
    triggerSleepAnalysis();
  }, [sleepHistory.length, sleepAnalysisLoading, triggerSleepAnalysis]);

  const handleSignout = async () => { await signout(); navigate("/"); };

  // Chart data transforms
  const architectureData = sleepHistory.map(r => ({
    date: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    deep: r.deep_sleep_seconds ? +(r.deep_sleep_seconds / 3600).toFixed(2) : 0,
    rem: r.rem_sleep_seconds ? +(r.rem_sleep_seconds / 3600).toFixed(2) : 0,
    light: r.light_sleep_seconds ? +(r.light_sleep_seconds / 3600).toFixed(2) : 0,
  }));

  const scoreTrend = sleepHistory.filter(r => r.sleep_score != null).map(r => ({
    date: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: r.sleep_score,
  }));

  const hrvTrend = sleepHistory.filter(r => r.hrv_overnight_avg_ms != null || r.hrv_ms != null).map(r => ({
    date: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round(r.hrv_overnight_avg_ms || r.hrv_ms),
  }));

  const rhrTrend = sleepHistory.filter(r => r.resting_hr_bpm != null).map(r => ({
    date: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round(r.resting_hr_bpm),
  }));

  // Sparkline arrays
  const scoreSparkData = sleepHistory.map(r => r.sleep_score).filter(v => v != null);
  const sleepSparkData = sleepHistory.map(r => r.total_sleep_seconds ? r.total_sleep_seconds / 3600 : null).filter(v => v != null);
  const effSparkData = sleepHistory.map(r => r.sleep_efficiency_pct).filter(v => v != null);
  const hrvSparkData = sleepHistory.map(r => r.hrv_overnight_avg_ms || r.hrv_ms).filter(v => v != null);

  // Nightly detail list — most recent first
  const nightlyRows = [...sleepHistory].reverse();

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <SEO title="Sleep" description="Track sleep patterns, recovery metrics, and trends from your wearables." path="/sleep" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 12px" : "0 32px", height: isMobile ? 48 : 52, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {["Dashboard", "Activities", "Performance", "Sleep", "Health Lab", "Connect"].map(item => (
                <button key={item} onClick={() => {
                  if (item === "Dashboard") navigate("/dashboard");
                  if (item === "Activities") navigate("/activities");
                  if (item === "Performance") navigate("/performance");
                  if (item === "Health Lab") navigate("/health-lab");
                  if (item === "Connect") navigate("/connect");
                }} style={{ background: item === "Sleep" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: item === "Sleep" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>{item}</button>
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
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            {["Dashboard", "Activities", "Performance", "Sleep", "Health Lab", "Connect", "Profile", "Settings"].map(item => (
              <button key={item} onClick={() => { setMenuOpen(false); if (item === "Dashboard") navigate("/dashboard"); if (item === "Activities") navigate("/activities"); if (item === "Performance") navigate("/performance"); if (item === "Health Lab") navigate("/health-lab"); if (item === "Connect") navigate("/connect"); if (item === "Profile") navigate("/profile"); if (item === "Settings") navigate("/settings"); }} style={{ background: item === "Sleep" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: item === "Sleep" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, textAlign: "left" }}>{item}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? "16px" : isTablet ? "24px" : "32px" }}>
        {/* Header */}
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            <span style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sleep</span> Intelligence
          </h1>
          <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>Track sleep patterns, recovery metrics, and trends from Eight Sleep, Oura, Whoop, and more.</p>
        </div>

        {/* Time Period Pills */}
        <div style={{ display: "flex", gap: 4, marginBottom: isMobile ? 16 : 20, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              padding: isMobile ? "8px 14px" : "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: font,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              background: period === p.id ? T.accentDim : T.surface,
              color: period === p.id ? T.accent : T.textSoft,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              minHeight: isMobile ? 44 : "auto",
            }}>{p.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 14, color: T.textDim }}>Loading your sleep data...</div>
          </div>
        ) : sleepHistory.length === 0 ? (
          /* Empty State */
          <div style={{ textAlign: "center", padding: "40px 0", maxWidth: 500, margin: "0 auto" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}><Moon size={48} color={T.textDim} /></div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>No Sleep Data Yet</h2>
            <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 24px", lineHeight: 1.6 }}>
              Connect a sleep tracker like Eight Sleep, Oura, or Whoop to start monitoring your sleep patterns and recovery.
            </p>
            <button onClick={() => navigate("/connect")} style={{
              padding: "12px 24px",
              background: T.accent,
              border: "none",
              borderRadius: 8,
              color: T.bg,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: font,
              cursor: "pointer",
            }}>Connect Apps</button>
          </div>
        ) : (
          /* ── Two-column layout: sleep data (left) + AI panel (right) ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 380px",
            gap: 20,
            alignItems: "start",
          }}>
          {/* ── LEFT COLUMN: Sleep data ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14 }}>
              <SummaryCard
                label="Sleep Score"
                value={averages?.sleep_score != null ? Math.round(averages.sleep_score) : "—"}
                unit="/ 100"
                color={scoreColor(averages?.sleep_score)}
                sparkData={scoreSparkData.length > 1 ? scoreSparkData : null}
                sparkColor={scoreColor(averages?.sleep_score)}
              />
              <SummaryCard
                label="Avg Duration"
                value={averages?.total_sleep_seconds ? formatSleepHours(averages.total_sleep_seconds) : "—"}
                color={T.blue}
                sparkData={sleepSparkData.length > 1 ? sleepSparkData : null}
                sparkColor={T.blue}
              />
              <SummaryCard
                label="Sleep Efficiency"
                value={averages?.sleep_efficiency_pct != null ? `${Math.round(averages.sleep_efficiency_pct)}%` : "—"}
                color={T.purple}
                sparkData={effSparkData.length > 1 ? effSparkData : null}
                sparkColor={T.purple}
              />
              <SummaryCard
                label="Avg HRV"
                value={averages?.hrv_overnight_avg_ms != null ? Math.round(averages.hrv_overnight_avg_ms) : averages?.hrv_ms != null ? Math.round(averages.hrv_ms) : "—"}
                unit="ms"
                color={T.accent}
                sparkData={hrvSparkData.length > 1 ? hrvSparkData : null}
                badge={latestNight?.hrv_source ? <SourceBadge source={latestNight.hrv_source} context="sleep" compact /> : null}
              />
            </div>

            {/* Sleep Architecture Chart */}
            {architectureData.some(d => d.deep > 0 || d.rem > 0 || d.light > 0) && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? "14px" : "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Sleep Architecture</h3>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[{ label: "Deep", color: T.purple }, { label: "REM", color: T.blue }, { label: "Light", color: T.textDim }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 10, color: T.textSoft }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: isMobile ? 160 : 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={architectureData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gradDeep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={T.purple} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={T.purple} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradRem" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={T.blue} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={T.blue} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={T.textDim} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={T.textDim} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textDim }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: T.textDim, fontFamily: mono }} tickLine={false} axisLine={false} width={30} tickFormatter={v => `${v}h`} />
                      <Tooltip content={<ChartTooltip formatter={v => `${v.toFixed(1)}h`} />} />
                      <Area type="monotone" dataKey="light" stackId="1" stroke={T.textDim} strokeWidth={1} fill="url(#gradLight)" name="Light" />
                      <Area type="monotone" dataKey="rem" stackId="1" stroke={T.blue} strokeWidth={1.5} fill="url(#gradRem)" name="REM" />
                      <Area type="monotone" dataKey="deep" stackId="1" stroke={T.purple} strokeWidth={1.5} fill="url(#gradDeep)" name="Deep" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Trend Charts */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 14 }}>
              {scoreTrend.length > 1 && (
                <TrendChart title="Sleep Score" data={scoreTrend} color={T.accent} avg={averages?.sleep_score} isMobile={isMobile} />
              )}
              {hrvTrend.length > 1 && (
                <TrendChart title="HRV" data={hrvTrend} color={T.blue} unit="ms" avg={averages?.hrv_overnight_avg_ms || averages?.hrv_ms} isMobile={isMobile} />
              )}
              {rhrTrend.length > 1 && (
                <TrendChart title="Resting HR" data={rhrTrend} color={T.pink} unit="bpm" avg={averages?.resting_hr_bpm} isMobile={isMobile} />
              )}
            </div>

            {/* AI Morning Summary */}
            {(sleepSummary || sleepSummaryLoading) && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? "14px" : "18px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${sleepSummary?.recovery_rating === "red" ? T.danger : sleepSummary?.recovery_rating === "yellow" ? T.amber : T.accent}40, transparent)` }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{sleepSummary?.recovery_rating === "red" ? "\uD83D\uDFE5" : sleepSummary?.recovery_rating === "yellow" ? "\uD83D\uDFE8" : "\uD83D\uDFE9"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Morning Sleep Report</span>
                  {sleepSummaryLoading && <span style={{ fontSize: 10, color: T.textDim, fontStyle: "italic" }}>Generating...</span>}
                </div>
                {sleepSummary && (
                  <>
                    {sleepSummary.greeting && (
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{sleepSummary.greeting}</div>
                    )}
                    {sleepSummary.metrics_line && (
                      <div style={{ fontSize: 11, color: T.accent, fontFamily: mono, marginBottom: 10, padding: "8px 12px", background: T.bg, borderRadius: 8 }}>
                        {sleepSummary.metrics_line}
                      </div>
                    )}
                    {sleepSummary.summary && (
                      <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.7, marginBottom: 8 }}>
                        <FormattedText text={sleepSummary.summary} />
                      </div>
                    )}
                    {sleepSummary.recommendation && (
                      <div style={{ fontSize: 12, color: sleepSummary.recovery_rating === "red" ? T.danger : sleepSummary.recovery_rating === "yellow" ? T.amber : T.accent, fontWeight: 600, lineHeight: 1.6 }}>
                        <FormattedText text={sleepSummary.recommendation} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Nightly Detail */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Nightly Detail</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nightlyRows.map(row => (
                  <NightlyRow
                    key={row.date}
                    row={row}
                    expanded={expandedNight === row.date}
                    onToggle={() => setExpandedNight(expandedNight === row.date ? null : row.date)}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: AI Panel ── */}
          <div style={isMobile
            ? { display: "flex", flexDirection: "column", gap: 16 }
            : { position: "sticky", top: 72, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 92px)", overflow: "auto" }
          }>
            <SleepAIPanel
              analysis={sleepAnalysis}
              onRequestAnalysis={() => triggerSleepAnalysis(true)}
              analysisLoading={sleepAnalysisLoading}
              analysisError={sleepAnalysisError}
              cachedAt={sleepAnalysisCachedAt}
            />
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Trend Chart Component ──

function TrendChart({ title, data, color, unit, avg, isMobile }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? "14px" : "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</h4>
        {avg != null && <span style={{ fontSize: 11, color: T.textDim }}>Avg: <span style={{ fontFamily: mono, color: T.textSoft }}>{Math.round(avg)}{unit ? ` ${unit}` : ""}</span></span>}
      </div>
      <div style={{ height: isMobile ? 100 : 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: T.textDim }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: T.textDim, fontFamily: mono }} tickLine={false} axisLine={false} width={28} domain={["auto", "auto"]} />
            <Tooltip content={<ChartTooltip formatter={v => `${v}${unit ? ` ${unit}` : ""}`} />} />
            {avg != null && (
              <Line type="monotone" dataKey={() => Math.round(avg)} stroke={T.textDim} strokeDasharray="4 4" strokeWidth={1} dot={false} name="Avg" />
            )}
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2, fill: color, strokeWidth: 0 }} activeDot={{ r: 4 }} name={title} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

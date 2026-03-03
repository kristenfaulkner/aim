import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { formatDistance, formatElevation } from "../lib/units";
import { useActivityBrowser } from "../hooks/useActivityBrowser";
import { useResponsive } from "../hooks/useResponsive";
import { supabase } from "../lib/supabase";
import SEO from "../components/SEO";
import { LogOut, Settings, Menu, X, Search, ChevronDown, ChevronUp, User, Sparkles } from "lucide-react";
import { formatActivityDate } from "../lib/formatTime";
import { FormattedText } from "../lib/formatText.jsx";

// ── Constants ──

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Helpers ──

function formatDuration(sec) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function groupActivities(activities) {
  const groups = new Map();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

  for (const act of activities) {
    const date = new Date(act.started_at);
    const actDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const t = actDate.getTime();
    let key;
    if (t === today.getTime()) key = "Today";
    else if (t === yesterday.getTime()) key = "Yesterday";
    else if (actDate >= mondayThisWeek) key = "This Week";
    else if (actDate >= mondayLastWeek) key = "Last Week";
    else key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(act);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function insightBorderColor(type) {
  if (type === "positive") return T.accent;
  if (type === "warning") return T.warn;
  if (type === "action") return T.purple;
  return T.blue;
}

// ── InlineAI — compact AI insights for the expanded card ──

function InlineAI({ analysis, loading, error, onRequest }) {
  const parsed = useMemo(() => {
    if (!analysis) return null;
    if (typeof analysis === "object" && Array.isArray(analysis.insights)) return analysis;
    if (typeof analysis === "string") {
      try {
        const p = JSON.parse(analysis);
        if (Array.isArray(p.insights)) return p;
      } catch { /* not JSON */ }
    }
    return null;
  }, [analysis]);

  if (loading) {
    return (
      <div style={{ padding: "20px 16px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%", background: T.accent,
              animation: `activities-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>Analyzing with AI...</div>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        {error && (
          <div style={{ fontSize: 11, color: T.danger, marginBottom: 10, padding: "8px 12px", background: `${T.danger}10`, borderRadius: 8 }}>
            {error}
          </div>
        )}
        <button
          onClick={onRequest}
          style={{
            background: T.gradient, border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 12, fontWeight: 700,
            color: T.white, cursor: "pointer", fontFamily: font,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {"\u2726"} Generate AI Analysis
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Section header */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.textDim,
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 11, background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{"\u2726"}</span>
        AIM Intelligence
      </div>

      {/* Summary */}
      {parsed.summary && (
        <div style={{
          fontSize: 12, color: T.text, lineHeight: 1.65,
          padding: "10px 12px", background: T.surface, borderRadius: 8,
          borderLeft: `3px solid ${T.accent}`,
        }}>
          <FormattedText text={parsed.summary} />
        </div>
      )}

      {/* Top 3 insights */}
      {parsed.insights?.slice(0, 3).map((insight, i) => (
        <div key={i} style={{
          padding: "9px 12px", background: T.surface, borderRadius: 8,
          borderLeft: `3px solid ${insightBorderColor(insight.type)}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 3 }}>
            {insight.icon} {insight.title}
          </div>
          <FormattedText text={insight.body} style={{ fontSize: 10, color: T.textSoft, lineHeight: 1.5 }} />
        </div>
      ))}

      {/* Overflow hint */}
      {parsed.insights?.length > 3 && (
        <div style={{ fontSize: 10, color: T.textSoft, fontStyle: "italic" }}>
          +{parsed.insights.length - 3} more insight{parsed.insights.length - 3 === 1 ? "" : "s"} — see full details
        </div>
      )}
    </div>
  );
}

// ── ExpandedContent — metrics + AI for an expanded activity card ──

function ExpandedContent({ detail, detailLoading, aiAnalysis, analysisLoading, analysisError, onRequestAnalysis, units, activityId, navigate }) {
  if (detailLoading || !detail) {
    return (
      <div style={{ padding: "20px", display: "flex", justifyContent: "center", gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: T.accent,
            animation: `activities-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    );
  }

  const metrics = [
    { label: "Duration", value: formatDuration(detail.duration_seconds) },
    detail.distance_meters > 0 ? { label: "Distance", value: formatDistance(detail.distance_meters, units) } : null,
    detail.avg_power_watts > 0 ? { label: "Avg Power", value: `${Math.round(detail.avg_power_watts)} W` } : null,
    detail.normalized_power_watts > 0 ? { label: "NP", value: `${Math.round(detail.normalized_power_watts)} W` } : null,
    detail.tss > 0 ? { label: "TSS", value: Math.round(detail.tss) } : null,
    detail.intensity_factor > 0 ? { label: "IF", value: Number(detail.intensity_factor).toFixed(2) } : null,
    detail.elevation_gain > 0 ? { label: "Elevation", value: formatElevation(detail.elevation_gain, units) } : null,
    detail.avg_hr_bpm > 0 ? { label: "Avg HR", value: `${Math.round(detail.avg_hr_bpm)} bpm` } : null,
  ].filter(Boolean);

  return (
    <div>
      {/* Metrics strip */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 0,
        padding: "12px 16px", borderTop: `1px solid ${T.border}`,
        background: T.surface,
      }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{
            minWidth: 80, padding: "6px 14px 6px 0",
            borderRight: i < metrics.length - 1 ? `1px solid ${T.border}` : "none",
            marginRight: i < metrics.length - 1 ? 14 : 0,
          }}>
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: T.text }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* AI insights */}
      <InlineAI
        analysis={aiAnalysis}
        loading={analysisLoading}
        error={analysisError}
        onRequest={onRequestAnalysis}
      />

      {/* Footer: see full details */}
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}`, marginTop: 12 }}>
        <button
          onClick={() => navigate(`/activity/${activityId}`)}
          style={{
            background: "none", border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "8px 14px",
            fontSize: 12, fontWeight: 600, color: T.accent,
            cursor: "pointer", fontFamily: font,
            display: "inline-flex", alignItems: "center", gap: 6,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.accentMid}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
        >
          See full activity details {"\u2192"}
        </button>
      </div>
    </div>
  );
}

// ── ActivityCard — collapsed row + optional expanded content ──

function ActivityCard({
  activity, isExpanded, onToggle,
  expandedDetail, detailLoading,
  aiAnalysis, analysisLoading, analysisError, onRequestAnalysis,
  units, navigate,
}) {
  const [hover, setHover] = useState(false);

  return (
    <div style={{
      borderBottom: `1px solid ${T.border}`,
      background: isExpanded ? `${T.accentDim}` : hover && !isExpanded ? T.cardHover : "transparent",
      borderLeft: isExpanded ? `3px solid ${T.accent}` : "3px solid transparent",
      transition: "background 0.15s",
    }}>
      {/* Clickable header row */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "11px 14px",
          background: "none", border: "none",
          cursor: "pointer", fontFamily: font, textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: isExpanded ? T.accent : T.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginBottom: 2,
          }}>
            {activity.name || "Untitled Ride"}
          </div>
          <div style={{ display: "flex", gap: 8, fontSize: 10, color: T.textDim, fontFamily: mono, flexWrap: "wrap" }}>
            <span>{formatActivityDate(activity, { weekday: "short", month: "short", day: "numeric" })}</span>
            {activity.duration_seconds > 0 && <span>{"\u00B7"} {formatDuration(activity.duration_seconds)}</span>}
            {activity.distance_meters > 0 && <span>{"\u00B7"} {formatDistance(activity.distance_meters, units)}</span>}
            {activity.avg_power_watts > 0 && <span>{"\u00B7"} {Math.round(activity.avg_power_watts)}W</span>}
            {activity.tss > 0 && <span>{"\u00B7"} {Math.round(activity.tss)} TSS</span>}
          </div>
        </div>
        <div style={{ flexShrink: 0, marginLeft: 10, color: isExpanded ? T.accent : T.textDim }}>
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <ExpandedContent
          detail={expandedDetail}
          detailLoading={detailLoading}
          aiAnalysis={aiAnalysis}
          analysisLoading={analysisLoading}
          analysisError={analysisError}
          onRequestAnalysis={onRequestAnalysis}
          units={units}
          activityId={activity.id}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ── NavBar ──

function NavBar({ profile, isMobile, menuOpen, setMenuOpen, userMenuOpen, setUserMenuOpen, onSignout, navigate }) {
  return (
    <>
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
                  background: item.label === "Activities" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: item.label === "Activities" ? T.accent : T.textSoft,
                  cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4,
                }}>{item.label}</button>
              ))}
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
                  <button onClick={() => { setUserMenuOpen(false); onSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>)}
            </div>
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
                background: item.label === "Activities" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Activities" ? T.accent : T.textSoft,
                cursor: "pointer", fontFamily: font, textAlign: "left",
              }}>{item.label}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); onSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Activities Page ──

export default function Activities() {
  const navigate = useNavigate();
  const { signout, user } = useAuth();
  const { units } = usePreferences();
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [profile, setProfile] = useState(null);

  const {
    activities,
    loading: browserLoading,
    hasMore,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    oldestYear,
    searchQuery, setSearchQuery,
    loadMore,
  } = useActivityBrowser({ enabled: true, initialTimePeriod: "month" });

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  // Auto-expand first activity once loaded
  useEffect(() => {
    if (!expandedId && activities.length > 0) {
      setExpandedId(activities[0].id);
    }
  }, [activities, expandedId]);

  // ── Fetch expanded activity detail ──
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [dailyMetrics, setDailyMetrics] = useState(null);

  useEffect(() => {
    if (!expandedId || !user) {
      setActivity(null);
      setDailyMetrics(null);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const res = await fetch(`/api/activities/detail?id=${expandedId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setActivity(data || null);
        if (data?.started_at) {
          const dateStr = new Date(data.started_at).toISOString().split("T")[0];
          const { data: dm } = await supabase
            .from("daily_metrics")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", dateStr)
            .single();
          if (!cancelled) setDailyMetrics(dm || null);
        }
      } catch { /* silently fail */ }
      finally { if (!cancelled) setActivityLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [expandedId, user]);

  // ── AI Analysis ──
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const effectiveAiAnalysis = liveAnalysis || activity?.ai_analysis || null;

  const triggerAnalysis = useCallback(async () => {
    if (!activity?.id) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAnalysisError("Not signed in"); return; }
      const res = await fetch(`/api/activities/analyze?id=${activity.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        setAnalysisError("Analysis server error — please try again");
        return;
      }
      if (res.ok) setLiveAnalysis(data.analysis);
      else setAnalysisError(data.error || `Analysis failed (${res.status})`);
    } catch (err) {
      setAnalysisError(err.message || "Network error");
    } finally {
      setAnalysisLoading(false);
    }
  }, [activity?.id]);

  // Reset live analysis when switching activities
  useEffect(() => {
    setLiveAnalysis(null);
    setAnalysisError(null);
  }, [activity?.id]);

  // Auto-trigger analysis when detail loads and no analysis exists
  useEffect(() => {
    if (activity && !activity.ai_analysis && !analysisLoading && !liveAnalysis) {
      triggerAnalysis();
    }
  }, [activity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignout = async () => { await signout(); navigate("/"); };

  // ── Toggle expand/collapse ──
  const handleToggle = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // ── Backfill AI Analysis ──
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(null);

  const runBackfill = useCallback(async () => {
    setBackfillRunning(true);
    setBackfillProgress({ processed: 0, remaining: null });
    let totalProcessed = 0;
    let remaining = Infinity;
    try {
      while (remaining > 0) {
        const res = await fetch("/api/activities/backfill-analysis?limit=5", {
          method: "POST",
          headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session.access_token}` },
        });
        const data = await res.json();
        totalProcessed += data.processed || 0;
        remaining = data.remaining ?? 0;
        setBackfillProgress({ processed: totalProcessed, remaining });
        if (data.error) { setBackfillProgress({ processed: totalProcessed, remaining, error: data.error }); break; }
        if ((data.processed || 0) === 0 && (data.failed || 0) === 0) break;
      }
      if (remaining === 0) setBackfillProgress({ processed: totalProcessed, remaining: 0 });
    } catch {
      setBackfillProgress(prev => ({ ...prev, error: "Network error" }));
    } finally {
      setBackfillRunning(false);
    }
  }, []);

  // ── Grouped activities ──
  const groups = groupActivities(activities);

  // ── Year options ──
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= oldestYear; y--) yearOptions.push(y);

  const selectStyle = {
    flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
    fontFamily: font, border: `1px solid ${T.border}`, background: T.surface,
    color: T.text, cursor: "pointer", outline: "none", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' fill='none' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 24,
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <SEO title="Activities" path="/activities" description="Browse all your activities with AI-powered analysis and cross-domain insights." />
      <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} userMenuOpen={userMenuOpen} setUserMenuOpen={setUserMenuOpen} onSignout={handleSignout} navigate={navigate} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? 16 : "20px 24px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Activities</span>
            </h1>
            <p style={{ fontSize: 13, color: T.textSoft, margin: "4px 0 0" }}>Click any activity to expand with AI analysis</p>
          </div>
          {!backfillRunning && backfillProgress?.remaining !== 0 && (
            <button onClick={runBackfill} style={{ background: T.gradient, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 11, fontWeight: 600, color: T.white, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <Sparkles size={13} /> Generate All AI Analyses
            </button>
          )}
          {backfillRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.accent, fontWeight: 600 }}>
              <div style={{ width: 14, height: 14, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "activities-spin 1s linear infinite" }} />
              Analyzing... {backfillProgress?.processed || 0} done
              {backfillProgress?.remaining != null ? `, ${backfillProgress.remaining} remaining` : ""}
            </div>
          )}
          {!backfillRunning && backfillProgress?.remaining === 0 && !backfillProgress?.error && (
            <div style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>✓ All activities analyzed</div>
          )}
          {!backfillRunning && backfillProgress?.error && (
            <div style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>
              {backfillProgress.processed > 0 ? `${backfillProgress.processed} analyzed — ` : ""}
              {typeof backfillProgress.error === "string" ? backfillProgress.error : "Analysis error — try again later"}
            </div>
          )}
        </div>

        {/* Filter controls */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "12px 12px 0 0", padding: "12px 14px", borderBottom: "none" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 2 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "7px 12px 7px 30px",
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7,
                  fontSize: 11, color: T.text, fontFamily: font, outline: "none",
                }}
              />
            </div>
            {/* Month */}
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={selectStyle}>
              {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
            </select>
            {/* Year */}
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={selectStyle}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Activity list */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          {groups.map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div style={{
                padding: "7px 16px", fontSize: 10, fontWeight: 700, color: T.textDim,
                textTransform: "uppercase", letterSpacing: "0.08em",
                background: T.surface, borderBottom: `1px solid ${T.border}`,
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{group.label}</span>
                <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                  {group.items.length} {group.items.length === 1 ? "ride" : "rides"}
                </span>
              </div>
              {/* Activity cards */}
              {group.items.map(a => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  isExpanded={a.id === expandedId}
                  onToggle={() => handleToggle(a.id)}
                  expandedDetail={a.id === expandedId ? activity : null}
                  detailLoading={a.id === expandedId && activityLoading}
                  aiAnalysis={a.id === expandedId ? effectiveAiAnalysis : null}
                  analysisLoading={a.id === expandedId && analysisLoading}
                  analysisError={a.id === expandedId ? analysisError : null}
                  onRequestAnalysis={triggerAnalysis}
                  units={units}
                  navigate={navigate}
                />
              ))}
            </div>
          ))}

          {/* Load more */}
          {hasMore && !searchQuery && (
            <button onClick={loadMore} disabled={browserLoading} style={{ width: "100%", padding: 12, border: "none", background: "transparent", cursor: browserLoading ? "default" : "pointer", fontSize: 11, fontWeight: 600, color: T.accent, fontFamily: font }}>
              {browserLoading ? "Loading..." : "Load More Activities"}
            </button>
          )}

          {/* Loading skeleton */}
          {browserLoading && activities.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 11, color: T.textDim }}>
              Loading activities...
            </div>
          )}

          {/* Empty state */}
          {!browserLoading && activities.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{searchQuery ? "\uD83D\uDD0D" : "\uD83D\uDEB4"}</div>
              <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>
                {searchQuery ? `No activities matching "${searchQuery}"` : "No activities in this period"}
              </div>
              {!searchQuery && (
                <p style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  Connect Strava or upload workouts to see your activities here.
                </p>
              )}
            </div>
          )}

          {/* Footer count */}
          <div style={{ padding: "8px 16px", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.textDim }}>
            {activities.length} activities{hasMore ? "+" : ""}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes activities-spin { to { transform: rotate(360deg); } }
        @keyframes activities-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

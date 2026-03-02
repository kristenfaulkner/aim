import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useActivityBrowser } from "../hooks/useActivityBrowser";
import { useResponsive } from "../hooks/useResponsive";
import { supabase } from "../lib/supabase";
import AIPanel from "../components/dashboard/AIPanel";
import SEO from "../components/SEO";
import { LogOut, Settings, Menu, X, Search, Calendar, ChevronDown } from "lucide-react";

// ── Constants ──

const TIME_PERIODS = [
  { id: "week", label: "7 Days" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Helpers ──

function formatDuration(sec) {
  if (!sec) return "\u2014";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function metersToMiles(m) {
  return (m / 1609.344).toFixed(1);
}

function groupActivities(activities, timePeriod) {
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
    let key;
    if (timePeriod === "week" || timePeriod === "month") {
      const actDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const actTime = actDate.getTime();
      if (actTime === today.getTime()) key = "Today";
      else if (actTime === yesterday.getTime()) key = "Yesterday";
      else if (actDate >= mondayThisWeek) key = "This Week";
      else if (actDate >= mondayLastWeek) key = "Last Week";
      else key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else {
      key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(act);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

// ── ActivityRow ──

function ActivityRow({ activity, isSelected, onSelect }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={() => onSelect(activity.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 14px",
        background: isSelected ? T.accentDim : hover ? T.cardHover : "transparent",
        border: "none",
        borderLeft: isSelected ? `2px solid ${T.accent}` : "2px solid transparent",
        borderBottom: `1px solid ${T.border}`,
        cursor: "pointer",
        fontFamily: font,
        textAlign: "left",
        transition: "background 0.15s",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: isSelected ? T.accent : T.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {activity.name || "Untitled Ride"}
        </div>
        <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>
          {new Date(activity.started_at).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0, marginLeft: 12 }}>
        <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 600, color: T.text }}>
          {formatDuration(activity.duration_seconds)}
        </span>
        <div style={{ display: "flex", gap: 8, fontSize: 10, color: T.textSoft, fontFamily: mono }}>
          {activity.distance_meters > 0 && <span>{metersToMiles(activity.distance_meters)} mi</span>}
          {activity.tss > 0 && <span>{Math.round(activity.tss)} TSS</span>}
          {activity.avg_power_watts > 0 && <span>{Math.round(activity.avg_power_watts)}W</span>}
        </div>
      </div>
    </button>
  );
}

// ── NavBar ──

function NavBar({ profile, isMobile, menuOpen, setMenuOpen, onSignout, navigate }) {
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
              {[{ label: "Dashboard", path: "/dashboard" }, { label: "Workouts", path: "/workouts" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Settings", path: "/settings" }].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "Workouts" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: item.label === "Workouts" ? T.accent : T.textSoft,
                  cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4,
                }}>{item.label === "Settings" ? <><Settings size={12} /> {item.label}</> : item.label}</button>
              ))}
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: T.surface, borderRadius: 7, border: `1px solid ${T.border}` }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent }} /><span style={{ fontSize: 10, color: T.textSoft }}>All synced</span>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white }}>
              {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
            </div>
            <button onClick={onSignout} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 5 }}>
              <LogOut size={13} /> Sign Out
            </button>
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
            {[{ label: "Dashboard", path: "/dashboard" }, { label: "Workouts", path: "/workouts" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Settings", path: "/settings" }].map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Workouts" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Workouts" ? T.accent : T.textSoft,
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

// ── Main Workouts Page ──

export default function Workouts() {
  const navigate = useNavigate();
  const { signout, user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [profile, setProfile] = useState(null);

  // Activity browser — always enabled on this page
  const {
    activities,
    loading: browserLoading,
    hasMore,
    timePeriod,
    setTimePeriod,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    oldestYear,
    searchQuery,
    setSearchQuery,
    loadMore,
  } = useActivityBrowser({ enabled: true });

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  // Auto-select first activity once loaded
  useEffect(() => {
    if (!selectedActivityId && activities.length > 0) {
      setSelectedActivityId(activities[0].id);
    }
  }, [activities, selectedActivityId]);

  // ── Fetch selected activity detail ──
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [dailyMetrics, setDailyMetrics] = useState(null);

  useEffect(() => {
    if (!selectedActivityId || !user) {
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
        const res = await fetch(`/api/activities/detail?id=${selectedActivityId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setActivity(data.activity || null);

        // Fetch daily metrics for that date
        if (data.activity?.started_at) {
          const dateStr = new Date(data.activity.started_at).toISOString().split("T")[0];
          const { data: dm } = await supabase
            .from("daily_metrics")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", dateStr)
            .single();
          if (!cancelled) setDailyMetrics(dm || null);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedActivityId, user]);

  // ── AI Analysis ──
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const analysisTriggeredRef = useRef(null);
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
      const data = await res.json();
      if (res.ok) setLiveAnalysis(data.analysis);
      else setAnalysisError(data.error || `Analysis failed (${res.status})`);
    } catch (err) {
      setAnalysisError(err.message || "Network error");
    } finally {
      setAnalysisLoading(false);
    }
  }, [activity?.id]);

  useEffect(() => {
    if (activity?.id && !activity.ai_analysis && !analysisLoading && analysisTriggeredRef.current !== activity.id) {
      analysisTriggeredRef.current = activity.id;
      triggerAnalysis();
    }
    if (activity?.id !== analysisTriggeredRef.current) setLiveAnalysis(null);
  }, [activity?.id, activity?.ai_analysis, analysisLoading, triggerAnalysis]);

  // ── Computed values (for AIPanel) ──
  const computed = useMemo(() => {
    if (!activity || !profile) return null;
    const weightKg = dailyMetrics?.weight_kg || profile.weight_kg || 70;
    const ftp = profile.ftp_watts || 200;
    return {
      IF: activity.intensity_factor != null ? Number(activity.intensity_factor).toFixed(2) : "\u2014",
      TSS: activity.tss != null ? Math.round(activity.tss) : "\u2014",
      weightKg, ftp,
    };
  }, [activity, profile, dailyMetrics]);

  const handleSignout = async () => { await signout(); navigate("/"); };

  // ── Filter UI ──
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= oldestYear; y--) yearOptions.push(y);

  // Client-side search
  const filtered = searchQuery
    ? activities.filter(a => (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : activities;
  const groups = groupActivities(filtered, timePeriod);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <SEO title="Workouts" path="/workouts" description="Browse all your workouts with AI-powered analysis and cross-domain insights." />
      <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onSignout={handleSignout} navigate={navigate} />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? 16 : "20px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Workouts</span>
          </h1>
          <p style={{ fontSize: 13, color: T.textSoft, margin: "4px 0 0" }}>Browse all activities with AI-powered analysis</p>
        </div>

        {/* Two-Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: 20, alignItems: "start" }}>
          {/* LEFT: Activity List */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: isMobile ? "none" : "calc(100vh - 140px)" }}>
            {/* Filters header */}
            <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
              {/* Search */}
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 32px",
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                    fontSize: 11, color: T.text, fontFamily: font, outline: "none",
                  }}
                />
              </div>

              {/* Time period pills */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {TIME_PERIODS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setTimePeriod(p.id)}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 600,
                      fontFamily: font, border: "none", cursor: "pointer",
                      background: timePeriod === p.id ? T.accentDim : T.surface,
                      color: timePeriod === p.id ? T.accent : T.textSoft,
                      transition: "all 0.15s",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Month + Year selectors */}
              {(timePeriod === "month" || timePeriod === "year") && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {timePeriod === "month" && (
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      style={{
                        flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        fontFamily: font, border: `1px solid ${T.border}`, background: T.surface,
                        color: T.text, cursor: "pointer", outline: "none", appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' fill='none' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 24,
                      }}
                    >
                      {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                    </select>
                  )}
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    style={{
                      flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      fontFamily: font, border: `1px solid ${T.border}`, background: T.surface,
                      color: T.text, cursor: "pointer", outline: "none", appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' fill='none' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 24,
                    }}
                  >
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Activity List */}
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              {groups.map(group => (
                <div key={group.label}>
                  <div style={{
                    padding: "8px 16px", fontSize: 10, fontWeight: 700, color: T.textDim,
                    textTransform: "uppercase", letterSpacing: "0.08em", background: T.surface,
                    borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 1,
                    display: "flex", justifyContent: "space-between", fontFamily: font,
                  }}>
                    <span>{group.label}</span>
                    <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                      {group.items.length} {group.items.length === 1 ? "ride" : "rides"}
                    </span>
                  </div>
                  {group.items.map(a => (
                    <ActivityRow
                      key={a.id}
                      activity={a}
                      isSelected={a.id === selectedActivityId}
                      onSelect={setSelectedActivityId}
                    />
                  ))}
                </div>
              ))}

              {/* Load More */}
              {hasMore && !searchQuery && (
                <button
                  onClick={loadMore}
                  disabled={browserLoading}
                  style={{
                    width: "100%", padding: "12px", border: "none", background: "transparent",
                    cursor: browserLoading ? "default" : "pointer", fontSize: 11, fontWeight: 600,
                    color: T.accent, fontFamily: font,
                  }}
                >
                  {browserLoading ? "Loading..." : "Load More Activities"}
                </button>
              )}

              {/* Loading state */}
              {browserLoading && activities.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 11, color: T.textDim }}>
                  Loading activities...
                </div>
              )}

              {/* Empty state */}
              {!browserLoading && filtered.length === 0 && (
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
            </div>

            {/* Footer */}
            <div style={{ padding: "8px 16px", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.textDim, flexShrink: 0, fontFamily: font }}>
              {filtered.length} activities{hasMore ? "+" : ""}
            </div>
          </div>

          {/* RIGHT: AI Panel */}
          <div style={isMobile
            ? { display: "flex", flexDirection: "column", gap: 16 }
            : { position: "sticky", top: 72, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 92px)", overflow: "auto" }
          }>
            {/* Selected activity header */}
            {activity && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {new Date(activity.started_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  {activity.name || "Untitled Ride"}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.textSoft, fontFamily: mono, flexWrap: "wrap" }}>
                  {activity.duration_seconds > 0 && <span>{formatDuration(activity.duration_seconds)}</span>}
                  {activity.distance_meters > 0 && <span>{metersToMiles(activity.distance_meters)} mi</span>}
                  {activity.avg_power_watts > 0 && <span>{Math.round(activity.avg_power_watts)}W avg</span>}
                  {activity.tss > 0 && <span>{Math.round(activity.tss)} TSS</span>}
                </div>
                <button
                  onClick={() => navigate(`/activity/${activity.id}`)}
                  style={{
                    background: "none", border: "none", padding: 0, marginTop: 8,
                    fontSize: 11, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: font,
                  }}
                >
                  View Full Details {"\u2192"}
                </button>
              </div>
            )}

            {/* AI Panel or empty state */}
            {activity ? (
              <AIPanel
                aiAnalysis={effectiveAiAnalysis}
                activity={activity}
                profile={profile}
                dailyMetrics={dailyMetrics}
                computed={computed}
                onRequestAnalysis={triggerAnalysis}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
              />
            ) : (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
                <div style={{ fontSize: 13, color: T.textSoft }}>
                  {activityLoading ? "Loading activity..." : "Select an activity to view AI analysis"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

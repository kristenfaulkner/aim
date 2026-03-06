import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn } from "../theme/styles";
import { ArrowLeft, Clock, Zap, Heart, Mountain, Activity, TrendingUp, Flame, RefreshCw, Menu, Settings, User, LogOut, X, ChevronDown, ChevronUp, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { usePreferences } from "../context/PreferencesContext";
import { formatDistance, formatElevation, elevationUnit } from "../lib/units";
import { formatActivityDate, formatActivityTime, getActivityTimezoneAbbrev } from "../lib/formatTime";
import SessionNotes from "../components/SessionNotes.jsx";
import WbalChart from "../components/WbalChart.jsx";
import { useWbalData } from "../hooks/useWbalData.js";
import { useSimilarSessions } from "../hooks/useSimilarSessions.js";
import SegmentComparisonPanel from "../components/SegmentComparisonPanel.jsx";
import { useSegmentEfforts } from "../hooks/useSegmentEfforts.js";
import IntelligencePanel from "../components/activity/IntelligencePanel.jsx";
import DataPanel from "../components/activity/DataPanel.jsx";
import FloatingChatBar from "../components/activity/FloatingChatBar.jsx";

// ── Helpers ──

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const ACTIVITY_TYPE_EMOJI = {
  Ride: "\uD83D\uDEB4",
  Run: "\uD83C\uDFC3",
  Swim: "\uD83C\uDFCA",
  Walk: "\uD83D\uDEB6",
  Hike: "\u26F0\uFE0F",
  Strength: "\uD83C\uDFCB\uFE0F",
  Yoga: "\uD83E\uDDD8",
};

// ── Main Page ──

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [localName, setLocalName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const { isMobile, isTablet } = useResponsive();
  const { signout, profile } = useAuth();
  const { units } = usePreferences();
  const { data: wbalData, loading: wbalLoading } = useWbalData(id);
  const similarSessions = useSimilarSessions(id);
  const { data: segmentData, loading: segmentsLoading } = useSegmentEfforts(id);
  const handleSignout = async () => { await signout(); navigate("/"); };

  // ── Delete activity ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/activities/delete?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.error || "Failed to delete activity");
        setDeleting(false);
        return;
      }
      navigate("/activities", { replace: true });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  // ── Data fetching ──

  const fetchActivity = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/activities/detail?id=${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setError(errData.detail || "Activity not found");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setActivity(data);
    setLoading(false);
    if (!data.ai_analysis && !data.ai_analysis_generated_at) {
      pollForAnalysis(session.access_token);
    }
  }, [id]);

  const pollForAnalysis = async (token) => {
    setAnalysisLoading(true);
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/activities/detail?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.ai_analysis) {
            setActivity(data);
            setAnalysisLoading(false);
            clearInterval(poll);
          }
        }
      } catch { /* ignore */ }
      if (attempts >= 12) { setAnalysisLoading(false); clearInterval(poll); }
    }, 5000);
  };

  const triggerAnalysis = async () => {
    setAnalysisLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`/api/activities/analyze?id=${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return; }
      if (res.ok && data.analysis) {
        setActivity(prev => ({ ...prev, ai_analysis: data.analysis, ai_analysis_generated_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    }
    setAnalysisLoading(false);
  };

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  useEffect(() => {
    if (activity) setLocalName(activity.name || "");
  }, [activity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveName = useCallback(async (newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === (activity?.name || "")) {
      setLocalName(activity?.name || "");
      setNameEditing(false);
      return;
    }
    setNameSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/activities/annotate?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setActivity(prev => ({ ...prev, name: trimmed }));
        setLocalName(trimmed);
      } else {
        setLocalName(activity?.name || "");
      }
    } catch { /* ignore */ } finally {
      setNameSaving(false);
      setNameEditing(false);
    }
  }, [activity?.name, id]);

  // Determine if session notes have data (for collapsed tag display)
  const notesHasData = activity && !!(activity.user_notes || activity.user_rating || activity.user_rpe || (activity.user_tags && activity.user_tags.length) || activity.gi_comfort || activity.mental_focus || activity.perceived_recovery_pre);

  // ── Loading state ──

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <RefreshCw size={24} style={{ color: T.accent, animation: "aim-spin 1s linear infinite" }} />
        <style>{`@keyframes aim-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ──

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: T.bg }}>
        <p style={{ fontSize: 16, color: T.textSoft }}>{error}</p>
        <button onClick={() => navigate("/activities")} style={{ ...btn(false), fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to Activities
        </button>
        <button onClick={() => { setError(null); setLoading(true); fetchActivity(); }} style={{ ...btn(true), fontSize: 13 }}>
          Retry
        </button>
      </div>
    );
  }

  const a = activity;
  const formattedDate = formatActivityDate(a, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const formattedTime = formatActivityTime(a, { hour: "numeric", minute: "2-digit" });
  const tzAbbrev = getActivityTimezoneAbbrev(a);
  const typeEmoji = ACTIVITY_TYPE_EMOJI[a.activity_type] || "\uD83C\uDFCB\uFE0F";

  // Weather temp for hero subtitle
  const temp = a.activity_weather?.temp_c != null ? `${Math.round(a.activity_weather.temp_c * 9 / 5 + 32)}\u00B0F` : null;

  // Hero stats ribbon
  const heroStats = [
    { label: "Duration", value: formatDuration(a.duration_seconds) },
    { label: "Distance", value: formatDistance(a.distance_meters, units) },
    { label: "Elevation", value: a.elevation_gain_meters ? `${formatElevation(a.elevation_gain_meters, units)} ${elevationUnit(units)}` : null },
    { label: "TSS", value: a.tss ? Math.round(a.tss) : null },
    { label: "NP", value: a.normalized_power_watts ? `${Math.round(a.normalized_power_watts)}W` : null, glow: true },
    { label: "EF", value: a.efficiency_factor || null, glow: true },
  ].filter(s => s.value != null);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 120 }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "0 12px" : "0 40px",
        height: isMobile ? 48 : 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${T.border}`,
        background: `${T.surface}cc`, backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.white }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => navigate("/activities")} style={{ background: T.accentDim, border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowLeft size={12} /> Activities
              </button>
              {[{ label: "Performance", path: "/performance" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{ background: "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font }}>{item.label}</button>
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
                  <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}><User size={14} /> Profile</button>
                  <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}><Settings size={14} /> Settings</button>
                  <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                  <button onClick={() => { setUserMenuOpen(false); handleSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}><LogOut size={14} /> Sign Out</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            {[{ label: "Dashboard", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "Performance", path: "/performance" }, { label: "My Stats", path: "/my-stats" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Profile", path: "/profile" }, { label: "Settings", path: "/settings" }].map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{ background: item.label === "Activities" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: item.label === "Activities" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, textAlign: "left" }}>{item.label}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}><LogOut size={14} /> Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "24px 24px 60px" }}>

        {/* ── Hero ── */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: isMobile ? "16px" : "20px 24px", marginBottom: 12,
          position: "relative", overflow: "hidden",
        }}>
          {/* Subtle glow */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "flex-start",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 20,
            position: "relative",
            flexDirection: isMobile ? "column" : "row",
          }}>
            {/* Left: type badge, title, date */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: T.accent,
                  background: T.accentDim, border: `1px solid ${T.accentMid}`,
                  borderRadius: 5, padding: "2px 7px", fontFamily: font,
                }}>{typeEmoji} {a.activity_type}</span>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  title="Delete activity"
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: T.textDim, display: "flex", alignItems: "center",
                    borderRadius: 4, transition: "color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T.danger}
                  onMouseLeave={e => e.currentTarget.style.color = T.textDim}
                ><Trash2 size={13} /></button>
              </div>
              {nameEditing ? (
                <input
                  autoFocus
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  onBlur={() => saveName(localName)}
                  onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { setLocalName(a.name || ""); setNameEditing(false); } }}
                  style={{
                    fontSize: isMobile ? 20 : 22, fontWeight: 700, letterSpacing: "-0.03em",
                    margin: "0 0 3px", width: "100%", background: T.surface,
                    border: `2px solid ${T.accentMid}`, borderRadius: 8,
                    padding: "4px 10px", fontFamily: font, color: T.text, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <h1
                  onClick={() => setNameEditing(true)}
                  title="Click to edit name"
                  style={{
                    fontSize: isMobile ? 20 : 22, fontWeight: 700, letterSpacing: "-0.03em",
                    lineHeight: 1.15, margin: "0 0 3px", cursor: "text",
                    display: "flex", alignItems: "center", gap: 8, fontFamily: font,
                  }}
                >
                  {a.name || "Untitled Activity"}
                  {nameSaving && <span style={{ fontSize: 12, color: T.textDim, fontWeight: 400 }}>Saving...</span>}
                </h1>
              )}
              <p style={{ fontSize: 12, color: T.textSoft, fontFamily: font, margin: 0 }}>
                {formattedDate} {"\u00B7"} {formattedTime}{tzAbbrev ? ` ${tzAbbrev}` : ""}
                {temp ? ` \u00B7 ${temp}` : ""}
              </p>
            </div>

            {/* Right: stats ribbon */}
            <div style={{
              display: "flex",
              gap: isMobile ? 10 : 14,
              flexShrink: 0,
              alignItems: "flex-end",
              flexWrap: isMobile ? "wrap" : "nowrap",
            }}>
              {heroStats.map((s, i) => (
                <div key={i} style={{ textAlign: isMobile ? "left" : "right" }}>
                  <div style={{ fontSize: 9, color: T.textDim, fontFamily: font, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: s.glow ? T.accent : T.text, fontFamily: mono, letterSpacing: "-0.02em" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Session Notes (collapsible) ── */}
        <div style={{ marginBottom: 14 }}>
          {notesExpanded ? (
            <SessionNotes
              key={id}
              activityId={id}
              initialNotes={a.user_notes || ""}
              initialRating={a.user_rating || 0}
              initialRpe={a.user_rpe || 0}
              initialTags={a.user_tags || []}
              initialGiComfort={a.gi_comfort || 0}
              initialMentalFocus={a.mental_focus || 0}
              initialPerceivedRecoveryPre={a.perceived_recovery_pre || 0}
              onClose={() => setNotesExpanded(false)}
              onSaved={(updated) => {
                setActivity(prev => ({ ...prev, ...updated }));
              }}
            />
          ) : (
            <div
              onClick={() => setNotesExpanded(true)}
              style={{
                background: notesHasData ? T.accentDim : T.card,
                border: `1px solid ${notesHasData ? T.accentMid : T.border}`,
                borderRadius: 12, padding: "10px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{"\uD83D\uDCDD"}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: font }}>Session Notes</span>
                {!notesHasData && (
                  <span style={{ fontSize: 10, color: T.textDim, fontFamily: font, fontStyle: "italic" }}>
                    Your notes help AIM learn your patterns
                  </span>
                )}
                {notesHasData && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.user_rpe > 0 && <NoteTag label={`RPE ${a.user_rpe}`} color={T.accent} />}
                    {a.user_rating > 0 && <NoteTag label={`${a.user_rating}\u2605`} color={T.blue} />}
                    {a.user_notes && <NoteTag label="Note added" color={T.textDim} />}
                    {(a.user_tags || []).slice(0, 2).map(t => <NoteTag key={t} label={t} color={T.accent} />)}
                  </div>
                )}
              </div>
              <ChevronDown size={14} style={{ color: T.textDim }} />
            </div>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 320px" : "1fr 380px",
          gap: 16,
          alignItems: "start",
        }}>
          {/* Left: Intelligence */}
          <IntelligencePanel
            analysis={a.ai_analysis}
            activity={a}
            activityId={id}
            loading={analysisLoading}
            onRegenerate={triggerAnalysis}
          />

          {/* Right: Data */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <DataPanel
              activity={a}
              similarSessions={similarSessions}
              units={units}
            />

            {/* Additional panels below data tabs */}
            {(segmentData || segmentsLoading) && (
              <SegmentComparisonPanel data={segmentData} loading={segmentsLoading} isMobile={isMobile} />
            )}

            {(wbalData || wbalLoading) && a.avg_power_watts && (
              <WbalChart data={wbalData} loading={wbalLoading} />
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Bar */}
      <FloatingChatBar activityId={id} />


      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={() => { if (!deleting) { setShowDeleteModal(false); setDeleteError(""); } }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.card, borderRadius: 16, padding: "28px 24px", width: "100%",
            maxWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: `1px solid ${T.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={18} color={T.danger} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font }}>Delete Activity</h3>
            </div>
            <p style={{ fontSize: 13, color: T.textSoft, fontFamily: font, margin: "0 0 16px", lineHeight: 1.5 }}>
              This will permanently delete <strong style={{ color: T.text }}>{a.name || "this activity"}</strong> and all its analysis data. This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ background: "rgba(239,68,68,0.08)", color: T.danger, fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontFamily: font }}>{deleteError}</div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                disabled={deleting}
                style={{ ...btn(false), fontSize: 13, padding: "10px 20px" }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, fontFamily: font,
                  background: T.danger, color: T.white, border: "none", borderRadius: 10,
                  cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >{deleting ? "Deleting..." : <><Trash2 size={13} /> Delete</>}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes aim-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Collapsed note tag ──
function NoteTag({ label, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: `${color}14`, border: `1px solid ${color}25`,
      borderRadius: 20, padding: "2px 8px",
      fontFamily: font, letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { useResponsive } from "../hooks/useResponsive";
import { useTodayIntelligence } from "../hooks/useTodayIntelligence";
import { useDashboardData } from "../hooks/useDashboardData";
import { usePrescription } from "../hooks/usePrescription";
import { supabase } from "../lib/supabase";
import { LogOut, Settings, Menu, X, User } from "lucide-react";
import AIBriefing from "../components/today/AIBriefing";
import InsightCard from "../components/today/InsightCard";
import WorkoutCard from "../components/today/WorkoutCard";
import CollapsedMorning from "../components/today/CollapsedMorning";
import AskClaude from "../components/today/AskClaude";
import DataGaps from "../components/today/DataGaps";
import CheckInModal, { CheckInSummaryCard } from "../components/dashboard/CheckInModal";
import NutritionLogger from "../components/dashboard/NutritionLogger";
import ReadinessCard from "../components/dashboard/ReadinessCard";
import LastRideCard from "../components/dashboard/LastRideCard";
import FitnessChart from "../components/dashboard/FitnessChart";
import TrainingWeekChart from "../components/dashboard/TrainingWeekChart";
import WorkingGoals from "../components/dashboard/WorkingGoals";
import PrescriptionCard from "../components/dashboard/PrescriptionCard";
import TravelStatusCard from "../components/dashboard/TravelStatusCard";
import TrialBanner from "../components/TrialBanner";

// ── NAV BAR ──
const NAV_ITEMS = [
  { label: "Today", path: "/today" },
  { label: "Activities", path: "/activities" },
  { label: "Performance", path: "/performance" },
  { label: "My Stats", path: "/my-stats" },
  { label: "Sleep", path: "/sleep" },
  { label: "Health Lab", path: "/health-lab" },
  { label: "Connect", path: "/connect" },
];

const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS,
  { label: "Profile", path: "/profile" },
  { label: "Settings", path: "/settings" },
];

function NavBar({ profile, isMobile, menuOpen, setMenuOpen, userMenuOpen, setUserMenuOpen, onSignout, navigate }) {
  return (
    <>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 12px" : "0 24px", height: isMobile ? 48 : 52, borderBottom: `1px solid ${T.border}`, background: `${T.card}ee`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/today")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.white, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {NAV_ITEMS.map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "Today" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: item.label === "Today" ? T.accent : T.textSoft,
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
            {MOBILE_NAV_ITEMS.map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Today" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Today" ? T.accent : T.textSoft,
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

// ── LOADING SKELETON ──
function SkeletonBriefing() {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: T.border, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: "90%", height: 14, background: T.border, borderRadius: 4, marginBottom: 10 }} />
          <div style={{ width: "75%", height: 14, background: T.border, borderRadius: 4, marginBottom: 10 }} />
          <div style={{ width: "60%", height: 14, background: T.border, borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%", background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
    </div>
  );
}

function SkeletonInsight() {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ width: "70%", height: 14, background: T.border, borderRadius: 4, marginBottom: 12 }} />
      <div style={{ width: "95%", height: 40, background: T.border, borderRadius: 6, marginBottom: 10 }} />
      <div style={{ width: "30%", height: 10, background: T.border, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%", background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
    </div>
  );
}

// ── HEADER ──
function TodayHeader({ profile, dailyMetrics, isMobile }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const recoveryScore = dailyMetrics?.recovery_score;
  const recoveryColor = recoveryScore >= 70 ? T.accent : recoveryScore >= 45 ? T.warn : recoveryScore != null ? T.danger : T.textDim;

  return (
    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: 20, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 0 }}>
      <div>
        <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{dateStr}</div>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", fontFamily: font }}>
          {greeting}, {firstName}
        </h1>
      </div>
      {recoveryScore != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Readiness ring - 48px */}
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: `conic-gradient(${recoveryColor} ${recoveryScore * 3.6}deg, ${T.surface} 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: T.card,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, fontFamily: mono, color: recoveryColor,
            }}>
              {Math.round(recoveryScore)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Readiness</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: recoveryColor }}>
              {recoveryScore >= 70 ? "Green" : recoveryScore >= 45 ? "Yellow" : "Red"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN TODAY PAGE ──
export default function Today() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { profile, signout, updateProfile } = useAuth();
  const { units } = usePreferences();
  const {
    dailyMetrics, activity, fitnessHistory, powerProfile,
    recentActivities, connectedIntegrations, checkinStatus, setCheckinStatus,
    activeTravel, loading: dashLoading, refetch: dashRefetch,
  } = useDashboardData();
  const { data: intelligence, loading: aiLoading, error: aiError, refetch: aiRefetch } = useTodayIntelligence();
  const { prescription: rxData, gaps: rxGaps, readiness: rxReadiness, loading: rxLoading, error: rxError, refetch: rxRefetch, addToCalendar: rxAddToCalendar } = usePrescription();

  // Nav state
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const handleSignout = async () => { await signout(); navigate("/"); };

  // Check-in modal state
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInEditing, setCheckInEditing] = useState(false);
  const checkInShownRef = useRef(false);

  // Nutrition logger
  const [nutritionOpen, setNutritionOpen] = useState(false);

  // Goals + Cross-training
  const [goals, setGoals] = useState(null);
  const [crossTrainingEntries, setCrossTrainingEntries] = useState([]);
  const goalsFetchedRef = useRef(false);

  useEffect(() => {
    if (goalsFetchedRef.current) return;
    goalsFetchedRef.current = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };
        const [goalsRes, crossRes] = await Promise.all([
          fetch("/api/goals/list", { headers }),
          fetch("/api/cross-training/list?days=7", { headers }),
        ]);
        if (goalsRes.ok) {
          const data = await goalsRes.json();
          setGoals(data.goals || []);
        }
        if (crossRes.ok) {
          const data = await crossRes.json();
          setCrossTrainingEntries(data.entries || []);
        }
      } catch {}
    })();
  }, []);

  // AI Analysis (on-demand for activity)
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

  useEffect(() => { setLiveAnalysis(null); }, [activity?.id]);

  // Show check-in modal once per day
  useEffect(() => {
    if (!dashLoading && checkinStatus === null && !checkInShownRef.current) {
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = localStorage.getItem("aim_checkin_shown_date");
      if (lastShown === today) return;
      checkInShownRef.current = true;
      localStorage.setItem("aim_checkin_shown_date", today);
      const timer = setTimeout(() => setShowCheckIn(true), 500);
      return () => clearTimeout(timer);
    }
  }, [dashLoading, checkinStatus]);

  // ── Computed values ──
  const computed = useMemo(() => {
    if (!activity || !profile) return null;
    const weightKg = dailyMetrics?.weight_kg || profile.weight_kg || 70;
    const ftp = profile.ftp_watts || 200;
    const IF = activity.intensity_factor;
    const calories = activity.calories || (activity.work_kj ? Math.round(activity.work_kj * 1.1) : null);
    const CTL = dailyMetrics?.ctl ?? null;
    const ATL = dailyMetrics?.atl ?? null;
    const TSB = CTL != null && ATL != null ? Math.round(CTL - ATL) : null;

    // Fuel breakdown
    let fuel = null;
    if (calories && calories > 0 && IF != null) {
      const PROTEIN_PCT = 3.5;
      const vo2pct = 5 + (IF * 80);
      let fatNP;
      if (vo2pct <= 37) fatNP = 72;
      else if (vo2pct <= 48) fatNP = -0.0497 * vo2pct * vo2pct + 3.8528 * vo2pct - 23.55;
      else if (vo2pct <= 85) fatNP = Math.max(0, -0.74 * vo2pct + 87.5);
      else if (vo2pct <= 97) fatNP = Math.max(0, -1.9 * vo2pct + 186);
      else fatNP = 0;
      const fatPct = fatNP * (100 - PROTEIN_PCT) / 100;
      const carbPct = 100 - fatPct - PROTEIN_PCT;
      fuel = {
        fatPct: Math.round(fatPct), carbPct: Math.round(carbPct), proteinPct: Math.round(PROTEIN_PCT),
        fatGrams: Math.round(calories * (fatPct / 100) / 9), carbGrams: Math.round(calories * (carbPct / 100) / 4), proteinGrams: Math.round(calories * (PROTEIN_PCT / 100) / 4),
      };
    }

    return { IF: IF != null ? Number(IF).toFixed(2) : "—", TSS: activity.tss != null ? Math.round(activity.tss) : "—", CTL: CTL != null ? Math.round(CTL) : "—", ATL: ATL != null ? Math.round(ATL) : "—", TSB: TSB != null ? TSB : "—", weightKg, ftp, fuel, calories: calories != null ? Math.round(calories) : "—" };
  }, [activity, profile, dailyMetrics]);

  // ── Power zones ──
  const powerZonesData = useMemo(() => {
    if (!activity?.zone_distribution) return [];
    const zd = activity.zone_distribution;
    if (!profile?.ftp_watts) return [];
    const ftp = profile.ftp_watts;
    return [
      { zone: "Z1 Recovery", min: 0, max: Math.round(ftp * 0.55), time: Math.round((zd.z1 || 0) / 60), color: "#6b7280" },
      { zone: "Z2 Endurance", min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75), time: Math.round((zd.z2 || 0) / 60), color: "#3b82f6" },
      { zone: "Z3 Tempo", min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.90), time: Math.round((zd.z3 || 0) / 60), color: "#10b981" },
      { zone: "Z4 Threshold", min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.05), time: Math.round((zd.z4 || 0) / 60), color: "#f59e0b" },
      { zone: "Z5 VO2max", min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.20), time: Math.round((zd.z5 || 0) / 60), color: "#ef4444" },
      { zone: "Z6 Anaerobic", min: Math.round(ftp * 1.20), max: 9999, time: Math.round(((zd.z6 || 0) + (zd.z7 || 0)) / 60), color: "#8b5cf6" },
    ];
  }, [activity, profile]);

  // Check if latest activity happened today
  const activityIsToday = useMemo(() => {
    if (!activity?.started_at) return false;
    const actDate = new Date(activity.started_at).toLocaleDateString();
    const todayDate = new Date().toLocaleDateString();
    return actDate === todayDate;
  }, [activity?.started_at]);

  const mode = intelligence?.mode || null;
  const briefing = intelligence?.intelligence?.briefing || intelligence?.briefing || null;
  const insights = intelligence?.intelligence?.insights || intelligence?.insights || [];
  const contextCards = intelligence?.intelligence?.contextCards || intelligence?.contextCards || [];
  const workout = intelligence?.intelligence?.workout || intelligence?.workout || null;
  const collapsedMorning = intelligence?.intelligence?.collapsedMorning || intelligence?.collapsedMorning || null;
  const dataGaps = intelligence?.intelligence?.dataGaps || intelligence?.dataGaps || [];

  const isLoading = dashLoading || aiLoading;

  // ── Empty state: no integrations connected ──
  if (!dashLoading && !activity && connectedIntegrations.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
        <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} userMenuOpen={userMenuOpen} setUserMenuOpen={setUserMenuOpen} onSignout={handleSignout} navigate={navigate} />
        <TrialBanner />
        <div style={{ maxWidth: 700, margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 24px" }}>
          <TodayHeader profile={profile} dailyMetrics={dailyMetrics} isMobile={isMobile} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚴</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Connect your apps to get started</h2>
            <p style={{ fontSize: 14, color: T.textSoft, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
              AIM needs data from your training and recovery apps to generate personalized intelligence. Connect Strava, Oura, Whoop, or other apps to unlock your AI coach.
            </p>
            <a href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: T.gradient, color: T.white, borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Connect Apps →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} userMenuOpen={userMenuOpen} setUserMenuOpen={setUserMenuOpen} onSignout={handleSignout} navigate={navigate} />
      <TrialBanner />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 24px" }}>
        {/* Header */}
        <TodayHeader profile={profile} dailyMetrics={dailyMetrics} isMobile={isMobile} />

        {/* Check-in summary (if completed) */}
        {checkinStatus && (
          <div style={{ marginBottom: 16 }}>
            <CheckInSummaryCard
              checkin={checkinStatus}
              onEdit={() => {
                setCheckInEditing(true);
                setShowCheckIn(true);
              }}
            />
          </div>
        )}

        {/* AI Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* POST_RIDE: Collapsed morning summary */}
          {mode === "POST_RIDE" && collapsedMorning && (
            <CollapsedMorning text={collapsedMorning} isMobile={isMobile} />
          )}

          {/* AI Briefing (hero content) */}
          {isLoading && !briefing ? (
            <SkeletonBriefing />
          ) : briefing ? (
            <AIBriefing briefing={briefing} contextCards={contextCards} isMobile={isMobile} />
          ) : aiError ? (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 18, lineHeight: 1 }}>✦</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Intelligence unavailable</span>
              </div>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 12px 0", lineHeight: 1.5 }}>{aiError}</p>
              <button onClick={aiRefetch} style={{ background: T.accent, color: T.white, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                Retry
              </button>
            </div>
          ) : null}

          {/* Workout Card (morning modes only) */}
          {(mode === "MORNING_WITH_PLAN" || mode === "PRE_RIDE_PLANNED") && workout && (
            <WorkoutCard workout={workout} isMobile={isMobile} />
          )}

          {/* Insights */}
          {isLoading && insights.length === 0 ? (
            <>
              <SkeletonInsight />
              <SkeletonInsight />
            </>
          ) : (
            insights.map((insight, i) => (
              <InsightCard
                key={i}
                insight={insight}
                index={i}
                activityId={activity?.id || null}
                isMobile={isMobile}
              />
            ))
          )}

          {/* Data Gaps */}
          {dataGaps.length > 0 && (
            <DataGaps dataGaps={dataGaps} isMobile={isMobile} />
          )}

          {/* Ask Claude */}
          <AskClaude mode={mode || "MORNING_RECOVERY"} isMobile={isMobile} />

          {/* ══════════════════════════════════════ */}
          {/* DATA PANELS — below AI section        */}
          {/* ══════════════════════════════════════ */}

          {/* Readiness */}
          <ReadinessCard dailyMetrics={dailyMetrics} checkinData={checkinStatus} isMobile={isMobile} />

          {/* Travel Status */}
          <TravelStatusCard travelEvent={activeTravel} isMobile={isMobile} />

          {/* Workout Prescription */}
          <PrescriptionCard
            prescription={rxData}
            gaps={rxGaps}
            readiness={rxReadiness}
            loading={rxLoading}
            error={rxError}
            onRefresh={rxRefetch}
            onAddToCalendar={rxAddToCalendar}
            isMobile={isMobile}
          />

          {/* Last Ride (only if it happened today) */}
          {activity && activityIsToday && (
            <LastRideCard
              activity={activity}
              onViewDetails={() => navigate(`/activity/${activity.id}`)}
              onCompareSimilar={() => navigate(`/activity/${activity.id}#similar`)}
              isMobile={isMobile}
              units={units}
            />
          )}

          {/* Training Week + Fitness Chart */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Weekly Training Load</div>
              <TrainingWeekChart recentActivities={recentActivities} crossTrainingEntries={crossTrainingEntries} />
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Fitness, Fatigue & Form</div>
              <FitnessChart fitnessData={fitnessHistory} />
            </div>
          </div>

          {/* Power Zones (only for today's activity) */}
          {activityIsToday && powerZonesData.length > 0 && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Power Zones</div>
              {powerZonesData.map(z => {
                const maxTime = Math.max(...powerZonesData.map(p => p.time), 1);
                return (
                  <div key={z.zone} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: T.textSoft }}>{`${z.zone} (${z.min}-${z.max === 9999 ? "+" : z.max}W)`}</span>
                      <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{`${z.time}m`}</span>
                    </div>
                    <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(z.time / maxTime) * 100}%`, background: `linear-gradient(90deg, ${z.color}80, ${z.color})`, borderRadius: 3, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Training Load Summary + Fuel Breakdown (only for today's activity) */}
          {activityIsToday && computed && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Training Load Summary</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "4px 16px" : 24, fontSize: 12 }}>
                <span style={{ color: T.textSoft }}>CTL: <span style={{ color: T.blue, fontWeight: 700, fontFamily: mono }}>{computed.CTL}</span></span>
                <span style={{ color: T.textSoft }}>ATL: <span style={{ color: T.pink, fontWeight: 700, fontFamily: mono }}>{computed.ATL}</span></span>
                <span style={{ color: T.textSoft }}>TSB: <span style={{ color: typeof computed.TSB === "number" && computed.TSB < 0 ? T.danger : T.accent, fontWeight: 700, fontFamily: mono }}>{computed.TSB}</span></span>
              </div>
              {computed.fuel && (
                <div style={{ marginTop: 12, padding: "12px 14px", background: T.surface, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Estimated Fuel Breakdown</div>
                  <div style={{ display: "flex", height: 18, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${computed.fuel.carbPct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)", transition: "width 0.6s ease" }} />
                    <div style={{ width: `${computed.fuel.fatPct}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", transition: "width 0.6s ease" }} />
                    <div style={{ width: `${computed.fuel.proteinPct}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)", transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "6px 12px" : 16, fontSize: 10 }}>
                    {[
                      { color: "#3b82f6", label: "Carbs", grams: computed.fuel.carbGrams, pct: computed.fuel.carbPct },
                      { color: "#f59e0b", label: "Fat", grams: computed.fuel.fatGrams, pct: computed.fuel.fatPct },
                      { color: "#8b5cf6", label: "Protein", grams: computed.fuel.proteinGrams, pct: computed.fuel.proteinPct },
                    ].map(f => (
                      <span key={f.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: "inline-block" }} />
                        <span style={{ color: T.textSoft }}>{f.label}</span>
                        <span style={{ fontWeight: 700, color: T.text, fontFamily: mono }}>{f.grams}g</span>
                        <span style={{ color: T.textDim }}>({f.pct}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Working Goals */}
          <WorkingGoals goals={goals} isMobile={isMobile} />
        </div>
      </div>

      {/* Nutrition Logger Modal */}
      <NutritionLogger
        isOpen={nutritionOpen}
        onClose={() => setNutritionOpen(false)}
        activityId={activity?.id}
        rideDurationHours={activity?.duration_seconds ? activity.duration_seconds / 3600 : null}
        isMobile={isMobile}
      />

      {/* Daily Check-In Modal */}
      {showCheckIn && (
        <CheckInModal
          athleteName={profile?.full_name?.split(" ")[0] || "there"}
          initialValues={checkInEditing ? checkinStatus : null}
          isFirstTime={!checkinStatus && !checkInShownRef.current}
          isMobile={isMobile}
          onComplete={(checkin) => {
            setShowCheckIn(false);
            setCheckInEditing(false);
            setCheckinStatus(checkin);
            dashRefetch();
          }}
          onSkip={() => {
            setShowCheckIn(false);
            setCheckInEditing(false);
          }}
        />
      )}

      <style>{`@keyframes shimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(50%); } }`}</style>
    </div>
  );
}

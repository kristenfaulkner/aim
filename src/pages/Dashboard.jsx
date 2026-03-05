import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useDashboardData } from "../hooks/useDashboardData";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { formatDistance, formatSpeed, formatElevation, elevationUnit, formatWeight, weightUnit } from "../lib/units";
import { supabase } from "../lib/supabase";
import { formatActivityDate } from "../lib/formatTime";
import { LogOut, Settings, Menu, X, User } from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";
import ActivityBrowser, { ActivityBrowserTrigger } from "../components/ActivityBrowser";
import ReadinessCard from "../components/dashboard/ReadinessCard";
import LastRideCard from "../components/dashboard/LastRideCard";
import AIPanel from "../components/dashboard/AIPanel";
import FitnessChart from "../components/dashboard/FitnessChart";
import CPModelCard from "../components/dashboard/CPModelCard";
import TrainingWeekChart from "../components/dashboard/TrainingWeekChart";
import WorkingGoals from "../components/dashboard/WorkingGoals";
import NutritionLogger from "../components/dashboard/NutritionLogger";
import PerformanceModels from "../components/dashboard/PerformanceModels";
import AthleteBio from "../components/dashboard/AthleteBio";
import TravelStatusCard from "../components/dashboard/TravelStatusCard";
import CheckInModal, { CheckInSummaryCard } from "../components/dashboard/CheckInModal";
import CrossTrainingLogger from "../components/dashboard/CrossTrainingLogger";
import PrescriptionCard from "../components/dashboard/PrescriptionCard";
import TrialBanner from "../components/TrialBanner";
import { usePrescription } from "../hooks/usePrescription";

// ── HELPERS ──

function formatDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function estimateFuelBreakdown(calories, intensityFactor) {
  if (!calories || calories <= 0 || intensityFactor == null) return null;
  const PROTEIN_PCT = 3.5;
  const vo2pct = 5 + (intensityFactor * 80);
  let fatNP;
  if (vo2pct <= 37) fatNP = 72;
  else if (vo2pct <= 48) fatNP = -0.0497 * vo2pct * vo2pct + 3.8528 * vo2pct - 23.55;
  else if (vo2pct <= 85) fatNP = Math.max(0, -0.74 * vo2pct + 87.5);
  else if (vo2pct <= 97) fatNP = Math.max(0, -1.9 * vo2pct + 186);
  else fatNP = 0;
  const fatPct = fatNP * (100 - PROTEIN_PCT) / 100;
  const carbPct = 100 - fatPct - PROTEIN_PCT;
  const fatCals = calories * (fatPct / 100);
  const carbCals = calories * (carbPct / 100);
  const proteinCals = calories * (PROTEIN_PCT / 100);
  return {
    fatPct: Math.round(fatPct), carbPct: Math.round(carbPct), proteinPct: Math.round(PROTEIN_PCT),
    fatGrams: Math.round(fatCals / 9), carbGrams: Math.round(carbCals / 4), proteinGrams: Math.round(proteinCals / 4),
    fatCals: Math.round(fatCals), carbCals: Math.round(carbCals), proteinCals: Math.round(proteinCals),
  };
}

function safe(v, decimals) {
  if (v == null || isNaN(v)) return "—";
  return decimals != null ? Number(v).toFixed(decimals) : v;
}

// ── SMALL REUSABLE COMPONENTS ──

function MiniBar({ value, max, color, label, subLabel }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
        <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{subLabel}</span>
      </div>
      <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, unit, color, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: color || T.text, fontFamily: mono }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: T.textDim, marginLeft: 3 }}>{unit}</span>}
        {sub && <div style={{ fontSize: 9, color: T.textDim }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── LOADING SKELETON ──
function SkeletonCard({ height = 80 }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", height, position: "relative", overflow: "hidden" }}>
      <div style={{ width: "40%", height: 10, background: T.border, borderRadius: 4, marginBottom: 12 }} />
      <div style={{ width: "60%", height: 20, background: T.border, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%", background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
    </div>
  );
}

// ── ACTION ITEMS PANEL ──
function ActionItems({ activity, dailyMetrics, computed, isMobile, onOpenNutrition, onOpenCrossTraining }) {
  const [tab, setTab] = useState("today");
  const tabs = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "big", label: "Big Picture" },
  ];

  const todayItems = [];
  if (activity && computed?.fuel) {
    todayItems.push({ icon: "\u26FD", cat: "NUTRITION", title: "Log post-ride nutrition", desc: `Estimated ${computed.fuel.carbGrams}g carbs burned — replenish within 30min`, action: onOpenNutrition });
  }
  todayItems.push({ icon: "\uD83C\uDFCB\uFE0F", cat: "TRAINING", title: "Log cross-training", desc: "Track strength, yoga, swimming, or other sessions", action: onOpenCrossTraining });
  if (dailyMetrics?.recovery_score != null && dailyMetrics.recovery_score < 50) {
    todayItems.push({ icon: "\uD83D\uDECF\uFE0F", cat: "RECOVERY", title: "Prioritize recovery today", desc: `Recovery score ${Math.round(dailyMetrics.recovery_score)}/100 — consider rest or easy spin` });
  }
  if (dailyMetrics?.hrv_ms && dailyMetrics.hrv_ms < 50) {
    todayItems.push({ icon: "\u2764\uFE0F", cat: "HEALTH", title: "HRV below baseline", desc: `${Math.round(dailyMetrics.hrv_ms)}ms — monitor fatigue and sleep quality` });
  }
  if (todayItems.length === 0) {
    todayItems.push({ icon: "\u2705", cat: "STATUS", title: "All systems go", desc: "No immediate action items. Keep up the great work!" });
  }

  const weekItems = [
    { icon: "\uD83D\uDCCA", cat: "TRAINING", title: "Review weekly training load", desc: `${computed?.CTL || "—"} CTL · ${computed?.ATL || "—"} ATL · ${computed?.TSB || "—"} TSB` },
  ];

  const bigItems = [
    { icon: "\uD83C\uDFAF", cat: "GOALS", title: "Set performance goals", desc: "Define targets for power, weight, or race performance" },
  ];

  const items = tab === "today" ? todayItems : tab === "week" ? weekItems : bigItems;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Action Items</div>
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderBottom: `1px solid ${T.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", padding: "6px 14px", fontSize: 11, fontWeight: 600,
            color: tab === t.id ? T.accent : T.textSoft, cursor: "pointer",
            borderBottom: tab === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
            transition: "all 0.2s", fontFamily: font,
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} onClick={item.action || undefined} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: T.surface, borderRadius: 10, cursor: item.action ? "pointer" : "default", transition: "background 0.15s" }}
            onMouseEnter={e => { if (item.action) e.currentTarget.style.background = T.cardHover; }}
            onMouseLeave={e => { if (item.action) e.currentTarget.style.background = T.surface; }}
          >
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{item.cat}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
            {item.action && <span style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 10, flexShrink: 0 }}>{"\u2192"}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NAV BAR ──
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
              {[{ label: "Dashboard", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "My Stats", path: "/my-stats" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "Dashboard" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: item.label === "Dashboard" ? T.accent : T.textSoft,
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
            {[{ label: "Dashboard", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "My Stats", path: "/my-stats" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Profile", path: "/profile" }, { label: "Settings", path: "/settings" }].map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Dashboard" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Dashboard" ? T.accent : T.textSoft,
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

// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const navigate = useNavigate();
  const { signout, updateProfile } = useAuth();
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const browserTriggerRef = useRef(null);
  const { isMobile, isTablet } = useResponsive();
  const { units } = usePreferences();
  const { activity, profile, dailyMetrics, fitnessHistory, powerProfile, recentActivities, connectedIntegrations, checkinStatus, setCheckinStatus, activeTravel, loading, error, refetch } = useDashboardData(selectedActivityId);

  const handleSignout = async () => { await signout(); navigate("/"); };

  // ── Prescription ──
  const { prescription: rxData, gaps: rxGaps, readiness: rxReadiness, loading: rxLoading, error: rxError, refetch: rxRefetch, addToCalendar: rxAddToCalendar } = usePrescription();

  // ── AI Analysis ──
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const effectiveAiAnalysis = liveAnalysis || activity?.ai_analysis || null;

  // ── Check-In Modal ──
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInEditing, setCheckInEditing] = useState(false);
  const checkInShownRef = useRef(false);

  useEffect(() => {
    // Show modal 500ms after dashboard loads when check-in not completed
    // Only show once per calendar day (persisted via localStorage)
    if (!loading && checkinStatus === null && !checkInShownRef.current) {
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = localStorage.getItem("aim_checkin_shown_date");
      if (lastShown === today) return;
      checkInShownRef.current = true;
      localStorage.setItem("aim_checkin_shown_date", today);
      const timer = setTimeout(() => setShowCheckIn(true), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, checkinStatus]);

  // ── Goals + Nutrition Logger + Cross-Training Logger ──
  const [goals, setGoals] = useState(null);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [crossTrainingOpen, setCrossTrainingOpen] = useState(false);
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
  }, [activity?.id]);

  // ── Computed values ──
  const computed = useMemo(() => {
    if (!activity || !profile) return null;
    const weightKg = dailyMetrics?.weight_kg || profile.weight_kg || 70;
    const ftp = profile.ftp_watts || 200;
    const leanMass = dailyMetrics?.body_fat_pct ? weightKg * (1 - dailyMetrics.body_fat_pct / 100) : weightKg * 0.87;
    const IF = activity.intensity_factor;
    const TSS = activity.tss;
    const calories = activity.calories || (activity.work_kj ? Math.round(activity.work_kj * 1.1) : null);
    const fuel = estimateFuelBreakdown(calories, IF);
    const CTL = dailyMetrics?.ctl ?? null;
    const ATL = dailyMetrics?.atl ?? null;
    const TSB = CTL != null && ATL != null ? Math.round(CTL - ATL) : null;

    return {
      IF: IF != null ? Number(IF).toFixed(2) : "—",
      TSS: TSS != null ? Math.round(TSS) : "—",
      VI: activity.variability_index != null ? Number(activity.variability_index).toFixed(2) : "—",
      EF: activity.efficiency_factor != null ? Number(activity.efficiency_factor).toFixed(2) : "—",
      wPerKg: activity.avg_power_watts ? (activity.avg_power_watts / weightKg).toFixed(2) : "—",
      npPerKg: activity.normalized_power_watts ? (activity.normalized_power_watts / weightKg).toFixed(2) : "—",
      ftpPerKg: (ftp / weightKg).toFixed(2),
      ftpPerLeanKg: (ftp / leanMass).toFixed(2),
      calories: calories != null ? Math.round(calories) : "—",
      hrDrift: activity.hr_drift_pct != null ? Number(activity.hr_drift_pct).toFixed(1) : "—",
      CTL: CTL != null ? Math.round(CTL) : "—",
      ATL: ATL != null ? Math.round(ATL) : "—",
      TSB: TSB != null ? TSB : "—",
      weightKg, ftp, leanMass, fuel,
    };
  }, [activity, profile, dailyMetrics]);

  // ── Power zones ──
  const powerZonesData = useMemo(() => {
    if (!activity?.zone_distribution) return [];
    const zd = activity.zone_distribution;
    const pz = profile?.power_zones;
    if (pz && Array.isArray(pz)) {
      return pz.filter(z => z.zone !== "Z7").map(z => ({
        zone: `${z.zone} ${z.name}`, min: z.min,
        max: z.zone === "Z6" ? 9999 : z.max,
        time: z.zone === "Z6" ? Math.round(((zd.z6 || 0) + (zd.z7 || 0)) / 60) : Math.round((zd[z.zone.toLowerCase()] || 0) / 60),
        color: z.color,
      }));
    }
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

  // ── RENDER: Loading State ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
        <NavBar profile={null} isMobile={isMobile} menuOpen={false} setMenuOpen={() => {}} userMenuOpen={false} setUserMenuOpen={() => {}} onSignout={handleSignout} navigate={navigate} />
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SkeletonCard height={200} />
              <SkeletonCard height={160} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
            {!isMobile && <SkeletonCard height={400} />}
          </div>
        </div>
        <style>{`@keyframes shimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(50%); } }`}</style>
      </div>
    );
  }

  // ── RENDER: Empty State ──
  if (!activity) {
    const hasStrava = connectedIntegrations.includes("strava");
    const hasAnyIntegration = connectedIntegrations.length > 0;
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
        <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} userMenuOpen={userMenuOpen} setUserMenuOpen={setUserMenuOpen} onSignout={handleSignout} navigate={navigate} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 52px)", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{hasAnyIntegration ? "\u2705" : "\uD83D\uDEB4"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>
            {hasAnyIntegration ? "Waiting for your first ride" : "No rides yet"}
          </h2>
          <p style={{ fontSize: 14, color: T.textSoft, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            {hasStrava
              ? "Strava is connected! Go ride and your data will sync automatically."
              : hasAnyIntegration
                ? "Your apps are connected! Connect Strava to sync your ride data."
                : "Connect Strava and sync your first ride to see your dashboard."}
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {!hasStrava && (
              <a href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: T.accent, color: T.white, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Connect Strava {"\u2192"}
              </a>
            )}
            <a href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              {hasAnyIntegration ? "Manage Apps" : "Browse Apps"}
            </a>
          </div>
          {error && <div style={{ marginTop: 16, fontSize: 11, color: T.danger }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ── RENDER: Main Dashboard (Two-Column Layout) ──
  const rideDateStr = formatActivityDate(activity, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} userMenuOpen={userMenuOpen} setUserMenuOpen={setUserMenuOpen} onSignout={handleSignout} navigate={navigate} />
      <TrialBanner />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? 16 : "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: 16, gap: isMobile ? 10 : 0 }}>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{rideDateStr}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{activity.name || "Untitled Ride"}</h1>
              <button onClick={() => navigate(`/activity/${activity.id}`)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: T.textSoft, cursor: "pointer", fontFamily: font, fontWeight: 500 }}>View Details</button>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: 20, alignItems: "start" }}>
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Athlete Bio */}
            <AthleteBio profile={profile} onUpdateProfile={updateProfile} isMobile={isMobile} />

            {/* Check-In Summary (shown after completion) */}
            {checkinStatus && (
              <CheckInSummaryCard
                checkin={checkinStatus}
                onEdit={() => {
                  setCheckInEditing(true);
                  setShowCheckIn(true);
                }}
              />
            )}

            {/* Readiness Card */}
            <ReadinessCard dailyMetrics={dailyMetrics} checkinData={checkinStatus} isMobile={isMobile} />

            {/* Travel Status (conditional — auto-dismisses when recovery complete) */}
            <TravelStatusCard travelEvent={activeTravel} isMobile={isMobile} />

            {/* Today's Workout Prescription */}
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

            {/* Action Items */}
            <ActionItems activity={activity} dailyMetrics={dailyMetrics} computed={computed} isMobile={isMobile} onOpenNutrition={() => setNutritionOpen(true)} onOpenCrossTraining={() => setCrossTrainingOpen(true)} />

            {/* Activity Browser + Last Ride */}
            <div style={{ position: "relative" }}>
              <ActivityBrowserTrigger isOpen={browserOpen} onClick={() => setBrowserOpen(!browserOpen)} triggerRef={browserTriggerRef} />
              <ActivityBrowser isOpen={browserOpen} onClose={() => setBrowserOpen(false)} selectedActivityId={selectedActivityId} onSelectActivity={id => setSelectedActivityId(id)} anchorRef={browserTriggerRef} />
            </div>
            <LastRideCard activity={activity} onViewDetails={() => navigate(`/activity/${activity.id}`)} onCompareSimilar={() => navigate(`/activity/${activity.id}#similar`)} isMobile={isMobile} units={units} />

            {/* Training Week + Fitness Chart Row */}
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

            {/* Power Zones */}
            {powerZonesData.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Power Zones</div>
                {powerZonesData.map(z => (
                  <MiniBar key={z.zone} value={z.time} max={Math.max(...powerZonesData.map(p => p.time), 1)} color={z.color}
                    label={`${z.zone} (${z.min}-${z.max === 9999 ? "+" : z.max}W)`} subLabel={`${z.time}m`} />
                ))}
              </div>
            )}

            {/* Critical Power Model */}
            <CPModelCard powerProfile={powerProfile} ftp={profile?.ftp_watts} isMobile={isMobile} />

            {/* PMC Summary */}
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

            {/* Performance Models */}
            <PerformanceModels isMobile={isMobile} />
          </div>

          {/* RIGHT COLUMN */}
          <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 16 } : { position: "sticky", top: 72, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 92px)", overflow: "auto" }}>
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
            <WorkingGoals goals={goals} isMobile={isMobile} />
          </div>
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

      {/* Cross-Training Logger Modal */}
      <CrossTrainingLogger
        isOpen={crossTrainingOpen}
        onClose={() => {
          setCrossTrainingOpen(false);
          // Refresh cross-training entries for chart
          (async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              const res = await fetch("/api/cross-training/list?days=7", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (res.ok) {
                const data = await res.json();
                setCrossTrainingEntries(data.entries || []);
              }
            } catch {}
          })();
        }}
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
            refetch();
          }}
          onSkip={() => {
            setShowCheckIn(false);
            setCheckInEditing(false);
          }}
        />
      )}
    </div>
  );
}

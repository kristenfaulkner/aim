import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { useResponsive } from "../hooks/useResponsive";
import { useTodayIntelligence } from "../hooks/useTodayIntelligence";
import { useDashboardData } from "../hooks/useDashboardData";
import { usePrescription } from "../hooks/usePrescription";
import { LogOut, Settings, Menu, X, User } from "lucide-react";
import ReadinessHero from "../components/today/ReadinessHero";
import AIBriefing from "../components/today/AIBriefing";
import TodayCard from "../components/today/TodayCard";
import VitalsStrip, { computeVitals } from "../components/today/VitalsStrip";
import ThisWeek, { computeThisWeek } from "../components/today/ThisWeek";
import CollapsedMorning from "../components/today/CollapsedMorning";
import RideSummary from "../components/today/RideSummary";
import AskClaude from "../components/today/AskClaude";
import DataGaps from "../components/today/DataGaps";
import CheckInModal from "../components/dashboard/CheckInModal";
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

// ── LOADING SKELETONS ──
function Skeleton({ height = 80 }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, position: "relative", overflow: "hidden", minHeight: height }}>
      <div style={{ width: "90%", height: 14, background: T.border, borderRadius: 4, marginBottom: 10 }} />
      <div style={{ width: "70%", height: 14, background: T.border, borderRadius: 4, marginBottom: 10 }} />
      <div style={{ width: "50%", height: 14, background: T.border, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%", background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
    </div>
  );
}

// ── HEADER ──
function TodayHeader({ profile, isMobile }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: T.textDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: font }}>{dateStr}</div>
      <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: T.text, letterSpacing: "-0.02em", marginTop: 2, fontFamily: font, margin: "2px 0 0 0" }}>
        {greeting}, {firstName}
      </h1>
    </div>
  );
}

// ── MAIN TODAY PAGE ──
export default function Today() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { profile, signout } = useAuth();
  const { units } = usePreferences();
  const {
    dailyMetrics, activity, recentActivities,
    connectedIntegrations, checkinStatus, setCheckinStatus,
    loading: dashLoading, refetch: dashRefetch,
  } = useDashboardData();
  const { data: intelligence, loading: aiLoading, error: aiError, refetch: aiRefetch } = useTodayIntelligence();
  const { prescription: rxData, loading: rxLoading, refetch: rxRefetch } = usePrescription();

  // Nav state
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const handleSignout = async () => { await signout(); navigate("/"); };

  // Check-in modal
  const [showCheckIn, setShowCheckIn] = useState(false);
  const checkInShownRef = useRef(false);

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

  // ── Extract AI content ──
  const ai = intelligence?.intelligence || {};
  const mode = intelligence?.mode || null;
  const briefing = ai.briefing || null;
  const contextCards = ai.contextCards || [];
  const prepRecs = ai.prepRecs || [];
  const recoveryRecs = ai.recoveryRecs || [];
  const workout = ai.workout || null;
  const collapsedMorning = ai.collapsedMorning || null;
  const dataGaps = ai.dataGaps || [];

  // ── Computed data (immediate from dashboard data) ──
  const readinessScore = dailyMetrics?.recovery_score ?? null;

  // Vitals from daily metrics — need array for trend computation
  // useDashboardData returns a single dailyMetrics object; wrap for computeVitals
  const vitals = useMemo(() => {
    if (!dailyMetrics) return null;
    return computeVitals(dailyMetrics, [dailyMetrics]);
  }, [dailyMetrics]);

  // This week TSS
  const thisWeekData = useMemo(() => computeThisWeek(recentActivities || []), [recentActivities]);

  // Planned TSS for today (from AI workout)
  const plannedTss = workout?.tss || null;

  // Is today's activity present?
  const activityIsToday = useMemo(() => {
    if (!activity?.started_at) return false;
    const actDate = new Date(activity.started_at).toLocaleDateString();
    const todayDate = new Date().toLocaleDateString();
    return actDate === todayDate;
  }, [activity?.started_at]);

  const isPostRide = mode === "POST_RIDE" || (activityIsToday && !aiLoading);
  const isLoading = dashLoading || aiLoading;

  // ── Empty state: no integrations ──
  if (!dashLoading && !activity && connectedIntegrations.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
        <NavBar profile={profile} isMobile={isMobile} menuOpen={menuOpen} setMenuOpen={setMenuOpen} userMenuOpen={userMenuOpen} setUserMenuOpen={setUserMenuOpen} onSignout={handleSignout} navigate={navigate} />
        <TrialBanner />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "20px 16px" : "24px 28px" }}>
          <TodayHeader profile={profile} isMobile={isMobile} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F6B4;</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Connect your apps to get started</h2>
            <p style={{ fontSize: 14, color: T.textSoft, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
              AIM needs data from your training and recovery apps to generate personalized intelligence. Connect Strava, Oura, Whoop, or other apps to unlock your AI coach.
            </p>
            <a href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: T.gradient, color: T.white, borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Connect Apps &rarr;
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

      <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "20px 16px" : "24px 28px" }}>
        <TodayHeader profile={profile} isMobile={isMobile} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {isPostRide ? (
            /* ═══════════════════════════════════════ */
            /* POST-RIDE MODE                         */
            /* ═══════════════════════════════════════ */
            <>
              {/* Collapsed Morning */}
              <CollapsedMorning text={collapsedMorning} readinessScore={readinessScore} />

              {/* Ride Summary */}
              {activityIsToday && <RideSummary activity={activity} units={units} />}

              {/* AI Briefing */}
              {isLoading && !briefing ? <Skeleton height={80} /> : <AIBriefing briefing={briefing} />}

              {/* Recovery Card */}
              {isLoading && recoveryRecs.length === 0 ? (
                <Skeleton height={120} />
              ) : (
                <TodayCard mode="POST_RIDE" recoveryRecs={recoveryRecs} />
              )}

              {/* This Week (updated with today's ride) */}
              <ThisWeek data={thisWeekData} />
            </>
          ) : (
            /* ═══════════════════════════════════════ */
            /* MORNING MODE                           */
            /* ═══════════════════════════════════════ */
            <>
              {/* Readiness Hero */}
              {isLoading && readinessScore == null ? (
                <Skeleton height={100} />
              ) : (
                <ReadinessHero score={readinessScore} contextCards={contextCards} />
              )}

              {/* AI Briefing */}
              {isLoading && !briefing ? <Skeleton height={80} /> : <AIBriefing briefing={briefing} />}

              {/* Today Card (workout + prepRecs) */}
              {isLoading && prepRecs.length === 0 ? (
                <Skeleton height={200} />
              ) : (
                <TodayCard
                  mode={mode || "MORNING_NO_PLAN"}
                  workout={workout}
                  prepRecs={prepRecs}
                  prescription={rxData}
                  prescriptionLoading={rxLoading}
                  onGetWorkout={rxRefetch}
                />
              )}

              {/* Vitals Strip */}
              <VitalsStrip vitals={vitals} />

              {/* This Week */}
              <ThisWeek data={thisWeekData} plannedTss={plannedTss} />
            </>
          )}

          {/* Error state */}
          {aiError && !briefing && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 18, lineHeight: 1 }}>&#10022;</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Intelligence unavailable</span>
              </div>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 12px 0", lineHeight: 1.5 }}>{aiError}</p>
              <button onClick={aiRefetch} style={{ background: T.accent, color: T.white, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Retry</button>
            </div>
          )}

          {/* Data Gaps */}
          {dataGaps.length > 0 && <DataGaps dataGaps={dataGaps} isMobile={isMobile} />}

          {/* Ask Claude */}
          <AskClaude mode={mode || "MORNING_NO_PLAN"} isMobile={isMobile} />
        </div>
      </div>

      {/* Daily Check-In Modal */}
      {showCheckIn && (
        <CheckInModal
          athleteName={profile?.full_name?.split(" ")[0] || "there"}
          isMobile={isMobile}
          onComplete={(checkin) => {
            setShowCheckIn(false);
            setCheckinStatus(checkin);
            dashRefetch();
          }}
          onSkip={() => setShowCheckIn(false)}
        />
      )}

      <style>{`@keyframes shimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(50%); } }`}</style>
    </div>
  );
}

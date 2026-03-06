import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { useTodayIntelligence } from "../hooks/useTodayIntelligence";
import { useDashboardData } from "../hooks/useDashboardData";
import { LogOut, Settings, Menu, X, User } from "lucide-react";
import AIBriefing from "../components/today/AIBriefing";
import InsightCard from "../components/today/InsightCard";
import WorkoutCard from "../components/today/WorkoutCard";
import CollapsedMorning from "../components/today/CollapsedMorning";
import AskClaude from "../components/today/AskClaude";
import DataGaps from "../components/today/DataGaps";
import CheckInModal, { CheckInSummaryCard } from "../components/dashboard/CheckInModal";
import NutritionLogger from "../components/dashboard/NutritionLogger";
import TrialBanner from "../components/TrialBanner";

// ── NAV BAR ──
const NAV_ITEMS = [
  { label: "Today", path: "/dashboard" },
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
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
  const { profile, signout } = useAuth();
  const { dailyMetrics, activity, checkinStatus, setCheckinStatus, connectedIntegrations, loading: dashLoading, refetch: dashRefetch } = useDashboardData();
  const { data: intelligence, loading: aiLoading, error: aiError, refetch: aiRefetch } = useTodayIntelligence();

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

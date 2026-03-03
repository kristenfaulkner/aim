import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { useResponsive } from "../hooks/useResponsive";
import { useMyStats } from "../hooks/useMyStats";
import { computePowerZones, computeHRZones, computeCPZones } from "../lib/zones";
import { formatWeight, weightUnit } from "../lib/units";
import { LogOut, Menu, X, User, Settings, Edit3, BarChart3 } from "lucide-react";
import SEO from "../components/SEO";

// ── HELPERS ──

function StatBox({ label, value, unit, sub, color, large }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 10, padding: large ? "14px 16px" : "10px 12px",
      display: "flex", flexDirection: "column", gap: 2, flex: 1,
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontFamily: mono, fontSize: large ? 26 : 20, fontWeight: 700, color: color || T.text, lineHeight: 1.2 }}>
          {value ?? "—"}
        </span>
        {unit && <span style={{ fontSize: 11, color: T.textSoft, marginLeft: 3 }}>{unit}</span>}
      </div>
      {sub && <span style={{ fontSize: 10, color: T.textSoft }}>{sub}</span>}
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function ZoneBar({ zone, name, min, max, color, maxTime }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: T.textDim, width: 24, textAlign: "right" }}>{zone}</span>
      <div style={{ flex: 1, height: 20, background: T.surface, borderRadius: 6, overflow: "hidden", position: "relative" }}>
        <div style={{ width: "100%", height: "100%", background: `${color}30`, borderRadius: 6 }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: mono, color: T.textSoft, width: 90, textAlign: "right" }}>
        {min}–{max === 9999 || max == null ? "+" : max}W
      </span>
      <span style={{ fontSize: 9, color: T.textDim, width: 60 }}>{name}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: T.textSoft, fontSize: 13 }}>
      {message}
    </div>
  );
}

function formatMinutes(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── NAV ──

const NAV_LINKS = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Activities", path: "/activities" },
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

// ── MAIN PAGE ──

export default function MyStats() {
  const navigate = useNavigate();
  const { signout } = useAuth();
  const { units } = usePreferences();
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [zoneView, setZoneView] = useState("power"); // power | hr | cp

  const { profile, powerProfile, latestMetrics, latestDexa, averages, loading } = useMyStats();

  const handleSignout = async () => { await signout(); navigate("/"); };

  // Compute zones
  const powerZones = profile?.power_zones || (profile?.ftp_watts ? computePowerZones(profile.ftp_watts) : null);
  const hrZones = profile?.hr_zones || (profile?.max_hr_bpm ? computeHRZones(profile.max_hr_bpm) : null);
  const cpZones = powerProfile?.cp_watts ? computeCPZones(powerProfile.cp_watts) : null;

  // W/kg
  const wkg = profile?.ftp_watts && profile?.weight_kg
    ? Math.round((profile.ftp_watts / profile.weight_kg) * 100) / 100
    : null;
  const cpWkg = powerProfile?.cp_watts && profile?.weight_kg
    ? Math.round((powerProfile.cp_watts / profile.weight_kg) * 100) / 100
    : null;

  // Training form
  const tsb = latestMetrics?.tsb;
  const formLabel = tsb == null ? null : tsb > 15 ? "Fresh" : tsb > -10 ? "Optimal" : tsb > -30 ? "Fatigued" : "Overreaching";
  const formColor = tsb == null ? T.textSoft : tsb > 15 ? T.accent : tsb > -10 ? "#3b82f6" : tsb > -30 ? "#f59e0b" : "#ef4444";

  // Recovery traffic light
  const recoveryScore = latestMetrics?.recovery_score;
  const recoveryLabel = recoveryScore == null ? null : recoveryScore >= 70 ? "Green" : recoveryScore >= 45 ? "Yellow" : "Red";
  const recoveryColor = recoveryScore == null ? T.textSoft : recoveryScore >= 70 ? T.accent : recoveryScore >= 45 ? "#f59e0b" : "#ef4444";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: T.textSoft, fontSize: 14 }}>Loading stats...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font }}>
      <SEO title="My Stats | AIM" description="Your complete athlete profile and performance metrics" />

      {/* ── NAV BAR ── */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                {menuOpen ? <X size={20} color={T.text} /> : <Menu size={20} color={T.text} />}
              </button>
            )}
            <span onClick={() => navigate("/dashboard")} style={{ fontSize: 18, fontWeight: 800, cursor: "pointer", background: "linear-gradient(135deg, #10b981, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIM</span>
          </div>

          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {NAV_LINKS.map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "My Stats" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 12, fontWeight: 600, color: item.label === "My Stats" ? T.accent : T.textSoft, cursor: "pointer",
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
              <div style={{ position: "absolute", right: 0, top: 36, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, minWidth: 150, zIndex: 200 }}>
                <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.text, cursor: "pointer" }}>
                  <User size={14} /> Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.text, cursor: "pointer" }}>
                  <Settings size={14} /> Settings
                </button>
                <button onClick={handleSignout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.danger, cursor: "pointer" }}>
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
                background: item.label === "My Stats" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "My Stats" ? T.accent : T.text, cursor: "pointer", textAlign: "left",
              }}>{item.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BarChart3 size={20} color={T.accent} />
          <span style={{ fontSize: 20, fontWeight: 700 }}>My Stats</span>
        </div>

        {/* ── SECTION 1: POWER MODEL ── */}
        <SectionCard
          title="Power Model"
          action={
            <button onClick={() => navigate("/profile")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontSize: 11, color: T.accent, cursor: "pointer", fontWeight: 600 }}>
              <Edit3 size={12} /> Edit
            </button>
          }
        >
          {profile?.ftp_watts || powerProfile?.cp_watts ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatBox label="FTP" value={profile?.ftp_watts} unit="W" sub={wkg ? `${wkg} W/kg` : undefined} color={T.accent} large />
                {powerProfile?.cp_watts && (
                  <>
                    <StatBox label="CP" value={powerProfile.cp_watts} unit="W" sub={cpWkg ? `${cpWkg} W/kg` : "Aerobic Ceiling"} color="#3b82f6" large />
                    <StatBox label="W'" value={powerProfile.w_prime_kj} unit="kJ" sub="Anaerobic Reserve" color="#8b5cf6" large />
                    <StatBox label="Pmax" value={powerProfile.pmax_watts} unit="W" sub="Sprint Power" color="#f59e0b" large />
                  </>
                )}
              </div>
              {powerProfile?.cp_watts && profile?.ftp_watts && (
                <div style={{ marginTop: 10, display: "flex", gap: 12, justifyContent: "center", fontSize: 11, color: T.textSoft }}>
                  <span>CP is {Math.abs(powerProfile.cp_watts - profile.ftp_watts)}W {powerProfile.cp_watts >= profile.ftp_watts ? "above" : "below"} FTP</span>
                  {powerProfile.cp_model_r_squared != null && (
                    <span style={{ color: powerProfile.cp_model_r_squared >= 0.95 ? T.accent : "#f59e0b" }}>
                      Model fit R² {powerProfile.cp_model_r_squared}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <EmptyState message="Set your FTP on the Profile page or sync activities to compute your power model." />
          )}
        </SectionCard>

        {/* ── SECTION 2: POWER PROFILE BESTS ── */}
        <SectionCard title="Power Profile Bests">
          {powerProfile ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 8 }}>
              {[
                { label: "5s", watts: powerProfile.best_5s_watts, wkg: powerProfile.best_5s_wkg },
                { label: "30s", watts: powerProfile.best_30s_watts, wkg: powerProfile.best_30s_wkg },
                { label: "1 min", watts: powerProfile.best_1m_watts, wkg: powerProfile.best_1m_wkg },
                { label: "5 min", watts: powerProfile.best_5m_watts, wkg: powerProfile.best_5m_wkg },
                { label: "20 min", watts: powerProfile.best_20m_watts, wkg: powerProfile.best_20m_wkg },
                { label: "60 min", watts: powerProfile.best_60m_watts, wkg: powerProfile.best_60m_wkg },
              ].map(d => (
                <StatBox
                  key={d.label}
                  label={d.label}
                  value={d.watts}
                  unit="W"
                  sub={d.wkg ? `${d.wkg} W/kg` : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Sync activities with power data to see your power profile." />
          )}
        </SectionCard>

        {/* ── SECTION 3: TRAINING ZONES ── */}
        <SectionCard
          title="Training Zones"
          action={
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: "power", label: "Power" },
                { key: "hr", label: "HR" },
                ...(cpZones ? [{ key: "cp", label: "CP" }] : []),
              ].map(tab => (
                <button key={tab.key} onClick={() => setZoneView(tab.key)} style={{
                  background: zoneView === tab.key ? T.accentDim : "none",
                  border: "none", padding: "3px 10px", borderRadius: 6, fontSize: 10,
                  fontWeight: 600, color: zoneView === tab.key ? T.accent : T.textSoft, cursor: "pointer",
                }}>{tab.label}</button>
              ))}
            </div>
          }
        >
          {zoneView === "power" && powerZones ? (
            powerZones.map(z => (
              <ZoneBar key={z.zone} zone={z.zone} name={z.name} min={z.min} max={z.max} color={z.color} />
            ))
          ) : zoneView === "hr" && hrZones ? (
            hrZones.map(z => (
              <ZoneBar key={z.zone} zone={z.zone} name={z.name} min={z.min} max={z.max} color={z.color} />
            ))
          ) : zoneView === "cp" && cpZones ? (
            cpZones.map(z => (
              <ZoneBar key={z.zone} zone={z.zone} name={z.name} min={z.min} max={z.max || "+" } color={z.color} />
            ))
          ) : (
            <EmptyState message={zoneView === "power" ? "Set your FTP to see power zones." : zoneView === "hr" ? "Set your Max HR to see HR zones." : "Sync activities to compute CP zones."} />
          )}
        </SectionCard>

        {/* ── SECTION 4: BODY COMPOSITION ── */}
        <SectionCard title="Body Composition">
          {profile?.weight_kg ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatBox label="Weight" value={formatWeight(profile.weight_kg, units)} unit={weightUnit(units)} />
              {profile.height_cm && (
                <StatBox label="Height" value={units === "imperial" ? `${Math.round(profile.height_cm / 2.54)}"` : `${profile.height_cm}`} unit={units === "imperial" ? "in" : "cm"} />
              )}
              {wkg && <StatBox label="FTP W/kg" value={wkg} unit="W/kg" color={T.accent} />}
              {latestDexa?.body_fat_pct != null && (
                <>
                  <StatBox label="Body Fat" value={latestDexa.body_fat_pct} unit="%" sub="DEXA" />
                  {latestDexa.lean_mass_kg && (
                    <StatBox
                      label="Lean W/kg"
                      value={profile.ftp_watts ? Math.round((profile.ftp_watts / latestDexa.lean_mass_kg) * 100) / 100 : null}
                      unit="W/kg"
                      sub="FTP / lean mass"
                      color="#3b82f6"
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <EmptyState message="Add your weight on the Profile page." />
          )}
        </SectionCard>

        {/* ── SECTION 5: TRAINING LOAD ── */}
        <SectionCard title="Training Load">
          {latestMetrics?.ctl != null ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatBox label="CTL" value={Math.round(latestMetrics.ctl)} sub="Fitness" color="#3b82f6" />
                <StatBox label="ATL" value={Math.round(latestMetrics.atl)} sub="Fatigue" color="#ef4444" />
                <StatBox label="TSB" value={Math.round(latestMetrics.tsb)} sub="Form" color={formColor} />
                {latestMetrics.ramp_rate != null && (
                  <StatBox label="Ramp Rate" value={Math.round(latestMetrics.ramp_rate * 10) / 10} unit="TSS/wk" sub={latestMetrics.ramp_rate > 7 ? "Caution" : "Safe"} color={latestMetrics.ramp_rate > 7 ? "#f59e0b" : T.accent} />
                )}
              </div>
              {formLabel && (
                <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: 700, color: formColor }}>
                  Form: {formLabel}
                </div>
              )}
            </>
          ) : (
            <EmptyState message="Sync activities with power data to see your training load." />
          )}
        </SectionCard>

        {/* ── SECTION 6: RECOVERY BASELINES ── */}
        <SectionCard title="Recovery Baselines">
          {averages ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatBox
                  label="HRV"
                  value={latestMetrics?.hrv != null ? Math.round(latestMetrics.hrv) : null}
                  unit="ms"
                  sub={averages.hrv != null ? `30d avg: ${averages.hrv}ms` : undefined}
                />
                <StatBox
                  label="RHR"
                  value={latestMetrics?.resting_hr != null ? Math.round(latestMetrics.resting_hr) : null}
                  unit="bpm"
                  sub={averages.rhr != null ? `30d avg: ${averages.rhr}bpm` : undefined}
                />
                <StatBox
                  label="Sleep Score"
                  value={latestMetrics?.sleep_score}
                  sub={averages.sleepScore != null ? `30d avg: ${averages.sleepScore}` : undefined}
                />
                <StatBox
                  label="Sleep Duration"
                  value={latestMetrics?.sleep_total ? formatMinutes(latestMetrics.sleep_total) : null}
                  sub={averages.sleepTotal != null ? `30d avg: ${formatMinutes(averages.sleepTotal)}` : undefined}
                />
              </div>
              {recoveryScore != null && (
                <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: 700, color: recoveryColor }}>
                  Recovery: {recoveryLabel} ({recoveryScore}/100)
                </div>
              )}
            </>
          ) : (
            <EmptyState message="Connect a recovery device (Eight Sleep, Oura, Whoop) to see your baselines." />
          )}
        </SectionCard>

      </div>
    </div>
  );
}

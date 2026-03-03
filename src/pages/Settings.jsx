import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { useResponsive } from "../hooks/useResponsive";
import { supabase } from "../lib/supabase";
import { User, Bell, Ruler, Palette, LogOut, MessageSquare, Check, Loader, Shield, Download, Trash2, AlertTriangle, Menu, X, Mail, Lock, Settings as SettingsIcon, Globe, RefreshCw } from "lucide-react";
import { apiFetch } from "../lib/api";

const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "America/Vancouver", "America/Sao_Paulo", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam",
  "Europe/Zurich", "Australia/Sydney", "Australia/Melbourne", "Asia/Tokyo",
  "Asia/Singapore", "Asia/Hong_Kong", "Africa/Johannesburg",
];

function formatTz(tz) {
  return tz.replace(/_/g, " ").replace(/\//g, " / ");
}

function formatPhoneDisplay(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toE164(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, signout, updateProfile, resetPassword } = useAuth();
  const { units, setUnits } = usePreferences();
  const { isMobile, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState("units");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Preferences form state
  const [timezone, setTimezone] = useState("");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Password reset state
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [profileError, setProfileError] = useState("");

  // SMS state
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsSaved, setSmsSaved] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reprocess state
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState(null);

  const [smsPrefs, setSmsPrefs] = useState({
    sms_workout_summary: true,
    sms_morning_readiness: true,
    sms_weekly_digest: true,
    sms_blood_panel_alerts: true,
  });
  const [emailPrefs, setEmailPrefs] = useState({
    email_workout_summary: true,
  });

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone_number ? formatPhoneDisplay(profile.phone_number.replace("+1", "")) : "");
      setSmsOptIn(!!profile.sms_opt_in);
      setSmsConsent(!!profile.sms_opt_in);
      setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    async function loadPrefs() {
      if (!user || !profile) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/settings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.notification_preferences) {
            const np = data.settings.notification_preferences;
            setSmsPrefs(prev => ({ ...prev, ...np }));
            setEmailPrefs(prev => ({ ...prev, ...np }));
          }
        }
      } catch (e) { /* use defaults */ }
    }
    loadPrefs();
  }, [profile, user]);

  const handlePasswordReset = async () => {
    setResetSending(true);
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      setProfileError(err.message || "Failed to send reset email");
    } finally {
      setResetSending(false);
    }
  };

  const handleSignout = async () => {
    await signout();
    navigate("/");
  };

  const savePreferences = async () => {
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      await updateProfile({
        timezone: timezone || null,
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (err) {
      setProfileError(err.message || "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const saveSmsSettings = async () => {
    setSmsSaving(true);
    setSmsSaved(false);
    try {
      const e164 = phone ? toE164(phone) : null;
      await updateProfile({
        phone_number: e164,
        sms_opt_in: smsOptIn,
        sms_opt_in_at: smsOptIn ? new Date().toISOString() : null,
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ notification_preferences: { ...smsPrefs, ...emailPrefs } }),
        });
      }
      setSmsSaved(true);
      setTimeout(() => setSmsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save SMS settings:", err);
    } finally {
      setSmsSaving(false);
    }
  };

  const tabs = [
    { id: "units", label: "Units & Display", icon: <Ruler size={16} /> },
    { id: "preferences", label: "Preferences", icon: <Globe size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { id: "password", label: "Password", icon: <Lock size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
    { id: "account", label: "Account & Data", icon: <Shield size={16} /> },
  ];

  const toggleStyle = (active) => ({
    width: 44, height: 24, borderRadius: 12, padding: 2,
    background: active ? T.accent : T.border,
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center",
    justifyContent: active ? "flex-end" : "flex-start",
    transition: "all 0.2s",
  });

  const toggleKnob = {
    width: 20, height: 20, borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  };

  const selBtn = (value, current, onClick) => (
    <button key={value} onClick={onClick}
      style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: current ? 700 : 500, background: current ? T.accentDim : T.card, border: `1px solid ${current ? T.accentMid : T.border}`, color: current ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}>
      {value}
    </button>
  );

  const lbl = (text) => (
    <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>{text}</label>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav bar */}
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
                  background: "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 600, color: T.textSoft,
                  cursor: "pointer", fontFamily: font,
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
                    <SettingsIcon size={14} /> Settings
                  </button>
                  <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                  <button onClick={() => { setUserMenuOpen(false); handleSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}>
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
                background: item.label === "Settings" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Settings" ? T.accent : T.textSoft,
                cursor: "pointer", fontFamily: font, textAlign: "left",
              }}>{item.label}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: 1000, margin: "0 auto", width: "100%", padding: isMobile ? "20px" : "40px" }}>
        {/* Sidebar tabs / horizontal tab bar on mobile */}
        <div style={isMobile ? { display: "flex", overflowX: "auto", gap: 4, padding: "0 16px", borderBottom: `1px solid ${T.border}`, marginBottom: 16 } : { width: 220, marginRight: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? T.accentDim : "transparent", color: activeTab === tab.id ? T.accent : T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left", whiteSpace: isMobile ? "nowrap" : undefined, flexShrink: isMobile ? 0 : undefined }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {activeTab === "units" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Units & Display</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Choose how measurements are displayed throughout the app.</p>

              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 20px", letterSpacing: "-0.01em" }}>Measurement System</h3>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  This affects how distances, speeds, elevation, weight, and temperature are displayed across all pages.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { value: "imperial", label: "Imperial", desc: "miles, mph, feet, lbs, °F" },
                    { value: "metric", label: "Metric", desc: "km, km/h, meters, kg, °C" },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setUnits(opt.value)}
                      style={{
                        flex: 1, minWidth: 180, padding: "16px 20px", borderRadius: 12,
                        background: units === opt.value ? T.accentDim : T.surface,
                        border: `2px solid ${units === opt.value ? T.accent : T.border}`,
                        cursor: "pointer", textAlign: "left", fontFamily: font,
                        transition: "all 0.2s",
                      }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: units === opt.value ? T.accent : T.text, marginBottom: 4 }}>
                        {units === opt.value && <Check size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />}
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 12, color: T.textDim }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Preferences</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>General app preferences.</p>

              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 20px" }}>Timezone</h3>
                <select value={timezone} onChange={e => setTimezone(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 16, cursor: "pointer", appearance: "auto" }}>
                  <option value="">Select timezone...</option>
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{formatTz(tz)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={savePreferences} disabled={prefsSaving} style={{
                  ...btn(true), fontSize: 13, padding: "10px 24px",
                  opacity: prefsSaving ? 0.6 : 1,
                }}>
                  {prefsSaving ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  {prefsSaving ? "Saving..." : "Save Preferences"}
                </button>
                {prefsSaved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.accent, fontWeight: 600 }}>
                    <Check size={14} /> Saved
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Notifications</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Control what alerts you receive.</p>

              {/* Email Notifications */}
              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <Mail size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Email Notifications</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  Get AI-powered workout analyses delivered to your inbox after every activity sync.
                </p>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 16 }}>
                  Emails sent to: <span style={{ color: T.text }}>{user?.email || "\u2014"}</span>
                </div>
                {[
                  { key: "email_workout_summary", label: "Post-Workout Analysis", desc: "AI analysis email after every activity sync", enabled: true },
                  { key: "email_morning_readiness", label: "Morning Readiness", desc: "Daily training recommendation based on sleep & recovery", enabled: false },
                  { key: "email_weekly_digest", label: "Weekly Digest", desc: "Sunday evening training week review", enabled: false },
                  { key: "email_blood_panel_alerts", label: "Blood Panel Alerts", desc: "Key findings after uploading lab results", enabled: false },
                ].map(({ key, label, desc, enabled }) => (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 0", borderTop: `1px solid ${T.border}`,
                    opacity: enabled ? 1 : 0.4,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}{!enabled && <span style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>Coming soon</span>}</div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{desc}</div>
                    </div>
                    <button
                      onClick={() => enabled && setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
                      style={toggleStyle(emailPrefs[key])}
                      disabled={!enabled}
                    >
                      <div style={toggleKnob} />
                    </button>
                  </div>
                ))}
              </div>

              {/* SMS Coach */}
              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <MessageSquare size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>SMS AI Coach</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 20px", lineHeight: 1.5 }}>
                  Get AI-powered workout summaries, recovery tips, and coaching insights delivered directly to your phone via text. Reply to any message to ask follow-up questions.
                </p>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>Phone Number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                    placeholder="(555) 123-4567"
                    maxLength={14}
                    style={{ ...inputStyle, paddingLeft: 16, fontFamily: mono, width: "100%" }}
                  />
                </div>

                <div style={{
                  padding: "14px 16px", background: "rgba(0,0,0,0.02)", borderRadius: 10,
                  border: `1px solid ${smsConsent ? "rgba(16,185,129,0.3)" : T.border}`,
                  marginBottom: 16, transition: "border-color 0.2s",
                }}>
                  <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => {
                        setSmsConsent(e.target.checked);
                        if (!e.target.checked) setSmsOptIn(false);
                      }}
                      style={{ marginTop: 2, accentColor: T.accent, width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>
                      I agree to receive automated text messages from AIM Performance at the phone number provided, including AI-powered workout summaries, training insights, and coaching messages. Message frequency varies. Msg & data rates may apply. Reply <strong style={{ color: T.text }}>STOP</strong> to unsubscribe at any time. Reply <strong style={{ color: T.text }}>HELP</strong> for help. View our{" "}
                      <a href="https://aimfitness.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "underline" }}>Privacy Policy</a> and{" "}
                      <a href="https://aimfitness.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "underline" }}>Terms & Conditions</a>.
                    </span>
                  </label>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 0", borderTop: `1px solid ${T.border}`,
                  opacity: smsConsent && phone.replace(/\D/g, "").length === 10 ? 1 : 0.4,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Enable SMS Coaching</div>
                    <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>
                      {!phone.replace(/\D/g, "").length ? "Enter your phone number above" :
                       phone.replace(/\D/g, "").length < 10 ? "Enter a valid 10-digit phone number" :
                       !smsConsent ? "Check the consent box above to enable" :
                       "Receive AI-powered texts after workouts"}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (smsConsent && phone.replace(/\D/g, "").length === 10) setSmsOptIn(!smsOptIn); }}
                    style={toggleStyle(smsOptIn)}
                    disabled={!smsConsent || phone.replace(/\D/g, "").length < 10}
                  >
                    <div style={toggleKnob} />
                  </button>
                </div>

                {smsOptIn && (
                  <div style={{ marginTop: 4 }}>
                    {[
                      { key: "sms_workout_summary", label: "Post-Workout Summary", desc: "AI analysis after every Strava sync" },
                      { key: "sms_morning_readiness", label: "Morning Readiness", desc: "Daily training recommendation based on sleep & recovery" },
                      { key: "sms_weekly_digest", label: "Weekly Digest", desc: "Sunday evening training week review" },
                      { key: "sms_blood_panel_alerts", label: "Blood Panel Alerts", desc: "Key findings after uploading lab results" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${T.border}` }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                          <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{desc}</div>
                        </div>
                        <button onClick={() => setSmsPrefs(p => ({ ...p, [key]: !p[key] }))} style={toggleStyle(smsPrefs[key])}>
                          <div style={toggleKnob} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={saveSmsSettings} disabled={smsSaving} style={{
                    ...btn(true), fontSize: 13, padding: "10px 24px",
                    opacity: smsSaving ? 0.6 : 1,
                  }}>
                    {smsSaving ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                    {smsSaving ? "Saving..." : "Save Notification Settings"}
                  </button>
                  {smsSaved && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.accent, fontWeight: 600 }}>
                      <Check size={14} /> Saved
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Password</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Change your account password.</p>

              {profileError && (
                <div style={{ padding: "10px 14px", marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#ef4444" }}>
                  {profileError}
                </div>
              )}

              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Lock size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Reset Password</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  We'll send a password reset link to <strong style={{ color: T.text }}>{user?.email}</strong>. Click the link in the email to set a new password.
                </p>
                <button onClick={handlePasswordReset} disabled={resetSending || resetSent}
                  style={{
                    ...btn(false), fontSize: 13, padding: "10px 24px",
                    opacity: (resetSending || resetSent) ? 0.6 : 1,
                    color: resetSent ? T.accent : T.text,
                    borderColor: resetSent ? T.accentMid : T.border,
                  }}>
                  {resetSending ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> :
                   resetSent ? <Check size={14} /> : <Mail size={14} />}
                  {resetSending ? "Sending..." : resetSent ? "Reset Link Sent" : "Send Password Reset Email"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Appearance</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Customize how AIM looks.</p>
              <p style={{ fontSize: 14, color: T.textDim }}>Coming soon — dashboard layout, widget arrangement.</p>
            </div>
          )}

          {activeTab === "account" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Account & Data</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Export your data or delete your account.</p>

              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Download size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Export Your Data</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  Download all your data in JSON format — activities, daily metrics, blood panels, DEXA scans, power profiles, AI conversations, and settings.
                </p>
                <button onClick={async () => {
                  setExporting(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/user/export", {
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `aim-data-export-${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error("Export failed:", err);
                  } finally {
                    setExporting(false);
                  }
                }} disabled={exporting} style={{ ...btn(true), fontSize: 13, padding: "10px 24px", opacity: exporting ? 0.6 : 1 }}>
                  {exporting ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
                  {exporting ? "Exporting..." : "Download My Data"}
                </button>
              </div>

              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <RefreshCw size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Reprocess Activities</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  Re-analyze all your activities to detect workout tags (VO2, Threshold, Endurance, etc.), extract intervals, and enrich with weather data. This powers the Workout Database and smart tag filtering.
                </p>
                {reprocessResult && (
                  <div style={{ padding: "10px 14px", marginBottom: 14, background: T.accentDim, border: `1px solid ${T.accentMid}`, borderRadius: 10, fontSize: 13, color: T.accent }}>
                    {reprocessResult}
                  </div>
                )}
                <button onClick={async () => {
                  setReprocessing(true);
                  setReprocessResult(null);
                  let totalIntervals = 0, totalTags = 0, totalWeather = 0, totalFailed = 0, rounds = 0;
                  try {
                    while (rounds < 20) {
                      rounds++;
                      const res = await apiFetch("/api/activities/backfill-intervals", { method: "POST", body: { mode: "all" } });
                      totalIntervals += res.intervals || 0;
                      totalTags += res.tags || 0;
                      totalWeather += res.weather || 0;
                      totalFailed += res.failed || 0;
                      if ((res.intervals || 0) + (res.tags || 0) === 0) break;
                    }
                    const parts = [];
                    if (totalTags > 0) parts.push(`${totalTags} tagged`);
                    if (totalIntervals > 0) parts.push(`${totalIntervals} intervals extracted`);
                    if (totalWeather > 0) parts.push(`${totalWeather} weather enriched`);
                    setReprocessResult(parts.length > 0
                      ? `Done! ${parts.join(", ")}${totalFailed > 0 ? ` (${totalFailed} failed)` : ""}`
                      : "All activities are already up to date.");
                  } catch (err) {
                    setReprocessResult(`Error: ${err.message}`);
                  } finally {
                    setReprocessing(false);
                  }
                }} disabled={reprocessing} style={{
                  ...btn(true), fontSize: 13, padding: "10px 24px",
                  opacity: reprocessing ? 0.6 : 1,
                }}>
                  {reprocessing ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
                  {reprocessing ? "Processing..." : "Reprocess All Activities"}
                </button>
              </div>

              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#ef4444" }}>Delete Account</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  Permanently delete your account and all associated data including activities, health metrics, blood panels, AI conversations, and connected integrations. This action cannot be undone.
                </p>
                <button onClick={() => setShowDeleteModal(true)}
                  style={{ ...btn(false), fontSize: 13, padding: "10px 24px", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
                  <Trash2 size={14} /> Delete My Account
                </button>
              </div>

              {showDeleteModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); setDeleteError(""); }}>
                  <div style={{ background: T.surface, borderRadius: 20, padding: isMobile ? 24 : 32, width: isMobile ? "calc(100% - 32px)" : "auto", maxWidth: isMobile ? "calc(100% - 32px)" : 440, border: `1px solid ${T.border}` }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <AlertTriangle size={24} color="#ef4444" />
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Are you sure?</h3>
                    </div>
                    <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6, marginBottom: 20 }}>
                      This will permanently delete your account and all data. Type <strong style={{ color: "#ef4444" }}>DELETE</strong> below to confirm.
                    </p>
                    {deleteError && (
                      <div style={{ padding: "10px 14px", marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#ef4444" }}>
                        {deleteError}
                      </div>
                    )}
                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder='Type "DELETE" to confirm'
                      style={{ ...inputStyle, paddingLeft: 16, marginBottom: 20, borderColor: "rgba(239,68,68,0.3)" }} />
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); setDeleteError(""); }}
                        style={{ ...btn(false), fontSize: 13, padding: "10px 20px" }}>
                        Cancel
                      </button>
                      <button onClick={async () => {
                        setDeleting(true);
                        setDeleteError("");
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch("/api/user/delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                            body: JSON.stringify({ confirmation: deleteConfirm }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Deletion failed");
                          await signout();
                          navigate("/");
                        } catch (err) {
                          setDeleteError(err.message);
                        } finally {
                          setDeleting(false);
                        }
                      }} disabled={deleteConfirm !== "DELETE" || deleting}
                        style={{ ...btn(false), fontSize: 13, padding: "10px 20px", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", background: deleteConfirm === "DELETE" ? "rgba(239,68,68,0.1)" : "transparent", opacity: (deleteConfirm !== "DELETE" || deleting) ? 0.4 : 1, cursor: (deleteConfirm !== "DELETE" || deleting) ? "not-allowed" : "pointer" }}>
                        {deleting ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

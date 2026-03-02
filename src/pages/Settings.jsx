import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { supabase } from "../lib/supabase";
import { ArrowLeft, User, Bell, Ruler, Palette, LogOut, MessageSquare, Check, Loader, Shield, Download, Trash2, AlertTriangle, Menu, X, Mail, Lock } from "lucide-react";
import { computePowerZones, computeHRZones } from "../lib/zones";
import { apiFetch } from "../lib/api";

const RIDING_LEVELS = ["Recreational", "Competitive", "Professional"];
const WEEKLY_HOURS = ["1-5", "5-10", "11-15", "16+"];
const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "America/Vancouver", "America/Sao_Paulo", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam",
  "Europe/Zurich", "Australia/Sydney", "Australia/Melbourne", "Asia/Tokyo",
  "Asia/Singapore", "Asia/Hong_Kong", "Africa/Johannesburg",
];

function fromMetric(field, value) {
  if (!value) return "";
  if (field === "height") return String(Math.round(value / 2.54 * 10) / 10);
  if (field === "weight") return String(Math.round(value / 0.453592 * 10) / 10);
  return String(value);
}

function toMetric(units, field, value) {
  if (!value) return null;
  const v = Number(value);
  if (units === "metric") return v;
  if (field === "height") return Math.round(v * 2.54 * 10) / 10;
  if (field === "weight") return Math.round(v * 0.453592 * 10) / 10;
  return v;
}

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
  const { isMobile, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState("profile");
  const [menuOpen, setMenuOpen] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: "", date_of_birth: "", sex: "",
    height: "", weight: "",
    ftp_watts: "", lthr_bpm: "", max_hr_bpm: "",
    riding_level: "", weekly_hours: "",
    uses_cycle_tracking: false, hormonal_contraception: "",
    timezone: "",
  });
  const [units, setUnits] = useState("imperial");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showFtpTooltip, setShowFtpTooltip] = useState(false);

  // Password reset state
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
    }
    // Load notification preferences + units + populate profile form
    async function loadPrefs() {
      if (!user || !profile) return;
      let userUnits = "imperial";
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
          if (data.settings?.units) userUnits = data.settings.units;
        }
      } catch (e) { /* use default */ }
      setUnits(userUnits);
      const isMetric = userUnits === "metric";
      setProfileForm({
        full_name: profile.full_name || "",
        date_of_birth: profile.date_of_birth || "",
        sex: profile.sex || "",
        height: isMetric ? String(profile.height_cm ?? "") : fromMetric("height", profile.height_cm),
        weight: isMetric ? String(profile.weight_kg ?? "") : fromMetric("weight", profile.weight_kg),
        ftp_watts: profile.ftp_watts ? String(profile.ftp_watts) : "",
        lthr_bpm: profile.lthr_bpm ? String(profile.lthr_bpm) : "",
        max_hr_bpm: profile.max_hr_bpm ? String(profile.max_hr_bpm) : "",
        riding_level: profile.riding_level || "",
        weekly_hours: profile.weekly_hours || "",
        uses_cycle_tracking: profile.uses_cycle_tracking || false,
        hormonal_contraception: profile.hormonal_contraception || "",
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
    loadPrefs();
  }, [profile, user]);

  const setField = (field, value) => setProfileForm(prev => ({ ...prev, [field]: value }));

  const handleUnitsToggle = (newUnits) => {
    if (newUnits === units) return;
    setProfileForm(prev => ({
      ...prev,
      height: newUnits === "metric"
        ? (prev.height ? String(Math.round(Number(prev.height) * 2.54 * 10) / 10) : "")
        : (prev.height ? String(Math.round(Number(prev.height) / 2.54 * 10) / 10) : ""),
      weight: newUnits === "metric"
        ? (prev.weight ? String(Math.round(Number(prev.weight) * 0.453592 * 10) / 10) : "")
        : (prev.weight ? String(Math.round(Number(prev.weight) / 0.453592 * 10) / 10) : ""),
    }));
    setUnits(newUnits);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError("");
    try {
      const ftpVal = profileForm.ftp_watts ? parseInt(profileForm.ftp_watts) : null;
      const maxHrVal = profileForm.max_hr_bpm ? parseInt(profileForm.max_hr_bpm) : null;
      const lthrVal = profileForm.lthr_bpm ? parseInt(profileForm.lthr_bpm) : null;

      await updateProfile({
        full_name: profileForm.full_name.trim(),
        date_of_birth: profileForm.date_of_birth || null,
        sex: profileForm.sex || null,
        height_cm: toMetric(units, "height", profileForm.height),
        weight_kg: toMetric(units, "weight", profileForm.weight),
        ftp_watts: ftpVal,
        lthr_bpm: lthrVal,
        max_hr_bpm: maxHrVal,
        riding_level: profileForm.riding_level || null,
        weekly_hours: profileForm.weekly_hours || null,
        uses_cycle_tracking: profileForm.uses_cycle_tracking,
        hormonal_contraception: profileForm.hormonal_contraception || null,
        timezone: profileForm.timezone || null,
      });

      // Save zone columns separately — these may not exist in production yet
      updateProfile({
        power_zones: computePowerZones(ftpVal),
        hr_zones: computeHRZones(maxHrVal),
      }).catch(() => {});

      // Save units preference (non-blocking)
      supabase.from("user_settings").upsert({
        user_id: user.id,
        units: units,
      }, { onConflict: "user_id" }).then(({ error: settingsErr }) => {
        if (settingsErr) console.error("Units save failed:", settingsErr.message);
      });

      // Backfill TSS/IF/VI/EF for activities when FTP is set (fire-and-forget)
      if (ftpVal) {
        apiFetch("/activities/backfill-metrics", { method: "POST" }).catch(() => {});
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

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

      // Save notification preferences
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
    { id: "profile", label: "Profile", icon: <User size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { id: "units", label: "Units & Display", icon: <Ruler size={16} /> },
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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "0 12px" : "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isMobile ? (
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          ) : (
            <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: font }}>
              <ArrowLeft size={18} /> Dashboard
            </button>
          )}
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
        <button onClick={handleSignout} style={{ ...btn(false), fontSize: 13, padding: "8px 16px", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}>
          <LogOut size={14} /> {!isMobile && "Sign Out"}
        </button>
      </div>

      {/* Mobile slide-out drawer */}
      {isMobile && menuOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }} onClick={() => setMenuOpen(false)} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: T.surface, borderRight: `1px solid ${T.border}`, zIndex: 999, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={20} />
              </button>
            </div>
            <button onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 400, background: "transparent", color: T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
              <ArrowLeft size={16} /> Dashboard
            </button>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? T.accentDim : "transparent", color: activeTab === tab.id ? T.accent : T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </>
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
          {activeTab === "profile" && (() => {
            const lbl = (text) => (
              <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>{text}</label>
            );
            const selBtn = (value, current, onClick) => (
              <button key={value} onClick={onClick}
                style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: current ? 700 : 500, background: current ? T.accentDim : T.card, border: `1px solid ${current ? T.accentMid : T.border}`, color: current ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}>
                {value}
              </button>
            );
            const card = (title, children) => (
              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 20px", letterSpacing: "-0.01em" }}>{title}</h3>
                {children}
              </div>
            );
            const isMetric = units === "metric";

            return (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Profile</h2>
                <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Manage your account and athlete profile.</p>

                {profileError && (
                  <div style={{ padding: "10px 14px", marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#ef4444" }}>
                    {profileError}
                  </div>
                )}

                {/* Personal Info */}
                {card("Personal Info", (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      {lbl("Full Name")}
                      <input value={profileForm.full_name} onChange={e => setField("full_name", e.target.value)} placeholder="Your name" style={{ ...inputStyle, paddingLeft: 16 }} />
                    </div>
                    <div>
                      {lbl("Email")}
                      <input value={user?.email || profile?.email || ""} disabled style={{ ...inputStyle, paddingLeft: 16, opacity: 0.5 }} />
                    </div>
                    <div>
                      {lbl("Date of Birth")}
                      <input type="date" value={profileForm.date_of_birth} onChange={e => setField("date_of_birth", e.target.value)} style={{ ...inputStyle, paddingLeft: 16 }} />
                    </div>
                    <div>
                      {lbl("Sex")}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {["Male", "Female", "Non-binary"].map(s => selBtn(s, profileForm.sex === s.toLowerCase(), () => setField("sex", s.toLowerCase())))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Physical Stats */}
                {card("Physical Stats", (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      {lbl("Units")}
                      <div style={{ display: "flex", gap: 8 }}>
                        {selBtn("Metric (kg, cm)", isMetric, () => handleUnitsToggle("metric"))}
                        {selBtn("Imperial (lbs, in)", !isMetric, () => handleUnitsToggle("imperial"))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        {lbl(isMetric ? "Height (cm)" : "Height (inches)")}
                        <input type="number" value={profileForm.height} onChange={e => setField("height", e.target.value)} placeholder={isMetric ? "175" : "69"} style={{ ...inputStyle, paddingLeft: 16 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        {lbl(isMetric ? "Weight (kg)" : "Weight (lbs)")}
                        <input type="number" value={profileForm.weight} onChange={e => setField("weight", e.target.value)} placeholder={isMetric ? "70" : "154"} style={{ ...inputStyle, paddingLeft: 16 }} />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Training Profile */}
                {card("Training Profile", (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                          FTP (watts)
                          <span
                            onMouseEnter={() => setShowFtpTooltip(true)}
                            onMouseLeave={() => setShowFtpTooltip(false)}
                            style={{ position: "relative", cursor: "help", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: T.border, fontSize: 10, fontWeight: 700, color: T.textDim }}
                          >
                            ?
                            {showFtpTooltip && (
                              <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: 240, padding: "10px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, fontWeight: 400, color: T.textSoft, lineHeight: 1.5, zIndex: 10, pointerEvents: "none", textAlign: "left" }}>
                                Functional Threshold Power — estimated as 95% of your best 20-minute average power.
                              </div>
                            )}
                          </span>
                        </label>
                        <input type="number" value={profileForm.ftp_watts} onChange={e => setField("ftp_watts", e.target.value)} placeholder="250" style={{ ...inputStyle, paddingLeft: 16 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        {lbl("Max HR (bpm)")}
                        <input type="number" value={profileForm.max_hr_bpm} onChange={e => setField("max_hr_bpm", e.target.value)} placeholder="185" style={{ ...inputStyle, paddingLeft: 16 }} />
                      </div>
                    </div>
                    <div>
                      {lbl("LTHR (bpm)")}
                      <input type="number" value={profileForm.lthr_bpm} onChange={e => setField("lthr_bpm", e.target.value)} placeholder="170" style={{ ...inputStyle, paddingLeft: 16, maxWidth: "calc(50% - 8px)" }} />
                    </div>
                    <div>
                      {lbl("Riding Level")}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {RIDING_LEVELS.map(l => selBtn(l, profileForm.riding_level === l.toLowerCase(), () => setField("riding_level", l.toLowerCase())))}
                      </div>
                    </div>
                    <div>
                      {lbl("Weekly Training Hours")}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {WEEKLY_HOURS.map(h => selBtn(`${h} hrs`, profileForm.weekly_hours === h, () => setField("weekly_hours", h)))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Preferences */}
                {card("Preferences", (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      {lbl("Timezone")}
                      <select value={profileForm.timezone} onChange={e => setField("timezone", e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 16, cursor: "pointer", appearance: "auto" }}>
                        <option value="">Select timezone...</option>
                        {COMMON_TIMEZONES.map(tz => (
                          <option key={tz} value={tz}>{formatTz(tz)}</option>
                        ))}
                      </select>
                    </div>
                    {profileForm.sex === "female" && (
                      <div style={{ padding: 20, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>Menstrual Cycle Tracking</div>
                            <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>AIM can adjust insights based on cycle phase</div>
                          </div>
                          <button onClick={() => setField("uses_cycle_tracking", !profileForm.uses_cycle_tracking)}
                            style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", padding: 2, background: profileForm.uses_cycle_tracking ? T.accent : T.border, transition: "background 0.2s" }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", transform: profileForm.uses_cycle_tracking ? "translateX(20px)" : "translateX(0)" }} />
                          </button>
                        </div>
                        {profileForm.uses_cycle_tracking && (
                          <div style={{ marginTop: 12 }}>
                            {lbl("Hormonal contraception?")}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {["None", "Pill", "IUD", "Implant", "Other"].map(h => selBtn(h, profileForm.hormonal_contraception === h.toLowerCase(), () => setField("hormonal_contraception", h.toLowerCase())))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Save Button */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                  <button onClick={saveProfile} disabled={profileSaving} style={{
                    ...btn(true), fontSize: 13, padding: "10px 24px",
                    opacity: profileSaving ? 0.6 : 1,
                  }}>
                    {profileSaving ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                  {profileSaved && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.accent, fontWeight: 600 }}>
                      <Check size={14} /> Saved
                    </div>
                  )}
                </div>

                {/* Password */}
                <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Lock size={18} color={T.accent} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Password</h3>
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

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            );
          })()}

          {activeTab === "notifications" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Notifications</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Control what alerts you receive.</p>

              {/* Email Notifications Section */}
              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <Mail size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Email Notifications</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 16px", lineHeight: 1.5 }}>
                  Get AI-powered workout analyses delivered to your inbox after every activity sync.
                </p>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 16 }}>
                  Emails sent to: <span style={{ color: T.text }}>{user?.email || "—"}</span>
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

              {/* SMS Coach Section */}
              <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <MessageSquare size={18} color={T.accent} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>SMS AI Coach</h3>
                </div>
                <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 20px", lineHeight: 1.5 }}>
                  Get AI-powered workout summaries, recovery tips, and coaching insights delivered directly to your phone via text. Reply to any message to ask follow-up questions.
                </p>

                {/* Phone Number */}
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

                {/* Consent Checkbox (TCPA required) */}
                <div style={{
                  padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10,
                  border: `1px solid ${smsConsent ? "rgba(0,229,160,0.3)" : T.border}`,
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

                {/* Master SMS Toggle (only enabled after consent) */}
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

                {/* Individual notification toggles (only show when SMS enabled) */}
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

                {/* Save Button */}
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
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          )}

          {activeTab === "units" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Units & Display</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Choose how data is displayed.</p>
              <p style={{ fontSize: 14, color: T.textDim }}>Coming soon — metric/imperial toggle, timezone, date format.</p>
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

              {/* Export Data */}
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

              {/* Delete Account */}
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

              {/* Delete Confirmation Modal */}
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
    </div>
  );
}

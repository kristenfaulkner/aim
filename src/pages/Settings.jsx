import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { ArrowLeft, User, Bell, Ruler, Palette, LogOut, MessageSquare, Check, Loader, Shield, Download, Trash2, AlertTriangle } from "lucide-react";

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
  const { user, profile, signout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

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

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone_number ? formatPhoneDisplay(profile.phone_number.replace("+1", "")) : "");
      setSmsOptIn(!!profile.sms_opt_in);
      setSmsConsent(!!profile.sms_opt_in);
    }
    // Load notification preferences
    async function loadPrefs() {
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.notification_preferences) {
          setSmsPrefs(prev => ({ ...prev, ...data.settings.notification_preferences }));
        }
      }
    }
    loadPrefs();
  }, [profile, user]);

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
          body: JSON.stringify({ notification_preferences: smsPrefs }),
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
      <div style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: font }}>
            <ArrowLeft size={18} /> Dashboard
          </button>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
        <button onClick={handleSignout} style={{ ...btn(false), fontSize: 13, padding: "8px 16px", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", maxWidth: 1000, margin: "0 auto", width: "100%", padding: "40px" }}>
        {/* Sidebar tabs */}
        <div style={{ width: 220, marginRight: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? T.accentDim : "transparent", color: activeTab === tab.id ? T.accent : T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {activeTab === "profile" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Profile</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Manage your account details.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>Name</label>
                  <input defaultValue={profile?.full_name || ""} style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>Email</label>
                  <input defaultValue={user?.email || profile?.email || ""} disabled style={{ ...inputStyle, paddingLeft: 16, opacity: 0.5 }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Notifications</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Control what alerts you receive.</p>

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
                    style={{ ...inputStyle, paddingLeft: 16, fontFamily: mono, width: 220 }}
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
                      <a href="https://app.aimperformance.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "underline" }}>Privacy Policy</a> and{" "}
                      <a href="https://app.aimperformance.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "underline" }}>Terms & Conditions</a>.
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
                    {smsSaving ? "Saving..." : "Save SMS Settings"}
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
                  <div style={{ background: T.surface, borderRadius: 20, padding: 32, width: "100%", maxWidth: 440, border: `1px solid ${T.border}` }}
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

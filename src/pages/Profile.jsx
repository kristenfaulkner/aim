import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { useResponsive } from "../hooks/useResponsive";
import { supabase } from "../lib/supabase";
import { User, LogOut, Check, Loader, Menu, X, Settings, ChevronDown } from "lucide-react";
import { computePowerZones, computeHRZones } from "../lib/zones";
import { apiFetch } from "../lib/api";
import { fromMetricWeight, fromMetricHeight, toMetricWeight, toMetricHeight } from "../lib/units";

const RIDING_LEVELS = ["Recreational", "Competitive", "Professional"];
const WEEKLY_HOURS = ["1-5", "5-10", "11-15", "16+"];

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signout, updateProfile } = useAuth();
  const { units } = usePreferences();
  const { isMobile, isTablet } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: "", date_of_birth: "", sex: "",
    height: "", weight: "",
    ftp_watts: "", lthr_bpm: "", max_hr_bpm: "",
    riding_level: "", weekly_hours: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showFtpTooltip, setShowFtpTooltip] = useState(false);
  const [usesCycleTracking, setUsesCycleTracking] = useState(false);
  const [hormonalContraception, setHormonalContraception] = useState("");

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || "",
      date_of_birth: profile.date_of_birth || "",
      sex: profile.sex || "",
      height: fromMetricHeight(profile.height_cm, units),
      weight: fromMetricWeight(profile.weight_kg, units),
      ftp_watts: profile.ftp_watts ? String(profile.ftp_watts) : "",
      lthr_bpm: profile.lthr_bpm ? String(profile.lthr_bpm) : "",
      max_hr_bpm: profile.max_hr_bpm ? String(profile.max_hr_bpm) : "",
      riding_level: profile.riding_level || "",
      weekly_hours: profile.weekly_hours || "",
    });
    setUsesCycleTracking(profile.uses_cycle_tracking || false);
    setHormonalContraception(profile.hormonal_contraception || "");
  }, [profile, units]);

  const setField = (field, value) => setProfileForm(prev => ({ ...prev, [field]: value }));

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
        height_cm: toMetricHeight(profileForm.height, units),
        weight_kg: toMetricWeight(profileForm.weight, units),
        ftp_watts: ftpVal,
        lthr_bpm: lthrVal,
        max_hr_bpm: maxHrVal,
        riding_level: profileForm.riding_level || null,
        weekly_hours: profileForm.weekly_hours || null,
        uses_cycle_tracking: usesCycleTracking,
        hormonal_contraception: hormonalContraception || null,
      });

      // Save zone columns separately
      updateProfile({
        power_zones: computePowerZones(ftpVal),
        hr_zones: computeHRZones(maxHrVal),
      }).catch(() => {});

      // Backfill TSS/IF/VI/EF for activities when FTP is set
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

  const handleSignout = async () => { await signout(); navigate("/"); };

  const isMetric = units === "metric";
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
              {[{ label: "Today", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "Performance", path: "/performance" }, { label: "My Stats", path: "/my-stats" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }].map(item => (
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
                    <Settings size={14} /> Settings
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
            {[{ label: "Today", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "Performance", path: "/performance" }, { label: "My Stats", path: "/my-stats" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Profile", path: "/profile" }, { label: "Settings", path: "/settings" }].map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Profile" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Profile" ? T.accent : T.textSoft,
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

      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: 800, margin: "0 auto", width: "100%", padding: isMobile ? "20px" : "40px" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Profile</h2>
          <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Manage your athlete profile.</p>

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

          {/* Menstrual Cycle Tracking */}
          {profileForm.sex === "female" && (
            <div style={{ padding: 24, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Menstrual Cycle Tracking</div>
                  <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>AIM can adjust insights based on cycle phase</div>
                </div>
                <button onClick={() => setUsesCycleTracking(!usesCycleTracking)}
                  style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", padding: 2, background: usesCycleTracking ? T.accent : T.border, transition: "background 0.2s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", transform: usesCycleTracking ? "translateX(20px)" : "translateX(0)" }} />
                </button>
              </div>
              {usesCycleTracking && (
                <div style={{ marginTop: 12 }}>
                  {lbl("Hormonal contraception?")}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {["None", "Pill", "IUD", "Implant", "Other"].map(h => selBtn(h, hormonalContraception === h.toLowerCase(), () => setHormonalContraception(h.toLowerCase())))}
                  </div>
                </div>
              )}
            </div>
          )}

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

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}

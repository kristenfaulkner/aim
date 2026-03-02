import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { computePowerZones, computeHRZones } from "../lib/zones";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";

const RIDING_LEVELS = ["Recreational", "Competitive", "Professional"];
const WEEKLY_HOURS = ["1-5", "5-10", "11-15", "16+"];

function toMetric(units, field, value) {
  if (!value) return null;
  const v = Number(value);
  if (units === "metric") return v;
  if (field === "height") return Math.round(v * 2.54 * 10) / 10; // inches → cm
  if (field === "weight") return Math.round(v * 0.453592 * 10) / 10; // lbs → kg
  return v;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile, user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    sex: "",
    units: "imperial",
    height: "",
    weight: "",
    riding_level: "",
    weekly_hours: "",
    max_hr: "",
    ftp: "",
    uses_cycle_tracking: false,
    hormonal_contraception: "",
  });
  const [showFtpTooltip, setShowFtpTooltip] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const isMetric = form.units === "metric";

  const canAdvance = () => {
    if (step === 1) return healthDataConsent;
    if (step === 2) return form.full_name && form.date_of_birth && form.sex;
    return true;
  };

  const canFinish = () => form.riding_level && form.weekly_hours;

  const handleFinish = async () => {
    setError("");
    setSubmitting(true);
    try {
      // First check if the profile row exists (trigger may not have fired)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existing) {
        // Create the profile row if it doesn't exist
        const { error: insertErr } = await supabase
          .from("profiles")
          .insert({ id: user.id, email: user.email });
        if (insertErr) throw insertErr;
      }

      const ftpVal = form.ftp ? parseInt(form.ftp) : null;
      const maxHrVal = form.max_hr ? parseInt(form.max_hr) : null;

      await updateProfile({
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        sex: form.sex,
        height_cm: toMetric(form.units, "height", form.height),
        weight_kg: toMetric(form.units, "weight", form.weight),
        riding_level: form.riding_level.toLowerCase(),
        weekly_hours: form.weekly_hours,
        max_hr_bpm: maxHrVal,
        ftp_watts: ftpVal,
        uses_cycle_tracking: form.uses_cycle_tracking,
        hormonal_contraception: form.hormonal_contraception || null,
        health_data_consent_at: new Date().toISOString(),
        onboarding_completed: true,
      });

      // Save zone columns separately — these may not exist in production yet
      updateProfile({
        power_zones: computePowerZones(ftpVal),
        hr_zones: computeHRZones(maxHrVal),
      }).catch(() => {});

      // Save units preference (non-blocking)
      if (user) {
        supabase.from("user_settings").upsert({
          user_id: user.id,
          units: form.units,
        }, { onConflict: "user_id" }).then(({ error: settingsErr }) => {
          if (settingsErr) console.error("Settings save failed:", settingsErr.message);
        });
      }

      navigate("/connect");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const label = (text) => (
    <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>{text}</label>
  );

  const selectBtn = (value, current, onClick) => (
    <button key={value} onClick={onClick}
      style={{ padding: "10px 16px", minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: current ? 700 : 500, background: current ? T.accentDim : T.card, border: `1px solid ${current ? T.accentMid : T.border}`, color: current ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}>
      {value}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? 20 : 40 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? T.accent : T.border, transition: "background 0.3s" }} />
          ))}
        </div>

        {error && (
          <div style={{ padding: "10px 14px", marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* Step 1: Health Data Consent */}
        {step === 1 && (
          <div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: T.accentDim, border: `1px solid ${T.accentMid}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Shield size={24} style={{ color: T.accent }} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Your data, your control</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 24px", lineHeight: 1.6 }}>
              AIM processes health and fitness data to provide personalized insights. Before we collect any data, we need your explicit consent.
            </p>

            <div style={{ padding: 20, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Data we process:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "Heart rate, power, cadence, and training metrics from connected devices",
                  "Sleep data including duration, stages, HRV, and resting heart rate",
                  "Body composition data (weight, body fat %, DEXA scans)",
                  "Blood panel biomarkers that you upload",
                  "Menstrual cycle data (only if you opt in)",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                    <span style={{ color: T.accent, marginTop: 1, flexShrink: 0 }}>-</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 20, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>How we use it:</div>
              <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>
                Your data is analyzed by AI (powered by Anthropic's Claude) to generate personalized training insights, recovery recommendations, and cross-domain pattern detection. Your data is <strong style={{ color: T.text }}>never sold</strong> and is <strong style={{ color: T.text }}>not used to train AI models</strong>. You can withdraw consent and delete your data at any time in Settings.
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "14px 16px", borderRadius: 10, minHeight: 44, background: healthDataConsent ? "rgba(16,185,129,0.04)" : "transparent", border: `1px solid ${healthDataConsent ? T.accentMid : T.border}`, transition: "all 0.2s" }}>
              <input type="checkbox" checked={healthDataConsent} onChange={e => setHealthDataConsent(e.target.checked)}
                style={{ marginTop: 2, accentColor: T.accent, width: 18, height: 18, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontWeight: 600 }}>
                I explicitly consent to AIM processing my health and fitness data as described above
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Tell us about yourself</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>This helps AIM personalize your insights.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                {label("Full Name")}
                <input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your name" style={{ ...inputStyle, paddingLeft: 16 }} />
              </div>
              <div>
                {label("Date of Birth")}
                <input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} style={{ ...inputStyle, paddingLeft: 16 }} />
              </div>
              <div>
                {label("Sex")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Male", "Female", "Non-binary"].map(s => selectBtn(s, form.sex === s.toLowerCase(), () => set("sex", s.toLowerCase())))}
                </div>
              </div>
              <div>
                {label("Units")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectBtn("Metric (kg, cm)", isMetric, () => set("units", "metric"))}
                  {selectBtn("Imperial (lbs, in)", !isMetric, () => set("units", "imperial"))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {label(isMetric ? "Height (cm)" : "Height (inches)")}
                  <input type="number" value={form.height} onChange={e => set("height", e.target.value)} placeholder={isMetric ? "175" : "69"} style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
                <div style={{ flex: 1 }}>
                  {label(isMetric ? "Weight (kg)" : "Weight (lbs)")}
                  <input type="number" value={form.weight} onChange={e => set("weight", e.target.value)} placeholder={isMetric ? "70" : "154"} style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Athlete Profile */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Your athlete profile</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>This calibrates your benchmarks and training recommendations.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                {label("Riding Level")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {RIDING_LEVELS.map(l => selectBtn(l, form.riding_level === l, () => set("riding_level", l)))}
                </div>
              </div>
              <div>
                {label("Weekly Training Hours")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {WEEKLY_HOURS.map(h => selectBtn(`${h} hrs`, form.weekly_hours === h, () => set("weekly_hours", h)))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {label("Max Heart Rate (bpm)")}
                  <input type="number" value={form.max_hr} onChange={e => set("max_hr", e.target.value)} placeholder="185" style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
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
                  <input type="number" value={form.ftp} onChange={e => set("ftp", e.target.value)} placeholder="250" style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
              </div>

              {form.sex === "female" && (
                <div style={{ padding: 20, background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Menstrual Cycle Tracking</div>
                      <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>AIM can adjust insights based on cycle phase</div>
                    </div>
                    <button onClick={() => set("uses_cycle_tracking", !form.uses_cycle_tracking)}
                      style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", padding: 2, background: form.uses_cycle_tracking ? T.accent : T.border, transition: "background 0.2s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", transform: form.uses_cycle_tracking ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                  </div>
                  {form.uses_cycle_tracking && (
                    <div style={{ marginTop: 12 }}>
                      {label("Hormonal contraception?")}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {["None", "Pill", "IUD", "Implant", "Other"].map(h => selectBtn(h, form.hormonal_contraception === h.toLowerCase(), () => set("hormonal_contraception", h.toLowerCase())))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} style={{ ...btn(false), fontSize: 14, padding: "12px 24px" }}>Back</button>
          ) : <div />}
          {step < 3 ? (
            <button onClick={() => canAdvance() && setStep(step + 1)} disabled={!canAdvance()}
              style={{ ...btn(true), fontSize: 14, padding: "12px 28px", opacity: canAdvance() ? 1 : 0.4, cursor: canAdvance() ? "pointer" : "not-allowed" }}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={submitting || !canFinish()}
              style={{ ...btn(true), fontSize: 14, padding: "12px 28px", opacity: submitting || !canFinish() ? 0.4 : 1, cursor: submitting || !canFinish() ? "not-allowed" : "pointer" }}>
              {submitting && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
              Finish & Connect Apps <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

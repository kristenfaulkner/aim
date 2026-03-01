import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Check, Loader2 } from "lucide-react";

const RIDING_LEVELS = ["Recreational", "Fitness", "Enthusiast", "Competitive", "Elite", "Professional"];
const WEEKLY_HOURS = ["1-3", "3-5", "5-8", "8-12", "12-16", "16+"];
const GOALS = ["Increase FTP", "Lose weight", "Improve endurance", "Race faster", "Better recovery", "General fitness", "Complete a gran fondo", "Track health markers"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    sex: "",
    height_cm: "",
    weight_kg: "",
    riding_level: "",
    weekly_hours: "",
    goals: [],
    uses_cycle_tracking: false,
    hormonal_contraception: "",
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleGoal = (g) => set("goals", form.goals.includes(g) ? form.goals.filter(x => x !== g) : [...form.goals, g]);

  const canAdvance = () => {
    if (step === 1) return form.full_name && form.date_of_birth && form.sex;
    if (step === 2) return form.riding_level && form.weekly_hours;
    return true;
  };

  const handleFinish = async () => {
    setError("");
    setSubmitting(true);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        sex: form.sex,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        riding_level: form.riding_level.toLowerCase(),
        weekly_hours: form.weekly_hours,
        goals: form.goals,
        uses_cycle_tracking: form.uses_cycle_tracking,
        hormonal_contraception: form.hormonal_contraception || null,
        onboarding_completed: true,
      });
      navigate("/connect");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const label = (text) => (
    <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>{text}</label>
  );

  const selectBtn = (value, current, onClick) => (
    <button key={value} onClick={onClick}
      style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: current ? 700 : 500, background: current ? T.accentDim : T.card, border: `1px solid ${current ? T.accentMid : T.border}`, color: current ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}>
      {value}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
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

        {/* Step 1: Basic Info */}
        {step === 1 && (
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
                <div style={{ display: "flex", gap: 8 }}>
                  {["Male", "Female", "Non-binary"].map(s => selectBtn(s, form.sex === s.toLowerCase(), () => set("sex", s.toLowerCase())))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {label("Height (cm)")}
                  <input type="number" value={form.height_cm} onChange={e => set("height_cm", e.target.value)} placeholder="175" style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
                <div style={{ flex: 1 }}>
                  {label("Weight (kg)")}
                  <input type="number" value={form.weight_kg} onChange={e => set("weight_kg", e.target.value)} placeholder="70" style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Cycling Profile */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Your cycling profile</h1>
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
            </div>
          </div>
        )}

        {/* Step 3: Goals & Preferences */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Goals & preferences</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>Select all that apply. You can change these later.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                {label("What are your goals?")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {GOALS.map(g => (
                    <button key={g} onClick={() => toggleGoal(g)}
                      style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: form.goals.includes(g) ? 700 : 500, background: form.goals.includes(g) ? T.accentDim : T.card, border: `1px solid ${form.goals.includes(g) ? T.accentMid : T.border}`, color: form.goals.includes(g) ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
                      {form.goals.includes(g) && <Check size={14} />} {g}
                    </button>
                  ))}
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
                      <div style={{ display: "flex", gap: 8 }}>
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
            <button onClick={handleFinish} disabled={submitting}
              style={{ ...btn(true), fontSize: 14, padding: "12px 28px", opacity: submitting ? 0.7 : 1 }}>
              {submitting && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
              Finish & Connect Apps <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

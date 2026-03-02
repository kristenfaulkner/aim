import { useState, useEffect } from "react";

// ── DESIGN TOKENS ──
const T = {
  bg: "#f8f8fa",
  white: "#ffffff",
  surfaceHover: "#f2f2f5",
  text: "#1a1a2e",
  textSecondary: "#6b6b80",
  textTertiary: "#9d9db0",
  textInverse: "#ffffff",
  accent: "#10b981",
  accentSoft: "rgba(16, 185, 129, 0.08)",
  accentDark: "#059669",
  green: "#10b981",
  greenSoft: "rgba(16, 185, 129, 0.08)",
  yellow: "#f59e0b",
  yellowSoft: "rgba(245, 158, 11, 0.08)",
  red: "#ef4444",
  redSoft: "rgba(239, 68, 68, 0.08)",
  blue: "#3b82f6",
  blueSoft: "rgba(59, 130, 246, 0.08)",
  purple: "#8b5cf6",
  purpleSoft: "rgba(139, 92, 246, 0.08)",
  orange: "#f97316",
  border: "rgba(0,0,0,0.06)",
  borderStrong: "rgba(0,0,0,0.1)",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  radius: 12,
  radiusSm: 8,
  radiusLg: 16,
  radiusFull: 9999,
  font: "'DM Sans', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

// ── READINESS RING ──
const ReadinessRing = ({ score, size = 88 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? T.green : score >= 45 ? T.yellow : T.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={`${color}15`} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: T.textTertiary, marginTop: 1, fontFamily: T.font, textTransform: "uppercase", letterSpacing: "0.06em" }}>ready</span>
      </div>
    </div>
  );
};

// ── WEATHER PILL ──
const WeatherPill = ({ temp, condition, icon, wind, humidity }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 14px",
    borderRadius: T.radiusFull, background: T.blueSoft, border: `1px solid ${T.blue}15`,
  }}>
    <span style={{ fontSize: 18 }}>{icon}</span>
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 600, color: T.text }}>{temp}</span>
        <span style={{ fontSize: 11, color: T.textSecondary }}>{condition}</span>
      </div>
      <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 1 }}>
        Wind {wind} · {humidity} humidity
      </div>
    </div>
  </div>
);

// ── NUTRITION CARD ──
const NutritionPlan = ({ duration, intensity, temp }) => {
  // Simulated calculation based on duration × intensity × weather
  const estCalories = Math.round(duration * 650); // ~650 kcal/hr for endurance
  const carbsPerHour = intensity === "high" ? 90 : intensity === "moderate" ? 70 : 50;
  const totalCarbs = Math.round(carbsPerHour * duration);
  const fluidPerHour = temp > 25 ? 900 : temp > 18 ? 750 : 600; // ml
  const totalFluid = Math.round((fluidPerHour * duration) / 1000 * 10) / 10;
  const sodiumPerHour = temp > 25 ? 800 : 500; // mg

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {[
        { label: "Calories", value: estCalories.toLocaleString(), unit: "kcal", icon: "🔥", color: T.orange },
        { label: "Carbs", value: `${carbsPerHour}g`, unit: "/hr", icon: "🍌", color: T.yellow, sub: `${totalCarbs}g total` },
        { label: "Fluid", value: `${fluidPerHour}ml`, unit: "/hr", icon: "💧", color: T.blue, sub: `${totalFluid}L total` },
        { label: "Sodium", value: `${sodiumPerHour}mg`, unit: "/hr", icon: "🧂", color: T.purple, sub: "electrolytes" },
      ].map(item => (
        <div key={item.label} style={{
          padding: "12px", borderRadius: T.radiusSm, background: `${item.color}08`,
          border: `1px solid ${item.color}15`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 18, fontWeight: 700, color: T.text }}>{item.value}</span>
            <span style={{ fontSize: 11, color: T.textTertiary }}>{item.unit}</span>
          </div>
          {item.sub && <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 3 }}>{item.sub}</div>}
        </div>
      ))}
    </div>
  );
};

// ── MODE 1: PLANNED WORKOUT ──
const PlannedWorkoutCard = () => {
  const workout = {
    name: "Sweet Spot 3×15'",
    source: "Coach Martinez",
    type: "Threshold",
    structure: "15' warmup → 3 × 15' @ 88-93% FTP (262-277W) / 5' recovery → 10' cooldown",
    duration: 1.75, // hours
    targetTss: 90,
    targetIf: 0.88,
    targetPower: "262-277W",
    intensity: "moderate",
  };

  return (
    <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
      {/* Header with readiness + weather */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ReadinessRing score={82} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: T.radiusFull, background: T.green }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>
                Green light — execute as planned
              </span>
            </div>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, marginBottom: 10, fontFamily: T.font }}>
              HRV at 121ms (top quartile), slept 6h 3m with 1h 17m deep. Your body is fully recovered and ready for sweet spot work.
            </p>
            <WeatherPill temp="62°F / 17°C" condition="Cloudy" icon="⛅" wind="5-10 mph WSW" humidity="91%" />
          </div>
        </div>
      </div>

      {/* Today's Workout */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: T.font }}>Today's Workout</span>
              <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.font }}>from {workout.source}</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 4, fontFamily: T.font }}>
              {workout.name}
            </h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{
              padding: "7px 16px", borderRadius: T.radiusFull, border: `1px solid ${T.border}`,
              background: T.white, color: T.textSecondary, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: T.font,
            }}>
              Swap Workout
            </button>
            <button style={{
              padding: "7px 16px", borderRadius: T.radiusFull, border: "none",
              background: T.accent, color: T.textInverse, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: T.font,
            }}>
              Start Workout →
            </button>
          </div>
        </div>

        {/* Workout structure */}
        <div style={{
          padding: "14px 16px", borderRadius: T.radiusSm, background: T.surfaceHover,
          fontFamily: T.fontMono, fontSize: 13, color: T.text, lineHeight: 1.6,
          marginBottom: 14,
        }}>
          {workout.structure}
        </div>

        {/* Workout metrics */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Duration", value: "1h 45m" },
            { label: "Target Power", value: workout.targetPower },
            { label: "Est. TSS", value: workout.targetTss },
            { label: "Target IF", value: workout.targetIf },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10, color: T.textTertiary, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3, fontFamily: T.font }}>{m.label}</div>
              <div style={{ fontFamily: T.fontMono, fontSize: 15, fontWeight: 600, color: T.text }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition & Hydration Plan */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.blue, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: T.font }}>
            Fueling Plan
          </span>
          <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.font }}>
            Based on 1h 45m · moderate intensity · 17°C
          </span>
        </div>
        <NutritionPlan duration={1.75} intensity="moderate" temp={17} />
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: T.radiusSm,
          background: T.yellowSoft, border: `1px solid ${T.yellow}15`,
          fontSize: 12, color: T.textSecondary, lineHeight: 1.5, fontFamily: T.font,
        }}>
          💡 <strong style={{ color: T.text }}>Tip:</strong> Your best sweet spot sessions (top 10% by IF) followed meals 2-3 hours before. If riding at 10am, eat breakfast by 8am. Include 40-60g carbs in your pre-ride meal.
        </div>
      </div>
    </div>
  );
};

// ── MODE 2: NO PLAN — AI RECOMMENDATION ──
const AIRecommendationCard = () => {
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  const recommendations = [
    {
      id: "vo2",
      icon: "⚡",
      name: "VO₂max Intervals",
      why: "Best match for today",
      structure: "Classic 5×5' at 216-224W with 5' recoveries",
      duration: "1h 15m",
      tss: 85,
      intensity: "high",
      reason: "Your HRV is in the top quartile (121ms) and you haven't done VO₂ work in 8 days. Your 5-min power is your biggest limiter — this is the highest-ROI session you can do today.",
      color: T.red,
    },
    {
      id: "sweetspot",
      icon: "🎯",
      name: "Sweet Spot 3×15'",
      why: "Build threshold volume",
      structure: "3 × 15' at 262-277W (88-93% FTP) with 5' rest",
      duration: "1h 45m",
      tss: 90,
      intensity: "moderate",
      reason: "Your endurance ceiling is your limiter long-term. Sweet spot builds threshold volume with less recovery cost than VO₂ work.",
      color: T.orange,
    },
    {
      id: "endurance",
      icon: "🚴",
      name: "Z2 Endurance",
      why: "If you want something easier",
      structure: "2-3 hours at 175-205W (60-70% FTP) with steady cadence",
      duration: "2h 30m",
      tss: 120,
      intensity: "low",
      reason: "Your Z2 volume has been driving EF improvements. A long steady ride builds aerobic base without taxing recovery.",
      color: T.accent,
    },
  ];

  return (
    <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
      {/* Header with readiness + weather */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ReadinessRing score={82} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: T.radiusFull, background: T.green }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>
                You're primed for intensity today
              </span>
            </div>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, marginBottom: 10, fontFamily: T.font }}>
              HRV at 121ms (top quartile), slept 6h 3m with 1h 17m deep. You haven't done high-intensity work in 8 days — today is ideal.
            </p>
            <WeatherPill temp="62°F / 17°C" condition="Cloudy" icon="⛅" wind="5-10 mph WSW" humidity="91%" />
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.purple, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14, fontFamily: T.font }}>
          ✦ AIM recommends · Pick one
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map(w => {
            const isSelected = selectedWorkout === w.id;
            return (
              <div key={w.id}>
                <div
                  onClick={() => setSelectedWorkout(isSelected ? null : w.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: T.radiusSm,
                    border: `1px solid ${isSelected ? w.color + "40" : T.border}`,
                    background: isSelected ? `${w.color}06` : T.white,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = T.borderStrong; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = T.border; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{w.icon}</span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>{w.name}</span>
                          {w.id === "vo2" && (
                            <span style={{
                              padding: "2px 8px", borderRadius: T.radiusFull, background: `${w.color}12`,
                              color: w.color, fontSize: 10, fontWeight: 600, fontFamily: T.font,
                            }}>
                              Best match
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2, fontFamily: T.font }}>{w.why}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.textTertiary }}>{w.duration}</span>
                      <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.textTertiary }}>{w.tss} TSS</span>
                      <svg width={16} height={16} style={{ transform: isSelected ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="4,6 8,10 12,6" fill="none" stroke={T.textTertiary} strokeWidth={1.5} strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div style={{ marginTop: 14, animation: "fadeIn 0.2s ease" }}>
                      <div style={{
                        padding: "12px 14px", borderRadius: T.radiusSm, background: T.surfaceHover,
                        fontFamily: T.fontMono, fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 12,
                      }}>
                        {w.structure}
                      </div>
                      <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6, marginBottom: 14, fontFamily: T.font }}>
                        {w.reason}
                      </p>
                      {/* Show nutrition plan for selected workout */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: T.blue, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontFamily: T.font }}>
                          Fueling Plan · {w.duration} · {w.intensity} intensity · 17°C
                        </div>
                        <NutritionPlan
                          duration={parseFloat(w.duration)}
                          intensity={w.intensity}
                          temp={17}
                        />
                      </div>
                      <button style={{
                        width: "100%", padding: "10px", borderRadius: T.radiusSm, border: "none",
                        background: w.color, color: T.textInverse, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: T.font, transition: "opacity 0.15s",
                      }}
                        onMouseEnter={e => e.target.style.opacity = 0.9}
                        onMouseLeave={e => e.target.style.opacity = 1}
                      >
                        Add to Today's Calendar →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── NUTRITION PLAN (shared by both modes) ──
const NutritionPlan = ({ duration, intensity, temp }) => {
  const carbsPerHour = intensity === "high" ? 90 : intensity === "moderate" ? 70 : 50;
  const fluidPerHour = temp > 25 ? 900 : temp > 18 ? 750 : 600;
  const sodiumPerHour = temp > 25 ? 800 : 500;
  const estCalories = Math.round(duration * (intensity === "high" ? 750 : intensity === "moderate" ? 650 : 500));

  const items = [
    { label: "Calories", value: estCalories.toLocaleString(), unit: "kcal", icon: "🔥", color: T.orange },
    { label: "Carbs", value: `${carbsPerHour}g`, unit: "/hr", icon: "🍌", color: T.yellow },
    { label: "Fluid", value: `${fluidPerHour}ml`, unit: "/hr", icon: "💧", color: T.blue },
    { label: "Sodium", value: `${sodiumPerHour}mg`, unit: "/hr", icon: "🧂", color: T.purple },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {items.map(item => (
        <div key={item.label} style={{
          padding: "10px", borderRadius: T.radiusSm, background: `${item.color}06`,
          border: `1px solid ${item.color}12`, textAlign: "center",
        }}>
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          <div style={{ fontFamily: T.fontMono, fontSize: 15, fontWeight: 700, color: T.text, marginTop: 4 }}>
            {item.value}
          </div>
          <div style={{ fontSize: 10, color: T.textTertiary, fontFamily: T.font }}>{item.unit}</div>
        </div>
      ))}
    </div>
  );
};

// ── RED DAY MODE ──
const RedDayCard = () => (
  <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <ReadinessRing score={34} size={88} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: T.radiusFull, background: T.red }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>
              Recovery day — your body needs rest
            </span>
          </div>
          <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, marginBottom: 10, fontFamily: T.font }}>
            HRV dropped to 38ms (bottom 10%) after declining for 3 consecutive nights. RHR is elevated at 54 bpm (+6 above baseline). Sleep was 5h 12m with only 32 min deep.
          </p>
          <WeatherPill temp="62°F / 17°C" condition="Cloudy" icon="⛅" wind="5-10 mph" humidity="91%" />
        </div>
      </div>

      {/* Recovery recommendations */}
      <div style={{ marginTop: 20, padding: "16px", borderRadius: T.radiusSm, background: T.redSoft, border: `1px solid ${T.red}12` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.red, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontFamily: T.font }}>
          ✦ Today's Recovery Plan
        </div>
        {[
          { icon: "🚶", text: "30-minute easy walk or light spin under 55% FTP (< 164W). No intensity." },
          { icon: "💤", text: "Target lights-out by 9:45 PM tonight. Your optimal sleep window is 9:45 PM - 5:30 AM." },
          { icon: "🌡️", text: "Set EightSleep to -4°C. Your deep sleep is 34% higher at this setting." },
          { icon: "🥗", text: "Focus on anti-inflammatory foods: salmon, berries, leafy greens. Target 2g protein per kg (136g)." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i > 0 ? `1px solid ${T.red}08` : "none" }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontFamily: T.font }}>{item.text}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: T.textTertiary, lineHeight: 1.5, fontFamily: T.font }}>
        Historically, when your HRV drops below 45ms for 2+ days, your NP drops 8-14% on comparable efforts for 3-5 days. Z1/Z2 only until HRV rebounds above 55ms.
      </div>
    </div>
  </div>
);

// ── MAIN DEMO — Toggle between states ──
export default function TodayCardDemo() {
  const [mode, setMode] = useState("planned");

  const modes = [
    { key: "planned", label: "🟢 With Planned Workout", desc: "Coach or plan loaded" },
    { key: "recommend", label: "🟢 No Plan — AI Recommends", desc: "AIM suggests workouts" },
    { key: "red", label: "🔴 Recovery Day", desc: "Low readiness" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, padding: "32px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Mode switcher */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: "-0.02em" }}>
            AIM — Today's Card
          </h1>
          <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 16 }}>
            The card adapts automatically based on whether a workout is planned and the athlete's readiness score.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {modes.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  padding: "8px 16px",
                  borderRadius: T.radiusSm,
                  border: `1px solid ${mode === m.key ? T.borderStrong : T.border}`,
                  background: mode === m.key ? T.white : "transparent",
                  boxShadow: mode === m.key ? T.shadow : "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.label}</div>
                <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card display */}
        <div key={mode} style={{ animation: "fadeIn 0.3s ease" }}>
          {mode === "planned" && <PlannedWorkoutCard />}
          {mode === "recommend" && <AIRecommendationCard />}
          {mode === "red" && <RedDayCard />}
        </div>
      </div>
    </div>
  );
}

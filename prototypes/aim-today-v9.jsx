import { useState } from "react";

const T = {
  bg: "#f8f8fa", surface: "#f0f0f3", white: "#ffffff",
  text: "#1a1a2e", textSoft: "#6b7280", textDim: "#9ca3af",
  accent: "#10b981", accentDim: "rgba(16,185,129,0.08)", accentDark: "#059669",
  green: "#10b981", yellow: "#f59e0b", red: "#ef4444",
  blue: "#3b82f6", purple: "#8b5cf6", orange: "#f97316",
  border: "rgba(0,0,0,0.08)", borderHover: "rgba(0,0,0,0.15)",
  radius: 16, radiusSm: 10, radiusFull: 9999,
  font: "'DM Sans', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

// ════════════════════════════════════════
// READINESS RING
// ════════════════════════════════════════
const ReadinessRing = ({ score, size = 88 }) => {
  const stroke = 6, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  const color = score >= 75 ? T.green : score >= 55 ? T.yellow : T.red;
  const label = score >= 75 ? "Go" : score >= 55 ? "Moderate" : "Rest";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surface} strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: T.fontMono, fontSize: size > 60 ? 28 : 18, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
};

// ════════════════════════════════════════
// CONTEXT PILL
// ════════════════════════════════════════
const ContextPill = ({ icon, label, sub, color = T.text }) => (
  <div style={{ flex: 1, padding: "10px 12px", borderRadius: T.radiusSm, background: T.white, border: `1px solid ${T.border}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 700, color }}>{label}</span>
    </div>
    <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.3 }}>{sub}</div>
  </div>
);

// ════════════════════════════════════════
// VITAL STAT
// ════════════════════════════════════════
const VitalStat = ({ label, value, unit, trend, trendColor }) => (
  <div style={{ flex: 1, textAlign: "center" }}>
    <div style={{ fontSize: 9, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
    <div style={{ fontFamily: T.fontMono, fontSize: 17, fontWeight: 700, color: T.text }}>
      {value}<span style={{ fontSize: 10, color: T.textDim, fontWeight: 400 }}>{unit}</span>
    </div>
    {trend && <div style={{ fontSize: 9, fontWeight: 600, color: trendColor || T.textDim, marginTop: 1 }}>{trend}</div>}
  </div>
);

// ════════════════════════════════════════
// PREP REC (collapsible — title only at rest)
// ════════════════════════════════════════
const PrepRec = ({ rec }) => {
  const [open, setOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
      <div onClick={() => { setOpen(!open); if (open) setEvidenceOpen(false); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: 14 }}>{rec.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.35 }}>{rec.title}</span>
        </div>
        <svg width={12} height={12} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 8, marginLeft: 22, animation: "fadeIn 0.15s ease" }}>
          <div style={{ padding: "6px 10px", borderRadius: T.radiusSm, background: `${T.accent}06`, borderLeft: `3px solid ${T.accent}`, fontSize: 12, color: T.text, lineHeight: 1.55, fontWeight: 500 }}>
            {rec.action}
          </div>
          {rec.evidence && (
            <>
              <div onClick={(e) => { e.stopPropagation(); setEvidenceOpen(!evidenceOpen); }} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 6, cursor: "pointer" }}>
                <span style={{ fontSize: 11, color: T.accent, fontWeight: 500 }}>{evidenceOpen ? "Hide evidence" : "Show evidence"}</span>
                <svg width={10} height={10} style={{ transform: evidenceOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                  <polyline points="2,3 5,6 8,3" fill="none" stroke={T.accent} strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              </div>
              {evidenceOpen && (
                <div style={{ marginTop: 6, animation: "fadeIn 0.15s ease" }}>
                  <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>{rec.evidence}</p>
                  {rec.pills && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                      {rec.pills.map((p, i) => (
                        <div key={i} style={{ padding: "4px 8px", borderRadius: T.radiusSm, background: T.surface }}>
                          <div style={{ fontFamily: T.fontMono, fontSize: 11, fontWeight: 700, color: T.text }}>{p.value}</div>
                          <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════
// COLLAPSED MORNING
// ════════════════════════════════════════
const CollapsedMorning = ({ onExpand }) => (
  <div onClick={onExpand} style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "12px 16px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <ReadinessRing score={82} size={36} />
      <span style={{ fontSize: 12, color: T.textSoft }}>This morning: readiness 82, HRV 110ms (top quartile), 6h03m sleep. Cleared for sweet spot.</span>
    </div>
    <svg width={12} height={12}><polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" /></svg>
  </div>
);


// ════════════════════════════════════════
// PAGE
// ════════════════════════════════════════
export default function TodayPage() {
  const [mode, setMode] = useState("morning");
  const [morningExpanded, setMorningExpanded] = useState(false);
  const [hasPlannedWorkout, setHasPlannedWorkout] = useState(true);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionReady, setPrescriptionReady] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(248,248,250,0.92)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: T.white, fontSize: 13, fontWeight: 700 }}>A</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.text, letterSpacing: "-0.02em" }}>AIM</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {["Today", "Performance", "Health Lab", "Connect"].map((item, i) => (
              <button key={item} style={{
                padding: "6px 14px", borderRadius: T.radiusFull, border: "none",
                background: i === 0 ? T.accentDim : "transparent",
                color: i === 0 ? T.accentDark : T.textSoft,
                fontSize: 13, fontWeight: i === 0 ? 600 : 500, cursor: "pointer", fontFamily: T.font,
              }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: T.radiusFull, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontSize: 11, fontWeight: 700 }}>KF</div>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 28px" }}>

        {/* MODE TOGGLE (prototype only) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, padding: "3px", background: T.surface, borderRadius: T.radiusFull }}>
            {["morning", "postRide"].map(m => (
              <button key={m} onClick={() => { setMode(m); setMorningExpanded(false); }} style={{
                padding: "5px 14px", borderRadius: T.radiusFull, border: "none",
                background: mode === m ? T.white : "transparent", color: mode === m ? T.text : T.textDim,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.font,
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>{m === "morning" ? "Morning" : "Post-Ride"}</button>
            ))}
          </div>
          {mode === "morning" && (
            <div style={{ display: "flex", gap: 4, padding: "3px", background: T.surface, borderRadius: T.radiusFull }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => { setHasPlannedWorkout(v); setPrescriptionReady(false); }} style={{
                  padding: "5px 12px", borderRadius: T.radiusFull, border: "none",
                  background: hasPlannedWorkout === v ? T.white : "transparent", color: hasPlannedWorkout === v ? T.text : T.textDim,
                  fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: T.font,
                  boxShadow: hasPlannedWorkout === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}>{v ? "Planned Workout" : "No Plan"}</button>
              ))}
            </div>
          )}
        </div>

        {/* HEADER */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: T.textDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Friday, March 6</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-0.02em", marginTop: 2 }}>
            {mode === "morning" ? "Good morning, Kristen" : "Good evening, Kristen"}
          </h1>
        </div>


        {/* ═══════════════════════════════════════ */}
        {/* MORNING MODE                           */}
        {/* ═══════════════════════════════════════ */}
        {mode === "morning" && (
          <>
            {/* HERO: Readiness + Context */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <ReadinessRing score={82} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <ContextPill icon="😴" label="6h03m" sub="3rd night below your 7h goal — but deep sleep was +33%" color={T.yellow} />
                  <ContextPill icon="🔴" label="Day 22" sub="Late luteal — same watts feel 1-2 RPE harder" color={T.purple} />
                  <ContextPill icon="☀️" label="21°C" sub="Clear skies, 17 km/h — 12°C above your breakpoint" color={T.blue} />
                </div>
              </div>
            </div>

            {/* AI BRIEFING */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <span style={{ color: T.white, fontSize: 10, fontWeight: 700 }}>✦</span>
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontWeight: 500 }}>
                  Green light for today's sweet spot session. HRV at 110ms (top quartile) and recovery looks good after yesterday's rest day. Two things to account for: it's 21°C (expect ~5% EF reduction above your 9°C breakpoint), and you're on day 22 (late luteal — same power will feel 1-2 RPE harder). Adjust expectations, not effort.
                </p>
              </div>
            </div>

            {/* ═══════════════════════════════════ */}
            {/* TODAY'S PLAN — the intelligence hub */}
            {/* ═══════════════════════════════════ */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "16px 18px", marginBottom: 12 }}>

              {hasPlannedWorkout ? (
                <>
                  {/* PLANNED WORKOUT */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1 }}>Today's Workout</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Sweet Spot 3×15'</div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>1h 45m · 262-277W · ~90 TSS</div>
                    </div>
                    <div style={{ padding: "4px 10px", borderRadius: T.radiusFull, background: `${T.accent}10`, color: T.accentDark, fontSize: 10, fontWeight: 600 }}>Coach Martinez</div>
                  </div>

                  <div style={{ padding: "10px 12px", borderRadius: T.radiusSm, background: T.surface, fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: 14, fontFamily: T.fontMono }}>
                    15' warmup → 3 × 15' @ 262-277W / 5' recovery → 10' cooldown
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Pre-Ride Prep</div>

                  <PrepRec rec={{
                    icon: "🍎", title: "Pre-ride meal: 200g carbs, 30g protein, 20g fat — 2-3 hours before",
                    action: "You're forecasted to burn ~480g of carbs during today's session. A solid pre-ride meal loaded with carbs ensures full glycogen stores before the first interval. Eat by 8 AM if riding at 10.",
                    evidence: "Your sweet spot sessions average 4.1 kJ/min, totaling ~430 kJ/hr over 1h45m. Fed sessions hit 94% of target power vs 86% fasted. The pre-ride meal is worth 8% better execution.",
                    pills: [{ value: "~480g", label: "Carbs burned" }, { value: "94%", label: "Fed execution" }, { value: "86%", label: "Fasted execution" }],
                  }} />

                  <PrepRec rec={{
                    icon: "💧", title: "Extra 500ml with sodium — you woke up 2% dehydrated",
                    action: "Withings shows 63.2% body water this morning — below your 65% baseline. On rides starting under-hydrated, cardiac drift doubles. Add 500ml with electrolytes 2 hours before.",
                    evidence: "Across 12 hydration-matched rides, starting below 65% body water correlates with 2.5× higher HR drift. Today's 21°C heat compounds the effect.",
                    pills: [{ value: "63.2%", label: "Hydration" }, { value: "65%", label: "Baseline" }, { value: "7.8%", label: "Drift dehydrated" }, { value: "3.1%", label: "Drift hydrated" }],
                  }} />

                  <PrepRec rec={{
                    icon: "🌡️", title: "Reduce power targets 3-5% — it's 12°C above your breakpoint",
                    action: "At 21°C, your heat model predicts ~5% EF reduction. Adjust sweet spot to 249-268W instead of 262-277W. Same stimulus, realistic targets.",
                    evidence: "Your heat model (92 rides) shows EF decreases 0.004/°C above 9°C breakpoint. At 21°C = ~4.8% efficiency loss.",
                    pills: [{ value: "9°C", label: "Breakpoint" }, { value: "21°C", label: "Today" }, { value: "-4.8%", label: "EF loss" }, { value: "249-268W", label: "Adjusted" }],
                  }} />

                  <PrepRec rec={{
                    icon: "🔴", title: "Late luteal — same power feels 1-2 RPE harder",
                    action: "Day 22 of your cycle. If 255W feels like threshold, it IS threshold right now. Trust RPE over power. Schedule your next FTP test in days 5-12.",
                    evidence: "Follicular sweet spot: 3.2% HR drift. Luteal: 5.8%. Core temp +0.4°C in luteal compounds with today's heat. Effective FTP is ~10-12W lower.",
                    pills: [{ value: "3.2%", label: "Follicular drift" }, { value: "5.8%", label: "Luteal drift" }, { value: "~10-12W", label: "FTP reduction" }],
                  }} />

                  <PrepRec rec={{
                    icon: "⚡", title: "Fuel 90g/hr — you're working toward 80g/hr and your fade data backs it",
                    action: "Power fades 6.2% at ≤70g/hr, just 1.8% at 75g+. You're averaging 72g/hr — push to 90 today. One gel every 20 min plus carb drink.",
                    evidence: "Carbs/hr correlates r=-0.68 with fade. Your working goal is 80g/hr — today's a chance to overshoot it.",
                    pills: [{ value: "6.2%", label: "Fade ≤70g" }, { value: "1.8%", label: "Fade 75g+" }, { value: "72g/hr", label: "Your avg" }, { value: "80g/hr", label: "Your goal" }],
                  }} />

                  <PrepRec rec={{
                    icon: "💚", title: "Recovery is strong — push the efforts if you feel good",
                    action: "HRV 110ms (top quartile) + rest day gives you an 8.4ppt cardiac boost. If the first interval feels controlled, don't hold back on reps 2 and 3.",
                    evidence: "After a rest day, HR drift flips from -4.4% to +4.0%. Push within the heat-adjusted targets.",
                    pills: [{ value: "110ms", label: "HRV" }, { value: "+8.4", label: "Rest boost (ppts)" }, { value: "Top 25%", label: "Quartile" }],
                  }} />
                </>
              ) : (
                <>
                  {/* NO PLANNED WORKOUT — Get Recommendation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1 }}>Today's Workout</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>No plan scheduled</div>
                    </div>
                  </div>

                  {!prescriptionReady ? (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <p style={{ fontSize: 12, color: T.textSoft, marginBottom: 14 }}>
                        Get an AI-generated workout based on your power profile, recovery state, training load, and today's conditions.
                      </p>
                      <button
                        onClick={() => { setPrescriptionLoading(true); setTimeout(() => { setPrescriptionLoading(false); setPrescriptionReady(true); }, 2000); }}
                        style={{
                          padding: "10px 24px", borderRadius: T.radiusFull, border: "none",
                          background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white,
                          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font,
                          opacity: prescriptionLoading ? 0.7 : 1,
                        }}
                      >
                        {prescriptionLoading ? "Analyzing..." : "⊙ Get Workout"}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* AI-PRESCRIBED WORKOUT (appears after clicking) */}
                      <div style={{ padding: "10px 14px", borderRadius: T.radiusSm, background: `${T.accent}06`, borderLeft: `3px solid ${T.accent}`, marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: T.white, fontSize: 8, fontWeight: 700 }}>✦</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>AIM Recommendation</span>
                        </div>
                        <p style={{ fontSize: 12, color: T.text, lineHeight: 1.55, fontWeight: 500 }}>
                          Based on your recovery (HRV 110ms, top quartile), training load (555 TSS this week, down from 1,228), and today's conditions (21°C, late luteal), AIM recommends:
                        </p>
                      </div>

                      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 2 }}>Z2 Endurance with Cadence Work</div>
                      <div style={{ fontSize: 11, color: T.textDim, marginBottom: 10 }}>2h 00m · 180-200W · ~100 TSS</div>
                      <div style={{ padding: "10px 12px", borderRadius: T.radiusSm, background: T.surface, fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: 14, fontFamily: T.fontMono }}>
                        15' warmup → 80' Z2 @ 180-200W (include 4×5' high cadence @ 100+ rpm) → 10' cooldown
                      </div>
                    </>
                  )}

                  {/* General prep recs (show regardless of prescription) */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, marginTop: 4 }}>Today's Prep</div>

                  <PrepRec rec={{
                    icon: "💧", title: "Extra 500ml with sodium — you woke up 2% dehydrated",
                    action: "Withings shows 63.2% body water — below your 65% baseline. Cardiac drift doubles when you start dehydrated. Add 500ml with electrolytes 2 hours before riding.",
                    evidence: "Across 12 hydration-matched rides, starting below 65% correlates with 2.5× higher HR drift. Today's 21°C compounds the effect.",
                    pills: [{ value: "63.2%", label: "Hydration" }, { value: "65%", label: "Baseline" }, { value: "2.5×", label: "Drift increase" }],
                  }} />

                  <PrepRec rec={{
                    icon: "🌡️", title: "21°C is 12°C above your breakpoint — hydrate proactively",
                    action: "Expect ~5% EF reduction vs cool conditions. Increase sodium to 500mg/hr and increase fluid intake. If doing intensity, reduce power targets 3-5%.",
                    evidence: "Your heat model (92 rides) shows 0.004 EF loss per °C above your 9°C breakpoint.",
                    pills: [{ value: "9°C", label: "Breakpoint" }, { value: "21°C", label: "Today" }, { value: "~5%", label: "EF loss" }],
                  }} />

                  <PrepRec rec={{
                    icon: "🔴", title: "Late luteal — same watts feel 1-2 RPE harder today",
                    action: "Day 22. If you ride, trust RPE over power. Your effective FTP is ~10-12W lower. Don't force numbers — the training stimulus is the same even at lower absolute power.",
                    pills: [{ value: "Day 22", label: "Cycle day" }, { value: "~10-12W", label: "FTP reduction" }],
                  }} />

                  <PrepRec rec={{
                    icon: "🛏️", title: "Lights out by 9:30 — you're working toward 7+ hours and tonight is your 3rd miss",
                    action: "Your goal is 7+ hours nightly — you're at 6.4h avg. 3 consecutive nights under 7h is the threshold where NP drops 8-12%. Eight Sleep at -3°C.",
                    pills: [{ value: "6.4h", label: "Current avg" }, { value: "7.0h", label: "Goal" }, { value: "3 nights", label: "Streak" }],
                  }} />
                </>
              )}
            </div>

            {/* VITALS STRIP */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "12px 6px", marginBottom: 12, display: "flex" }}>
              <VitalStat label="HRV" value="110" unit="ms" trend="Top quartile" trendColor={T.green} />
              <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
              <VitalStat label="RHR" value="47.5" unit="bpm" trend="-2 vs avg" trendColor={T.green} />
              <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
              <VitalStat label="Sleep" value="6h03" unit="" trend="Below target" trendColor={T.yellow} />
              <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
              <VitalStat label="Deep" value="90" unit="min" trend="+33%" trendColor={T.green} />
            </div>

            {/* THIS WEEK */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>This Week</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {[
                  { day: "M", tss: 134 }, { day: "T", tss: 0 }, { day: "W", tss: 253 },
                  { day: "T", tss: 168 }, { day: "F", tss: 0 },
                  { day: "S", tss: null, today: true }, { day: "S", tss: null },
                ].map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: d.today ? T.accent : T.textDim, marginBottom: 3 }}>{d.day}</div>
                    <div style={{
                      height: 28, borderRadius: 4,
                      background: d.tss > 0 ? `${T.accent}${Math.min(Math.round((d.tss / 300) * 80) + 15, 95)}` : d.today ? `${T.accent}10` : T.surface,
                      display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2,
                      border: d.today ? `1.5px solid ${T.accent}` : "none",
                    }}>
                      {d.tss > 0 && <span style={{ fontFamily: T.fontMono, fontSize: 8, fontWeight: 600, color: T.text }}>{d.tss}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.textDim }}>Week: <span style={{ fontFamily: T.fontMono, fontWeight: 700, color: T.text }}>555 TSS</span> + today's ~90</span>
                <span style={{ fontSize: 11, color: T.textDim }}>Last week: <span style={{ fontFamily: T.fontMono, fontWeight: 600, color: T.text }}>1,228</span></span>
              </div>
            </div>

          </>
        )}


        {/* ═══════════════════════════════════════ */}
        {/* POST-RIDE MODE                         */}
        {/* ═══════════════════════════════════════ */}
        {mode === "postRide" && (
          <>
            {/* COLLAPSED MORNING */}
            {!morningExpanded ? (
              <CollapsedMorning onExpand={() => setMorningExpanded(true)} />
            ) : (
              <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ReadinessRing score={82} size={52} />
                  <div style={{ flex: 1, fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                    Morning readiness 82 (green). HRV 110ms (top quartile), RHR 47.5. Sleep 6h03m, 90 min deep (+33%). Day 22 late luteal. 21°C clear.
                  </div>
                </div>
                <div onClick={() => setMorningExpanded(false)} style={{ textAlign: "center", marginTop: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: T.textDim }}>Collapse ▴</span>
                </div>
              </div>
            )}

            {/* RIDE SUMMARY */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1 }}>Today's Ride</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Saturday Sweet Spot</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>2h 12m · 72.4 km · 620m climbing</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: T.fontMono, fontSize: 22, fontWeight: 700, color: T.text }}>187<span style={{ fontSize: 12, color: T.textDim }}>TSS</span></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { label: "NP", value: "241W" }, { label: "Avg HR", value: "152" },
                  { label: "EF", value: "1.59", color: T.green }, { label: "Drift", value: "3.1%", color: T.green },
                  { label: "Carbs", value: "76g/hr", color: T.green },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, padding: "7px 5px", borderRadius: T.radiusSm, background: T.surface, textAlign: "center" }}>
                    <div style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 700, color: m.color || T.text }}>{m.value}</div>
                    <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase", marginTop: 1 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* POST-RIDE AI BRIEFING */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <span style={{ color: T.white, fontSize: 10, fontWeight: 700 }}>✦</span>
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontWeight: 500 }}>
                  Strong ride. NP 241W at 152bpm gives EF 1.59 — right at your 90-day average despite heat and late luteal phase. Drift at 3.1% is your best this month for this duration. You fueled well at 76g/hr — above your 75g/hr threshold. Compared to your most similar ride (Feb 18): drift improved from 5.8% to 3.1%. The Z2 volume and fueling consistency are both paying off.
                </p>
              </div>
            </div>

            {/* POST-RIDE RECOVERY — the intelligence hub */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Recovery Focus</div>

              <PrepRec rec={{
                icon: "🍎", title: "30g protein + 60g carbs within 30 minutes",
                action: "Your glycogen stores are depleted after 187 TSS. A recovery shake or meal with 30g protein and 60g carbs in the next 30 minutes accelerates muscle repair and glycogen resynthesis by ~50%.",
              }} />

              <PrepRec rec={{
                icon: "💧", title: "Drink 2L before bed — you're likely 1.5-2% dehydrated",
                action: "At 21°C and 2h12m, you lost approximately 1.5-2L of sweat. Your Withings will confirm tomorrow morning, but pre-emptive rehydration tonight prevents the compounding effect on tomorrow's HRV.",
                evidence: "Your data shows that post-ride dehydration correlates with 8-12ms lower HRV the next morning. Rehydrating before bed recovers ~70% of that by morning.",
                pills: [{ value: "~1.8L", label: "Est. sweat loss" }, { value: "8-12ms", label: "HRV impact if dehydrated" }],
              }} />

              <PrepRec rec={{
                icon: "🛏️", title: "Lights out by 9:30 PM — you're working toward 7+ hours and tonight is your 3rd miss",
                action: "Your goal is averaging 7+ hours nightly — you're at 6.4h and this is your 3rd consecutive night under 7. Your model shows the NP drop kicks in now. Eight Sleep at -3°C for maximum deep sleep. This is the most important thing you do tonight.",
                evidence: "Your optimal bedtime window is 9:30-10:15 PM (25 more minutes of deep sleep vs after 11 PM). After a solid training week, sleep is where adaptation happens. 3+ nights under 7h correlates with 8-12% NP drop.",
                pills: [{ value: "3 nights", label: "Streak <7h" }, { value: "6.4h", label: "Current avg" }, { value: "7.0h", label: "Your goal" }, { value: "-3°C", label: "Eight Sleep" }],
              }} />

              <PrepRec rec={{
                icon: "🚴", title: "Tomorrow: Z2 endurance only — 2-3 hours, IF 0.60-0.65",
                action: "Your week is at 742 TSS with today's ride. A Z2 ride tomorrow (100-120 TSS) puts you at 850-860 — perfectly in your post-block recovery range. No intervals. Let the aerobic system absorb this week's work.",
                evidence: "Historically after 1,228+ TSS weeks, you drop to 550-830 the following week. You're at 742 with Sunday left. The body is absorbing well — don't overload it with intensity.",
                pills: [{ value: "742", label: "Week TSS" }, { value: "100-120", label: "Tomorrow target" }, { value: "Z2 only", label: "Intensity" }],
              }} />
            </div>

            {/* UPDATED WEEK */}
            <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>This Week</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {[
                  { day: "M", tss: 134 }, { day: "T", tss: 0 }, { day: "W", tss: 253 },
                  { day: "T", tss: 168 }, { day: "F", tss: 0 },
                  { day: "S", tss: 187, today: true }, { day: "S", tss: null },
                ].map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: d.today ? T.accent : T.textDim, marginBottom: 3 }}>{d.day}</div>
                    <div style={{
                      height: 28, borderRadius: 4,
                      background: d.tss > 0 ? `${T.accent}${Math.min(Math.round((d.tss / 300) * 80) + 15, 95)}` : T.surface,
                      display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2,
                      border: d.today ? `1.5px solid ${T.accent}` : "none",
                    }}>
                      {d.tss > 0 && <span style={{ fontFamily: T.fontMono, fontSize: 8, fontWeight: 600, color: T.text }}>{d.tss}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.textDim }}>Week: <span style={{ fontFamily: T.fontMono, fontWeight: 700, color: T.text }}>742 TSS</span></span>
                <span style={{ fontSize: 11, color: T.textDim }}>Sunday: ~100-120 TSS (Z2)</span>
              </div>
            </div>

          </>
        )}


        {/* ASK CLAUDE */}
        <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface, cursor: "text" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: T.white, fontSize: 9 }}>✦</span>
            </div>
            <span style={{ fontSize: 12, color: T.textDim }}>
              {mode === "morning" ? "Should I adjust the warmup given the heat?" : "How should I structure tomorrow's Z2 ride?"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

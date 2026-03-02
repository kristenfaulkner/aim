import { useState } from "react";

const T = {
  bg: "#f8f8fa", white: "#ffffff", surfaceHover: "#f2f2f5",
  text: "#1a1a2e", textSecondary: "#6b6b80", textTertiary: "#9d9db0", textInverse: "#ffffff",
  accent: "#10b981", accentSoft: "rgba(16, 185, 129, 0.08)", accentDark: "#059669",
  green: "#10b981", greenSoft: "rgba(16, 185, 129, 0.08)",
  yellow: "#f59e0b", yellowSoft: "rgba(245, 158, 11, 0.08)",
  red: "#ef4444", redSoft: "rgba(239, 68, 68, 0.08)",
  blue: "#3b82f6", blueSoft: "rgba(59, 130, 246, 0.08)",
  purple: "#8b5cf6", purpleSoft: "rgba(139, 92, 246, 0.08)",
  orange: "#f97316", orangeSoft: "rgba(249, 115, 22, 0.08)",
  border: "rgba(0,0,0,0.06)", borderStrong: "rgba(0,0,0,0.1)",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  radius: 12, radiusSm: 8, radiusFull: 9999,
  font: "'DM Sans', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

const Sparkline = ({ data, color = T.accent, height = 28, width = 80, target = null }) => {
  const max = Math.max(...data, target || 0) * 1.05;
  const min = Math.min(...data) * 0.95;
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const targetY = target ? height - ((target - min) / range) * (height - 4) - 2 : null;
  const lastX = ((data.length - 1) / (data.length - 1)) * width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {target && <line x1={0} y1={targetY} x2={width} y2={targetY} stroke={color} strokeWidth={1} strokeDasharray="3,3" opacity={0.25} />}
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
};

const ProgressBar = ({ current, start, target, color = T.accent }) => {
  const progress = target !== start ? ((current - start) / (target - start)) * 100 : 0;
  const pct = Math.min(Math.max(progress, 0), 100);
  return (
    <div style={{ position: "relative", height: 5, borderRadius: 3, background: `${color}12` }}>
      <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pct}%`, transition: "width 0.8s ease" }} />
    </div>
  );
};

const CheckItem = ({ done, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
    <div style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      border: `1.5px solid ${done ? T.accent : T.border}`,
      background: done ? T.accent : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s ease",
    }}>
      {done && <svg width={10} height={10}><polyline points="2,5 4.5,8 8,3" fill="none" stroke={T.textInverse} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
    <span style={{
      fontSize: 12, color: done ? T.textTertiary : T.text, fontFamily: T.font,
      textDecoration: done ? "line-through" : "none",
      opacity: done ? 0.7 : 1,
    }}>
      {label}
    </span>
  </div>
);

// ── GOAL DATA ──
const goals = [
  {
    id: "vo2",
    icon: "🚀",
    color: T.red,
    title: "Raise VO₂max ceiling",
    status: "on_track",
    startedAt: "Jan 6, 2026",
    // METRIC
    metric: { label: "5-min power (90-day best)", current: 351, start: 328, target: 380, unit: "W" },
    trend: [328, 330, 335, 340, 338, 345, 351],
    trendLabel: "+23W in 8 weeks",
    // WHY IT MATTERS
    whyItMatters: "Your 5-min to 20-min power ratio is 1.05 — well below the optimal 1.20-1.25. This means your VO₂max ceiling is capping your FTP. Raising 5-min power from 351W to 380W should unlock 15-20W at threshold without any other changes. That's the difference between dropping the group on a 6-min climb and getting dropped yourself.",
    // HOW WE'RE FIXING IT
    actionPlan: [
      { label: "1× weekly Classic 5×5' at 105-110% FTP (305-320W)", frequency: "weekly", type: "workout" },
      { label: "1× weekly 30/30s (30s hard / 30s easy × 20) at 115-120% FTP", frequency: "weekly", type: "workout" },
      { label: "Prioritize sleep >6.5h the night before VO₂ sessions", frequency: "ongoing", type: "recovery" },
      { label: "Caffeine 200mg 45 min before VO₂ sessions", frequency: "per_session", type: "supplement" },
    ],
    thisWeek: [
      { label: "Classic 5×5' VO₂max session", done: true },
      { label: "30/30s repeatability session", done: false },
      { label: "Sleep >6.5h night before intensity", done: true },
    ],
    // AI OBSERVATION
    aiNote: "Your 5-min power jumped 6W after last week's 30/30s — the repeatability format seems to work better for you than the classic 5×5'. Consider making 30/30s your primary VO₂ format and 5×5' secondary.",
  },
  {
    id: "lr",
    icon: "⚖️",
    color: T.orange,
    title: "Fix L/R imbalance under fatigue",
    status: "on_track",
    startedAt: "Jan 20, 2026",
    metric: { label: "L/R balance after 2 hours", current: 53.2, start: 55.1, target: 51.0, unit: "% L" },
    trend: [55.1, 54.8, 54.2, 54.0, 53.5, 53.8, 53.2],
    trendLabel: "−1.9% drift in 6 weeks",
    whyItMatters: "Your left leg dominates by 4% after hour 2, and it's getting worse as rides get longer — reaching 54/46 by hour 5. This asymmetry wastes 3-5% of your power output (that's 6-10W at your NP) and increases overuse injury risk in your left knee, hip, and IT band. Riders who fix this imbalance typically gain 8-15W at the same effort level on long rides. It also explains the left knee discomfort you've noted after 3 of your last 5 long rides.",
    actionPlan: [
      { label: "Single-leg drills: 3×30s each leg during warmup", frequency: "every_ride", type: "workout" },
      { label: "Glute activation: clamshells + bridges 3×/week", frequency: "3x_week", type: "strength" },
      { label: "Schedule bike fit consult to check cleat alignment", frequency: "once", type: "equipment" },
      { label: "Foam roll left glute/piriformis after every ride >2hr", frequency: "post_ride", type: "recovery" },
    ],
    thisWeek: [
      { label: "Single-leg drills 3× this week", done: true },
      { label: "Glute activation session (Mon)", done: true },
      { label: "Glute activation session (Wed)", done: true },
      { label: "Glute activation session (Fri)", done: false },
      { label: "Book bike fit appointment", done: false },
    ],
    aiNote: "Your L/R imbalance is worst on climbs >6% grade — it shifts from 52/48 on flats to 54/46 on climbs. This points to left glute weakness under high torque. The clamshell/bridge work is helping (53.2% down from 55.1%), but adding standing single-leg deadlifts would target the specific movement pattern.",
  },
  {
    id: "sleep",
    icon: "😴",
    color: T.purple,
    title: "Improve deep sleep consistency",
    status: "ahead",
    startedAt: "Jan 27, 2026",
    metric: { label: "7-day avg deep sleep", current: 68, start: 42, target: 75, unit: "min" },
    trend: [42, 48, 51, 55, 60, 58, 65, 63, 72, 68],
    trendLabel: "+26 min avg in 5 weeks",
    whyItMatters: "Deep sleep is when your body releases 75% of its daily growth hormone — the primary driver of muscle repair and adaptation. Your best endurance performances (top 10% by EF) all follow nights with >70 min deep sleep. When deep sleep drops below 45 min, your next-day NP drops 8-12% at the same RPE and your HRV averages 15ms lower. Fixing sleep is the single highest-ROI change you can make right now — it amplifies everything else.",
    actionPlan: [
      { label: "Lights-out by 10:00 PM at least 5 nights/week", frequency: "daily", type: "habit" },
      { label: "No screens after 9:15 PM (read, stretch, or journal instead)", frequency: "daily", type: "habit" },
      { label: "EightSleep bed temp set to -4°C (your deep sleep sweet spot)", frequency: "daily", type: "environment" },
      { label: "Magnesium glycinate 400mg at 9:00 PM", frequency: "daily", type: "supplement" },
      { label: "No caffeine after 1:00 PM", frequency: "daily", type: "habit" },
    ],
    thisWeek: [
      { label: "Lights-out by 10pm (Mon)", done: true },
      { label: "Lights-out by 10pm (Tue)", done: true },
      { label: "Lights-out by 10pm (Wed)", done: true },
      { label: "Lights-out by 10pm (Thu)", done: true },
      { label: "Lights-out by 10pm (Fri)", done: false },
      { label: "No caffeine after 1pm all week", done: true },
    ],
    aiNote: "You've hit 4 consecutive nights with lights-out before 10pm — your best streak. Those 4 nights averaged 74 min deep sleep vs 51 min on late nights. The EightSleep at -4°C is also working: your deep sleep is 34% higher at this setting vs the default. Keep this routine locked in.",
  },
];

const suggestedGoals = [
  {
    id: "heat",
    icon: "🌡️",
    color: T.orange,
    title: "Build heat adaptation",
    whyItMatters: "Your cardiac drift doubles above 28°C (2.96% → 6-8%). Your target races in July will be 30°C+. Without adaptation, you're leaving 20-30W on the table on race day.",
    howToFix: "2× weekly sauna (15 min, building to 20), pre-ride hyperhydration on hot days, one outdoor ride per week in midday heat",
    metric: "Cardiac drift at >25°C",
  },
  {
    id: "endurance",
    icon: "⏱️",
    color: T.blue,
    title: "Extend endurance ceiling",
    whyItMatters: "Your 60-min power is only 74.8% of your 20-min best. Competitive athletes are >80%. This is why you fade in hours 5-7 of long events.",
    howToFix: "2-3 hour tempo rides at 75-85% FTP, progressive long ride duration (+15 min/week), race-pace fueling practice",
    metric: "60-min / 20-min power ratio",
  },
  {
    id: "fueling",
    icon: "🍌",
    color: T.yellow,
    title: "Train gut for 90g carbs/hour",
    whyItMatters: "You average 65g carbs/hr but your 7-hour rides demand 80-90g/hr. Under-fueling costs 5-8% power in the final 2 hours and accelerates muscle protein breakdown.",
    howToFix: "Increase by 10g/hr each week during training rides, practice with race-day products, train with full fueling even on easy rides",
    metric: "Tolerated carbs per hour without GI distress",
  },
];

// ── STATUS BADGE ──
const StatusBadge = ({ status }) => {
  const config = {
    on_track: { label: "On Track", color: T.accent },
    ahead: { label: "Ahead of Plan", color: T.blue },
    behind: { label: "Needs Attention", color: T.yellow },
    stalled: { label: "Stalled", color: T.red },
  };
  const c = config[status];
  return (
    <span style={{
      padding: "2px 8px", borderRadius: T.radiusFull,
      background: `${c.color}10`, color: c.color,
      fontSize: 10, fontWeight: 600, fontFamily: T.font,
    }}>
      {c.label}
    </span>
  );
};

// ── GOAL CARD ──
const GoalCard = ({ goal, expanded, onToggle }) => {
  const [activeSection, setActiveSection] = useState("plan");
  const progressPct = goal.metric.target !== goal.metric.start
    ? Math.round(((goal.metric.current - goal.metric.start) / (goal.metric.target - goal.metric.start)) * 100)
    : 0;

  return (
    <div style={{
      borderRadius: T.radius, border: `1px solid ${expanded ? goal.color + "25" : T.border}`,
      background: T.white, overflow: "hidden", transition: "all 0.2s ease", marginBottom: 10,
      boxShadow: expanded ? `0 2px 12px ${goal.color}08` : "none",
    }}>
      {/* Collapsed header */}
      <div onClick={onToggle} style={{ padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: T.radiusSm, background: `${goal.color}08`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
          }}>
            {goal.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font }}>{goal.title}</span>
              <StatusBadge status={goal.status} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 18, fontWeight: 700, color: T.text }}>
                {goal.metric.current}
              </span>
              <span style={{ fontSize: 12, color: T.textTertiary }}>
                {goal.metric.unit}
              </span>
              <span style={{ fontSize: 12, color: T.textTertiary }}>→</span>
              <span style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 600, color: goal.color }}>
                {goal.metric.target}{goal.metric.unit}
              </span>
              <div style={{ marginLeft: "auto" }}>
                <Sparkline data={goal.trend} color={goal.color} target={goal.metric.target} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ProgressBar current={goal.metric.current} start={goal.metric.start} target={goal.metric.target} color={goal.color} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: goal.color, fontFamily: T.fontMono, flexShrink: 0 }}>
                {progressPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ animation: "fadeIn 0.25s ease" }}>
          {/* Section tabs */}
          <div style={{ display: "flex", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
            {[
              { key: "plan", label: "Action Plan" },
              { key: "why", label: "Why It Matters" },
              { key: "week", label: "This Week" },
            ].map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
                flex: 1, padding: "9px 0", border: "none", background: "none",
                borderBottom: `2px solid ${activeSection === s.key ? goal.color : "transparent"}`,
                color: activeSection === s.key ? T.text : T.textTertiary,
                fontSize: 12, fontWeight: activeSection === s.key ? 600 : 500,
                cursor: "pointer", fontFamily: T.font, transition: "all 0.15s ease",
              }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "14px 16px" }}>
            {/* ACTION PLAN */}
            {activeSection === "plan" && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: goal.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontFamily: T.font }}>
                  How we're fixing this
                </div>
                {goal.actionPlan.map((action, i) => {
                  const typeIcons = { workout: "🏋️", recovery: "🧘", strength: "💪", supplement: "💊", habit: "🔄", environment: "🏠", equipment: "🔧", per_session: "⚡" };
                  const freqLabels = { weekly: "Weekly", "3x_week": "3×/week", daily: "Daily", every_ride: "Every ride", post_ride: "Post-ride", once: "One-time", per_session: "Per session", ongoing: "Ongoing" };
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 10, padding: "10px 12px", marginBottom: 4,
                      borderRadius: T.radiusSm, background: i % 2 === 0 ? T.surfaceHover : "transparent",
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{typeIcons[action.type] || "📌"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontFamily: T.font }}>{action.label}</div>
                        <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 2, fontFamily: T.font }}>
                          {freqLabels[action.frequency] || action.frequency}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* WHY IT MATTERS */}
            {activeSection === "why" && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: goal.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontFamily: T.font }}>
                  Why this matters for your performance
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontFamily: T.font }}>
                  {goal.whyItMatters}
                </p>
                <div style={{
                  marginTop: 14, padding: "10px 12px", borderRadius: T.radiusSm,
                  background: `${goal.color}06`, border: `1px solid ${goal.color}10`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font }}>Tracking:</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font }}>{goal.metric.label}</span>
                </div>
              </div>
            )}

            {/* THIS WEEK */}
            {activeSection === "week" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: goal.color, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: T.font }}>
                    This week's checklist
                  </span>
                  <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.font }}>
                    {goal.thisWeek.filter(t => t.done).length}/{goal.thisWeek.length} done
                  </span>
                </div>
                <div style={{ marginBottom: 14 }}>
                  {goal.thisWeek.map((item, i) => (
                    <CheckItem key={i} done={item.done} label={item.label} />
                  ))}
                </div>
                {/* AI observation */}
                <div style={{
                  padding: "12px 14px", borderRadius: T.radiusSm,
                  background: `${goal.color}05`, border: `1px solid ${goal.color}10`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font }}>✦ AIM observation</span>
                  </div>
                  <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6, fontFamily: T.font }}>
                    {goal.aiNote}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 16px", borderTop: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: T.textTertiary, fontFamily: T.font }}>
              Started {goal.startedAt} · {goal.trendLabel}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{
                padding: "4px 10px", borderRadius: T.radiusFull, border: `1px solid ${T.border}`,
                background: T.white, color: T.textTertiary, fontSize: 10, fontWeight: 500,
                cursor: "pointer", fontFamily: T.font,
              }}>Pause</button>
              <button style={{
                padding: "4px 10px", borderRadius: T.radiusFull, border: `1px solid ${T.border}`,
                background: T.white, color: T.textTertiary, fontSize: 10, fontWeight: 500,
                cursor: "pointer", fontFamily: T.font,
              }}>Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── SUGGESTED GOAL ──
const SuggestedGoalCard = ({ goal, onAdd }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      borderRadius: T.radius, border: `1px dashed ${expanded ? goal.color + "40" : T.border}`,
      background: expanded ? `${goal.color}03` : T.white, overflow: "hidden",
      transition: "all 0.2s ease", marginBottom: 8,
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{goal.icon}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font }}>{goal.title}</span>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2, fontFamily: T.font }}>
              AIM detected this opportunity in your data
            </div>
          </div>
          <svg width={16} height={16} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
            <polyline points="4,6 8,10 12,6" fill="none" stroke={T.textTertiary} strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", animation: "fadeIn 0.2s ease" }}>
          {/* Why it matters */}
          <div style={{
            padding: "12px 14px", borderRadius: T.radiusSm, background: `${goal.color}06`,
            border: `1px solid ${goal.color}10`, marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: goal.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, fontFamily: T.font }}>
              Why this matters
            </div>
            <p style={{ fontSize: 12, color: T.text, lineHeight: 1.6, fontFamily: T.font }}>{goal.whyItMatters}</p>
          </div>
          {/* How we'll fix it */}
          <div style={{ padding: "12px 14px", borderRadius: T.radiusSm, background: T.surfaceHover, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, fontFamily: T.font }}>
              How we'll fix it
            </div>
            <p style={{ fontSize: 12, color: T.text, lineHeight: 1.6, fontFamily: T.font }}>{goal.howToFix}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.font }}>
              Tracking: <strong style={{ color: T.text }}>{goal.metric}</strong>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              style={{
                padding: "7px 18px", borderRadius: T.radiusFull, border: "none",
                background: goal.color, color: T.textInverse, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: T.font, transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.target.style.opacity = 0.9}
              onMouseLeave={e => e.target.style.opacity = 1}
            >
              + Start This Goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── MAIN ──
export default function WorkingGoalsV2() {
  const [expandedGoal, setExpandedGoal] = useState("vo2");
  const [addedGoals, setAddedGoals] = useState([]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, padding: "32px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: "-0.02em" }}>Working Goals</h2>
        <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          This panel sits as a tab in the right-side AI Intelligence panel. Each goal has: what we're tracking, why it matters, how we're fixing it, and this week's progress.
        </p>

        {/* Active goals */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active · {goals.length} goals
            </span>
            <button style={{
              padding: "4px 10px", borderRadius: T.radiusFull, border: `1px solid ${T.border}`,
              background: T.white, color: T.textSecondary, fontSize: 11, fontWeight: 500,
              cursor: "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Add Goal
            </button>
          </div>
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              expanded={expandedGoal === goal.id}
              onToggle={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
            />
          ))}
        </div>

        {/* Suggested */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, padding: "0 2px" }}>
            ✦ Suggested by AIM
          </div>
          {suggestedGoals.filter(g => !addedGoals.includes(g.id)).map(goal => (
            <SuggestedGoalCard
              key={goal.id}
              goal={goal}
              onAdd={() => setAddedGoals([...addedGoals, goal.id])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

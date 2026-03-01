import { useState, useEffect, useRef } from "react";
import { T, font, mono } from "../theme/tokens";
import {
  athlete, ride, computed, benchmarks, athletePowerProfile,
  classifyPower, athleteClassifications, pctToNextLevel,
  workoutPrescriptions, powerZones, weeklyTSS, fitnessHistory, powerCurve,
} from "../data/dashboard";

// ── REUSABLE COMPONENTS ──

function MiniBar({ value, max, color, label, subLabel }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
        <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{subLabel}</span>
      </div>
      <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </div>
  );
}

function Sparkline({ data, width = 120, height = 32, color = T.accent }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const id = `grad-${color.replace("#", "").replace(/[(),.\s]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, unit, trend, trendDir, sparkData, color = T.accent, icon }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: T.text, fontFamily: mono }}>{value}</span>
            {unit && <span style={{ fontSize: 11, color: T.textSoft }}>{unit}</span>}
          </div>
          {trend && (
            <div style={{ fontSize: 10, marginTop: 3, color: trendDir === "up" ? T.accent : trendDir === "down" ? T.danger : T.textSoft }}>
              {trendDir === "up" ? "\u2191" : trendDir === "down" ? "\u2193" : "\u2192"} {trend}
            </div>
          )}
        </div>
        {sparkData && <div style={{ opacity: 0.8, marginTop: 4 }}><Sparkline data={sparkData} color={color} width={90} height={28} /></div>}
      </div>
    </div>
  );
}

// Micro stat row used inside cards
function StatRow({ label, value, unit, color, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: color || T.text, fontFamily: mono }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: T.textDim, marginLeft: 3 }}>{unit}</span>}
        {sub && <div style={{ fontSize: 9, color: T.textDim }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── POWER PROFILE RADAR ──
function PowerProfileRadar() {
  const durations = ["5s", "1m", "5m", "20m", "60m"];
  const labels = ["Sprint", "Anaerobic", "VO2max", "Threshold", "Endurance"];
  const cats = benchmarks.male;
  const cx = 150, cy = 105, r = 80;
  const angles = durations.map((_, i) => (i / durations.length) * 2 * Math.PI - Math.PI / 2);

  const makePolygon = (levelKey) => {
    return durations.map((dur, i) => {
      const val = levelKey === "athlete"
        ? parseFloat(athletePowerProfile[dur].wkg) / cats.worldTour[dur]
        : cats[levelKey][dur] / cats.worldTour[dur];
      const clampedVal = Math.min(val, 1);
      const x = cx + Math.cos(angles[i]) * r * clampedVal;
      const y = cy + Math.sin(angles[i]) * r * clampedVal;
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <svg viewBox="0 0 300 220" style={{ width: "100%", height: "auto" }}>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1.0].map(pct => (
        <polygon key={pct} points={durations.map((_, i) => `${cx + Math.cos(angles[i]) * r * pct},${cy + Math.sin(angles[i]) * r * pct}`).join(" ")}
          fill="none" stroke={T.border} strokeWidth="0.5" />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => (<line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={T.border} strokeWidth="0.5" />))}
      {/* Cat 1 reference */}
      <polygon points={makePolygon("cat1")} fill={`${T.purple}08`} stroke={T.purple} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      {/* Cat 2 reference */}
      <polygon points={makePolygon("cat2")} fill={`${T.blue}08`} stroke={T.blue} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
      {/* Athlete */}
      <polygon points={makePolygon("athlete")} fill={`${T.accent}15`} stroke={T.accent} strokeWidth="2" />
      {/* Dots + labels */}
      {durations.map((dur, i) => {
        const val = parseFloat(athletePowerProfile[dur].wkg) / cats.worldTour[dur];
        const clampedVal = Math.min(val, 1);
        const x = cx + Math.cos(angles[i]) * r * clampedVal;
        const y = cy + Math.sin(angles[i]) * r * clampedVal;
        const lx = cx + Math.cos(angles[i]) * (r + 22);
        const ly = cy + Math.sin(angles[i]) * (r + 22);
        const cls = athleteClassifications[dur];
        return (
          <g key={dur}>
            <circle cx={x} cy={y} r="4" fill={cls.color} stroke={T.bg} strokeWidth="1.5" />
            <text x={lx} y={ly - 5} textAnchor="middle" fill={T.text} fontSize="9" fontWeight="700">{labels[i]}</text>
            <text x={lx} y={ly + 5} textAnchor="middle" fill={cls.color} fontSize="7.5" fontWeight="600">{cls.level}</text>
            <text x={lx} y={ly + 14} textAnchor="middle" fill={T.textDim} fontSize="7">{athletePowerProfile[dur].wkg} W/kg</text>
          </g>
        );
      })}
      {/* Legend */}
      <line x1={10} x2={22} y1={210} y2={210} stroke={T.accent} strokeWidth="2" />
      <text x={25} y={213} fill={T.textSoft} fontSize="7">You</text>
      <line x1={55} x2={67} y1={210} y2={210} stroke={T.purple} strokeWidth="1" strokeDasharray="3,3" />
      <text x={70} y={213} fill={T.textSoft} fontSize="7">Cat 1</text>
      <line x1={100} x2={112} y1={210} y2={210} stroke={T.blue} strokeWidth="1" strokeDasharray="3,3" />
      <text x={115} y={213} fill={T.textSoft} fontSize="7">Cat 2</text>
    </svg>
  );
}

// ── BENCHMARK COMPARISON CARD ──
function BenchmarkCard() {
  const durations = ["5s", "1m", "5m", "20m", "60m"];
  const labels = ["Sprint 5s", "Anaerobic 1m", "VO2max 5m", "Threshold 20m", "Endurance 60m"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {durations.map((dur, i) => {
        const cls = athleteClassifications[dur];
        const next = pctToNextLevel(athletePowerProfile[dur].wkg, dur);
        const isWeakness = cls.idx >= 4; // Cat 3 or below = area to improve
        return (
          <div key={dur} style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${isWeakness ? `${T.warn}20` : "transparent"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{labels[i]}</span>
                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${cls.color}20`, color: cls.color, fontWeight: 700 }}>{cls.level}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: mono }}>{cls.watts}W</span>
                <span style={{ fontSize: 10, color: T.textDim, marginLeft: 4 }}>{cls.wkg} W/kg</span>
              </div>
            </div>
            {/* Progress to next level */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${next.pct}%`, background: `linear-gradient(90deg, ${cls.color}80, ${cls.color})`, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 9, color: T.textDim, whiteSpace: "nowrap" }}>
                {next.neededWatts > 0 ? `+${next.neededWatts}W to ${next.nextLevel}` : "\u2713 Top level"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WORKOUT PRESCRIPTION CARD ──
function WorkoutPrescriptionCard({ workouts, title, subtitle }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>{subtitle}</div>
      {workouts.map((w, i) => (
        <div key={i}
          onClick={() => setExpanded(expanded === i ? null : i)}
          style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer", border: `1px solid ${expanded === i ? T.accentMid : "transparent"}`, transition: "all 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{w.name}</span>
              <span style={{ fontSize: 9, color: T.textDim, marginLeft: 8 }}>{w.focus}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: T.accentMid, fontFamily: mono }}>{w.target}</span>
              <span style={{ fontSize: 10, color: T.textDim }}>{expanded === i ? "\u25BE" : "\u25B8"}</span>
            </div>
          </div>
          {expanded === i && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.6, marginBottom: 6 }}>{w.desc}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                <span style={{ color: T.textDim }}>\u23F1 {w.time}</span>
                <span style={{ color: T.textDim }}>\uD83D\uDCCA ~{w.tss} TSS</span>
                <span style={{ color: T.accent }}>\uD83C\uDFAF {w.target}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── AI ANALYSIS PANEL ──
function AIAnalysisPanel() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [insightFilter, setInsightFilter] = useState("all");
  const chatRef = useRef(null);

  const analysisInsights = [
    // BODY COMPOSITION -> PERFORMANCE
    {
      type: "insight", icon: "\u2696\uFE0F", category: "body",
      title: "Weight Impact on Today's Climbing",
      body: `At your current ${athlete.weight}kg + ${athlete.bikeWeight}kg bike (${computed.totalSystemWeight}kg system weight), you needed ${computed.wattsAt6pct}W to maintain 16 km/h on the 6% grades today. Every 1 lb (0.45kg) you gain or lose shifts that requirement by ~${computed.wattsPerLbAt6pct}W. Your recent 0.8kg drop saved you ~3.5W on every climb today \u2014 that's free speed.`,
      confidence: "high",
    },
    {
      type: "positive", icon: "\uD83D\uDCCA", category: "body",
      title: "FTP/Lean Mass Ratio Improving",
      body: `Your FTP per kg of lean body mass is ${computed.ftpPerLeanKg} W/kg \u2014 up from 3.62 W/kg six weeks ago. This is a better performance indicator than raw W/kg because it filters out fat mass changes. Your muscle mass is stable at ${athlete.muscleMass}% while body fat dropped from 14.2% \u2192 ${athlete.bodyFat}%, meaning your power gains are genuine neuromuscular adaptations, not just weight loss.`,
      confidence: "high",
    },
    {
      type: "warning", icon: "\uD83D\uDCA7", category: "body",
      title: "Hydration Was Low Before This Ride",
      body: `Your Withings hydration reading this morning was ${athlete.hydration}% \u2014 below your 65% baseline. In hot conditions (today was ${ride.temperature}\u00B0C), starting under-hydrated compounds cardiac drift. Your 8.1% drift today vs. 3.2% on a similar effort when you weighed in at 65% hydration suggests ~2-3% of today's drift was hydration-related, not fitness. Weigh yourself before and after rides to track sweat rate.`,
      confidence: "medium",
    },
    {
      type: "action", icon: "\uD83C\uDFD4\uFE0F", category: "body",
      title: "Race Weight Projection for Mt. Tam Hillclimb",
      body: `Your hillclimb race is in 18 days. At current rate (-0.5kg/week), you'll be ~86.4kg on race day = ${(athlete.ftp / 86.4).toFixed(2)} W/kg. If you hold FTP at 298W, that's a projected VAM of ~1,340 m/hr on the 7.4% avg gradient \u2014 roughly 38:20 for the 8.2km climb. Every additional kg lost would save ~18 seconds. But dropping below 86kg at your muscle mass risks power loss.`,
      confidence: "medium",
    },
    // RECOVERY -> PERFORMANCE
    {
      type: "warning", icon: "\uD83D\uDE34", category: "recovery",
      title: "Poor Sleep Drove Today's HR Drift",
      body: "Deep sleep was 48 min last night (avg: 1h 42m) and HRV dropped to 38ms (avg: 68ms). This likely explains the 8.1% cardiac drift \u2014 on Feb 18 with similar power but 72ms HRV, drift was only 3.2%. Your aerobic engine is fit, but your body was under-recovered.",
      confidence: "high",
    },
    {
      type: "insight", icon: "\uD83D\uDCC9", category: "recovery",
      title: "3-Night HRV Decline \u2192 Power Fade Pattern",
      body: "Your overnight HRV has declined 74ms \u2192 62ms \u2192 38ms over 3 nights. Historically, when HRV drops below 45ms for 2+ consecutive days, your NP drops 8-14% on comparable efforts. Today's NP was 272W vs. your 285W average \u2014 a 4.6% drop. Z1/Z2 only tomorrow.",
      confidence: "high",
    },
    {
      type: "action", icon: "\uD83C\uDF21\uFE0F", category: "recovery",
      title: "EightSleep + Sleep Timing Optimization",
      body: "Your deep sleep is 34% higher at -4\u00B0C vs. -1\u00B0C (last night's setting). Combined with your optimal sleep window (before 10:15 PM = best performances), tonight set bed to -4\u00B0C and lights out by 10 PM. Your HRV should rebound 15-20ms within 48 hours based on your historical recovery curves.",
      confidence: "medium",
    },
    {
      type: "warning", icon: "\uD83D\uDD0B", category: "recovery",
      title: "Whoop Strain Exceeding Recovery",
      body: "7-day cumulative strain: 18.4 (daily avg: 15.2), but recovery averaging only 48%. Combined with declining HRV and elevated RHR (52 vs. baseline 48), you're accumulating more fatigue than you're absorbing. Your ATL (92) is 8% above CTL (85) \u2014 productive overreach, but approaching the red line.",
      confidence: "high",
    },
    // PERFORMANCE
    {
      type: "positive", icon: "\uD83C\uDFAF", category: "performance",
      title: `Efficiency Factor: ${computed.EF} W/bpm`,
      body: `Your EF (NP/avg HR) of ${computed.EF} is your second-highest this season, despite poor recovery. On well-rested days, you've hit ${(272/148).toFixed(2)}. This confirms your aerobic base is strong \u2014 the drift today was recovery-driven, not fitness-driven. Your 14.5 hrs/week of Z2 over the past month is paying off.`,
      confidence: "high",
    },
    {
      type: "warning", icon: "\u26A1", category: "performance",
      title: "VO2max Power: Cat 3 \u2014 Your Weakest Link",
      body: `Your 5-min power of 355W (${athletePowerProfile["5m"].wkg} W/kg) classifies as ${athleteClassifications["5m"].level}, while your 20-min threshold is ${athleteClassifications["20m"].level} at ${athletePowerProfile["20m"].wkg} W/kg. That's a 2-tier gap. Your VO2/FTP ratio is ${(355/298).toFixed(2)} \u2014 well below the 1.25 target. You need +${pctToNextLevel(athletePowerProfile["5m"].wkg, "5m").neededWatts}W at 5-min to reach ${pctToNextLevel(athletePowerProfile["5m"].wkg, "5m").nextLevel}. I'd recommend 2\u00D7 per week VO2 sessions for 6-8 weeks.`,
      confidence: "high",
    },
    {
      type: "action", icon: "\uD83C\uDFCB\uFE0F", category: "performance",
      title: "Prescribed: VO2max Block (6-8 weeks)",
      body: `Based on your power profile, VO2max is your biggest limiter. Target intensity: ${Math.round(athlete.ftp * 1.08)}-${Math.round(athlete.ftp * 1.15)}W (108-115% FTP). Start with 4\u00D74min / 3min rest, progress to 5\u00D75min / 5min rest. On recovery weeks, use 30/30s (${Math.round(athlete.ftp * 1.20)}-${Math.round(athlete.ftp * 1.30)}W) to maintain stimulus. Goal: raise 5-min from 355W \u2192 380W+ (${(380/athlete.weight).toFixed(2)} W/kg = ${classifyPower(380/athlete.weight, "5m").level}). See workout library below for specific sessions.`,
      confidence: "high",
    },
    {
      type: "positive", icon: "\uD83C\uDFC6", category: "performance",
      title: "Sprint & Threshold: Cat 2 \u2014 Genuine Strengths",
      body: `Your 5s sprint (${athletePowerProfile["5s"].wkg} W/kg) and 20-min threshold (${athletePowerProfile["20m"].wkg} W/kg) are both solidly ${athleteClassifications["20m"].level}. You're only ${pctToNextLevel(athletePowerProfile["20m"].wkg, "20m").neededWatts}W away from ${pctToNextLevel(athletePowerProfile["20m"].wkg, "20m").nextLevel} at threshold. For a climber/rouleur profile, these numbers are competitive \u2014 your limiter is the VO2 gap between them. World Tour riders at your weight would hold ${Math.round(benchmarks.male.worldTour["5m"] * athlete.weight)}W for 5 min and ${Math.round(benchmarks.male.worldTour["20m"] * athlete.weight)}W for 20 min.`,
      confidence: "high",
    },
    {
      type: "insight", icon: "\uD83C\uDF21\uFE0F", category: "performance",
      title: "Heat Adaptation Nearly Complete",
      body: `Power:HR at 95\u00B0F today was ${computed.pwHR} W/bpm vs. 1.45 at 68\u00B0F three weeks ago \u2014 only a 2% gap. Early summer, heat caused a 21% drop. Your plasma volume expansion is nearly complete. For your race, if temps exceed 90\u00B0F, you'll lose <3% power vs. cooler conditions.`,
      confidence: "high",
    },
    // TRAINING LOAD
    {
      type: "action", icon: "\uD83D\uDCCA", category: "training",
      title: "Taper Protocol for Race Day",
      body: `CTL ${computed.CTL}, TSB ${computed.TSB}. Race in 18 days \u2192 begin taper in ~4 days. Target TSB +15 to +20 by race day. Reduce volume 40% next week, maintain 2 short intensity sessions (10-12 min total at VO2/threshold). Predicted race-day CTL: ~80, which historically correlates with your best performances.`,
      confidence: "high",
    },
    {
      type: "insight", icon: "\u23F1\uFE0F", category: "training",
      title: "Threshold Volume Driving FTP Gains",
      body: "You've accumulated 312 minutes between 88-105% FTP in the last 8 weeks. Your FTP rose from 290W \u2192 298W during this period. Historically, your FTP responds to threshold volume with a ~6 week delay. The work you did in weeks 3-5 is what's showing up now. Keep this volume through your build phase.",
      confidence: "high",
    },
  ];

  const filteredInsights = insightFilter === "all" ? analysisInsights : analysisInsights.filter(i => i.category === insightFilter);
  const insightCategories = [
    { id: "all", label: "All", count: analysisInsights.length },
    { id: "performance", label: "Benchmarks", count: analysisInsights.filter(i => i.category === "performance").length },
    { id: "body", label: "Body Comp", count: analysisInsights.filter(i => i.category === "body").length },
    { id: "recovery", label: "Recovery", count: analysisInsights.filter(i => i.category === "recovery").length },
    { id: "training", label: "Training", count: analysisInsights.filter(i => i.category === "training").length },
  ];

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { role: "user", text: chatInput }]);
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `Great question. Here's your power profile vs. benchmarks at ${athlete.weight}kg:\n\n\u2022 Sprint (5s): ${athletePowerProfile["5s"].wkg} W/kg \u2192 ${athleteClassifications["5s"].level} \u2713\n\u2022 Anaerobic (1m): ${athletePowerProfile["1m"].wkg} W/kg \u2192 ${athleteClassifications["1m"].level}\n\u2022 VO2max (5m): ${athletePowerProfile["5m"].wkg} W/kg \u2192 ${athleteClassifications["5m"].level} \u2190 LIMITER\n\u2022 Threshold (20m): ${athletePowerProfile["20m"].wkg} W/kg \u2192 ${athleteClassifications["20m"].level} \u2713\n\u2022 Endurance (60m): ${athletePowerProfile["60m"].wkg} W/kg \u2192 ${athleteClassifications["60m"].level}\n\nYour profile shows a classic "threshold rider with a VO2 gap." You have the engine but can't access the top end. For context, a World Tour rider at your weight would hold ${Math.round(benchmarks.male.worldTour["5m"] * athlete.weight)}W for 5 min vs. your 355W.\n\nI'd prescribe a 6-8 week VO2 block: Start with 4\u00D74min at ${Math.round(athlete.ftp * 1.08)}-${Math.round(athlete.ftp * 1.12)}W (108-112% FTP) with 3min rest. Progress to 5\u00D75min at ${Math.round(athlete.ftp * 1.10)}-${Math.round(athlete.ftp * 1.15)}W with 5min rest. On alternate days, try 30/30s: 8 reps of 30s at ${Math.round(athlete.ftp * 1.25)}W / 30s easy. Do these 2\u00D7 per week. Goal: get 5-min power from 355W to 380W+ within 8 weeks, which moves you from ${athleteClassifications["5m"].level} to ${classifyPower(380/athlete.weight, "5m").level}.`,
      }]);
    }, 2500);
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isTyping]);

  const tabs = [{ id: "analysis", label: "AI Analysis" }, { id: "chat", label: "Ask Claude" }];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.bg }}>\u2726</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AIM Intelligence</div>
            <div style={{ fontSize: 9, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Powered by Claude</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 600, color: activeTab === tab.id ? T.accent : T.textSoft, cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.2s", fontFamily: font }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: activeTab === "chat" ? 0 : "14px 18px" }}>
        {activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Post-Ride Analysis \u00B7 Today 3:42pm</div>

            {/* Recovery alert banner */}
            <div style={{ background: `linear-gradient(135deg, ${T.danger}12, ${T.warn}08)`, border: `1px solid ${T.danger}25`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${T.danger}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.danger, fontFamily: mono, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, lineHeight: 1 }}>38</div><div style={{ fontSize: 7, opacity: 0.7 }}>HRV</div></div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.danger, marginBottom: 2 }}>\u26A0\uFE0F Under-Recovered State</div>
                <div style={{ fontSize: 10, color: T.textSoft, lineHeight: 1.4 }}>HRV 38ms (avg 68) \u00B7 Deep 48m (avg 1h42m) \u00B7 RHR 52 (base 48) \u00B7 Whoop 34%</div>
              </div>
            </div>

            {/* Category pills */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {insightCategories.map(cat => (
                <button key={cat.id} onClick={() => setInsightFilter(cat.id)} style={{ background: insightFilter === cat.id ? `${T.accent}18` : T.bg, border: `1px solid ${insightFilter === cat.id ? T.accentMid : T.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: insightFilter === cat.id ? T.accent : T.textSoft, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5, fontFamily: font }}>
                  {cat.label}
                  <span style={{ fontSize: 8, background: insightFilter === cat.id ? `${T.accent}30` : `${T.textDim}30`, padding: "1px 4px", borderRadius: 6, color: insightFilter === cat.id ? T.accent : T.textDim }}>{cat.count}</span>
                </button>
              ))}
            </div>

            {filteredInsights.map((insight, i) => (
              <div key={i} style={{ background: T.bg, borderRadius: 11, padding: "12px 14px", borderLeft: `3px solid ${insight.type === "positive" ? T.accent : insight.type === "warning" ? T.warn : insight.type === "action" ? T.purple : T.blue}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{insight.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>{insight.title}</span>
                  <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 4, background: insight.confidence === "high" ? T.accentDim : `${T.warn}20`, color: insight.confidence === "high" ? T.accent : T.warn, textTransform: "uppercase", letterSpacing: "0.05em" }}>{insight.confidence}</span>
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6, color: T.textSoft }}>{insight.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>\u2726</div>
                  <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ask me anything about your training</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                    {["How do I compare to Cat 1 riders?", "Give me a VO2max workout plan", "What's my biggest power limiter?", "How far am I from Domestic Pro?"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 11, color: T.textSoft, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: font }}
                        onMouseOver={e => { e.target.style.borderColor = T.accentMid; e.target.style.color = T.text; }}
                        onMouseOut={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textSoft; }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px", background: msg.role === "user" ? T.accent : T.bg, color: msg.role === "user" ? T.bg : T.text, fontSize: 12, lineHeight: 1.6, fontWeight: msg.role === "user" ? 600 : 400 }}>{msg.text}</div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: "flex", gap: 4, padding: "9px 13px", background: T.bg, borderRadius: 13, width: "fit-content" }}>
                  {[0, 1, 2].map(i => (<div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }} />))}
                </div>
              )}
            </div>
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} placeholder="Ask about your training..." style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: T.text, outline: "none", fontFamily: font }} />
                <button onClick={handleSendChat} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer" }}>\u2192</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}

// ── CHARTS ──
function PowerCurveChart() {
  const w = 480, h = 150, pad = { t: 10, r: 10, b: 28, l: 38 };
  const maxP = Math.max(...powerCurve.map(d => Math.max(d.power, d.benchmark)));
  const xStep = (w - pad.l - pad.r) / (powerCurve.length - 1);
  const toY = v => pad.t + (1 - v / maxP) * (h - pad.t - pad.b);
  const myLine = powerCurve.map((d, i) => `${pad.l + i * xStep},${toY(d.power)}`).join(" ");
  const benchLine = powerCurve.map((d, i) => `${pad.l + i * xStep},${toY(d.benchmark)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity="0.2" /><stop offset="100%" stopColor={T.accent} stopOpacity="0" /></linearGradient></defs>
      {[0, 300, 600, 900, 1200].map(v => (<g key={v}><line x1={pad.l} x2={w - pad.r} y1={toY(v)} y2={toY(v)} stroke={T.border} /><text x={pad.l - 5} y={toY(v) + 3} fill={T.textDim} fontSize="8" textAnchor="end" fontFamily={mono}>{v}</text></g>))}
      <polygon points={`${pad.l},${h - pad.b} ${myLine} ${pad.l + (powerCurve.length - 1) * xStep},${h - pad.b}`} fill="url(#pcGrad)" />
      <polyline points={benchLine} fill="none" stroke={T.textDim} strokeWidth="1.5" strokeDasharray="4,4" />
      <polyline points={myLine} fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
      {powerCurve.map((d, i) => (<g key={i}><circle cx={pad.l + i * xStep} cy={toY(d.power)} r="2.5" fill={T.accent} /><text x={pad.l + i * xStep} y={h - 6} fill={T.textDim} fontSize="7" textAnchor="middle" fontFamily={mono}>{d.duration}</text></g>))}
      <line x1={w - 130} x2={w - 115} y1={10} y2={10} stroke={T.accent} strokeWidth="2" /><text x={w - 112} y={13} fill={T.textSoft} fontSize="8">You</text>
      <line x1={w - 75} x2={w - 60} y1={10} y2={10} stroke={T.textDim} strokeWidth="1.5" strokeDasharray="4,4" /><text x={w - 57} y={13} fill={T.textSoft} fontSize="8">Benchmark</text>
    </svg>
  );
}

function FitnessChart() {
  const w = 480, h = 130, pad = { t: 10, r: 10, b: 28, l: 32 };
  const allVals = fitnessHistory.flatMap(d => [d.ctl, d.atl, d.tsb]);
  const max = Math.max(...allVals), min = Math.min(...allVals), range = max - min;
  const xStep = (w - pad.l - pad.r) / (fitnessHistory.length - 1);
  const toY = v => pad.t + ((max - v) / range) * (h - pad.t - pad.b);
  const makeLine = key => fitnessHistory.map((d, i) => `${pad.l + i * xStep},${toY(d[key])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <line x1={pad.l} x2={w - pad.r} y1={toY(0)} y2={toY(0)} stroke={T.textDim} strokeWidth="0.5" strokeDasharray="2,2" />
      {fitnessHistory.map((d, i) => { const x = pad.l + i * xStep, y0 = toY(0), y1 = toY(d.tsb); return <rect key={i} x={x - 5} y={Math.min(y0, y1)} width={10} height={Math.abs(y1 - y0)} fill={d.tsb > 0 ? `${T.accent}30` : `${T.danger}30`} rx={2} />; })}
      <polyline points={makeLine("ctl")} fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" />
      <polyline points={makeLine("atl")} fill="none" stroke={T.pink} strokeWidth="2" strokeLinecap="round" />
      {fitnessHistory.map((d, i) => (<text key={i} x={pad.l + i * xStep} y={h - 6} fill={T.textDim} fontSize="7" textAnchor="middle" fontFamily={mono}>{d.week}</text>))}
      <circle cx={pad.l} cy={pad.t + 2} r="3" fill={T.blue} /><text x={pad.l + 7} y={pad.t + 5} fill={T.textSoft} fontSize="8">CTL</text>
      <circle cx={pad.l + 50} cy={pad.t + 2} r="3" fill={T.pink} /><text x={pad.l + 57} y={pad.t + 5} fill={T.textSoft} fontSize="8">ATL</text>
      <rect x={pad.l + 100} y={pad.t - 2} width={7} height={7} fill={`${T.accent}40`} rx={1} /><text x={pad.l + 110} y={pad.t + 5} fill={T.textSoft} fontSize="8">TSB</text>
    </svg>
  );
}

// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const [selectedRide, setSelectedRide] = useState("today");

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Dashboard", "Calendar", "Trends", "Race Planner"].map(item => (
              <button key={item} style={{ background: item === "Dashboard" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: item === "Dashboard" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: T.card, borderRadius: 7, border: `1px solid ${T.border}` }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent }} /><span style={{ fontSize: 10, color: T.textSoft }}>All synced</span>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>JD</div>
        </div>
      </nav>

      {/* Main Layout */}
      <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
        {/* Left: Dashboard */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {/* Ride Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Today \u00B7 March 1, 2026</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Mt. Diablo Summit Ride</h1>
              <div style={{ fontSize: 11, color: T.textSoft, marginTop: 3 }}>3h 12m \u00B7 68.4 mi \u00B7 5,240 ft \u2191 \u00B7 95\u00B0F \u00B7 {computed.TSS} TSS</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Today", "Week", "Month", "Season"].map(p => (
                <button key={p} onClick={() => setSelectedRide(p.toLowerCase())} style={{ background: selectedRide === p.toLowerCase() ? T.accent : T.card, border: `1px solid ${selectedRide === p.toLowerCase() ? T.accent : T.border}`, padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 600, color: selectedRide === p.toLowerCase() ? T.bg : T.textSoft, cursor: "pointer", fontFamily: font }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Row 1: Core power metrics (TrainingPeaks parity) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            <MetricCard label="Avg Power" value={ride.avgPower} unit="W" trend="+12W vs last wk" trendDir="up" sparkData={[220, 235, 228, 240, 242, 248]} color={T.accent} icon="\u26A1" />
            <MetricCard label="Normalized Power" value={ride.normalizedPower} unit="W" trend={`IF: ${computed.IF}`} trendDir="up" sparkData={[255, 260, 258, 265, 268, 272]} color={T.blue} icon="\uD83D\uDCCA" />
            <MetricCard label="TSS" value={computed.TSS} unit="" trend="590 weekly" trendDir="up" color={T.purple} icon="\uD83D\uDCC8" />
            <MetricCard label="Variability Index" value={computed.VI} unit="" trend="Steady pacing" color={T.accent} icon="\u3030\uFE0F" />
            <MetricCard label="Efficiency Factor" value={computed.EF} unit="W/bpm" trend="2nd best this season" trendDir="up" color={T.blue} icon="\uD83C\uDFAF" />
          </div>

          {/* Row 2: Body comp + weight-adjusted metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            <MetricCard label="W/kg (Avg)" value={computed.wPerKg} unit="" trend={`NP: ${computed.npPerKg} W/kg`} color={T.accent} icon="\uD83C\uDFCB\uFE0F" />
            <MetricCard label="FTP/kg" value={computed.ftpPerKg} unit="" trend={`Lean: ${computed.ftpPerLeanKg}`} trendDir="up" sparkData={[3.1, 3.15, 3.2, 3.25, 3.3, 3.35]} color={T.accent} icon="\uD83D\uDCAA" />
            <MetricCard label="Weight" value={athlete.weight} unit="kg" trend={`\u2193${(athlete.prevWeight - athlete.weight).toFixed(1)}kg this wk`} trendDir="up" sparkData={[91, 90.5, 90.2, 89.8, 89.4, 89]} color={T.blue} icon="\u2696\uFE0F" />
            <MetricCard label="Body Fat" value={athlete.bodyFat} unit="%" trend={`Muscle: ${athlete.muscleMass}%`} trendDir="up" sparkData={[14.2, 13.8, 13.4, 13.0, 12.7, 12.4]} color={T.orange} icon="\uD83D\uDCC9" />
            <MetricCard label="VAM" value={computed.VAM} unit="m/hr" trend={`System: ${computed.totalSystemWeight}kg`} color={T.purple} icon="\uD83C\uDFD4\uFE0F" />
          </div>

          {/* Row 3: HR + cadence + detailed */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
            <MetricCard label="Avg HR" value={ride.avgHR} unit="bpm" trend={`${computed.hrDrift}% drift`} trendDir="down" sparkData={[148, 150, 151, 153, 156, 160]} color={T.pink} icon="\u2764\uFE0F" />
            <MetricCard label="Calories" value={computed.calories.toLocaleString()} unit="kcal" trend={`${ride.work} kJ work`} color={T.orange} icon="\uD83D\uDD25" />
            <MetricCard label="L/R Balance" value="51/49" unit="%" trend="53/47 final hr" trendDir="down" color={T.warn} icon="\u2696\uFE0F" />
            <MetricCard label="Cadence" value={ride.avgCadence} unit="rpm" trend={`Max: ${ride.maxCadence}`} color={T.accent} icon="\uD83D\uDD04" />
            <MetricCard label="Power:HR" value={computed.pwHR} unit="W/bpm" trend="Heat-adjusted" trendDir="up" sparkData={[1.6, 1.62, 1.58, 1.65, 1.7, 1.79]} color={T.accent} icon="\uD83D\uDC93" />
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Power Duration Curve</div>
              <PowerCurveChart />
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Fitness, Fatigue & Form</div>
              <FitnessChart />
            </div>
          </div>

          {/* Zones + Weekly + Climbing Calculator */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Power Zones */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Power Zones (Coggan)</div>
              {powerZones.map(z => <MiniBar key={z.zone} value={z.time} max={70} color={z.color} label={`${z.zone} (${z.min}-${z.max === 9999 ? "+" : z.max}W)`} subLabel={`${z.time}m`} />)}
            </div>

            {/* Weekly TSS */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Weekly Training Load</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
                {weeklyTSS.map(d => (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9, color: T.textSoft, fontFamily: mono }}>{d.tss || "\u2014"}</span>
                    <div style={{ width: "100%", height: `${(d.tss / 200) * 80}px`, minHeight: d.tss ? 3 : 1, background: d.tss ? `linear-gradient(180deg, ${d.tss > 150 ? T.purple : d.tss > 100 ? T.blue : T.accent}80, ${d.tss > 150 ? T.purple : d.tss > 100 ? T.blue : T.accent}30)` : T.border, borderRadius: 3 }} />
                    <span style={{ fontSize: 9, color: T.textDim }}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: "6px 10px", background: T.bg, borderRadius: 7, fontSize: 10, color: T.textSoft }}>
                Weekly: <span style={{ color: T.accent, fontWeight: 700 }}>590 TSS</span> \u00B7 Target: 550-650 \u00B7 <span style={{ color: T.accent }}>On track</span>
              </div>
            </div>

            {/* Climbing / Weight Impact Calculator */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>\u26F0\uFE0F Climbing Impact Calculator</div>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>Based on Withings weight + bike weight</div>
              <StatRow label="System Weight" value={computed.totalSystemWeight} unit="kg" sub={`Rider ${athlete.weight} + Bike ${athlete.bikeWeight}`} />
              <StatRow label="Watts needed @ 6%" value={computed.wattsAt6pct} unit="W" sub="at 16 km/h" color={T.accent} />
              <StatRow label="Cost per 1 lb gained" value={`+${computed.wattsPerLbAt6pct}`} unit="W" sub="on 6% grade" color={T.danger} />
              <StatRow label="Today's VAM" value={computed.VAM} unit="m/hr" color={T.purple} />
              <StatRow label="W/kg (lean mass)" value={computed.ftpPerLeanKg} unit="" sub="FTP \u00F7 lean mass" color={T.accent} />
              <div style={{ marginTop: 8, padding: "6px 10px", background: T.bg, borderRadius: 7, fontSize: 10, color: T.textSoft, lineHeight: 1.5 }}>
                \uD83D\uDCA1 At race weight (86.4kg), you'd need <span style={{ color: T.accent, fontWeight: 600 }}>~11W less</span> on 6% climbs \u2014 saving ~45s over 20 min
              </div>
            </div>
          </div>

          {/* Power Profile + Benchmarks + Workouts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Radar */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>\uD83C\uDFAF Power Profile vs. Benchmarks</div>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Coggan levels \u00B7 Male {athlete.weight}kg</div>
              <PowerProfileRadar />
            </div>

            {/* Benchmark breakdown */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>\uD83D\uDCCA Classification by Duration</div>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>Progress to next level</div>
              <BenchmarkCard />
            </div>

            {/* Workout prescriptions */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px", overflow: "auto" }}>
              <WorkoutPrescriptionCard
                title="\uD83D\uDC8A Prescribed: VO2max Workouts"
                subtitle={`Target: raise 5-min from 355W \u2192 380W (${athleteClassifications["5m"].level} \u2192 ${classifyPower(380/athlete.weight, "5m").level})`}
                workouts={workoutPrescriptions.vo2max}
              />
            </div>
          </div>

          {/* Recovery + Body Comp + Sleep row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>\uD83D\uDECF\uFE0F Recovery Score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: T.danger }}>34</span>
                <span style={{ fontSize: 11, color: T.textSoft }}>/ 100</span>
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 5 }}>HRV: 38ms \u2193\u00B744% \u00B7 RHR: 52 \u2191\u00B74 \u00B7 Sleep: 6h 10m</div>
              <div style={{ fontSize: 10, color: T.danger, marginTop: 3 }}>Under-recovered \u2014 Z1/Z2 only tomorrow</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>\u2696\uFE0F Body Composition</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono }}>{athlete.weight}</span>
                <span style={{ fontSize: 11, color: T.textSoft }}>kg</span>
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 5 }}>Fat: {athlete.bodyFat}% \u00B7 Muscle: {athlete.muscleMass}% \u00B7 H\u2082O: {athlete.hydration}%</div>
              <div style={{ fontSize: 10, color: T.warn, marginTop: 3 }}>\u2193 0.8kg/wk \u00B7 Lean mass: {athlete.leanMass.toFixed(1)}kg (stable)</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>\uD83D\uDE34 Sleep Quality</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: T.warn }}>52</span>
                <span style={{ fontSize: 11, color: T.textSoft }}>/ 100</span>
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 5 }}>Deep: 48m \u2193\u00B753% \u00B7 REM: 1h04m \u2193\u00B752% \u00B7 Temp: -1\u00B0C</div>
              <div style={{ fontSize: 10, color: T.warn, marginTop: 3 }}>Asleep 11:48pm \u2014 1h 33m past optimal</div>
            </div>
          </div>

          {/* Full TrainingPeaks-style metrics table */}
          <div style={{ marginTop: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>\uD83D\uDCCB Full Ride Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 20px" }}>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Power</div>
                <StatRow label="Avg Power" value={ride.avgPower} unit="W" />
                <StatRow label="Normalized Power" value={ride.normalizedPower} unit="W" />
                <StatRow label="Max Power" value={ride.maxPower} unit="W" />
                <StatRow label="Intensity Factor" value={computed.IF} />
                <StatRow label="TSS" value={computed.TSS} />
                <StatRow label="Variability Index" value={computed.VI} />
                <StatRow label="Work" value={ride.work} unit="kJ" />
                <StatRow label="FTP" value={athlete.ftp} unit="W" />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Heart Rate</div>
                <StatRow label="Avg HR" value={ride.avgHR} unit="bpm" />
                <StatRow label="Max HR" value={ride.maxHR} unit="bpm" />
                <StatRow label="HR Drift" value={`${computed.hrDrift}%`} color={T.warn} />
                <StatRow label="Efficiency Factor" value={computed.EF} unit="W/bpm" />
                <StatRow label="Power:HR Ratio" value={computed.pwHR} />
                <StatRow label="LTHR" value={athlete.lthr} unit="bpm" />
                <StatRow label="%HRmax (avg)" value={`${Math.round(ride.avgHR / athlete.maxHR * 100)}%`} />
                <StatRow label="%HRR (avg)" value={`${Math.round((ride.avgHR - athlete.restingHR) / (athlete.maxHR - athlete.restingHR) * 100)}%`} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Body / Weight</div>
                <StatRow label="W/kg (avg)" value={computed.wPerKg} />
                <StatRow label="W/kg (NP)" value={computed.npPerKg} />
                <StatRow label="FTP/kg" value={computed.ftpPerKg} />
                <StatRow label="FTP/lean kg" value={computed.ftpPerLeanKg} color={T.accent} />
                <StatRow label="Rider Weight" value={athlete.weight} unit="kg" />
                <StatRow label="Lean Mass" value={athlete.leanMass.toFixed(1)} unit="kg" />
                <StatRow label="Body Fat" value={`${athlete.bodyFat}%`} />
                <StatRow label="Hydration" value={`${athlete.hydration}%`} color={athlete.hydration < 64 ? T.warn : T.text} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Ride Details</div>
                <StatRow label="Distance" value={(ride.distance * 0.621).toFixed(1)} unit="mi" />
                <StatRow label="Elevation" value={`${Math.round(ride.elevation * 3.281)}`} unit="ft" />
                <StatRow label="Duration" value="3:12:00" />
                <StatRow label="Avg Speed" value={(ride.avgSpeed * 0.621).toFixed(1)} unit="mph" />
                <StatRow label="VAM" value={computed.VAM} unit="m/hr" color={T.purple} />
                <StatRow label="Calories" value={computed.calories.toLocaleString()} unit="kcal" />
                <StatRow label="Temperature" value={`${ride.temperature}\u00B0C / ${Math.round(ride.temperature * 9/5 + 32)}\u00B0F`} />
                <StatRow label="L/R Balance" value="51/49 \u2192 53/47" />
              </div>
            </div>
            {/* PMC row */}
            <div style={{ marginTop: 12, padding: "8px 12px", background: T.bg, borderRadius: 8, display: "flex", gap: 24, fontSize: 11 }}>
              <span style={{ color: T.textSoft }}>CTL: <span style={{ color: T.blue, fontWeight: 700 }}>{computed.CTL}</span></span>
              <span style={{ color: T.textSoft }}>ATL: <span style={{ color: T.pink, fontWeight: 700 }}>{computed.ATL}</span></span>
              <span style={{ color: T.textSoft }}>TSB: <span style={{ color: computed.TSB < 0 ? T.danger : T.accent, fontWeight: 700 }}>{computed.TSB}</span></span>
              <span style={{ color: T.textSoft }}>Ramp Rate: <span style={{ fontWeight: 700 }}>+5.2 TSS/wk</span></span>
              <span style={{ color: T.textSoft }}>Chronic Load: <span style={{ fontWeight: 700 }}>42-day</span></span>
              <span style={{ color: T.textSoft }}>Acute Load: <span style={{ fontWeight: 700 }}>7-day</span></span>
            </div>
          </div>
        </div>

        {/* Right: AI Panel */}
        <div style={{ width: 370, borderLeft: `1px solid ${T.border}`, padding: 14, display: "flex", flexDirection: "column" }}>
          <AIAnalysisPanel />
        </div>
      </div>
    </div>
  );
}

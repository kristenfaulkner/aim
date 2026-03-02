import { useState, useEffect, useRef } from "react";

// ── DESIGN TOKENS — Light Theme, Apple Health × Oura × Linear ──
const T = {
  // Backgrounds
  bg: "#f8f8fa",
  white: "#ffffff",
  surfaceHover: "#f2f2f5",
  surfaceActive: "#eeeef2",
  
  // Text
  text: "#1a1a2e",
  textSecondary: "#6b6b80",
  textTertiary: "#9d9db0",
  textInverse: "#ffffff",
  
  // Accent — a refined teal-green (less neon than before)
  accent: "#10b981",
  accentSoft: "rgba(16, 185, 129, 0.08)",
  accentBorder: "rgba(16, 185, 129, 0.2)",
  accentDark: "#059669",
  
  // Status colors
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
  orangeSoft: "rgba(249, 115, 22, 0.08)",
  
  // Borders & shadows
  border: "rgba(0,0,0,0.06)",
  borderStrong: "rgba(0,0,0,0.1)",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  shadowLg: "0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
  
  // Radius
  radius: 12,
  radiusSm: 8,
  radiusLg: 16,
  radiusXl: 20,
  radiusFull: 9999,
  
  // Fonts
  font: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ── MOCK DATA ──
const readiness = {
  score: 82,
  color: "green",
  headline: "You're primed for intensity today",
  summary: "HRV at 121ms (top quartile), RHR dropped to 48 bpm, and 6h 3m sleep with exceptional REM. Your body is recovering faster than you're loading it — this is your window.",
  hrv: 121,
  hrvTrend: "+37ms over 8 days",
  rhr: 48,
  sleepScore: 87,
  sleepDuration: "6h 3m",
  deepSleep: "1h 17m",
  remSleep: "2h",
};

const lastRide = {
  name: "Nieuwsblad-Inspired Belgian Endurance Ride",
  date: "Saturday, February 28",
  duration: "7:01:11",
  distance: "113.5 mi",
  elevation: "6,844 ft",
  np: 204,
  avgPower: 192,
  avgHr: 132,
  hrDrift: "2.96%",
  ef: 1.55,
  calories: "4,821",
  temp: "18°C / 64°F",
  wkg: 2.82,
  wkgNP: 3.00,
};

const actionItems = {
  today: [
    {
      id: 1,
      icon: "⚡",
      category: "Training",
      title: "VO₂max intervals — your body is primed",
      description: "Classic 5×5' at 216-224W (105-110% FTP) with 5' recoveries. Your HRV of 121ms and green readiness make this the ideal day for high-intensity work.",
      color: T.accent,
      actionLabel: "Add to Calendar",
    },
    {
      id: 2,
      icon: "🥤",
      category: "Nutrition",
      title: "Increase carb intake on today's ride",
      description: "Your power faded only 2% in yesterday's hour 3 at 80g carbs/hr. Keep this fueling strategy — it's working better than your old 45g/hr approach.",
      color: T.blue,
      actionLabel: null,
    },
  ],
  thisWeek: [
    {
      id: 3,
      icon: "🔧",
      category: "Bike Fit",
      title: "Schedule a bike fit consult",
      description: "L/R balance shifted from 51/49 to 54/46 after hour 2 in 3 of your last 5 long rides, specifically on climbs >6%. This pattern suggests a hip/glute imbalance worth investigating.",
      color: T.orange,
      actionLabel: null,
    },
    {
      id: 4,
      icon: "🩸",
      category: "Health",
      title: "Retest blood panel — last was Aug 2022",
      description: "Ferritin was 81 ng/mL (optimal) but that was 3.5 years ago. With your training volume, iron stores deplete over time. If your 60-min power plateau persists, suboptimal ferritin could be a factor.",
      color: T.red,
      actionLabel: "Find a Lab",
    },
  ],
  bigPicture: [
    {
      id: 5,
      icon: "🎯",
      category: "Training Block",
      title: "Endurance ceiling is your biggest limiter",
      description: "Your 60-min power is only 74.8% of your 90-day best (290W) while your 20-min is at 67.3%. Add 2-3 hour tempo rides at 75-85% FTP to raise hour power from 290W → 310-320W over 6-8 weeks.",
      color: T.purple,
      actionLabel: "View Training Plan",
    },
  ],
};

const insights = [
  {
    id: 1,
    category: "performance",
    title: "2.96% cardiac drift over 7 hours — elite-level durability",
    body: "Most athletes see 5-8% drift on rides beyond 5 hours. Your EF of 1.55 stayed rock-solid, indicating strong aerobic fitness, excellent fueling/hydration, and optimal pacing.",
    confidence: "high",
    icon: "💚",
  },
  {
    id: 2,
    category: "recovery",
    title: "1h 17m deep sleep the night before primed your system",
    body: "You logged 4,620 seconds of deep sleep — 33% above your 7-day average. Your HRV that night was 109ms and RHR was 49.4 bpm. Deep sleep >1h 15m consistently predicts your best endurance performances.",
    confidence: "high",
    icon: "😴",
  },
  {
    id: 3,
    category: "recovery",
    title: "HRV climbed 37ms in 8 days — your body is thriving under load",
    body: "HRV rose from 83.8ms (Feb 24) to 121.3ms (Mar 2) despite the massive 4,821-calorie burn. Your training load is in the productive zone, not the overreaching zone.",
    confidence: "high",
    icon: "📈",
  },
  {
    id: 4,
    category: "performance",
    title: "93 rpm cadence held for 7 hours — muscular endurance is a strength",
    body: "Most riders drift down to 80-85 rpm in the final hours. Holding cadence >90 is associated with better power preservation. Combined with your 2.96% drift, your neuromuscular fatigue resistance is a key differentiator.",
    confidence: "high",
    icon: "🦵",
  },
  {
    id: 5,
    category: "environment",
    title: "18°C was optimal — your drift would double above 28°C",
    body: "Your heat penalty model shows ~2.1% NP loss per 10°F above 70°F. At 28°C, expect 6-8% drift instead of today's 2.96%. On hot days, adjust target power down 5-8% or increase cooling strategies.",
    confidence: "high",
    icon: "🌡️",
  },
  {
    id: 6,
    category: "training",
    title: "VO₂max work could unlock 15-20W at FTP",
    body: "Your 5-min power (351W, 5.16 W/kg) to 20-min power (333W, 4.90 W/kg) ratio is 1.05 — below the optimal 1.20-1.25. Add 1 weekly session of 4-6 × 5-min efforts at 105-110% FTP.",
    confidence: "high",
    icon: "🚀",
  },
  {
    id: 7,
    category: "health",
    title: "Ferritin at 81 ng/mL (Aug 2022) — likely still optimal but retest soon",
    body: "Your last blood panel showed ferritin well above the athlete-optimal threshold of >50 ng/mL. However, that was 3.5 years ago. Athletes doing 7-hour rides regularly can deplete iron stores over time.",
    confidence: "medium",
    icon: "🔬",
  },
];

const weeklyTraining = [
  { day: "Mon", label: "Rest", tss: 0, type: "rest" },
  { day: "Tue", label: "VO₂max 5×5'", tss: 85, type: "intensity" },
  { day: "Wed", label: "Z2 Endurance", tss: 120, type: "endurance" },
  { day: "Thu", label: "Sweet Spot 3×15'", tss: 90, type: "tempo" },
  { day: "Fri", label: "Recovery Spin", tss: 35, type: "recovery" },
  { day: "Sat", label: "Long Ride", tss: 220, type: "endurance" },
  { day: "Sun", label: "Z2 + Sprints", tss: 110, type: "mixed" },
];

const fitnessData = [
  { week: "Jan 6", ctl: 62, atl: 55, tsb: 7 },
  { week: "Jan 13", ctl: 65, atl: 70, tsb: -5 },
  { week: "Jan 20", ctl: 68, atl: 58, tsb: 10 },
  { week: "Jan 27", ctl: 70, atl: 75, tsb: -5 },
  { week: "Feb 3", ctl: 72, atl: 68, tsb: 4 },
  { week: "Feb 10", ctl: 75, atl: 82, tsb: -7 },
  { week: "Feb 17", ctl: 78, atl: 72, tsb: 6 },
  { week: "Feb 24", ctl: 80, atl: 88, tsb: -8 },
  { week: "Mar 2", ctl: 82, atl: 76, tsb: 6 },
];

// ── COMPONENTS ──

const Card = ({ children, style, onClick, hover = false }) => (
  <div
    style={{
      background: T.white,
      borderRadius: T.radius,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      transition: "all 0.2s ease",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
    onMouseEnter={e => {
      if (hover) {
        e.currentTarget.style.boxShadow = T.shadowMd;
        e.currentTarget.style.borderColor = T.borderStrong;
      }
    }}
    onMouseLeave={e => {
      if (hover) {
        e.currentTarget.style.boxShadow = T.shadow;
        e.currentTarget.style.borderColor = T.border;
      }
    }}
    onClick={onClick}
  >
    {children}
  </div>
);

const Badge = ({ children, color = T.accent, soft = true }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: T.radiusFull,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      background: soft ? `${color}12` : color,
      color: soft ? color : T.white,
      fontFamily: T.font,
    }}
  >
    {children}
  </span>
);

const MetricValue = ({ value, unit, size = "large" }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
    <span
      style={{
        fontFamily: T.fontMono,
        fontSize: size === "large" ? 28 : size === "medium" ? 22 : 16,
        fontWeight: 600,
        color: T.text,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {value}
    </span>
    {unit && (
      <span
        style={{
          fontSize: size === "large" ? 13 : 11,
          color: T.textTertiary,
          fontWeight: 500,
          fontFamily: T.font,
        }}
      >
        {unit}
      </span>
    )}
  </div>
);

// ── READINESS RING ──
const ReadinessRing = ({ score, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? T.green : score >= 45 ? T.yellow : T.red;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`${color}15`}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: 32,
            fontWeight: 700,
            color: T.text,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ fontSize: 11, color: T.textTertiary, marginTop: 2, fontFamily: T.font }}>
          readiness
        </span>
      </div>
    </div>
  );
};

// ── ACTION ITEM ──
const ActionItem = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        borderRadius: T.radiusSm,
        background: hovered ? T.surfaceHover : "transparent",
        transition: "background 0.15s ease",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: T.radiusSm,
          background: `${item.color}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: item.color, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: T.font }}>
            {item.category}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.4, marginBottom: 4, fontFamily: T.font }}>
          {item.title}
        </div>
        <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, fontFamily: T.font }}>
          {item.description}
        </div>
        {item.actionLabel && (
          <button
            style={{
              marginTop: 10,
              padding: "6px 14px",
              borderRadius: T.radiusFull,
              border: `1px solid ${item.color}30`,
              background: `${item.color}08`,
              color: item.color,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.font,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              e.target.style.background = `${item.color}15`;
            }}
            onMouseLeave={e => {
              e.target.style.background = `${item.color}08`;
            }}
          >
            {item.actionLabel} →
          </button>
        )}
      </div>
    </div>
  );
};

// ── INSIGHT CARD ──
const InsightCard = ({ insight }) => {
  const [expanded, setExpanded] = useState(false);
  const catColors = {
    performance: T.accent,
    recovery: T.blue,
    training: T.purple,
    environment: T.orange,
    health: T.red,
  };
  const color = catColors[insight.category] || T.accent;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: "14px 16px",
        borderRadius: T.radiusSm,
        border: `1px solid ${T.border}`,
        background: T.white,
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: 8,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = T.borderStrong;
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 16, lineHeight: 1.4 }}>{insight.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4, fontFamily: T.font }}>
              {insight.title}
            </span>
          </div>
          {expanded && (
            <div
              style={{
                fontSize: 13,
                color: T.textSecondary,
                lineHeight: 1.6,
                marginTop: 8,
                fontFamily: T.font,
                animation: "fadeIn 0.2s ease",
              }}
            >
              {insight.body}
            </div>
          )}
        </div>
        <Badge color={color}>
          {insight.confidence === "high" ? "HIGH" : "MED"}
        </Badge>
      </div>
    </div>
  );
};

// ── MINI CHART — Simple sparkline ──
const Sparkline = ({ data, color = T.accent, height = 40, width = 120 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
        r={3}
        fill={color}
      />
    </svg>
  );
};

// ── TRAINING WEEK PREVIEW ──
const TrainingWeek = () => {
  const typeColors = {
    rest: T.textTertiary,
    intensity: T.red,
    endurance: T.accent,
    tempo: T.orange,
    recovery: T.blue,
    mixed: T.purple,
  };
  const maxTss = Math.max(...weeklyTraining.map(d => d.tss));

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
      {weeklyTraining.map((day, i) => {
        const barH = day.tss > 0 ? Math.max((day.tss / maxTss) * 56, 4) : 4;
        const isToday = i === 0; // Monday for demo
        return (
          <div key={day.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: "100%",
                maxWidth: 32,
                height: barH,
                borderRadius: 4,
                background: day.tss > 0 ? typeColors[day.type] : `${T.textTertiary}20`,
                opacity: day.tss > 0 ? (isToday ? 1 : 0.6) : 0.3,
                transition: "all 0.3s ease",
              }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: isToday ? 700 : 500,
              color: isToday ? T.text : T.textTertiary,
              fontFamily: T.font,
            }}>
              {day.day}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── FITNESS CHART (CTL/ATL/TSB mini) ──
const FitnessChart = () => {
  const w = 280;
  const h = 60;
  const data = fitnessData;
  const maxVal = 100;
  const minVal = -20;
  const range = maxVal - minVal;

  const makeLine = (key, color) => {
    const points = data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d[key] - minVal) / range) * h;
        return `${x},${y}`;
      })
      .join(" ");
    return <polyline key={key} points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />;
  };

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {makeLine("ctl", T.accent)}
      {makeLine("atl", T.red)}
      {makeLine("tsb", T.blue)}
    </svg>
  );
};

// ── MAIN DASHBOARD ──
export default function AIMDashboard() {
  const [insightFilter, setInsightFilter] = useState("all");
  const [activeActionTab, setActiveActionTab] = useState("today");
  const filteredInsights = insightFilter === "all" ? insights : insights.filter(i => i.category === insightFilter);

  const actionTabs = [
    { key: "today", label: "Today", count: actionItems.today.length },
    { key: "thisWeek", label: "This Week", count: actionItems.thisWeek.length },
    { key: "bigPicture", label: "Big Picture", count: actionItems.bigPicture.length },
  ];

  const insightCategories = [
    { key: "all", label: "All", count: insights.length },
    { key: "performance", label: "Performance", count: insights.filter(i => i.category === "performance").length },
    { key: "recovery", label: "Recovery", count: insights.filter(i => i.category === "recovery").length },
    { key: "training", label: "Training", count: insights.filter(i => i.category === "training").length },
    { key: "environment", label: "Environment", count: insights.filter(i => i.category === "environment").length },
    { key: "health", label: "Health", count: insights.filter(i => i.category === "health").length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
      `}</style>

      {/* ── NAV ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(248,248,250,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: T.white, fontSize: 13, fontWeight: 700 }}>A</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.text, letterSpacing: "-0.02em" }}>AIM</span>
            <Badge color={T.textTertiary}>BETA</Badge>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Dashboard", "Health Lab", "Connect", "Settings"].map((item, i) => (
              <button
                key={item}
                style={{
                  padding: "6px 14px",
                  borderRadius: T.radiusFull,
                  border: "none",
                  background: i === 0 ? T.accentSoft : "transparent",
                  color: i === 0 ? T.accentDark : T.textSecondary,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: T.font,
                  transition: "all 0.15s ease",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: T.textTertiary }}>● All synced</span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: T.radiusFull,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.white,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            KF
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        {/* ── HEADER ── */}
        <div style={{ marginBottom: 28, animation: "slideUp 0.4s ease" }}>
          <div style={{ fontSize: 13, color: T.textTertiary, marginBottom: 4 }}>
            Monday, March 2, 2026
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            Good morning, Kristen
          </h1>
        </div>

        {/* ── TWO COLUMN LAYOUT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── READINESS + VITALS ── */}
            <Card style={{ padding: 24, animation: "slideUp 0.5s ease" }}>
              <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                <ReadinessRing score={readiness.score} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: T.radiusFull, background: T.green }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
                      {readiness.headline}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
                    {readiness.summary}
                  </p>
                  <div style={{ display: "flex", gap: 24 }}>
                    {[
                      { label: "HRV", value: `${readiness.hrv}ms`, sub: readiness.hrvTrend, color: T.accent },
                      { label: "RHR", value: `${readiness.rhr} bpm`, sub: "baseline: 50", color: T.blue },
                      { label: "Sleep", value: readiness.sleepDuration, sub: `Score: ${readiness.sleepScore}`, color: T.purple },
                      { label: "Deep", value: readiness.deepSleep, sub: "+33% vs avg", color: T.accent },
                    ].map(metric => (
                      <div key={metric.label}>
                        <div style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {metric.label}
                        </div>
                        <div style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 600, color: T.text }}>
                          {metric.value}
                        </div>
                        <div style={{ fontSize: 11, color: metric.color, fontWeight: 500, marginTop: 2 }}>
                          {metric.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── ACTION ITEMS ── */}
            <Card style={{ animation: "slideUp 0.6s ease" }}>
              <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Action Items</h2>
                  <div style={{ display: "flex", gap: 2 }}>
                    {actionTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveActionTab(tab.key)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: T.radiusFull,
                          border: "none",
                          background: activeActionTab === tab.key ? T.text : "transparent",
                          color: activeActionTab === tab.key ? T.white : T.textSecondary,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: T.font,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tab.label}
                        <span style={{ marginLeft: 4, opacity: 0.6 }}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 6px 12px" }}>
                {actionItems[activeActionTab].map((item, i) => (
                  <ActionItem key={item.id} item={item} index={i} />
                ))}
              </div>
            </Card>

            {/* ── LAST RIDE ── */}
            <Card style={{ animation: "slideUp 0.7s ease" }} hover>
              <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 2 }}>{lastRide.date}</div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{lastRide.name}</h3>
                  </div>
                  <button
                    style={{
                      padding: "6px 14px",
                      borderRadius: T.radiusFull,
                      border: `1px solid ${T.border}`,
                      background: T.white,
                      color: T.text,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    View Full Analysis →
                  </button>
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {[
                    { label: "Duration", value: lastRide.duration },
                    { label: "Distance", value: lastRide.distance },
                    { label: "Elevation", value: lastRide.elevation },
                    { label: "Calories", value: lastRide.calories, unit: "kcal" },
                    { label: "NP", value: `${lastRide.np}`, unit: "W" },
                    { label: "Avg HR", value: `${lastRide.avgHr}`, unit: "bpm" },
                    { label: "HR Drift", value: lastRide.hrDrift, highlight: true },
                    { label: "EF", value: `${lastRide.ef}`, unit: "W/bpm" },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {m.label}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                        <span style={{
                          fontFamily: T.fontMono,
                          fontSize: 18,
                          fontWeight: 600,
                          color: m.highlight ? T.accent : T.text,
                        }}>
                          {m.value}
                        </span>
                        {m.unit && <span style={{ fontSize: 11, color: T.textTertiary }}>{m.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── TRAINING WEEK + FITNESS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, animation: "slideUp 0.8s ease" }}>
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>This Week's Plan</div>
                <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 16 }}>
                  Projected TSS: {weeklyTraining.reduce((a, b) => a + b.tss, 0)}
                </div>
                <TrainingWeek />
              </Card>
              <Card style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Fitness & Form</div>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  {[
                    { label: "CTL", value: "82", color: T.accent },
                    { label: "ATL", value: "76", color: T.red },
                    { label: "TSB", value: "+6", color: T.blue },
                  ].map(m => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: m.color }} />
                      <span style={{ fontSize: 11, color: T.textTertiary }}>{m.label}:</span>
                      <span style={{ fontSize: 12, fontFamily: T.fontMono, fontWeight: 600, color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
                <FitnessChart />
              </Card>
            </div>
          </div>

          {/* ── RIGHT COLUMN — AI INSIGHTS ── */}
          <div style={{ position: "sticky", top: 80, animation: "slideUp 0.5s ease" }}>
            <Card style={{ overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: T.white, fontSize: 14 }}>✦</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>AI Analysis</div>
                    <div style={{ fontSize: 11, color: T.accent, fontWeight: 500 }}>Powered by Claude</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {insightCategories.filter(c => c.count > 0).map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setInsightFilter(cat.key)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: T.radiusFull,
                        border: `1px solid ${insightFilter === cat.key ? T.borderStrong : T.border}`,
                        background: insightFilter === cat.key ? T.surfaceHover : T.white,
                        color: insightFilter === cat.key ? T.text : T.textTertiary,
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: T.font,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {cat.label}
                      <span style={{ marginLeft: 3, opacity: 0.5 }}>{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Post-ride summary */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.accentSoft }}>
                <div style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Post-Ride Analysis · Feb 28
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontWeight: 500 }}>
                  You crushed a 7-hour Belgian-style endurance ride — 182km with 2,086m elevation at NP 204W. 
                  Your cardiac drift was just 2.96% over 7 hours, which is exceptional. Deep sleep of 1h 17m 
                  the night before set you up perfectly, and your HRV has climbed from 109ms to 121ms post-ride.
                </p>
              </div>

              {/* Insights list */}
              <div style={{ padding: "12px 16px", maxHeight: 520, overflowY: "auto" }}>
                {filteredInsights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>

              {/* Ask Claude */}
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: T.radiusSm,
                    border: `1px solid ${T.border}`,
                    background: T.surfaceHover,
                    cursor: "text",
                  }}
                >
                  <span style={{ fontSize: 14 }}>✦</span>
                  <span style={{ fontSize: 13, color: T.textTertiary }}>
                    Ask Claude about your training...
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

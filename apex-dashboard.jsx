import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0a0a0f",
  surface: "#12121a",
  surfaceHover: "#1a1a25",
  card: "#16161f",
  cardBorder: "#ffffff08",
  accent: "#00e5a0",
  accentDim: "#00e5a020",
  accentMid: "#00e5a060",
  warning: "#ffb800",
  danger: "#ff4757",
  text: "#e8e8ed",
  textMuted: "#8888a0",
  textDim: "#55556a",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  orange: "#f97316",
  pink: "#ec4899",
};

// ── ATHLETE PROFILE (Withings + computed) ──
const athlete = {
  weight: 89.0, // kg — from Withings
  prevWeight: 89.8,
  bodyFat: 12.4, // % — from Withings
  muscleMass: 42.1, // % — from Withings
  boneMass: 3.8, // kg
  hydration: 62, // %
  leanMass: 89.0 * (1 - 0.124), // 78.0 kg
  ftp: 298, // watts
  lthr: 168, // bpm
  maxHR: 192,
  restingHR: 48,
  bikeWeight: 7.8, // kg
  height: 182, // cm
  age: 32,
  sex: "M",
};

// ── RIDE DATA ──
const ride = {
  duration: 11520, // seconds (3h 12m)
  distance: 110.1, // km (68.4 mi)
  elevation: 1597, // meters (5,240 ft)
  avgPower: 248,
  maxPower: 842,
  normalizedPower: 272,
  avgHR: 152,
  maxHR: 184,
  avgCadence: 88,
  maxCadence: 112,
  avgSpeed: 34.4, // km/h
  maxSpeed: 72.3,
  temperature: 35, // °C (95°F)
  work: 2858, // kJ
  leftRight: { avg: [51, 49], final: [53, 47] },
  powerData: Array.from({ length: 192 }, (_, i) => 200 + Math.sin(i / 10) * 80 + Math.random() * 40),
  hrData: Array.from({ length: 192 }, (_, i) => 140 + (i / 192) * 20 + Math.random() * 8),
};

// ── AUTO-CALCULATED TRAININGPEAKS METRICS ──
const computed = (() => {
  const IF = ride.normalizedPower / athlete.ftp; // Intensity Factor
  const TSS = (ride.duration * ride.normalizedPower * IF) / (athlete.ftp * 3600) * 100;
  const VI = ride.normalizedPower / ride.avgPower; // Variability Index
  const EF = ride.normalizedPower / ride.avgHR; // Efficiency Factor (W/bpm)
  const wPerKg = ride.avgPower / athlete.weight;
  const npPerKg = ride.normalizedPower / athlete.weight;
  const ftpPerKg = athlete.ftp / athlete.weight;
  const ftpPerLeanKg = athlete.ftp / athlete.leanMass;
  const calories = ride.work * 1.1; // ~kJ * 1.1 = kcal (rough)
  const hrDrift = 8.1; // % — calculated from first half avg HR vs second half
  const pwHR = ride.normalizedPower / ride.avgHR; // power:HR ratio
  const chronoRace = ride.duration / ride.distance; // seconds per km
  // Climbing metrics
  const VAM = (ride.elevation / (ride.duration / 3600)) ; // meters/hour
  const climbWkg = npPerKg; // simplified for display
  const totalSystemWeight = athlete.weight + athlete.bikeWeight; // kg
  // Weight impact calculations
  const wattsPerKgClimb = (grade) => {
    const gravity = 9.81;
    const rollingRes = 0.005;
    const speed = 4.5; // m/s (~16 km/h climbing)
    const dragCdA = 0.32;
    const airDensity = 1.2;
    const gradeDecimal = grade / 100;
    const gravityForce = totalSystemWeight * gravity * gradeDecimal;
    const rollingForce = totalSystemWeight * gravity * rollingRes;
    const aeroForce = 0.5 * airDensity * dragCdA * speed * speed;
    return (gravityForce + rollingForce + aeroForce);
  };
  const wattsAt6pct = wattsPerKgClimb(6);
  const wattsPerLbAt6pct = (wattsPerKgClimb(6) - (() => {
    const newWeight = totalSystemWeight - 0.4536;
    const gravity = 9.81;
    const gradeDecimal = 0.06;
    const speed = 4.5;
    return newWeight * gravity * gradeDecimal + newWeight * gravity * 0.005 + 0.5 * 1.2 * 0.32 * speed * speed;
  })());
  // CTL/ATL/TSB
  const CTL = 85;
  const ATL = 92;
  const TSB = CTL - ATL;

  return {
    IF: IF.toFixed(2),
    TSS: Math.round(TSS),
    VI: VI.toFixed(2),
    EF: EF.toFixed(2),
    wPerKg: wPerKg.toFixed(2),
    npPerKg: npPerKg.toFixed(2),
    ftpPerKg: ftpPerKg.toFixed(2),
    ftpPerLeanKg: ftpPerLeanKg.toFixed(2),
    calories: Math.round(calories),
    hrDrift,
    pwHR: pwHR.toFixed(2),
    VAM: Math.round(VAM),
    wattsAt6pct: Math.round(wattsAt6pct),
    wattsPerLbAt6pct: wattsPerLbAt6pct.toFixed(1),
    totalSystemWeight: totalSystemWeight.toFixed(1),
    CTL, ATL, TSB,
    // Time in zones (min) — from power data
    zoneTime: { z1: 42, z2: 68, z3: 24, z4: 18, z5: 8, z6: 3 },
  };
})();

// ── BENCHMARK DATABASE ──
// Coggan power profile table (W/kg) by category and duration
// Source: Training and Racing with a Power Meter (Coggan/Allen), adapted for weight class
const benchmarks = {
  // W/kg values for Male 75-90kg range
  male: {
    worldTour: { "5s": 24.04, "1m": 11.50, "5m": 7.60, "20m": 6.40, "60m": 6.10 },
    domestic: { "5s": 22.00, "1m": 10.00, "5m": 6.50, "20m": 5.60, "60m": 5.30 },
    cat1: { "5s": 20.00, "1m": 8.80, "5m": 5.60, "20m": 5.00, "60m": 4.70 },
    cat2: { "5s": 18.00, "1m": 7.50, "5m": 4.90, "20m": 4.30, "60m": 4.00 },
    cat3: { "5s": 16.00, "1m": 6.50, "5m": 4.20, "20m": 3.70, "60m": 3.40 },
    cat4: { "5s": 14.00, "1m": 5.50, "5m": 3.50, "20m": 3.10, "60m": 2.80 },
    cat5: { "5s": 11.00, "1m": 4.50, "5m": 2.80, "20m": 2.50, "60m": 2.20 },
  },
};

// Athlete's actual W/kg at each duration
const athletePowerProfile = {
  "5s": { watts: 1150, wkg: (1150 / athlete.weight).toFixed(2) },
  "1m": { watts: 520, wkg: (520 / athlete.weight).toFixed(2) },
  "5m": { watts: 355, wkg: (355 / athlete.weight).toFixed(2) },
  "20m": { watts: 298, wkg: (298 / athlete.weight).toFixed(2) },
  "60m": { watts: 275, wkg: (275 / athlete.weight).toFixed(2) },
};

// Classify each duration into a category
function classifyPower(wkg, duration) {
  const cats = benchmarks.male;
  if (wkg >= cats.worldTour[duration]) return { level: "World Tour", color: "#ffd700", idx: 0 };
  if (wkg >= cats.domestic[duration]) return { level: "Domestic Pro", color: "#c0c0c0", idx: 1 };
  if (wkg >= cats.cat1[duration]) return { level: "Cat 1", color: "#cd7f32", idx: 2 };
  if (wkg >= cats.cat2[duration]) return { level: "Cat 2", color: COLORS.purple, idx: 3 };
  if (wkg >= cats.cat3[duration]) return { level: "Cat 3", color: COLORS.blue, idx: 4 };
  if (wkg >= cats.cat4[duration]) return { level: "Cat 4", color: COLORS.accent, idx: 5 };
  return { level: "Cat 5", color: COLORS.textMuted, idx: 6 };
}

const athleteClassifications = Object.fromEntries(
  Object.entries(athletePowerProfile).map(([dur, data]) => [
    dur,
    { ...data, ...classifyPower(parseFloat(data.wkg), dur) },
  ])
);

// Calculate % of next level for each duration
function pctToNextLevel(wkg, duration) {
  const cats = benchmarks.male;
  const levels = ["cat5", "cat4", "cat3", "cat2", "cat1", "domestic", "worldTour"];
  const val = parseFloat(wkg);
  for (let i = levels.length - 1; i >= 0; i--) {
    if (val >= cats[levels[i]][duration]) {
      if (i === levels.length - 1) return { pct: 100, nextLevel: "World Tour", needed: 0 };
      const current = cats[levels[i]][duration];
      const next = cats[levels[i + 1]] ? cats[levels[i + 1]][duration] : current;
      const pct = ((val - current) / (next - current)) * 100;
      const nextName = levels[i + 1] === "worldTour" ? "World Tour" : levels[i + 1] === "domestic" ? "Domestic Pro" : levels[i + 1].replace("cat", "Cat ");
      const neededWkg = next - val;
      const neededWatts = Math.round(neededWkg * athlete.weight);
      return { pct: Math.min(pct, 100), nextLevel: nextName, neededWkg: neededWkg.toFixed(2), neededWatts };
    }
  }
  return { pct: 0, nextLevel: "Cat 5", neededWkg: 0, neededWatts: 0 };
}

// Prescribed workouts based on identified weaknesses
const workoutPrescriptions = {
  vo2max: [
    { name: "Classic 5×5'", desc: "5 × 5 min at 108-112% FTP with 5 min recovery", target: `${Math.round(athlete.ftp * 1.08)}-${Math.round(athlete.ftp * 1.12)}W`, tss: 85, time: "1h 10m", focus: "VO2max ceiling" },
    { name: "30/30s", desc: "3 sets of 8 × 30s on / 30s off at 120-130% FTP", target: `${Math.round(athlete.ftp * 1.20)}-${Math.round(athlete.ftp * 1.30)}W`, tss: 70, time: "1h", focus: "VO2max repeatability" },
    { name: "4×4 Norwegian", desc: "4 × 4 min at 110-115% FTP with 3 min recovery", target: `${Math.round(athlete.ftp * 1.10)}-${Math.round(athlete.ftp * 1.15)}W`, tss: 75, time: "1h 05m", focus: "VO2max sustained" },
    { name: "Billats", desc: "3 sets of 6 × 1 min at 120% FTP / 1 min at 50%", target: `${Math.round(athlete.ftp * 1.20)}W / ${Math.round(athlete.ftp * 0.50)}W`, tss: 65, time: "55m", focus: "VO2max accumulation" },
    { name: "Rønnestad 3×13", desc: "3 sets of 13 × 30s at 130% / 15s at 50%", target: `${Math.round(athlete.ftp * 1.30)}W / ${Math.round(athlete.ftp * 0.50)}W`, tss: 72, time: "1h", focus: "VO2max & anaerobic" },
  ],
  threshold: [
    { name: "2×20 Classic", desc: "2 × 20 min at 95-100% FTP with 5 min recovery", target: `${Math.round(athlete.ftp * 0.95)}-${athlete.ftp}W`, tss: 90, time: "1h 15m", focus: "FTP sustainment" },
    { name: "Over/Unders", desc: "3 × 12 min alternating 2 min at 105% / 2 min at 90%", target: `${Math.round(athlete.ftp * 1.05)}/${Math.round(athlete.ftp * 0.90)}W`, tss: 80, time: "1h 10m", focus: "Lactate clearance" },
  ],
  sprint: [
    { name: "Sprint Repeats", desc: "8 × 15s all-out sprints with 3 min recovery", target: "Max effort", tss: 45, time: "45m", focus: "Peak neuromuscular power" },
    { name: "Standing Starts", desc: "6 × 20s from standstill, max effort, 5 min recovery", target: "Max effort", tss: 40, time: "50m", focus: "Sprint acceleration" },
  ],
};
  { zone: "Z1 Recovery", min: 0, max: Math.round(athlete.ftp * 0.55), time: 42, color: "#6b7280" },
  { zone: "Z2 Endurance", min: Math.round(athlete.ftp * 0.55), max: Math.round(athlete.ftp * 0.75), time: 68, color: "#3b82f6" },
  { zone: "Z3 Tempo", min: Math.round(athlete.ftp * 0.75), max: Math.round(athlete.ftp * 0.90), time: 24, color: "#10b981" },
  { zone: "Z4 Threshold", min: Math.round(athlete.ftp * 0.90), max: Math.round(athlete.ftp * 1.05), time: 18, color: "#f59e0b" },
  { zone: "Z5 VO2max", min: Math.round(athlete.ftp * 1.05), max: Math.round(athlete.ftp * 1.20), time: 8, color: "#ef4444" },
  { zone: "Z6 Anaerobic", min: Math.round(athlete.ftp * 1.20), max: 9999, time: 3, color: "#8b5cf6" },
];

const weeklyTSS = [
  { day: "Mon", tss: 85 }, { day: "Tue", tss: 120 }, { day: "Wed", tss: 0 },
  { day: "Thu", tss: 95 }, { day: "Fri", tss: 65 }, { day: "Sat", tss: 180 }, { day: "Sun", tss: 45 },
];

const fitnessHistory = [
  { week: "W1", ctl: 72, atl: 65, tsb: 7 }, { week: "W2", ctl: 74, atl: 78, tsb: -4 },
  { week: "W3", ctl: 76, atl: 82, tsb: -6 }, { week: "W4", ctl: 75, atl: 60, tsb: 15 },
  { week: "W5", ctl: 77, atl: 70, tsb: 7 }, { week: "W6", ctl: 79, atl: 85, tsb: -6 },
  { week: "W7", ctl: 81, atl: 90, tsb: -9 }, { week: "W8", ctl: 80, atl: 62, tsb: 18 },
  { week: "W9", ctl: 82, atl: 75, tsb: 7 }, { week: "W10", ctl: 84, atl: 88, tsb: -4 },
  { week: "W11", ctl: 86, atl: 92, tsb: -6 }, { week: "W12", ctl: 85, atl: 58, tsb: 27 },
];

const powerCurve = [
  { duration: "5s", power: 1150, benchmark: 1200 }, { duration: "15s", power: 920, benchmark: 950 },
  { duration: "30s", power: 680, benchmark: 720 }, { duration: "1m", power: 520, benchmark: 540 },
  { duration: "2m", power: 410, benchmark: 430 }, { duration: "5m", power: 355, benchmark: 380 },
  { duration: "10m", power: 320, benchmark: 340 }, { duration: "20m", power: 298, benchmark: 310 },
  { duration: "60m", power: 275, benchmark: 290 },
];

// ── REUSABLE COMPONENTS ──

function MiniBar({ value, max, color, label, subLabel }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</span>
        <span style={{ fontSize: 11, color: COLORS.text, fontWeight: 600 }}>{subLabel}</span>
      </div>
      <div style={{ height: 6, background: COLORS.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </div>
  );
}

function Sparkline({ data, width = 120, height = 32, color = COLORS.accent }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const id = `grad-${color.replace("#", "")}-${Math.random().toString(36).slice(2, 6)}`;
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

function MetricCard({ label, value, unit, trend, trendDir, sparkData, color = COLORS.accent, icon }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
            {unit && <span style={{ fontSize: 11, color: COLORS.textMuted }}>{unit}</span>}
          </div>
          {trend && (
            <div style={{ fontSize: 10, marginTop: 3, color: trendDir === "up" ? COLORS.accent : trendDir === "down" ? COLORS.danger : COLORS.textMuted }}>
              {trendDir === "up" ? "↑" : trendDir === "down" ? "↓" : "→"} {trend}
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
      <span style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: color || COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: 3 }}>{unit}</span>}
        {sub && <div style={{ fontSize: 9, color: COLORS.textDim }}>{sub}</div>}
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
          fill="none" stroke={COLORS.cardBorder} strokeWidth="0.5" />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => (<line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={COLORS.cardBorder} strokeWidth="0.5" />))}
      {/* Cat 1 reference */}
      <polygon points={makePolygon("cat1")} fill={`${COLORS.purple}08`} stroke={COLORS.purple} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      {/* Cat 2 reference */}
      <polygon points={makePolygon("cat2")} fill={`${COLORS.blue}08`} stroke={COLORS.blue} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
      {/* Athlete */}
      <polygon points={makePolygon("athlete")} fill={`${COLORS.accent}15`} stroke={COLORS.accent} strokeWidth="2" />
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
            <circle cx={x} cy={y} r="4" fill={cls.color} stroke={COLORS.bg} strokeWidth="1.5" />
            <text x={lx} y={ly - 5} textAnchor="middle" fill={COLORS.text} fontSize="9" fontWeight="700">{labels[i]}</text>
            <text x={lx} y={ly + 5} textAnchor="middle" fill={cls.color} fontSize="7.5" fontWeight="600">{cls.level}</text>
            <text x={lx} y={ly + 14} textAnchor="middle" fill={COLORS.textDim} fontSize="7">{athletePowerProfile[dur].wkg} W/kg</text>
          </g>
        );
      })}
      {/* Legend */}
      <line x1={10} x2={22} y1={210} y2={210} stroke={COLORS.accent} strokeWidth="2" />
      <text x={25} y={213} fill={COLORS.textMuted} fontSize="7">You</text>
      <line x1={55} x2={67} y1={210} y2={210} stroke={COLORS.purple} strokeWidth="1" strokeDasharray="3,3" />
      <text x={70} y={213} fill={COLORS.textMuted} fontSize="7">Cat 1</text>
      <line x1={100} x2={112} y1={210} y2={210} stroke={COLORS.blue} strokeWidth="1" strokeDasharray="3,3" />
      <text x={115} y={213} fill={COLORS.textMuted} fontSize="7">Cat 2</text>
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
        const isStrength = cls.idx <= 2; // Cat 1 or above = strength
        return (
          <div key={dur} style={{ background: COLORS.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${isWeakness ? `${COLORS.warning}20` : "transparent"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>{labels[i]}</span>
                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${cls.color}20`, color: cls.color, fontWeight: 700 }}>{cls.level}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, fontFamily: "JetBrains Mono" }}>{cls.watts}W</span>
                <span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: 4 }}>{cls.wkg} W/kg</span>
              </div>
            </div>
            {/* Progress to next level */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: `${COLORS.cardBorder}`, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${next.pct}%`, background: `linear-gradient(90deg, ${cls.color}80, ${cls.color})`, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 9, color: COLORS.textDim, whiteSpace: "nowrap" }}>
                {next.neededWatts > 0 ? `+${next.neededWatts}W to ${next.nextLevel}` : "✓ Top level"}
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
      <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 10 }}>{subtitle}</div>
      {workouts.map((w, i) => (
        <div key={i}
          onClick={() => setExpanded(expanded === i ? null : i)}
          style={{ background: COLORS.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer", border: `1px solid ${expanded === i ? COLORS.accentMid : "transparent"}`, transition: "all 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{w.name}</span>
              <span style={{ fontSize: 9, color: COLORS.textDim, marginLeft: 8 }}>{w.focus}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: COLORS.accentMid, fontFamily: "JetBrains Mono" }}>{w.target}</span>
              <span style={{ fontSize: 10, color: COLORS.textDim }}>{expanded === i ? "▾" : "▸"}</span>
            </div>
          </div>
          {expanded === i && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.cardBorder}` }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 6 }}>{w.desc}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                <span style={{ color: COLORS.textDim }}>⏱ {w.time}</span>
                <span style={{ color: COLORS.textDim }}>📊 ~{w.tss} TSS</span>
                <span style={{ color: COLORS.accent }}>🎯 {w.target}</span>
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
    // BODY COMPOSITION → PERFORMANCE
    {
      type: "insight", icon: "⚖️", category: "body",
      title: "Weight Impact on Today's Climbing",
      body: `At your current ${athlete.weight}kg + ${athlete.bikeWeight}kg bike (${computed.totalSystemWeight}kg system weight), you needed ${computed.wattsAt6pct}W to maintain 16 km/h on the 6% grades today. Every 1 lb (0.45kg) you gain or lose shifts that requirement by ~${computed.wattsPerLbAt6pct}W. Your recent 0.8kg drop saved you ~3.5W on every climb today — that's free speed.`,
      confidence: "high",
    },
    {
      type: "positive", icon: "📊", category: "body",
      title: "FTP/Lean Mass Ratio Improving",
      body: `Your FTP per kg of lean body mass is ${computed.ftpPerLeanKg} W/kg — up from 3.62 W/kg six weeks ago. This is a better performance indicator than raw W/kg because it filters out fat mass changes. Your muscle mass is stable at ${athlete.muscleMass}% while body fat dropped from 14.2% → ${athlete.bodyFat}%, meaning your power gains are genuine neuromuscular adaptations, not just weight loss.`,
      confidence: "high",
    },
    {
      type: "warning", icon: "💧", category: "body",
      title: "Hydration Was Low Before This Ride",
      body: `Your Withings hydration reading this morning was ${athlete.hydration}% — below your 65% baseline. In hot conditions (today was ${ride.temperature}°C), starting under-hydrated compounds cardiac drift. Your 8.1% drift today vs. 3.2% on a similar effort when you weighed in at 65% hydration suggests ~2-3% of today's drift was hydration-related, not fitness. Weigh yourself before and after rides to track sweat rate.`,
      confidence: "medium",
    },
    {
      type: "action", icon: "🏔️", category: "body",
      title: "Race Weight Projection for Mt. Tam Hillclimb",
      body: `Your hillclimb race is in 18 days. At current rate (-0.5kg/week), you'll be ~86.4kg on race day = ${(athlete.ftp / 86.4).toFixed(2)} W/kg. If you hold FTP at 298W, that's a projected VAM of ~1,340 m/hr on the 7.4% avg gradient — roughly 38:20 for the 8.2km climb. Every additional kg lost would save ~18 seconds. But dropping below 86kg at your muscle mass risks power loss.`,
      confidence: "medium",
    },
    // RECOVERY → PERFORMANCE
    {
      type: "warning", icon: "😴", category: "recovery",
      title: "Poor Sleep Drove Today's HR Drift",
      body: "Deep sleep was 48 min last night (avg: 1h 42m) and HRV dropped to 38ms (avg: 68ms). This likely explains the 8.1% cardiac drift — on Feb 18 with similar power but 72ms HRV, drift was only 3.2%. Your aerobic engine is fit, but your body was under-recovered.",
      confidence: "high",
    },
    {
      type: "insight", icon: "📉", category: "recovery",
      title: "3-Night HRV Decline → Power Fade Pattern",
      body: "Your overnight HRV has declined 74ms → 62ms → 38ms over 3 nights. Historically, when HRV drops below 45ms for 2+ consecutive days, your NP drops 8-14% on comparable efforts. Today's NP was 272W vs. your 285W average — a 4.6% drop. Z1/Z2 only tomorrow.",
      confidence: "high",
    },
    {
      type: "action", icon: "🌡️", category: "recovery",
      title: "EightSleep + Sleep Timing Optimization",
      body: "Your deep sleep is 34% higher at -4°C vs. -1°C (last night's setting). Combined with your optimal sleep window (before 10:15 PM = best performances), tonight set bed to -4°C and lights out by 10 PM. Your HRV should rebound 15-20ms within 48 hours based on your historical recovery curves.",
      confidence: "medium",
    },
    {
      type: "warning", icon: "🔋", category: "recovery",
      title: "Whoop Strain Exceeding Recovery",
      body: "7-day cumulative strain: 18.4 (daily avg: 15.2), but recovery averaging only 48%. Combined with declining HRV and elevated RHR (52 vs. baseline 48), you're accumulating more fatigue than you're absorbing. Your ATL (92) is 8% above CTL (85) — productive overreach, but approaching the red line.",
      confidence: "high",
    },
    // PERFORMANCE
    {
      type: "positive", icon: "🎯", category: "performance",
      title: `Efficiency Factor: ${computed.EF} W/bpm`,
      body: `Your EF (NP/avg HR) of ${computed.EF} is your second-highest this season, despite poor recovery. On well-rested days, you've hit ${(272/148).toFixed(2)}. This confirms your aerobic base is strong — the drift today was recovery-driven, not fitness-driven. Your 14.5 hrs/week of Z2 over the past month is paying off.`,
      confidence: "high",
    },
    {
      type: "warning", icon: "⚡", category: "performance",
      title: "VO2max Power: Cat 3 — Your Weakest Link",
      body: `Your 5-min power of 355W (${athletePowerProfile["5m"].wkg} W/kg) classifies as ${athleteClassifications["5m"].level}, while your 20-min threshold is ${athleteClassifications["20m"].level} at ${athletePowerProfile["20m"].wkg} W/kg. That's a 2-tier gap. Your VO2/FTP ratio is ${(355/298).toFixed(2)} — well below the 1.25 target. You need +${pctToNextLevel(athletePowerProfile["5m"].wkg, "5m").neededWatts}W at 5-min to reach ${pctToNextLevel(athletePowerProfile["5m"].wkg, "5m").nextLevel}. I'd recommend 2× per week VO2 sessions for 6-8 weeks.`,
      confidence: "high",
    },
    {
      type: "action", icon: "🏋️", category: "performance",
      title: "Prescribed: VO2max Block (6-8 weeks)",
      body: `Based on your power profile, VO2max is your biggest limiter. Target intensity: ${Math.round(athlete.ftp * 1.08)}-${Math.round(athlete.ftp * 1.15)}W (108-115% FTP). Start with 4×4min / 3min rest, progress to 5×5min / 5min rest. On recovery weeks, use 30/30s (${Math.round(athlete.ftp * 1.20)}-${Math.round(athlete.ftp * 1.30)}W) to maintain stimulus. Goal: raise 5-min from 355W → 380W+ (${(380/athlete.weight).toFixed(2)} W/kg = ${classifyPower(380/athlete.weight, "5m").level}). See workout library below for specific sessions.`,
      confidence: "high",
    },
    {
      type: "positive", icon: "🏆", category: "performance",
      title: "Sprint & Threshold: Cat 2 — Genuine Strengths",
      body: `Your 5s sprint (${athletePowerProfile["5s"].wkg} W/kg) and 20-min threshold (${athletePowerProfile["20m"].wkg} W/kg) are both solidly ${athleteClassifications["20m"].level}. You're only ${pctToNextLevel(athletePowerProfile["20m"].wkg, "20m").neededWatts}W away from ${pctToNextLevel(athletePowerProfile["20m"].wkg, "20m").nextLevel} at threshold. For a climber/rouleur profile, these numbers are competitive — your limiter is the VO2 gap between them. World Tour riders at your weight would hold ${Math.round(benchmarks.male.worldTour["5m"] * athlete.weight)}W for 5 min and ${Math.round(benchmarks.male.worldTour["20m"] * athlete.weight)}W for 20 min.`,
      confidence: "high",
    },
    {
      type: "insight", icon: "🌡️", category: "performance",
      title: "Heat Adaptation Nearly Complete",
      body: `Power:HR at 95°F today was ${computed.pwHR} W/bpm vs. 1.45 at 68°F three weeks ago — only a 2% gap. Early summer, heat caused a 21% drop. Your plasma volume expansion is nearly complete. For your race, if temps exceed 90°F, you'll lose <3% power vs. cooler conditions.`,
      confidence: "high",
    },
    // TRAINING LOAD
    {
      type: "action", icon: "📊", category: "training",
      title: "Taper Protocol for Race Day",
      body: `CTL ${computed.CTL}, TSB ${computed.TSB}. Race in 18 days → begin taper in ~4 days. Target TSB +15 to +20 by race day. Reduce volume 40% next week, maintain 2 short intensity sessions (10-12 min total at VO2/threshold). Predicted race-day CTL: ~80, which historically correlates with your best performances.`,
      confidence: "high",
    },
    {
      type: "insight", icon: "⏱️", category: "training",
      title: "Threshold Volume Driving FTP Gains",
      body: "You've accumulated 312 minutes between 88-105% FTP in the last 8 weeks. Your FTP rose from 290W → 298W during this period. Historically, your FTP responds to threshold volume with a ~6 week delay. The work you did in weeks 3-5 is what's showing up now. Keep this volume through your build phase.",
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
        text: `Great question. Here's your power profile vs. benchmarks at ${athlete.weight}kg:\n\n• Sprint (5s): ${athletePowerProfile["5s"].wkg} W/kg → ${athleteClassifications["5s"].level} ✓\n• Anaerobic (1m): ${athletePowerProfile["1m"].wkg} W/kg → ${athleteClassifications["1m"].level}\n• VO2max (5m): ${athletePowerProfile["5m"].wkg} W/kg → ${athleteClassifications["5m"].level} ← LIMITER\n• Threshold (20m): ${athletePowerProfile["20m"].wkg} W/kg → ${athleteClassifications["20m"].level} ✓\n• Endurance (60m): ${athletePowerProfile["60m"].wkg} W/kg → ${athleteClassifications["60m"].level}\n\nYour profile shows a classic "threshold rider with a VO2 gap." You have the engine but can't access the top end. For context, a World Tour rider at your weight would hold ${Math.round(benchmarks.male.worldTour["5m"] * athlete.weight)}W for 5 min vs. your 355W.\n\nI'd prescribe a 6-8 week VO2 block: Start with 4×4min at ${Math.round(athlete.ftp * 1.08)}-${Math.round(athlete.ftp * 1.12)}W (108-112% FTP) with 3min rest. Progress to 5×5min at ${Math.round(athlete.ftp * 1.10)}-${Math.round(athlete.ftp * 1.15)}W with 5min rest. On alternate days, try 30/30s: 8 reps of 30s at ${Math.round(athlete.ftp * 1.25)}W / 30s easy. Do these 2× per week. Goal: get 5-min power from 355W to 380W+ within 8 weeks, which moves you from ${athleteClassifications["5m"].level} to ${classifyPower(380/athlete.weight, "5m").level}.`,
      }]);
    }, 2500);
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isTyping]);

  const tabs = [{ id: "analysis", label: "AI Analysis" }, { id: "chat", label: "Ask Claude" }];

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 16, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: COLORS.bg }}>✦</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Apex Intelligence</div>
            <div style={{ fontSize: 9, color: COLORS.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Powered by Claude</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 600, color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted, cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${COLORS.accent}` : "2px solid transparent", transition: "all 0.2s" }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: activeTab === "chat" ? 0 : "14px 18px" }}>
        {activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Post-Ride Analysis · Today 3:42pm</div>

            {/* Recovery alert banner */}
            <div style={{ background: `linear-gradient(135deg, ${COLORS.danger}12, ${COLORS.warning}08)`, border: `1px solid ${COLORS.danger}25`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${COLORS.danger}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: COLORS.danger, fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, lineHeight: 1 }}>38</div><div style={{ fontSize: 7, opacity: 0.7 }}>HRV</div></div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.danger, marginBottom: 2 }}>⚠️ Under-Recovered State</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.4 }}>HRV 38ms (avg 68) · Deep 48m (avg 1h42m) · RHR 52 (base 48) · Whoop 34%</div>
              </div>
            </div>

            {/* Category pills */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {insightCategories.map(cat => (
                <button key={cat.id} onClick={() => setInsightFilter(cat.id)} style={{ background: insightFilter === cat.id ? `${COLORS.accent}18` : COLORS.bg, border: `1px solid ${insightFilter === cat.id ? COLORS.accentMid : COLORS.cardBorder}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: insightFilter === cat.id ? COLORS.accent : COLORS.textMuted, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5 }}>
                  {cat.label}
                  <span style={{ fontSize: 8, background: insightFilter === cat.id ? `${COLORS.accent}30` : `${COLORS.textDim}30`, padding: "1px 4px", borderRadius: 6, color: insightFilter === cat.id ? COLORS.accent : COLORS.textDim }}>{cat.count}</span>
                </button>
              ))}
            </div>

            {filteredInsights.map((insight, i) => (
              <div key={i} style={{ background: COLORS.bg, borderRadius: 11, padding: "12px 14px", borderLeft: `3px solid ${insight.type === "positive" ? COLORS.accent : insight.type === "warning" ? COLORS.warning : insight.type === "action" ? COLORS.purple : COLORS.blue}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{insight.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, flex: 1 }}>{insight.title}</span>
                  <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 4, background: insight.confidence === "high" ? COLORS.accentDim : `${COLORS.warning}20`, color: insight.confidence === "high" ? COLORS.accent : COLORS.warning, textTransform: "uppercase", letterSpacing: "0.05em" }}>{insight.confidence}</span>
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6, color: COLORS.textMuted }}>{insight.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 6 }}>Ask me anything about your training</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                    {["How do I compare to Cat 1 riders?", "Give me a VO2max workout plan", "What's my biggest power limiter?", "How far am I from Domestic Pro?"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} style={{ background: COLORS.bg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10, padding: "9px 12px", fontSize: 11, color: COLORS.textMuted, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                        onMouseOver={e => { e.target.style.borderColor = COLORS.accentMid; e.target.style.color = COLORS.text; }}
                        onMouseOut={e => { e.target.style.borderColor = COLORS.cardBorder; e.target.style.color = COLORS.textMuted; }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px", background: msg.role === "user" ? COLORS.accent : COLORS.bg, color: msg.role === "user" ? COLORS.bg : COLORS.text, fontSize: 12, lineHeight: 1.6, fontWeight: msg.role === "user" ? 600 : 400 }}>{msg.text}</div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: "flex", gap: 4, padding: "9px 13px", background: COLORS.bg, borderRadius: 13, width: "fit-content" }}>
                  {[0, 1, 2].map(i => (<div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.accent, animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }} />))}
                </div>
              )}
            </div>
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.cardBorder}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} placeholder="Ask about your training..." style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: COLORS.text, outline: "none" }} />
                <button onClick={handleSendChat} style={{ background: COLORS.accent, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: COLORS.bg, cursor: "pointer" }}>→</button>
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
      <defs><linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.2" /><stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" /></linearGradient></defs>
      {[0, 300, 600, 900, 1200].map(v => (<g key={v}><line x1={pad.l} x2={w - pad.r} y1={toY(v)} y2={toY(v)} stroke={COLORS.cardBorder} /><text x={pad.l - 5} y={toY(v) + 3} fill={COLORS.textDim} fontSize="8" textAnchor="end" fontFamily="JetBrains Mono">{v}</text></g>))}
      <polygon points={`${pad.l},${h - pad.b} ${myLine} ${pad.l + (powerCurve.length - 1) * xStep},${h - pad.b}`} fill="url(#pcGrad)" />
      <polyline points={benchLine} fill="none" stroke={COLORS.textDim} strokeWidth="1.5" strokeDasharray="4,4" />
      <polyline points={myLine} fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" />
      {powerCurve.map((d, i) => (<g key={i}><circle cx={pad.l + i * xStep} cy={toY(d.power)} r="2.5" fill={COLORS.accent} /><text x={pad.l + i * xStep} y={h - 6} fill={COLORS.textDim} fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono">{d.duration}</text></g>))}
      <line x1={w - 130} x2={w - 115} y1={10} y2={10} stroke={COLORS.accent} strokeWidth="2" /><text x={w - 112} y={13} fill={COLORS.textMuted} fontSize="8">You</text>
      <line x1={w - 75} x2={w - 60} y1={10} y2={10} stroke={COLORS.textDim} strokeWidth="1.5" strokeDasharray="4,4" /><text x={w - 57} y={13} fill={COLORS.textMuted} fontSize="8">Benchmark</text>
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
      <line x1={pad.l} x2={w - pad.r} y1={toY(0)} y2={toY(0)} stroke={COLORS.textDim} strokeWidth="0.5" strokeDasharray="2,2" />
      {fitnessHistory.map((d, i) => { const x = pad.l + i * xStep, y0 = toY(0), y1 = toY(d.tsb); return <rect key={i} x={x - 5} y={Math.min(y0, y1)} width={10} height={Math.abs(y1 - y0)} fill={d.tsb > 0 ? `${COLORS.accent}30` : `${COLORS.danger}30`} rx={2} />; })}
      <polyline points={makeLine("ctl")} fill="none" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" />
      <polyline points={makeLine("atl")} fill="none" stroke={COLORS.pink} strokeWidth="2" strokeLinecap="round" />
      {fitnessHistory.map((d, i) => (<text key={i} x={pad.l + i * xStep} y={h - 6} fill={COLORS.textDim} fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono">{d.week}</text>))}
      <circle cx={pad.l} cy={pad.t + 2} r="3" fill={COLORS.blue} /><text x={pad.l + 7} y={pad.t + 5} fill={COLORS.textMuted} fontSize="8">CTL</text>
      <circle cx={pad.l + 50} cy={pad.t + 2} r="3" fill={COLORS.pink} /><text x={pad.l + 57} y={pad.t + 5} fill={COLORS.textMuted} fontSize="8">ATL</text>
      <rect x={pad.l + 100} y={pad.t - 2} width={7} height={7} fill={`${COLORS.accent}40`} rx={1} /><text x={pad.l + 110} y={pad.t + 5} fill={COLORS.textMuted} fontSize="8">TSB</text>
    </svg>
  );
}

// ── MAIN DASHBOARD ──
export default function ApexDashboard() {
  const [selectedRide, setSelectedRide] = useState("today");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: `1px solid ${COLORS.cardBorder}`, background: `${COLORS.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: COLORS.bg }}>A</div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>APEX</span>
            <span style={{ fontSize: 8, color: COLORS.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Dashboard", "Calendar", "Trends", "Race Planner"].map(item => (
              <button key={item} style={{ background: item === "Dashboard" ? COLORS.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: item === "Dashboard" ? COLORS.accent : COLORS.textMuted, cursor: "pointer" }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: COLORS.card, borderRadius: 7, border: `1px solid ${COLORS.cardBorder}` }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.accent }} /><span style={{ fontSize: 10, color: COLORS.textMuted }}>All synced</span>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>JD</div>
        </div>
      </nav>

      {/* Main Layout */}
      <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
        {/* Left: Dashboard */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {/* Ride Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Today · March 1, 2026</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Mt. Diablo Summit Ride</h1>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>3h 12m · 68.4 mi · 5,240 ft ↑ · 95°F · {computed.TSS} TSS</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Today", "Week", "Month", "Season"].map(p => (
                <button key={p} onClick={() => setSelectedRide(p.toLowerCase())} style={{ background: selectedRide === p.toLowerCase() ? COLORS.accent : COLORS.card, border: `1px solid ${selectedRide === p.toLowerCase() ? COLORS.accent : COLORS.cardBorder}`, padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 600, color: selectedRide === p.toLowerCase() ? COLORS.bg : COLORS.textMuted, cursor: "pointer" }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Row 1: Core power metrics (TrainingPeaks parity) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            <MetricCard label="Avg Power" value={ride.avgPower} unit="W" trend="+12W vs last wk" trendDir="up" sparkData={[220, 235, 228, 240, 242, 248]} color={COLORS.accent} icon="⚡" />
            <MetricCard label="Normalized Power" value={ride.normalizedPower} unit="W" trend={`IF: ${computed.IF}`} trendDir="up" sparkData={[255, 260, 258, 265, 268, 272]} color={COLORS.blue} icon="📊" />
            <MetricCard label="TSS" value={computed.TSS} unit="" trend={`590 weekly`} trendDir="up" color={COLORS.purple} icon="📈" />
            <MetricCard label="Variability Index" value={computed.VI} unit="" trend="Steady pacing" color={COLORS.accent} icon="〰️" />
            <MetricCard label="Efficiency Factor" value={computed.EF} unit="W/bpm" trend="2nd best this season" trendDir="up" color={COLORS.blue} icon="🎯" />
          </div>

          {/* Row 2: Body comp + weight-adjusted metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            <MetricCard label="W/kg (Avg)" value={computed.wPerKg} unit="" trend={`NP: ${computed.npPerKg} W/kg`} color={COLORS.accent} icon="🏋️" />
            <MetricCard label="FTP/kg" value={computed.ftpPerKg} unit="" trend={`Lean: ${computed.ftpPerLeanKg}`} trendDir="up" sparkData={[3.1, 3.15, 3.2, 3.25, 3.3, 3.35]} color={COLORS.accent} icon="💪" />
            <MetricCard label="Weight" value={athlete.weight} unit="kg" trend={`↓${(athlete.prevWeight - athlete.weight).toFixed(1)}kg this wk`} trendDir="up" sparkData={[91, 90.5, 90.2, 89.8, 89.4, 89]} color={COLORS.blue} icon="⚖️" />
            <MetricCard label="Body Fat" value={athlete.bodyFat} unit="%" trend={`Muscle: ${athlete.muscleMass}%`} trendDir="up" sparkData={[14.2, 13.8, 13.4, 13.0, 12.7, 12.4]} color={COLORS.orange} icon="📉" />
            <MetricCard label="VAM" value={computed.VAM} unit="m/hr" trend={`System: ${computed.totalSystemWeight}kg`} color={COLORS.purple} icon="🏔️" />
          </div>

          {/* Row 3: HR + cadence + detailed */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
            <MetricCard label="Avg HR" value={ride.avgHR} unit="bpm" trend={`${computed.hrDrift}% drift`} trendDir="down" sparkData={[148, 150, 151, 153, 156, 160]} color={COLORS.pink} icon="❤️" />
            <MetricCard label="Calories" value={computed.calories.toLocaleString()} unit="kcal" trend={`${ride.work} kJ work`} color={COLORS.orange} icon="🔥" />
            <MetricCard label="L/R Balance" value="51/49" unit="%" trend="53/47 final hr" trendDir="down" color={COLORS.warning} icon="⚖️" />
            <MetricCard label="Cadence" value={ride.avgCadence} unit="rpm" trend={`Max: ${ride.maxCadence}`} color={COLORS.accent} icon="🔄" />
            <MetricCard label="Power:HR" value={computed.pwHR} unit="W/bpm" trend="Heat-adjusted" trendDir="up" sparkData={[1.6, 1.62, 1.58, 1.65, 1.7, 1.79]} color={COLORS.accent} icon="💓" />
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Power Duration Curve</div>
              <PowerCurveChart />
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Fitness, Fatigue & Form</div>
              <FitnessChart />
            </div>
          </div>

          {/* Zones + Weekly + Climbing Calculator */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Power Zones */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Power Zones (Coggan)</div>
              {powerZones.map(z => <MiniBar key={z.zone} value={z.time} max={70} color={z.color} label={`${z.zone} (${z.min}-${z.max === 9999 ? "+" : z.max}W)`} subLabel={`${z.time}m`} />)}
            </div>

            {/* Weekly TSS */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Weekly Training Load</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
                {weeklyTSS.map(d => (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: "JetBrains Mono" }}>{d.tss || "—"}</span>
                    <div style={{ width: "100%", height: `${(d.tss / 200) * 80}px`, minHeight: d.tss ? 3 : 1, background: d.tss ? `linear-gradient(180deg, ${d.tss > 150 ? COLORS.purple : d.tss > 100 ? COLORS.blue : COLORS.accent}80, ${d.tss > 150 ? COLORS.purple : d.tss > 100 ? COLORS.blue : COLORS.accent}30)` : COLORS.cardBorder, borderRadius: 3 }} />
                    <span style={{ fontSize: 9, color: COLORS.textDim }}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: "6px 10px", background: COLORS.bg, borderRadius: 7, fontSize: 10, color: COLORS.textMuted }}>
                Weekly: <span style={{ color: COLORS.accent, fontWeight: 700 }}>590 TSS</span> · Target: 550-650 · <span style={{ color: COLORS.accent }}>On track</span>
              </div>
            </div>

            {/* Climbing / Weight Impact Calculator */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>⛰️ Climbing Impact Calculator</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 10 }}>Based on Withings weight + bike weight</div>
              <StatRow label="System Weight" value={computed.totalSystemWeight} unit="kg" sub={`Rider ${athlete.weight} + Bike ${athlete.bikeWeight}`} />
              <StatRow label="Watts needed @ 6%" value={computed.wattsAt6pct} unit="W" sub="at 16 km/h" color={COLORS.accent} />
              <StatRow label="Cost per 1 lb gained" value={`+${computed.wattsPerLbAt6pct}`} unit="W" sub="on 6% grade" color={COLORS.danger} />
              <StatRow label="Today's VAM" value={computed.VAM} unit="m/hr" color={COLORS.purple} />
              <StatRow label="W/kg (lean mass)" value={computed.ftpPerLeanKg} unit="" sub="FTP ÷ lean mass" color={COLORS.accent} />
              <div style={{ marginTop: 8, padding: "6px 10px", background: COLORS.bg, borderRadius: 7, fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5 }}>
                💡 At race weight (86.4kg), you'd need <span style={{ color: COLORS.accent, fontWeight: 600 }}>~11W less</span> on 6% climbs — saving ~45s over 20 min
              </div>
            </div>
          </div>

          {/* Power Profile + Benchmarks + Workouts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Radar */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🎯 Power Profile vs. Benchmarks</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>Coggan levels · Male {athlete.weight}kg</div>
              <PowerProfileRadar />
            </div>

            {/* Benchmark breakdown */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📊 Classification by Duration</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 10 }}>Progress to next level</div>
              <BenchmarkCard />
            </div>

            {/* Workout prescriptions */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px", overflow: "auto" }}>
              <WorkoutPrescriptionCard
                title="💊 Prescribed: VO2max Workouts"
                subtitle={`Target: raise 5-min from 355W → 380W (${athleteClassifications["5m"].level} → ${classifyPower(380/athlete.weight, "5m").level})`}
                workouts={workoutPrescriptions.vo2max}
              />
            </div>
          </div>

          {/* Recovery + Body Comp + Sleep row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>🛏️ Recovery Score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono", color: COLORS.danger }}>34</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>/ 100</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 5 }}>HRV: 38ms ↓44% · RHR: 52 ↑4 · Sleep: 6h 10m</div>
              <div style={{ fontSize: 10, color: COLORS.danger, marginTop: 3 }}>Under-recovered — Z1/Z2 only tomorrow</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>⚖️ Body Composition</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{athlete.weight}</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>kg</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 5 }}>Fat: {athlete.bodyFat}% · Muscle: {athlete.muscleMass}% · H₂O: {athlete.hydration}%</div>
              <div style={{ fontSize: 10, color: COLORS.warning, marginTop: 3 }}>↓ 0.8kg/wk · Lean mass: {athlete.leanMass.toFixed(1)}kg (stable)</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>😴 Sleep Quality</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono", color: COLORS.warning }}>52</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>/ 100</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 5 }}>Deep: 48m ↓53% · REM: 1h04m ↓52% · Temp: -1°C</div>
              <div style={{ fontSize: 10, color: COLORS.warning, marginTop: 3 }}>Asleep 11:48pm — 1h 33m past optimal</div>
            </div>
          </div>

          {/* Full TrainingPeaks-style metrics table */}
          <div style={{ marginTop: 14, background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 13, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>📋 Full Ride Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 20px" }}>
              <div>
                <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Power</div>
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
                <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Heart Rate</div>
                <StatRow label="Avg HR" value={ride.avgHR} unit="bpm" />
                <StatRow label="Max HR" value={ride.maxHR} unit="bpm" />
                <StatRow label="HR Drift" value={`${computed.hrDrift}%`} color={COLORS.warning} />
                <StatRow label="Efficiency Factor" value={computed.EF} unit="W/bpm" />
                <StatRow label="Power:HR Ratio" value={computed.pwHR} />
                <StatRow label="LTHR" value={athlete.lthr} unit="bpm" />
                <StatRow label="%HRmax (avg)" value={`${Math.round(ride.avgHR / athlete.maxHR * 100)}%`} />
                <StatRow label="%HRR (avg)" value={`${Math.round((ride.avgHR - athlete.restingHR) / (athlete.maxHR - athlete.restingHR) * 100)}%`} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Body / Weight</div>
                <StatRow label="W/kg (avg)" value={computed.wPerKg} />
                <StatRow label="W/kg (NP)" value={computed.npPerKg} />
                <StatRow label="FTP/kg" value={computed.ftpPerKg} />
                <StatRow label="FTP/lean kg" value={computed.ftpPerLeanKg} color={COLORS.accent} />
                <StatRow label="Rider Weight" value={athlete.weight} unit="kg" />
                <StatRow label="Lean Mass" value={athlete.leanMass.toFixed(1)} unit="kg" />
                <StatRow label="Body Fat" value={`${athlete.bodyFat}%`} />
                <StatRow label="Hydration" value={`${athlete.hydration}%`} color={athlete.hydration < 64 ? COLORS.warning : COLORS.text} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Ride Details</div>
                <StatRow label="Distance" value={(ride.distance * 0.621).toFixed(1)} unit="mi" />
                <StatRow label="Elevation" value={`${Math.round(ride.elevation * 3.281)}`} unit="ft" />
                <StatRow label="Duration" value="3:12:00" />
                <StatRow label="Avg Speed" value={(ride.avgSpeed * 0.621).toFixed(1)} unit="mph" />
                <StatRow label="VAM" value={computed.VAM} unit="m/hr" color={COLORS.purple} />
                <StatRow label="Calories" value={computed.calories.toLocaleString()} unit="kcal" />
                <StatRow label="Temperature" value={`${ride.temperature}°C / ${Math.round(ride.temperature * 9/5 + 32)}°F`} />
                <StatRow label="L/R Balance" value="51/49 → 53/47" />
              </div>
            </div>
            {/* PMC row */}
            <div style={{ marginTop: 12, padding: "8px 12px", background: COLORS.bg, borderRadius: 8, display: "flex", gap: 24, fontSize: 11 }}>
              <span style={{ color: COLORS.textMuted }}>CTL: <span style={{ color: COLORS.blue, fontWeight: 700 }}>{computed.CTL}</span></span>
              <span style={{ color: COLORS.textMuted }}>ATL: <span style={{ color: COLORS.pink, fontWeight: 700 }}>{computed.ATL}</span></span>
              <span style={{ color: COLORS.textMuted }}>TSB: <span style={{ color: computed.TSB < 0 ? COLORS.danger : COLORS.accent, fontWeight: 700 }}>{computed.TSB}</span></span>
              <span style={{ color: COLORS.textMuted }}>Ramp Rate: <span style={{ fontWeight: 700 }}>+5.2 TSS/wk</span></span>
              <span style={{ color: COLORS.textMuted }}>Chronic Load: <span style={{ fontWeight: 700 }}>42-day</span></span>
              <span style={{ color: COLORS.textMuted }}>Acute Load: <span style={{ fontWeight: 700 }}>7-day</span></span>
            </div>
          </div>
        </div>

        {/* Right: AI Panel */}
        <div style={{ width: 370, borderLeft: `1px solid ${COLORS.cardBorder}`, padding: 14, display: "flex", flexDirection: "column" }}>
          <AIAnalysisPanel />
        </div>
      </div>
    </div>
  );
}

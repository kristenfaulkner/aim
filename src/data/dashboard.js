import { T } from "../theme/tokens";

// ── ATHLETE PROFILE (Withings + computed) ──
export const athlete = {
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
export const ride = {
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
export const computed = (() => {
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
export const benchmarks = {
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
export const athletePowerProfile = {
  "5s": { watts: 1150, wkg: (1150 / athlete.weight).toFixed(2) },
  "1m": { watts: 520, wkg: (520 / athlete.weight).toFixed(2) },
  "5m": { watts: 355, wkg: (355 / athlete.weight).toFixed(2) },
  "20m": { watts: 298, wkg: (298 / athlete.weight).toFixed(2) },
  "60m": { watts: 275, wkg: (275 / athlete.weight).toFixed(2) },
};

// Classify each duration into a category
export function classifyPower(wkg, duration) {
  const cats = benchmarks.male;
  if (wkg >= cats.worldTour[duration]) return { level: "World Tour", color: "#ffd700", idx: 0 };
  if (wkg >= cats.domestic[duration]) return { level: "Domestic Pro", color: "#c0c0c0", idx: 1 };
  if (wkg >= cats.cat1[duration]) return { level: "Cat 1", color: "#cd7f32", idx: 2 };
  if (wkg >= cats.cat2[duration]) return { level: "Cat 2", color: T.purple, idx: 3 };
  if (wkg >= cats.cat3[duration]) return { level: "Cat 3", color: T.blue, idx: 4 };
  if (wkg >= cats.cat4[duration]) return { level: "Cat 4", color: T.accent, idx: 5 };
  return { level: "Cat 5", color: T.textSoft, idx: 6 };
}

export const athleteClassifications = Object.fromEntries(
  Object.entries(athletePowerProfile).map(([dur, data]) => [
    dur,
    { ...data, ...classifyPower(parseFloat(data.wkg), dur) },
  ])
);

// Calculate % of next level for each duration
export function pctToNextLevel(wkg, duration) {
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
export const workoutPrescriptions = {
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

export const powerZones = [
  { zone: "Z1 Recovery", min: 0, max: Math.round(athlete.ftp * 0.55), time: 42, color: "#6b7280" },
  { zone: "Z2 Endurance", min: Math.round(athlete.ftp * 0.55), max: Math.round(athlete.ftp * 0.75), time: 68, color: "#3b82f6" },
  { zone: "Z3 Tempo", min: Math.round(athlete.ftp * 0.75), max: Math.round(athlete.ftp * 0.90), time: 24, color: "#10b981" },
  { zone: "Z4 Threshold", min: Math.round(athlete.ftp * 0.90), max: Math.round(athlete.ftp * 1.05), time: 18, color: "#f59e0b" },
  { zone: "Z5 VO2max", min: Math.round(athlete.ftp * 1.05), max: Math.round(athlete.ftp * 1.20), time: 8, color: "#ef4444" },
  { zone: "Z6 Anaerobic", min: Math.round(athlete.ftp * 1.20), max: 9999, time: 3, color: "#8b5cf6" },
];

export const weeklyTSS = [
  { day: "Mon", tss: 85 }, { day: "Tue", tss: 120 }, { day: "Wed", tss: 0 },
  { day: "Thu", tss: 95 }, { day: "Fri", tss: 65 }, { day: "Sat", tss: 180 }, { day: "Sun", tss: 45 },
];

export const fitnessHistory = [
  { week: "W1", ctl: 72, atl: 65, tsb: 7 }, { week: "W2", ctl: 74, atl: 78, tsb: -4 },
  { week: "W3", ctl: 76, atl: 82, tsb: -6 }, { week: "W4", ctl: 75, atl: 60, tsb: 15 },
  { week: "W5", ctl: 77, atl: 70, tsb: 7 }, { week: "W6", ctl: 79, atl: 85, tsb: -6 },
  { week: "W7", ctl: 81, atl: 90, tsb: -9 }, { week: "W8", ctl: 80, atl: 62, tsb: 18 },
  { week: "W9", ctl: 82, atl: 75, tsb: 7 }, { week: "W10", ctl: 84, atl: 88, tsb: -4 },
  { week: "W11", ctl: 86, atl: 92, tsb: -6 }, { week: "W12", ctl: 85, atl: 58, tsb: 27 },
];

export const powerCurve = [
  { duration: "5s", power: 1150, benchmark: 1200 }, { duration: "15s", power: 920, benchmark: 950 },
  { duration: "30s", power: 680, benchmark: 720 }, { duration: "1m", power: 520, benchmark: 540 },
  { duration: "2m", power: 410, benchmark: 430 }, { duration: "5m", power: 355, benchmark: 380 },
  { duration: "10m", power: 320, benchmark: 340 }, { duration: "20m", power: 298, benchmark: 310 },
  { duration: "60m", power: 275, benchmark: 290 },
];

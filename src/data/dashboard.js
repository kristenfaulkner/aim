import { T } from "../theme/tokens";

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

// Calculate % of next level for each duration
export function pctToNextLevel(wkg, duration, weightKg) {
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
      const neededWatts = weightKg ? Math.round(neededWkg * weightKg) : null;
      return { pct: Math.min(pct, 100), nextLevel: nextName, neededWkg: neededWkg.toFixed(2), neededWatts };
    }
  }
  return { pct: 0, nextLevel: "Cat 5", neededWkg: 0, neededWatts: 0 };
}

// Prescribed workouts based on identified weaknesses
// These accept ftp as a parameter for dynamic target computation
export function getWorkoutPrescriptions(ftp) {
  return {
    vo2max: [
      { name: "Classic 5×5'", desc: "5 × 5 min at 108-112% FTP with 5 min recovery", target: `${Math.round(ftp * 1.08)}-${Math.round(ftp * 1.12)}W`, tss: 85, time: "1h 10m", focus: "VO2max ceiling" },
      { name: "30/30s", desc: "3 sets of 8 × 30s on / 30s off at 120-130% FTP", target: `${Math.round(ftp * 1.20)}-${Math.round(ftp * 1.30)}W`, tss: 70, time: "1h", focus: "VO2max repeatability" },
      { name: "4×4 Norwegian", desc: "4 × 4 min at 110-115% FTP with 3 min recovery", target: `${Math.round(ftp * 1.10)}-${Math.round(ftp * 1.15)}W`, tss: 75, time: "1h 05m", focus: "VO2max sustained" },
      { name: "Billats", desc: "3 sets of 6 × 1 min at 120% FTP / 1 min at 50%", target: `${Math.round(ftp * 1.20)}W / ${Math.round(ftp * 0.50)}W`, tss: 65, time: "55m", focus: "VO2max accumulation" },
      { name: "Rønnestad 3×13", desc: "3 sets of 13 × 30s at 130% / 15s at 50%", target: `${Math.round(ftp * 1.30)}W / ${Math.round(ftp * 0.50)}W`, tss: 72, time: "1h", focus: "VO2max & anaerobic" },
    ],
    threshold: [
      { name: "2×20 Classic", desc: "2 × 20 min at 95-100% FTP with 5 min recovery", target: `${Math.round(ftp * 0.95)}-${ftp}W`, tss: 90, time: "1h 15m", focus: "FTP sustainment" },
      { name: "Over/Unders", desc: "3 × 12 min alternating 2 min at 105% / 2 min at 90%", target: `${Math.round(ftp * 1.05)}/${Math.round(ftp * 0.90)}W`, tss: 80, time: "1h 10m", focus: "Lactate clearance" },
    ],
    sprint: [
      { name: "Sprint Repeats", desc: "8 × 15s all-out sprints with 3 min recovery", target: "Max effort", tss: 45, time: "45m", focus: "Peak neuromuscular power" },
      { name: "Standing Starts", desc: "6 × 20s from standstill, max effort, 5 min recovery", target: "Max effort", tss: 40, time: "50m", focus: "Sprint acceleration" },
    ],
  };
}

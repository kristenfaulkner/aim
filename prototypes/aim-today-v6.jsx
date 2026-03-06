/**
 * AIM Today Page — V6 Prototype
 * Design source of truth for the AI-first "Today" page.
 * Single centered column, AI narrative as primary content.
 *
 * This prototype uses mock data to show the pixel-level design.
 * The real implementation in src/pages/Today.jsx wires to the API.
 */

// ── MOCK DATA ──
const MOCK_MORNING_PLAN = {
  mode: "MORNING_WITH_PLAN",
  briefing: "Good morning, Kristen. Your HRV is 121ms — top 15% of your personal range — and you slept 7h12m with 1h48m deep sleep. Your body is primed for today's sweet spot session. Conditions are 17C with light wind from the west, just above your 14C heat breakpoint — near-peak for power output.",
  insights: [
    {
      type: "positive",
      icon: "🟢",
      headline: "Readiness 82 — green light for sweet spot",
      takeaway: "Execute as planned. Your HRV and sleep both support intensity today. Target 265-280W for the intervals.",
      narrative: "Your HRV of 121ms is 29% above your 30-day average of 94ms. Combined with 7h12m sleep (vs 6h24m avg) and a TSB of +4, today is one of your best readiness days this month. Your sleep model predicts EF of 1.70+ on days like this.",
      evidence: [
        { label: "HRV today", value: "121ms", color: "green" },
        { label: "30-day avg", value: "94ms", color: "dim" },
        { label: "Sleep", value: "7h12m", color: "green" },
        { label: "TSB", value: "+4", color: "green" },
      ],
      crossDomain: "This insight connects Oura (HRV + sleep) with your power data (EF prediction from sleep model). No single app can predict your cycling efficiency from sleep metrics.",
      sources: ["Oura", "Wahoo"],
      dataGap: null,
    },
    {
      type: "action",
      icon: "🎯",
      headline: "Sweet spot intervals — target 268W today",
      takeaway: "Your CP model suggests 268W for 20-min efforts. Fuel with 80g carbs/hr and 750ml fluid/hr at 17C.",
      narrative: "Based on your CP of 295W and today's readiness, 268W (91% CP) is your optimal sweet spot target. Your heat model shows 17C is just above your 14C breakpoint — expect EF around 1.65-1.70. Last time you did sweet spot at similar readiness (Mar 1), you averaged 271W with EF 1.68.",
      evidence: [
        { label: "CP", value: "295W", color: "blue" },
        { label: "Target", value: "268W", color: "green" },
        { label: "Temperature", value: "17C", color: "blue" },
        { label: "Last SS", value: "271W", color: "dim" },
      ],
      crossDomain: "Combines CP model (Wahoo power data), heat model (weather), and similar session matching (historical rides) for a personalized target.",
      sources: ["Wahoo", "Open-Meteo"],
      dataGap: null,
    },
    {
      type: "warning",
      icon: "⚠️",
      headline: "Sleep debt: 3.2h accumulated this week",
      takeaway: "You can handle today's session, but prioritize 8+ hours tonight. Consider moving tomorrow's intensity to Thursday.",
      narrative: "Despite last night's solid 7h12m, your 7-day average is 6h24m — 36 minutes below your personal optimum of 7h00m. Your sleep model shows EF declines 2.1% per hour of weekly sleep debt. At 3.2h debt, expect ~7% lower efficiency by Friday if the trend continues.",
      evidence: [
        { label: "Last night", value: "7h12m", color: "green" },
        { label: "7-day avg", value: "6h24m", color: "yellow" },
        { label: "Optimal", value: "7h00m", color: "dim" },
        { label: "Weekly debt", value: "3.2h", color: "yellow" },
      ],
      crossDomain: null,
      sources: ["Eight Sleep"],
      dataGap: "Connect Whoop to cross-reference recovery scores with Eight Sleep HRV for a more complete readiness picture.",
    },
  ],
  contextCards: [
    { icon: "⛅", label: "17C", sub: "Just above your 14C breakpoint — near-peak conditions", color: "blue" },
    { icon: "💨", label: "8 km/h W", sub: "Light crosswind — no route adjustments needed", color: "dim" },
  ],
  workout: {
    name: "Sweet Spot 3x20",
    source: "AIM Prescription",
    structure: "15min warmup\n3x20min @ 265-280W (2min rest)\n10min cooldown",
    duration_min: 85,
    target_power: "265-280W",
    est_tss: 142,
    fueling: {
      carbs_per_hour: 80,
      fluid_ml_per_hour: 750,
      sodium_mg_per_hour: 600,
    },
  },
  collapsedMorning: null,
  dataGaps: [
    {
      source: "Blood Panel",
      lastUpdated: "9 months ago",
      prompt: "Your last blood panel was 9 months ago. Ferritin and iron shift during heavy training blocks like this one — upload a new panel to check."
    },
  ],
};

const MOCK_POST_RIDE = {
  mode: "POST_RIDE",
  briefing: "Strong session, Kristen. Your 3x20 sweet spot averaged 271W with EF of 1.70 — both above target. Despite 3.2h sleep debt this week, your HRV of 121ms carried you. The 17C conditions were near-perfect for power output.",
  insights: [
    {
      type: "positive",
      icon: "🟢",
      headline: "EF 1.70 — beat your heat model prediction by +0.05",
      takeaway: "Your efficiency is improving at this intensity. Your heat model predicted 1.65 at 17C — you exceeded it.",
      narrative: "Your EF of 1.70 is your 3rd best this season at sweet spot intensity. On Feb 18, a similar session at 15C produced EF 1.61. Today's improvement (+5.6%) came despite warmer conditions. Two factors explain it: HRV was 33ms higher and you had 48 minutes more sleep.",
      evidence: [
        { label: "EF today", value: "1.70", color: "green" },
        { label: "Model predicted", value: "1.65", color: "dim" },
        { label: "Feb 18 similar", value: "1.61", color: "dim" },
        { label: "HRV delta", value: "+33ms", color: "green" },
      ],
      crossDomain: "Combines power meter (EF), Oura (HRV), Eight Sleep (sleep duration), and weather data. Only AIM connects your sleep quality to your cycling efficiency.",
      sources: ["Wahoo", "Oura", "Eight Sleep", "Open-Meteo"],
      dataGap: null,
    },
  ],
  contextCards: [
    { icon: "⛅", label: "17C", sub: "Near-peak conditions for your heat profile", color: "blue" },
  ],
  collapsedMorning: "This morning: readiness 82, HRV 121ms (top 15%), 7h12m sleep. You were cleared for sweet spot work.",
  dataGaps: [],
};

// ── NOTE ──
// This is a design-only prototype with mock data.
// See src/pages/Today.jsx for the real implementation.
export default function TodayPrototype() {
  return null;
}

// ── DESIGN TOKENS ──
// Unified design system for AIM

export const T = {
  bg: "#05060a",
  surface: "#0c0d14",
  card: "#111219",
  cardHover: "#161720",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  accent: "#00e5a0",
  accentDim: "rgba(0,229,160,0.1)",
  accentMid: "rgba(0,229,160,0.25)",
  accentGlow: "rgba(0,229,160,0.4)",
  text: "#eaeaf0",
  textSoft: "#9495a5",
  textDim: "#5c5d70",
  white: "#ffffff",
  danger: "#ff4757",
  warn: "#ffb800",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#f97316",
  green: "#00e5a0",
  red: "#ff4757",
  amber: "#f59e0b",
  gradient: "linear-gradient(135deg, #00e5a0, #3b82f6)",
  gradientSubtle: "linear-gradient(135deg, rgba(0,229,160,0.08), rgba(59,130,246,0.08))",
};

export const font = "'Outfit', sans-serif";
export const mono = "'JetBrains Mono', monospace";

// Category colors for boosters
export const catColors = {
  supplement: T.accent,
  protocol: T.amber,
  training: T.blue,
  nutrition: T.pink,
  recovery: T.purple,
};

export const catLabelsBooters = {
  supplement: "Supplements",
  protocol: "Protocols",
  training: "Training",
  nutrition: "Nutrition",
  recovery: "Recovery",
};

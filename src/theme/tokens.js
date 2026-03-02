// ── DESIGN TOKENS ──
// Unified design system for AIM (light theme)

export const T = {
  bg: "#f8f8fa",
  surface: "#f0f0f3",
  card: "#ffffff",
  cardHover: "#f5f5f8",
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.15)",
  accent: "#10b981",
  accentDim: "rgba(16,185,129,0.08)",
  accentMid: "rgba(16,185,129,0.2)",
  accentGlow: "rgba(16,185,129,0.35)",
  text: "#1a1a2e",
  textSoft: "#6b7280",
  textDim: "#9ca3af",
  white: "#ffffff",
  danger: "#ef4444",
  warn: "#f59e0b",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#f97316",
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
  gradientSubtle: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.06))",
};

export const font = "'DM Sans', sans-serif";
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

// ── RESPONSIVE BREAKPOINTS ──
export const breakpoints = {
  mobile: 768,   // < 768px
  tablet: 1024,  // 768–1024px
  // desktop: > 1024px (default)
};

// Minimum touch target per WCAG 2.5.8
export const touchMin = 44;

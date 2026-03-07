import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";

// ── READINESS RING ──
export function ReadinessRing({ score, size = 88 }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  const color = score >= 70 ? T.green : score >= 45 ? T.warn : T.danger;
  const label = score >= 70 ? "Go" : score >= 45 ? "Moderate" : "Rest";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.surface} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: mono, fontSize: size > 60 ? 28 : 18, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: font }}>{label}</span>
    </div>
  );
}

// ── CONTEXT PILL ──
const PILL_COLORS = { blue: T.blue, green: T.green, yellow: T.warn, purple: T.purple, dim: T.textDim, red: T.danger };

function ContextPill({ icon, label, sub, color = "dim" }) {
  const c = PILL_COLORS[color] || T.text;
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: c }}>{label}</span>
      </div>
      <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.3, fontFamily: font }}>{sub}</div>
    </div>
  );
}

// ── HERO ──
export default function ReadinessHero({ score, contextCards = [] }) {
  const { isMobile } = useResponsive();

  if (score == null && contextCards.length === 0) return null;

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: isMobile ? 14 : 18 }}>
      <div style={{
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 14 : 18,
        flexDirection: isMobile && contextCards.length > 2 ? "column" : "row",
      }}>
        {score != null && <ReadinessRing score={Math.round(score)} />}
        {contextCards.length > 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            {contextCards.map((card, i) => (
              <ContextPill key={i} icon={card.icon} label={card.label} sub={card.sub} color={card.color} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

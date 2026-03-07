import { T, mono } from "../../theme/tokens";

const COLOR_MAP = {
  green: T.green,
  red: T.red,
  yellow: T.amber,
  orange: T.orange,
  blue: T.blue,
  purple: T.purple,
  accent: T.accent,
};

export default function StatCard({ label, value, unit, sub, color }) {
  const c = COLOR_MAP[color] || T.text;
  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, background: T.surface, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: c }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: T.textDim }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

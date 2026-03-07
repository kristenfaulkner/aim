import { T, mono } from "../../theme/tokens";

const COLOR_MAP = {
  green: T.green,
  red: T.red,
  yellow: T.amber,
  orange: T.orange,
  blue: T.blue,
  purple: T.purple,
};

export default function ZoneCard({ label, range, ef, drift, color, count }) {
  const c = COLOR_MAP[color] || T.textDim;
  return (
    <div style={{ flex: 1, padding: 14, borderRadius: 10, background: `${c}06`, border: `1px solid ${c}10` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: c, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: T.text }}>{range}</div>
      <div style={{ fontSize: 11, color: T.textSoft, marginTop: 4 }}>
        EF: {ef}{drift != null ? ` · Drift: ${drift}` : ""}
      </div>
      {count != null && <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{count} rides</div>}
    </div>
  );
}

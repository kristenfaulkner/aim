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

function Sparkline({ data, color = T.accent, width = 160, height = 36 }) {
  if (!data?.length || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 6) - 3}`
  ).join(" ");
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 6) - 3;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={width} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

export default function SparklineRow({ sparklines }) {
  if (!sparklines || typeof sparklines !== "object") return null;
  const entries = Object.entries(sparklines).filter(([, v]) => v?.data?.length >= 2);
  if (!entries.length) return null;

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {entries.map(([label, s]) => {
        const c = COLOR_MAP[s.color] || T.accent;
        return (
          <div key={label} style={{ flex: 1, padding: 14, borderRadius: 10, background: T.surface }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
              {s.trend && <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c }}>{s.trend}</span>}
            </div>
            <Sparkline data={s.data} color={c} />
          </div>
        );
      })}
    </div>
  );
}

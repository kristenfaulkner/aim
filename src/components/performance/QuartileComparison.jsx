import { T, mono } from "../../theme/tokens";

export default function QuartileComparison({ data }) {
  if (!data) return null;
  const items = Array.isArray(data) ? data : Object.entries(data).map(([label, d]) => ({ label, ...d }));
  if (!items.length) return null;

  const colors = [T.red, T.green, T.blue, T.purple];

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 2)}, 1fr)`, gap: 8 }}>
      {items.map((item, i) => {
        const c = item.color ? ({ green: T.green, red: T.red, yellow: T.amber, blue: T.blue, purple: T.purple }[item.color] || colors[i]) : colors[i];
        return (
          <div key={item.label} style={{ padding: 14, borderRadius: 10, background: `${c}06`, border: `1px solid ${c}08` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: c, textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
            {item.value != null && (
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700 }}>
                {item.value} {item.unit && <span style={{ fontSize: 11, color: T.textDim }}>{item.unit}</span>}
              </div>
            )}
            {item.sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{item.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

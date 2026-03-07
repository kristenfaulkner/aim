import { T, font, mono } from "../../theme/tokens";

export default function BinTable({ bins }) {
  if (!bins || typeof bins !== "object") return null;
  const entries = Object.entries(bins).filter(([, v]) => v);
  if (!entries.length) return null;

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 50px", padding: "8px 14px", background: T.surface }}>
        {["Condition", "Avg EF", "Drift", "n"].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", textAlign: h === "Condition" ? "left" : "right", fontFamily: font }}>{h}</span>
        ))}
      </div>
      {entries.map(([label, d]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 50px", padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.text, fontWeight: 500, fontFamily: font }}>{label}</span>
          <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 600, color: T.text, textAlign: "right" }}>{d.avgEF}</span>
          <span style={{ fontSize: 12, fontFamily: mono, color: T.textSoft, textAlign: "right" }}>{d.avgDrift}%</span>
          <span style={{ fontSize: 11, color: T.textDim, textAlign: "right" }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

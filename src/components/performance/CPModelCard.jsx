import { T, mono } from "../../theme/tokens";
import StatCard from "./StatCard";

export default function CPModelCard({ model }) {
  if (!model) return null;
  return (
    <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Critical Power Model</span>
        {model.r2 != null && (
          <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 9, fontWeight: 600, background: `${T.green}10`, color: T.green }}>
            R² {model.r2}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {model.cp != null && <StatCard label="CP" value={model.cp} unit="W" sub="Aerobic Ceiling" />}
        {model.wprime != null && <StatCard label="W'" value={model.wprime} unit="kJ" sub="Anaerobic Reserve" />}
        {model.pmax != null && <StatCard label="Pmax" value={model.pmax} unit="W" sub="Sprint Power" />}
      </div>
    </div>
  );
}

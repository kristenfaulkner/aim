import { T, mono } from "../../theme/tokens";

export default function PowerBestsGrid({ bests }) {
  if (!bests?.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {bests.map(pb => (
        <div key={pb.duration} style={{ padding: 10, borderRadius: 10, background: T.surface, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{pb.duration}</div>
          <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: T.text }}>
            {pb.watts}<span style={{ fontSize: 10, color: T.textDim }}>W</span>
          </div>
          {pb.wkg != null && <div style={{ fontFamily: mono, fontSize: 11, color: T.textSoft }}>{pb.wkg} W/kg</div>}
          {pb.trend && (
            <div style={{ fontSize: 9, fontWeight: 600, color: pb.trend.startsWith("+") ? T.green : pb.trend.startsWith("-") ? T.red : T.textDim, marginTop: 2, fontFamily: mono }}>{pb.trend}</div>
          )}
        </div>
      ))}
    </div>
  );
}

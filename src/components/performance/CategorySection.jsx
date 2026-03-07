import { useState } from "react";
import { T, font } from "../../theme/tokens";
import InsightCard from "./InsightCard";
import ModelDataRenderer from "./ModelDataRenderer";

const CONFIDENCE_COLORS = {
  high: T.green,
  medium: T.amber,
  low: T.orange,
};

export default function CategorySection({ category, icon, sampleNote, confidence, insights, modelData }) {
  const [dataOpen, setDataOpen] = useState(false);
  const cc = CONFIDENCE_COLORS[confidence] || T.textDim;

  return (
    <div style={{
      background: T.card,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      marginBottom: 14,
      overflow: "hidden",
    }}>
      {/* Category header */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: font }}>{category}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {sampleNote && <span style={{ fontSize: 11, color: T.textDim, fontFamily: font }}>{sampleNote}</span>}
            {confidence && (
              <span style={{
                padding: "2px 8px",
                borderRadius: 9999,
                fontSize: 9,
                fontWeight: 600,
                background: `${cc}10`,
                color: cc,
                textTransform: "uppercase",
              }}>{confidence}</span>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights?.length > 0 && (
        <div style={{ padding: "4px 20px 0" }}>
          {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
        </div>
      )}

      {/* Model data — expandable toggle */}
      {modelData && (
        <>
          <div
            onClick={() => setDataOpen(!dataOpen)}
            style={{
              padding: "12px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: dataOpen ? "transparent" : `${T.surface}60`,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!dataOpen) e.currentTarget.style.background = T.surface; }}
            onMouseLeave={e => { if (!dataOpen) e.currentTarget.style.background = dataOpen ? "transparent" : `${T.surface}60`; }}
          >
            <span style={{ fontSize: 12, color: T.textDim, fontWeight: 500, fontFamily: font }}>
              {dataOpen ? "Hide model data" : "View model data"}
            </span>
            <svg width={12} height={12} style={{ transform: dataOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
              <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </div>
          {dataOpen && (
            <div style={{ padding: "0 20px 20px" }}>
              <ModelDataRenderer modelData={modelData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

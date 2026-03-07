import { useState } from "react";
import { T, font } from "../../theme/tokens";
import { ReadinessRing } from "./ReadinessHero";

export default function CollapsedMorning({ text, readinessScore }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  if (expanded) {
    return (
      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {readinessScore != null && <ReadinessRing score={Math.round(readinessScore)} size={52} />}
          <div style={{ flex: 1, fontSize: 12, color: T.textSoft, lineHeight: 1.5, fontFamily: font }}>{text}</div>
        </div>
        <div onClick={() => setExpanded(false)} style={{ textAlign: "center", marginTop: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: font }}>Collapse &#9652;</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setExpanded(true)}
      style={{
        background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
        padding: "12px 16px", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        {readinessScore != null && <ReadinessRing score={Math.round(readinessScore)} size={36} />}
        <span style={{ fontSize: 12, color: T.textSoft, fontFamily: font, lineHeight: 1.4 }}>{text}</span>
      </div>
      <svg width={12} height={12} style={{ flexShrink: 0 }}>
        <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    </div>
  );
}

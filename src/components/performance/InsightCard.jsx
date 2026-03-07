import { useState } from "react";
import { T, font } from "../../theme/tokens";

export default function InsightCard({ insight }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4, fontFamily: font }}>{insight.title}</div>
        <svg width={12} height={12} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {insight.takeaway && (
            <div style={{
              padding: "7px 11px",
              borderRadius: 10,
              background: `${T.accent}06`,
              borderLeft: `3px solid ${T.accent}`,
              fontSize: 12,
              color: T.text,
              lineHeight: 1.6,
              fontWeight: 500,
              marginBottom: 10,
              fontFamily: font,
            }}>
              {insight.takeaway}
            </div>
          )}
          {insight.body && (
            <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.7, marginBottom: 6, fontFamily: font }}>{insight.body}</p>
          )}
          {insight.sources?.length > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {insight.sources.map(s => (
                <span key={s} style={{
                  padding: "1px 6px",
                  borderRadius: 9999,
                  fontSize: 9,
                  fontWeight: 500,
                  background: T.surface,
                  color: T.textDim,
                  border: `1px solid ${T.border}`,
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { T, font, mono } from "../../theme/tokens";

export default function PrepRec({ rec }) {
  const [open, setOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (!rec) return null;

  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
      <div
        onClick={() => { setOpen(!open); if (open) setEvidenceOpen(false); }}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: 14 }}>{rec.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.35, fontFamily: font }}>{rec.title}</span>
        </div>
        <svg width={12} height={12} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div style={{ marginTop: 8, marginLeft: 22 }}>
          {rec.action && (
            <div style={{
              padding: "6px 10px", borderRadius: 10,
              background: "rgba(16,185,129,0.04)", borderLeft: `3px solid ${T.accent}`,
              fontSize: 12, color: T.text, lineHeight: 1.55, fontWeight: 500, fontFamily: font,
            }}>
              {rec.action}
            </div>
          )}

          {rec.evidence && (
            <>
              <div
                onClick={(e) => { e.stopPropagation(); setEvidenceOpen(!evidenceOpen); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 6, cursor: "pointer" }}
              >
                <span style={{ fontSize: 11, color: T.accent, fontWeight: 500, fontFamily: font }}>
                  {evidenceOpen ? "Hide evidence" : "Show evidence"}
                </span>
                <svg width={10} height={10} style={{ transform: evidenceOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                  <polyline points="2,3 5,6 8,3" fill="none" stroke={T.accent} strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              </div>

              {evidenceOpen && (
                <div style={{ marginTop: 6 }}>
                  <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6, fontFamily: font, margin: 0 }}>{rec.evidence}</p>
                  {rec.pills && rec.pills.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                      {rec.pills.map((p, i) => (
                        <div key={i} style={{ padding: "4px 8px", borderRadius: 10, background: T.surface }}>
                          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: T.text }}>{p.value}</div>
                          <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase", fontFamily: font }}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

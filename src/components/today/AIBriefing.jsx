import { T, font } from "../../theme/tokens";

export default function AIBriefing({ briefing }) {
  if (!briefing) return null;

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: T.gradient,
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>
          <span style={{ color: T.white, fontSize: 10, fontWeight: 700 }}>&#10022;</span>
        </div>
        <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontWeight: 500, fontFamily: font, margin: 0 }}>
          {briefing}
        </p>
      </div>
    </div>
  );
}

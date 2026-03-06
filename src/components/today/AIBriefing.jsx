import React from "react";
import { T, font, mono } from "../../theme/tokens";

const colorMap = {
  blue: T.blue,
  green: T.accent,
  dim: T.textDim,
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function AIBriefing({ briefing, contextCards, isMobile }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* AI icon + briefing text */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span
          style={{
            background: T.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          ✦
        </span>
        <p
          style={{
            fontFamily: font,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.7,
            color: T.text,
            margin: 0,
          }}
        >
          {briefing}
        </p>
      </div>

      {/* Context cards row */}
      {contextCards && contextCards.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          {contextCards.map((card, i) => {
            const resolved = colorMap[card.color] || T.textDim;
            const rgb = hexToRgb(resolved);
            return (
              <div
                key={i}
                style={{
                  background: `rgba(${rgb}, 0.06)`,
                  padding: "10px 14px",
                  borderRadius: 10,
                  flex: 1,
                  minWidth: 140,
                }}
              >
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  {card.icon} {card.label}
                </div>
                <div
                  style={{
                    fontFamily: font,
                    fontSize: 11,
                    color: T.textSoft,
                    marginTop: 2,
                  }}
                >
                  {card.sub}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

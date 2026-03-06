import { useState } from "react";
import { T, font, mono } from "../../theme/tokens";
import InsightFeedback from "../../components/InsightFeedback";

const TYPE_COLORS = {
  positive: T.accent,
  warning: T.warn,
  action: T.purple,
};

function getTypeColor(type) {
  return TYPE_COLORS[type] || T.blue;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function colorWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function InsightCard({ insight, index, activityId, isMobile }) {
  const [expanded, setExpanded] = useState(false);

  const typeColor = getTypeColor(insight.type);

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* Layer 1: Always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
          {insight.icon}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: font,
            color: T.text,
            lineHeight: 1.3,
          }}
        >
          {insight.headline}
        </span>
      </div>

      {/* Takeaway box */}
      <div
        style={{
          borderLeft: `3px solid ${typeColor}`,
          background: colorWithAlpha(typeColor, 0.06),
          padding: "9px 13px",
          borderRadius: "0 8px 8px 0",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            fontFamily: font,
            color: T.text,
            lineHeight: 1.5,
          }}
        >
          {insight.takeaway}
        </span>
      </div>

      {/* Bottom row: feedback + toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontSize: 11,
            fontFamily: font,
            color: T.accent,
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {expanded ? "Hide evidence" : "See evidence"}
        </button>

        {/* Inline feedback thumbs */}
        <InsightFeedback
          activityId={activityId}
          source="dashboard"
          insightIndex={index}
          insight={{
            category: insight.crossDomain || "general",
            type: insight.type,
            title: insight.headline,
            body: insight.takeaway,
          }}
        />
      </div>

      {/* Layer 2: Expanded evidence */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {/* Narrative */}
          {insight.narrative && (
            <p
              style={{
                fontSize: 13,
                fontFamily: font,
                color: T.textSoft,
                lineHeight: 1.7,
                margin: "0 0 14px 0",
              }}
            >
              {insight.narrative}
            </p>
          )}

          {/* Evidence pills */}
          {insight.evidence && insight.evidence.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {insight.evidence.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    background: colorWithAlpha(typeColor, 0.08),
                    border: `1px solid ${colorWithAlpha(typeColor, 0.12)}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontFamily: mono,
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {ev.value}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: font,
                      color: T.textDim,
                      lineHeight: 1.2,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}
                  >
                    {ev.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Cross-domain callout */}
          {insight.crossDomain && (
            <div
              style={{
                background: T.gradientSubtle,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  background: T.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✦
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: font,
                  fontStyle: "italic",
                  color: T.textSoft,
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {insight.crossDomain}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: font,
                  fontWeight: 700,
                  color: T.accent,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              >
                Only AIM
              </span>
            </div>
          )}

          {/* Source pills */}
          {insight.sources && insight.sources.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: insight.dataGap ? 10 : 0,
              }}
            >
              {insight.sources.map((src, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 9,
                    fontFamily: font,
                    color: T.textDim,
                    background: T.surface,
                    borderRadius: 4,
                    padding: "3px 7px",
                    lineHeight: 1.3,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {src}
                </span>
              ))}
            </div>
          )}

          {/* Data gap nudge */}
          {insight.dataGap && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: insight.sources && insight.sources.length > 0 ? 10 : 0,
              }}
            >
              <span style={{ fontSize: 11, lineHeight: 1 }}>🔗</span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: font,
                  color: T.amber,
                  lineHeight: 1.4,
                }}
              >
                {insight.dataGap}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

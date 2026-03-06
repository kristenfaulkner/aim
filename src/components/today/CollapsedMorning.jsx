import { useState } from "react";
import { T, font, mono } from "../../theme/tokens";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function CollapsedMorning({ text, isMobile }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "10px 14px",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Readiness ring placeholder */}
        <div
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: "50%",
            background: T.accent,
            border: "2.5px solid transparent",
            backgroundImage: `linear-gradient(${T.accent}, ${T.accent}), linear-gradient(135deg, #10b981, #3b82f6)`,
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        />

        {/* Morning summary text */}
        <span
          style={{
            ...font(13),
            color: T.textSoft,
            flex: 1,
          }}
        >
          {text}
        </span>

        {/* Chevron */}
        {expanded ? (
          <ChevronUp size={16} color={T.textDim} />
        ) : (
          <ChevronDown size={16} color={T.textDim} />
        )}
      </div>

      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: 12,
            marginTop: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p
            style={{
              ...font(13),
              color: T.text,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {text}
          </p>
          <div
            style={{
              marginTop: 8,
              textAlign: "right",
            }}
          >
            <span
              style={{
                ...font(11),
                color: T.accent,
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
            >
              Collapse
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

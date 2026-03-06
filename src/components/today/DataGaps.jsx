import { T, font } from "../../theme/tokens";
import { useNavigate } from "react-router-dom";

const UPLOAD_SOURCES = ["blood panel", "dexa"];

function isUploadSource(source) {
  return UPLOAD_SOURCES.some((s) => source.toLowerCase().includes(s));
}

export default function DataGaps({ dataGaps, isMobile }) {
  if (!dataGaps || dataGaps.length === 0) return null;

  const navigate = useNavigate();
  const items = dataGaps.slice(0, 3);

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontFamily: font,
          fontWeight: 600,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        Unlock more insights
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((gap, i) => {
          const upload = isUploadSource(gap.source);
          const label = upload ? "Upload" : "Connect";
          const dest = upload ? "/health-lab" : "/connect";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: T.accentDim,
                border: "1px solid rgba(16,185,129,0.06)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                🔗
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: font,
                    fontWeight: 700,
                    color: T.text,
                    lineHeight: 1.4,
                  }}
                >
                  {gap.source}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: font,
                    color: T.textSoft,
                    lineHeight: 1.5,
                  }}
                >
                  {gap.prompt}
                </div>
              </div>

              <button
                onClick={() => navigate(dest)}
                style={{
                  fontSize: 11,
                  fontFamily: font,
                  fontWeight: 600,
                  color: T.accent,
                  background: "none",
                  border: `1px solid ${T.accent}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  flexShrink: 0,
                  lineHeight: 1.3,
                }}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

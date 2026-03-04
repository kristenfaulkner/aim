import { useState } from "react";
import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";
import { Target, ChevronDown, ChevronUp, Calendar, RefreshCw, Zap, Apple } from "lucide-react";

const READINESS_COLORS = {
  green: T.accent,
  yellow: T.warn,
  red: T.danger,
};

const READINESS_LABELS = {
  green: "Good to go",
  yellow: "Moderate — targets adjusted",
  red: "Recovery day",
};

function ReadinessBadge({ check, score }) {
  const color = READINESS_COLORS[check] || T.textSoft;
  const label = READINESS_LABELS[check] || check;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        background: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          fontFamily: font,
        }}
      >
        {label}
        {score != null ? ` (${Math.round(score)})` : ""}
      </span>
    </div>
  );
}

function StructureTable({ structure, isMobile }) {
  if (!structure || structure.length === 0) return null;

  return (
    <div
      style={{
        background: T.surface,
        borderRadius: 10,
        overflow: "hidden",
        marginTop: 12,
      }}
    >
      {structure.map((block, i) => {
        const isWork =
          block.sets ||
          (block.power_watts && block.power_watts.length > 0) ||
          (block.target && block.target.includes("CP"));
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr auto"
                : "140px 70px 1fr",
              gap: isMobile ? 4 : 8,
              padding: "8px 12px",
              background: i % 2 === 0 ? "transparent" : `${T.border}`,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: isWork ? 700 : 500,
                color: isWork ? T.text : T.textSoft,
                fontFamily: font,
              }}
            >
              {block.sets
                ? `${block.sets}×${block.work_min}min`
                : block.name}
            </span>
            {!isMobile && (
              <span
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  fontFamily: mono,
                }}
              >
                {block.duration_min
                  ? `${block.duration_min}min`
                  : block.sets && block.rest_min
                    ? `${block.rest_min}min rest`
                    : ""}
              </span>
            )}
            <span
              style={{
                fontSize: 12,
                fontWeight: isWork ? 700 : 500,
                color: isWork ? T.accent : T.textSoft,
                fontFamily: mono,
                textAlign: isMobile ? "right" : "left",
              }}
            >
              {block.power_watts && Array.isArray(block.power_watts)
                ? `${block.power_watts[0]}-${block.power_watts[1]}W`
                : block.target || ""}
              {block.hr_ceiling ? ` • HR<${block.hr_ceiling}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FuelingRow({ fueling }) {
  if (!fueling) return null;

  const parts = [fueling.pre, fueling.during, fueling.post].filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "10px 12px",
        background: `${T.pink}08`,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Apple size={14} style={{ color: T.pink, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.pink,
            marginBottom: 4,
          }}
        >
          FUELING
        </div>
        <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>
          {fueling.during || parts[0]}
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionCard({
  prescription,
  gaps,
  readiness,
  loading,
  error,
  onRefresh,
  onAddToCalendar,
  isMobile: isMobileProp,
}) {
  const responsive = useResponsive();
  const isMobile = isMobileProp ?? responsive.isMobile;
  const [showAlternative, setShowAlternative] = useState(false);
  const [showFuelingDetail, setShowFuelingDetail] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 18,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <Target size={16} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            Today's Recommendation
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
            padding: "20px 0",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: `2px solid ${T.accent}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: 12, color: T.textSoft }}>
            Analyzing your profile...
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Target size={16} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            Today's Recommendation
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.textSoft,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {error}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              margin: "0 auto",
              padding: "8px 16px",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: T.textSoft,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            <RefreshCw size={12} /> Try Again
          </button>
        )}
      </div>
    );
  }

  // No prescription (already rode, planned workout, or insufficient data)
  if (!prescription) return null;

  const rx = prescription;
  const alt = rx.alternative;
  const check = rx.readiness_check || readiness?.check || "green";

  const handleAddToCalendar = async () => {
    if (!onAddToCalendar || addedToCalendar) return;
    setAddingToCalendar(true);
    try {
      await onAddToCalendar(rx);
      setAddedToCalendar(true);
    } catch {
      // Silently fail — user can retry
    } finally {
      setAddingToCalendar(false);
    }
  };

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={16} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            Today's Recommendation
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.textDim,
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Regenerate"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Workout Name */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}
      >
        {rx.workout_name}
      </div>

      {/* Meta Row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: isMobile ? "4px 12px" : 16,
          fontSize: 12,
          color: T.textSoft,
          marginBottom: 12,
        }}
      >
        {rx.duration_minutes > 0 && (
          <span style={{ fontFamily: mono, fontWeight: 600 }}>
            {rx.duration_minutes} min
          </span>
        )}
        {rx.tss_estimate > 0 && (
          <span style={{ fontFamily: mono, fontWeight: 600 }}>
            ~{rx.tss_estimate} TSS
          </span>
        )}
        {rx.workout_type && (
          <span
            style={{
              textTransform: "capitalize",
              fontWeight: 500,
            }}
          >
            {rx.workout_type}
          </span>
        )}
      </div>

      {/* Readiness Badge */}
      <div style={{ marginBottom: 12 }}>
        <ReadinessBadge check={check} score={readiness?.score} />
      </div>

      {/* Readiness Note */}
      {rx.readiness_note && (
        <div
          style={{
            fontSize: 12,
            color: T.textSoft,
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {rx.readiness_note}
        </div>
      )}

      {/* Rationale */}
      <div
        style={{
          fontSize: 13,
          color: T.textSoft,
          fontStyle: "italic",
          marginBottom: 12,
          lineHeight: 1.5,
          padding: "8px 12px",
          background: T.gradientSubtle,
          borderRadius: 8,
        }}
      >
        {rx.rationale}
      </div>

      {/* Workout Structure */}
      <StructureTable structure={rx.structure} isMobile={isMobile} />

      {/* Fueling */}
      {rx.fueling && (
        <>
          <FuelingRow fueling={rx.fueling} />
          {(rx.fueling.pre || rx.fueling.post) && (
            <button
              onClick={() => setShowFuelingDetail(!showFuelingDetail)}
              style={{
                background: "none",
                border: "none",
                fontSize: 11,
                color: T.textDim,
                cursor: "pointer",
                padding: "4px 0",
                fontFamily: font,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {showFuelingDetail ? "Hide" : "Full"} fueling plan
              {showFuelingDetail ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
            </button>
          )}
          {showFuelingDetail && (
            <div
              style={{
                fontSize: 11,
                color: T.textSoft,
                lineHeight: 1.6,
                padding: "8px 12px",
                background: T.surface,
                borderRadius: 8,
              }}
            >
              {rx.fueling.pre && (
                <div>
                  <strong>Pre:</strong> {rx.fueling.pre}
                </div>
              )}
              {rx.fueling.during && (
                <div>
                  <strong>During:</strong> {rx.fueling.during}
                </div>
              )}
              {rx.fueling.post && (
                <div>
                  <strong>Post:</strong> {rx.fueling.post}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Weather Note */}
      {rx.weather_note && (
        <div
          style={{
            fontSize: 11,
            color: T.textDim,
            marginTop: 8,
            fontStyle: "italic",
          }}
        >
          {rx.weather_note}
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleAddToCalendar}
          disabled={addingToCalendar || addedToCalendar}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: addedToCalendar ? T.surface : T.accent,
            color: addedToCalendar ? T.accent : T.white,
            border: addedToCalendar
              ? `1px solid ${T.accent}30`
              : "none",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            cursor: addedToCalendar ? "default" : "pointer",
            fontFamily: font,
            opacity: addingToCalendar ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          <Calendar size={13} />
          {addedToCalendar
            ? "Added to Calendar"
            : addingToCalendar
              ? "Adding..."
              : "Add to Calendar"}
        </button>

        {alt && (
          <button
            onClick={() => setShowAlternative(!showAlternative)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "transparent",
              color: T.textSoft,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: font,
              transition: "all 0.2s",
            }}
          >
            <Zap size={13} />
            {showAlternative ? "Hide" : "Show"} Alternative
          </button>
        )}
      </div>

      {/* Alternative Workout */}
      {showAlternative && alt && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            background: T.surface,
            borderRadius: 10,
            border: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
              marginBottom: 4,
            }}
          >
            {alt.name}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 11,
              color: T.textSoft,
              marginBottom: 6,
              fontFamily: mono,
            }}
          >
            {alt.duration_minutes && (
              <span>{alt.duration_minutes} min</span>
            )}
            {alt.tss_estimate && <span>~{alt.tss_estimate} TSS</span>}
          </div>
          <div
            style={{
              fontSize: 12,
              color: T.textSoft,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            {alt.reason}
          </div>
          {alt.structure && (
            <StructureTable structure={alt.structure} isMobile={isMobile} />
          )}
        </div>
      )}

      {/* Power Profile Gaps */}
      {gaps && gaps.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Profile Gaps
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {gaps.map((g) => (
              <div
                key={g.label}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: `${T.warn}15`,
                  border: `1px solid ${T.warn}30`,
                  fontSize: 10,
                  fontWeight: 600,
                  color: T.warn,
                  fontFamily: mono,
                }}
              >
                {g.label}: -{g.deficit}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

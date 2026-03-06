import React from "react";
import { T, font, mono } from "../../theme/tokens";

export default function WorkoutCard({ workout, isMobile }) {
  if (!workout) return null;

  const { name, source, structure, duration_min, target_power, est_tss, fueling } = workout;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {source && (
            <div
              style={{
                fontFamily: font,
                fontSize: 9,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: T.textDim,
                marginBottom: 4,
              }}
            >
              {source}
            </div>
          )}
          <div
            style={{
              fontFamily: font,
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>
        </div>
        <button
          style={{
            fontFamily: font,
            fontSize: 11,
            fontWeight: 600,
            color: T.textSoft,
            background: "transparent",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Swap
        </button>
      </div>

      {/* Structure block */}
      {structure && (
        <pre
          style={{
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.5,
            color: T.text,
            background: T.surface,
            padding: 12,
            borderRadius: 8,
            margin: 0,
            marginBottom: 14,
            whiteSpace: "pre-wrap",
            overflowX: "auto",
          }}
        >
          {structure}
        </pre>
      )}

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: fueling ? 14 : 0,
        }}
      >
        {duration_min != null && (
          <StatPill label="Duration" value={`${duration_min} min`} />
        )}
        {target_power != null && (
          <StatPill label="Target Power" value={target_power} />
        )}
        {est_tss != null && (
          <StatPill label="Est. TSS" value={est_tss} />
        )}
      </div>

      {/* Fueling grid */}
      {fueling && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          {fueling.carbs_per_hour != null && (
            <FuelCell icon={"\uD83C\uDF5E"} value={fueling.carbs_per_hour} unit="g/hr" />
          )}
          {fueling.fluid_ml_per_hour != null && (
            <FuelCell icon={"\uD83D\uDCA7"} value={fueling.fluid_ml_per_hour} unit="ml/hr" />
          )}
          {fueling.sodium_mg_per_hour != null && (
            <FuelCell icon={"\uD83E\uDDC2"} value={fueling.sodium_mg_per_hour} unit="mg/hr" />
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: T.surface,
        borderRadius: 6,
        padding: "5px 10px",
      }}
    >
      <span
        style={{
          fontFamily: font,
          fontSize: 10,
          color: T.textDim,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 12,
          fontWeight: 600,
          color: T.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FuelCell({ icon, value, unit }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 13,
          fontWeight: 700,
          color: T.text,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: font,
          fontSize: 10,
          color: T.textDim,
          fontWeight: 500,
        }}
      >
        {unit}
      </span>
    </div>
  );
}

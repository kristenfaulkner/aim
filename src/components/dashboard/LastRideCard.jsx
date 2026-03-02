import React from "react";
import { T, mono } from "../../theme/tokens";
import { formatDistance, formatElevation, elevationUnit } from "../../lib/units";

// ── Helpers ──

function formatDuration(seconds) {
  if (seconds == null) return "--";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

// ── Metric Box ──

function MetricBox({ label, value, unit }) {
  return (
    <div
      style={{
        background: T.surface,
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: mono,
            fontSize: 20,
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.2,
          }}
        >
          {value ?? "--"}
        </span>
        {unit && (
          <span style={{ fontSize: 10, color: T.textSoft, marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Last Ride Card ──

export default function LastRideCard({ activity, onViewDetails, isMobile, units = "imperial" }) {
  if (!activity) return null;

  const a = activity;

  const dateStr = a.started_at
    ? new Date(a.started_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const summaryParts = [
    a.duration_seconds != null ? formatDuration(a.duration_seconds) : null,
    a.distance_meters != null ? formatDistance(a.distance_meters, units) : null,
    a.elevation_gain_meters != null
      ? `${formatElevation(a.elevation_gain_meters, units)} ${elevationUnit(units)}`
      : null,
    a.tss != null ? `${Math.round(a.tss)} TSS` : null,
  ].filter(Boolean);

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
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 8 : 0,
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 2,
            }}
          >
            Last Ride
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: T.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {a.name || "Ride"}
          </div>
          {dateStr && (
            <div style={{ fontSize: 11, color: T.textSoft, marginTop: 1 }}>
              {dateStr}
            </div>
          )}
        </div>

        {onViewDetails && (
          <button
            onClick={onViewDetails}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: T.accent,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            View Details &rarr;
          </button>
        )}
      </div>

      {/* Summary line */}
      {summaryParts.length > 0 && (
        <div
          style={{
            fontSize: 12,
            color: T.textSoft,
            marginBottom: 14,
            fontFamily: mono,
            display: "flex",
            flexWrap: "wrap",
            gap: "0 6px",
          }}
        >
          {summaryParts.map((part, i) => (
            <span key={i}>
              {i > 0 && (
                <span style={{ color: T.textDim, margin: "0 2px" }}>·</span>
              )}
              {part}
            </span>
          ))}
        </div>
      )}

      {/* 4x2 Metric grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        <MetricBox
          label="Avg Power"
          value={a.avg_power_watts != null ? Math.round(a.avg_power_watts) : null}
          unit="W"
        />
        <MetricBox
          label="Normalized Power"
          value={
            a.normalized_power_watts != null
              ? Math.round(a.normalized_power_watts)
              : null
          }
          unit="W"
        />
        <MetricBox
          label="TSS"
          value={a.tss != null ? Math.round(a.tss) : null}
        />
        <MetricBox
          label="Intensity Factor"
          value={a.intensity_factor != null ? a.intensity_factor.toFixed(2) : null}
        />
        <MetricBox
          label="Avg HR"
          value={a.avg_hr_bpm != null ? Math.round(a.avg_hr_bpm) : null}
          unit="bpm"
        />
        <MetricBox
          label="Max HR"
          value={a.max_hr_bpm != null ? Math.round(a.max_hr_bpm) : null}
          unit="bpm"
        />
        <MetricBox
          label="Calories"
          value={a.calories != null ? Math.round(a.calories).toLocaleString() : null}
          unit="kcal"
        />
        <MetricBox
          label="Work"
          value={a.work_kj != null ? Math.round(a.work_kj).toLocaleString() : null}
          unit="kJ"
        />
      </div>
    </div>
  );
}

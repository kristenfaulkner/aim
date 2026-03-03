import React from "react";
import { T, mono } from "../../theme/tokens";

// ── Metric Panel ──

function CPMetric({ label, value, unit, sub, color }) {
  return (
    <div
      style={{
        background: T.surface,
        borderRadius: 10,
        padding: "12px 14px",
        flex: 1,
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
            fontSize: 22,
            fontWeight: 700,
            color: color || T.text,
            lineHeight: 1.2,
          }}
        >
          {value ?? "--"}
        </span>
        {unit && (
          <span style={{ fontSize: 11, color: T.textSoft, marginLeft: 3 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span style={{ fontSize: 10, color: T.textSoft }}>{sub}</span>
      )}
    </div>
  );
}

// ── CP Model Card ──

export default function CPModelCard({ powerProfile, ftp, isMobile }) {
  if (!powerProfile?.cp_watts) return null;

  const { cp_watts, w_prime_kj, pmax_watts, cp_model_r_squared } = powerProfile;

  // CP vs FTP comparison
  const cpFtpDelta = ftp ? cp_watts - ftp : null;
  const cpFtpText = cpFtpDelta != null
    ? `CP is ${Math.abs(cpFtpDelta)}W ${cpFtpDelta >= 0 ? "above" : "below"} FTP`
    : null;

  // R² quality label
  const rSquared = cp_model_r_squared;
  const fitLabel = rSquared >= 0.98 ? "Excellent"
    : rSquared >= 0.95 ? "Good"
    : rSquared >= 0.90 ? "Fair"
    : "Low";
  const fitColor = rSquared >= 0.95 ? T.accent : rSquared >= 0.90 ? "#f59e0b" : "#ef4444";

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
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          Critical Power Model
        </span>
        {rSquared != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: fitColor,
              background: `${fitColor}15`,
              padding: "2px 8px",
              borderRadius: 8,
            }}
          >
            Fit: {fitLabel} (R² {rSquared})
          </span>
        )}
      </div>

      {/* 3-panel metrics */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <CPMetric
          label="CP"
          value={cp_watts}
          unit="W"
          sub="Aerobic Ceiling"
          color={T.accent}
        />
        <CPMetric
          label="W'"
          value={w_prime_kj}
          unit="kJ"
          sub="Anaerobic Reserve"
          color="#3b82f6"
        />
        <CPMetric
          label="Pmax"
          value={pmax_watts}
          unit="W"
          sub="Sprint Power"
          color="#8b5cf6"
        />
      </div>

      {/* CP vs FTP comparison */}
      {cpFtpText && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: T.textSoft,
            textAlign: "center",
          }}
        >
          {cpFtpText}
        </div>
      )}
    </div>
  );
}

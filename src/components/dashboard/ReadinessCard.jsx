import React from "react";
import { T, mono } from "../../theme/tokens";
import SourceBadge from "../SourceBadge";

// ── Readiness Ring ──
// SVG circular progress showing recovery score 0-100
function ReadinessRing({ score }) {
  const size = 88;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 70 ? "#10b981" : clamped >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={T.surface}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      {/* Score number centered over the ring */}
      <div
        style={{
          marginTop: -size + (size - 24) / 2,
          height: size,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 26,
            fontWeight: 700,
            color: color,
            lineHeight: 1,
          }}
        >
          {score != null ? clamped : "--"}
        </span>
      </div>

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.textSoft,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginTop: 6,
        }}
      >
        Readiness
      </span>
    </div>
  );
}

// ── Metric Pill ──
function MetricPill({ label, value, unit, badge }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        {badge}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span
          style={{
            fontFamily: mono,
            fontSize: 18,
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.2,
          }}
        >
          {value ?? "--"}
        </span>
        <span style={{ fontSize: 11, color: T.textSoft }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Subjective score computation ──
function computeSubjectiveScore(checkin) {
  if (!checkin) return null;
  const { life_stress_score, motivation_score, muscle_soreness_score, mood_score } = checkin;
  const values = [];
  if (life_stress_score != null) values.push(6 - life_stress_score); // invert
  if (motivation_score != null) values.push(motivation_score);
  if (muscle_soreness_score != null) values.push(6 - muscle_soreness_score); // invert
  if (mood_score != null) values.push(mood_score);
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length; // 1-5
  return Math.round(((avg - 1) / 4) * 100); // 0-100
}

function blendReadiness(deviceScore, subjectiveScore) {
  if (deviceScore == null && subjectiveScore == null) return null;
  if (subjectiveScore == null) return deviceScore;
  if (deviceScore == null) return subjectiveScore;
  return Math.round(deviceScore * 0.7 + subjectiveScore * 0.3);
}

// ── Readiness Card ──
export default function ReadinessCard({ dailyMetrics, checkinData, isMobile }) {
  const m = dailyMetrics || {};

  const deepSleepMin =
    m.deep_sleep_seconds != null
      ? Math.round(m.deep_sleep_seconds / 60)
      : null;

  const subjectiveScore = computeSubjectiveScore(checkinData);
  const blendedScore = blendReadiness(m.recovery_score, subjectiveScore);

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: isMobile ? 16 : 20,
      }}
    >
      {/* Metric pills */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <MetricPill label="HRV" value={m.hrv_ms} unit="ms"
          badge={m.hrv_source ? <SourceBadge source={m.hrv_source} context="resting" compact /> : null} />
        <MetricPill label="RHR" value={m.resting_hr_bpm} unit="bpm"
          badge={m.rhr_source ? <SourceBadge source={m.rhr_source} context="resting" compact /> : null} />
        <MetricPill
          label="Sleep Score"
          value={m.sleep_score}
          unit="/100"
        />
        {subjectiveScore != null ? (
          <MetricPill label="Subjective" value={subjectiveScore} unit="/100" />
        ) : (
          <MetricPill label="Deep Sleep" value={deepSleepMin} unit="min" />
        )}
      </div>
    </div>
  );
}

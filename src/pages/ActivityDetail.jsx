import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { ArrowLeft, Clock, Zap, Heart, Mountain, Gauge, Activity, TrendingUp, Flame, RefreshCw, Brain, ChevronRight, Star, X, Check, Send, Menu, Settings, User, LogOut, Wind, Thermometer, Droplets, Tag, Target, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { usePreferences } from "../context/PreferencesContext";
import { formatDistance, formatSpeed, formatElevation, elevationUnit, formatWeight, weightUnit } from "../lib/units";
import { FormattedText } from "../lib/formatText.jsx";
import InsightFeedback from "../components/InsightFeedback";
import { formatActivityDate, formatActivityTime, getActivityTimezoneAbbrev } from "../lib/formatTime";
import SessionNotes from "../components/SessionNotes.jsx";
import WbalChart from "../components/WbalChart.jsx";
import { useWbalData } from "../hooks/useWbalData.js";

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}


function MetricCard({ icon, label, value, unit, color }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ color: color || T.accent, opacity: 0.7 }}>{icon}</div>
        <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.03em", color: color || T.text }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: T.textDim, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}

function ZoneBar({ zones, ftp, isMobile }) {
  if (!zones) return null;
  const zoneColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626", "#7c3aed"];
  const zoneLabels = ["Z1 Recovery", "Z2 Endurance", "Z3 Tempo", "Z4 Threshold", "Z5 VO2max", "Z6 Anaerobic", "Z7 Sprint"];
  const total = Object.values(zones).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Power Zones</div>
      <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        {Object.entries(zones).map(([z, seconds], i) => {
          const pct = (seconds / total) * 100;
          if (pct < 0.5) return null;
          return <div key={z} style={{ width: `${pct}%`, background: zoneColors[i], transition: "width 0.5s" }} title={`${zoneLabels[i]}: ${formatDuration(seconds)}`} />;
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
        {Object.entries(zones).map(([z, seconds], i) => {
          const pct = ((seconds / total) * 100).toFixed(0);
          return (
            <div key={z} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: zoneColors[i], flexShrink: 0 }} />
              <span style={{ color: T.textDim }}>{zoneLabels[i].split(" ")[0]}</span>
              <span style={{ fontFamily: mono, color: T.textSoft, fontWeight: 600 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Tag label lookup (matches api/_lib/tags.js)
const TAG_LABELS = {
  race_day: "Race Day", group_ride: "Group Ride", indoor_trainer: "Indoor",
  endurance_steady: "Endurance", tempo_ride: "Tempo", sweet_spot_session: "Sweet Spot",
  threshold_session: "Threshold", vo2_session: "VO2max", anaerobic_session: "Anaerobic",
  neuromuscular_session: "Neuromuscular", climbing_focus: "Climbing", rolling_surge_ride: "Rolling/Surges",
  hot_conditions: "Hot", cold_conditions: "Cold", high_wind_conditions: "Windy",
  high_drift: "High Drift", low_hrv_day: "Low HRV", poor_sleep_day: "Poor Sleep",
  data_quality_issue: "Data Quality", low_cadence_interval: "Low Cadence", high_cadence_interval: "High Cadence",
  vo2_interval: "VO2", threshold_interval: "Threshold", sweet_spot_interval: "Sweet Spot",
  anaerobic_interval: "Anaerobic", sprint_interval: "Sprint", overcooked_start: "Overcooked",
  power_fade: "Faded", strong_finish: "Strong Finish", inconsistent_power: "Inconsistent",
  cadence_decay: "Cadence Decay", cadence_collapse: "Cadence Collapse", hr_lag_slow: "Slow HR Rise",
};

const TAG_CATEGORY_COLORS = {
  type: "#3b82f6", energy_system: T.accent, terrain: "#8b5cf6",
  environment: "#f59e0b", physiology: "#ef4444", readiness: "#f97316", meta: T.textDim,
};

function TagPills({ tags }) {
  if (!tags || tags.length === 0) return null;
  // Only show workout-level tags
  const workoutTags = tags.filter(t => t.scope === "workout");
  if (workoutTags.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {workoutTags.map((tag, i) => {
        const label = TAG_LABELS[tag.tag_id] || tag.tag_id.replace(/_/g, " ");
        return (
          <span key={i} style={{
            fontSize: 10, fontWeight: 600, padding: "3px 10px",
            borderRadius: 20, background: `${T.accent}12`, color: T.accent,
            border: `1px solid ${T.accent}25`, letterSpacing: "0.02em",
          }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

function WeatherCard({ weather }) {
  if (!weather) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Thermometer size={14} style={{ color: "#f59e0b" }} /> Conditions
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {weather.temp_c != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Thermometer size={13} style={{ color: T.textDim }} />
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{Math.round(weather.temp_c)}°C</span>
            {weather.apparent_temp_c != null && weather.apparent_temp_c !== weather.temp_c && (
              <span style={{ fontSize: 11, color: T.textDim }}>(feels {Math.round(weather.apparent_temp_c)}°)</span>
            )}
          </div>
        )}
        {weather.humidity_pct != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Droplets size={13} style={{ color: "#3b82f6" }} />
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600 }}>{Math.round(weather.humidity_pct)}%</span>
          </div>
        )}
        {weather.wind_speed_mps != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Wind size={13} style={{ color: T.textDim }} />
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600 }}>{Math.round(weather.wind_speed_mps * 3.6)} km/h</span>
          </div>
        )}
        {weather.dew_point_c != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: T.textDim }}>Dew pt</span>
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600 }}>{Math.round(weather.dew_point_c)}°C</span>
          </div>
        )}
      </div>
    </div>
  );
}

function IntervalsTable({ laps, isMobile }) {
  if (!laps?.intervals?.length) return null;

  const workIntervals = laps.intervals.filter(i => i.type === "work");
  const hasExecution = workIntervals.some(i => i.execution);
  const hasCadenceDrift = workIntervals.some(i => i.execution?.cadence_drift != null);

  const executionLabelColors = {
    met: T.accent,
    strong_finish: "#22c55e",
    negative_split: "#22c55e",
    slightly_high: "#eab308",
    slightly_low: "#eab308",
    faded: "#f97316",
    overcooked: "#ef4444",
    inconsistent: "#f97316",
    unknown: T.textDim,
  };

  const executionLabelText = {
    met: "Met Target",
    strong_finish: "Strong Finish",
    negative_split: "Neg Split",
    slightly_high: "Slightly High",
    slightly_low: "Slightly Low",
    faded: "Faded",
    overcooked: "Overcooked",
    inconsistent: "Inconsistent",
    unknown: "—",
  };

  const typeColors = {
    warmup: "#3b82f6",
    work: T.accent,
    rest: T.textDim,
    cooldown: "#8b5cf6",
    unknown: T.textDim,
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Intervals</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.textDim }}>
            {workIntervals.length} work interval{workIntervals.length !== 1 ? "s" : ""}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px",
            borderRadius: 6, background: `${T.accent}15`, color: T.accent
          }}>
            {laps.source === "fit_laps" ? "FIT Laps" : "Auto-detected"}
          </span>
        </div>
      </div>

      {/* Set-level summary */}
      {laps.set_metrics && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 10, marginBottom: 16, padding: "12px 14px",
          background: T.surface, borderRadius: 10
        }}>
          {laps.set_metrics.avg_work_power_w && (
            <div>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Avg Power</div>
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: T.accent }}>{laps.set_metrics.avg_work_power_w}W</div>
            </div>
          )}
          {laps.set_metrics.power_consistency_cv != null && (
            <div>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Consistency</div>
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700 }}>CV {(laps.set_metrics.power_consistency_cv * 100).toFixed(1)}%</div>
            </div>
          )}
          {laps.set_metrics.durability_index != null && (
            <div>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Durability</div>
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: laps.set_metrics.durability_index >= 0.95 ? T.accent : T.warn }}>
                {(laps.set_metrics.durability_index * 100).toFixed(0)}%
              </div>
            </div>
          )}
          {laps.set_metrics.total_work_kj > 0 && (
            <div>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Total Work</div>
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700 }}>{laps.set_metrics.total_work_kj} kJ</div>
            </div>
          )}
        </div>
      )}

      {/* Intervals table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: "left", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Type</th>
              <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Duration</th>
              <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg W</th>
              {!isMobile && <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>NP</th>}
              <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg HR</th>
              {!isMobile && <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Cadence</th>}
              {hasCadenceDrift && !isMobile && <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Cad Drift</th>}
              {hasExecution && !isMobile && <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Execution</th>}
            </tr>
          </thead>
          <tbody>
            {laps.intervals.map((interval, i) => {
              const label = interval.execution?.execution_label;
              const drift = interval.type === "work" ? interval.execution?.cadence_drift ?? null : null;
              const driftColor = drift == null ? T.textDim
                : drift < -15 ? "#ef4444"
                : drift < -8 ? "#f59e0b"
                : drift > 4 ? T.accent
                : T.textSoft;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}08` }}>
                  <td style={{ padding: "8px 6px", fontFamily: mono, color: T.textDim }}>{i + 1}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 6px",
                      borderRadius: 4, background: `${typeColors[interval.type] || T.textDim}15`,
                      color: typeColors[interval.type] || T.textDim, textTransform: "capitalize"
                    }}>
                      {interval.type}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono }}>
                    {formatDuration(interval.duration_s)}
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, fontWeight: 600, color: interval.type === "work" ? T.accent : T.textSoft }}>
                    {interval.avg_power_w || "—"}
                  </td>
                  {!isMobile && (
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, color: T.textSoft }}>
                      {interval.normalized_power_w || "—"}
                    </td>
                  )}
                  <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, color: interval.avg_hr_bpm ? T.danger : T.textDim }}>
                    {interval.avg_hr_bpm || "—"}
                  </td>
                  {!isMobile && (
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, color: T.textSoft }}>
                      {interval.avg_cadence_rpm || "—"}
                    </td>
                  )}
                  {hasCadenceDrift && !isMobile && (
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, fontSize: 11, color: driftColor }}>
                      {drift != null ? `${drift > 0 ? "+" : ""}${drift}` : "—"}
                    </td>
                  )}
                  {hasExecution && !isMobile && (
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      {label ? (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px",
                          borderRadius: 4, background: `${executionLabelColors[label] || T.textDim}15`,
                          color: executionLabelColors[label] || T.textDim,
                        }}>
                          {executionLabelText[label] || label}
                        </span>
                      ) : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Execution detail for mobile (below table) */}
      {hasExecution && isMobile && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {workIntervals.map((interval, i) => {
            const label = interval.execution?.execution_label;
            if (!label) return null;
            return (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px",
                borderRadius: 4, background: `${executionLabelColors[label] || T.textDim}15`,
                color: executionLabelColors[label] || T.textDim,
              }}>
                Rep {i + 1}: {executionLabelText[label] || label}
              </span>
            );
          })}
        </div>
      )}

      {/* Cadence drift pills for mobile */}
      {hasCadenceDrift && isMobile && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {workIntervals.map((interval, i) => {
            const d = interval.execution?.cadence_drift;
            if (d == null || Math.abs(d) < 4) return null;
            const color = d < -15 ? "#ef4444" : d < -8 ? "#f59e0b" : d > 4 ? T.accent : T.textDim;
            return (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px",
                borderRadius: 4, background: `${color}15`, color,
              }}>
                Rep {i + 1}: {d > 0 ? "+" : ""}{d} rpm
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlannedVsActual({ data, isMobile }) {
  if (!data) return null;
  const { plan, comparison, execution_score } = data;
  if (!plan) return null;

  const scoreColor = execution_score?.score >= 85 ? "#22c55e"
    : execution_score?.score >= 70 ? T.accent
    : execution_score?.score >= 50 ? "#f59e0b"
    : "#ef4444";

  const scoreLabel = execution_score?.label === "excellent" ? "Excellent"
    : execution_score?.label === "good" ? "Good"
    : execution_score?.label === "fair" ? "Fair"
    : "Needs Work";

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={14} style={{ color: "#3b82f6" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Planned vs Actual</span>
        </div>
        {execution_score && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.textDim }}>Execution</span>
            <span style={{
              fontSize: 14, fontWeight: 800, fontFamily: mono, color: scoreColor,
              padding: "2px 10px", borderRadius: 8, background: `${scoreColor}15`,
            }}>
              {execution_score.score}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: scoreColor }}>{scoreLabel}</span>
          </div>
        )}
      </div>

      {/* Plan summary */}
      <div style={{
        padding: "12px 14px", background: T.surface, borderRadius: 10, marginBottom: 16,
        display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Planned</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{plan.title || plan.workout_type || "Workout"}</div>
        </div>
        {plan.planned_duration_min && (
          <div>
            <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Duration</div>
            <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{plan.planned_duration_min}m</div>
          </div>
        )}
        {plan.planned_tss && (
          <div>
            <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Target TSS</div>
            <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{plan.planned_tss}</div>
          </div>
        )}
        {plan.description && (
          <div style={{ flex: "1 0 100%", fontSize: 11, color: T.textSoft, lineHeight: 1.4, marginTop: 2 }}>
            {plan.description}
          </div>
        )}
      </div>

      {/* Interval comparisons */}
      {comparison?.comparisons?.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ textAlign: "left", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Interval</th>
                <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Target W</th>
                <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Actual W</th>
                <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Power Δ</th>
                {!isMobile && (
                  <>
                    <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Target Dur</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Actual Dur</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Dur Δ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {comparison.comparisons.map((c, i) => {
                const powerColor = c.power_deviation_pct == null ? T.textDim
                  : Math.abs(c.power_deviation_pct) <= 3 ? "#22c55e"
                  : Math.abs(c.power_deviation_pct) <= 8 ? "#f59e0b"
                  : "#ef4444";
                const durColor = c.duration_deviation_pct == null ? T.textDim
                  : Math.abs(c.duration_deviation_pct) <= 5 ? "#22c55e"
                  : Math.abs(c.duration_deviation_pct) <= 15 ? "#f59e0b"
                  : "#ef4444";

                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}08` }}>
                    <td style={{ padding: "8px 6px", fontSize: 11, fontWeight: 500 }}>{c.planned_name}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, color: T.textSoft }}>
                      {c.planned_watts || "—"}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, fontWeight: 600 }}>
                      {c.actual_watts || "—"}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, fontWeight: 700, color: powerColor }}>
                      {c.power_deviation_pct != null ? `${c.power_deviation_pct > 0 ? "+" : ""}${c.power_deviation_pct}%` : "—"}
                    </td>
                    {!isMobile && (
                      <>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, color: T.textSoft }}>
                          {c.planned_duration_s ? formatDuration(c.planned_duration_s) : "—"}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono }}>
                          {c.actual_duration_s ? formatDuration(c.actual_duration_s) : "—"}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, fontWeight: 700, color: durColor }}>
                          {c.duration_deviation_pct != null ? `${c.duration_deviation_pct > 0 ? "+" : ""}${c.duration_deviation_pct}%` : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Count mismatch notice */}
      {comparison && !comparison.count_match && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: "#f59e0b10", fontSize: 11, color: "#f59e0b", fontWeight: 500,
        }}>
          Planned {comparison.planned_count} intervals, completed {comparison.actual_count}
        </div>
      )}

      {/* Execution score breakdown */}
      {execution_score?.breakdown && (
        <div style={{
          marginTop: 14, display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 8, padding: "10px 12px", background: T.surface, borderRadius: 8
        }}>
          {[
            { label: "Count", val: execution_score.breakdown.count, max: 40 },
            { label: "Power", val: execution_score.breakdown.power, max: 30 },
            { label: "Duration", val: execution_score.breakdown.duration, max: 20 },
            { label: "Consistency", val: execution_score.breakdown.consistency, max: 10 },
          ].map(({ label, val, max }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 2 }}>
                <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: val >= max * 0.8 ? "#22c55e" : val >= max * 0.5 ? "#f59e0b" : "#ef4444" }}>
                  {val}
                </span>
                <span style={{ fontSize: 10, color: T.textDim }}>/{max}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nutrition plan if present */}
      {plan.nutrition_plan && (
        <div style={{
          marginTop: 14, padding: "10px 12px", background: T.surface, borderRadius: 8,
          fontSize: 11, color: T.textSoft, lineHeight: 1.5
        }}>
          <span style={{ fontWeight: 600, color: T.text, fontSize: 10, textTransform: "uppercase" }}>Nutrition Plan: </span>
          {typeof plan.nutrition_plan === "string" ? plan.nutrition_plan : JSON.stringify(plan.nutrition_plan)}
        </div>
      )}
    </div>
  );
}

function PowerCurveDisplay({ curve }) {
  if (!curve) return null;
  const labels = { "5s": "5 sec", "30s": "30 sec", "1m": "1 min", "5m": "5 min", "20m": "20 min", "60m": "60 min" };
  const maxWatts = Math.max(...Object.values(curve).filter(Boolean));

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Power Curve — Best Efforts</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(labels).map(([key, label]) => {
          const watts = curve[key];
          if (!watts) return null;
          const pct = (watts / maxWatts) * 100;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: T.textDim, width: 50, textAlign: "right", flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 22, background: T.surface, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent}40, ${T.accent})`, borderRadius: 6, transition: "width 0.5s" }} />
              </div>
              <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: T.text, width: 50, textAlign: "right", flexShrink: 0 }}>{watts}W</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIAnalysis({ analysis, loading, onRegenerate, activityId }) {
  const [activeTab, setActiveTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  // Parse AI analysis into structured insights
  const parsedAnalysis = useMemo(() => {
    if (analysis && typeof analysis === "object" && Array.isArray(analysis.insights)) return analysis;
    if (analysis && typeof analysis === "string") {
      try {
        const parsed = JSON.parse(analysis);
        if (Array.isArray(parsed.insights)) return parsed;
      } catch { /* not JSON */ }
      return {
        summary: null,
        insights: [{ type: "insight", icon: "\u2726", category: "performance", title: "AI Analysis", body: analysis, confidence: "high" }],
        dataGaps: [],
      };
    }
    return null;
  }, [analysis]);

  const analysisInsights = parsedAnalysis?.insights || null;
  const analysisSummary = parsedAnalysis?.summary || null;
  const dataGaps = parsedAnalysis?.dataGaps || [];

  const [insightFilter, setInsightFilter] = useState("all");
  const filteredInsights = !analysisInsights ? [] :
    insightFilter === "all" ? analysisInsights :
    analysisInsights.filter(i => i.category === insightFilter);

  const allCategories = [
    { id: "all", label: "All" },
    { id: "performance", label: "Performance" },
    { id: "body", label: "Body Comp" },
    { id: "recovery", label: "Recovery" },
    { id: "training", label: "Training" },
    { id: "nutrition", label: "Nutrition" },
    { id: "environment", label: "Environment" },
    { id: "health", label: "Health" },
  ];
  const insightCategories = analysisInsights ? allCategories.map(c => ({
    ...c,
    count: c.id === "all" ? analysisInsights.length : analysisInsights.filter(i => i.category === c.id).length,
  })).filter(c => c.id === "all" || c.count > 0) : [];

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: userMsg, activityId, history: messages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: !res.ok ? `Error: ${data.error || "Request failed"}` : data.reply || "Sorry, I couldn't process that." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Connection error: ${err.message || "Please try again."}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isTyping]);

  const tabs = [{ id: "analysis", label: "AI Analysis" }, { id: "summary", label: "Summary" }, { id: "chat", label: "Ask Claude" }];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, display: "flex", flexDirection: "column", minHeight: 500, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.bg }}>{"\u2726"}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AIM Intelligence</div>
              <div style={{ fontSize: 9, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cross-domain insights</div>
            </div>
          </div>
          {analysisInsights && (
            <button onClick={onRegenerate} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 10, color: T.textDim, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={10} /> Regenerate
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 600, color: activeTab === tab.id ? T.accent : T.textSoft, cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.2s", fontFamily: font }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: activeTab === "chat" ? 0 : "14px 18px" }}>
        {activeTab === "summary" ? (
          <div style={{ padding: "8px 0" }}>
            {!analysisInsights ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{loading ? "" : "\u2726"}</div>
                {loading ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
                      {[0, 1, 2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
                    </div>
                    <div style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>Analyzing your training data...</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 6, lineHeight: 1.5 }}>Our AI engine is reviewing your power, recovery, and training load to generate personalized insights.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 16 }}>Generate an AI analysis to see your summary</div>
                    <button onClick={onRegenerate} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer", fontFamily: font }}>{"\u2726"} Generate Analysis</button>
                  </>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Workout Summary</div>
                {analysisSummary && (
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.8, padding: "16px 18px", background: T.bg, borderRadius: 12, borderLeft: `3px solid ${T.accent}`, marginBottom: 16 }}><FormattedText text={analysisSummary} /></div>
                )}
                {analysisInsights.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Key Takeaways</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analysisInsights.slice(0, 4).map((insight, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: T.bg, borderRadius: 10 }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{insight.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>{insight.title}</div>
                            <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>{insight.body?.length > 120 ? insight.body.slice(0, 120) + "..." : insight.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {analysisInsights.length > 4 && (
                      <button onClick={() => setActiveTab("analysis")} style={{ background: "none", border: "none", fontSize: 11, color: T.accent, cursor: "pointer", fontFamily: font, fontWeight: 600, marginTop: 10, padding: 0 }}>View all {analysisInsights.length} insights →</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!analysisInsights ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{loading ? "" : "\u2726"}</div>
                {loading ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
                      {[0, 1, 2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
                    </div>
                    <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginBottom: 6 }}>Analyzing your training data...</div>
                    <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>Our AI engine is reviewing your power, recovery, body composition, and training load to generate personalized insights.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ready to analyze this ride</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>Our AI engine will review your power data, recovery metrics, body composition, and training load to generate cross-domain insights.</div>
                    <button onClick={onRegenerate} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer", fontFamily: font }}>{"\u2726"} Generate AI Analysis</button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Post-Ride Analysis</div>

                {analysisSummary && (
                  <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, padding: "10px 14px", background: T.bg, borderRadius: 10, borderLeft: `3px solid ${T.accent}` }}><FormattedText text={analysisSummary} /></div>
                )}

                {insightCategories.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    {insightCategories.map(cat => (
                      <button key={cat.id} onClick={() => setInsightFilter(cat.id)} style={{ background: insightFilter === cat.id ? `${T.accent}18` : T.bg, border: `1px solid ${insightFilter === cat.id ? T.accentMid : T.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: insightFilter === cat.id ? T.accent : T.textSoft, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5, fontFamily: font, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {cat.label}
                        <span style={{ fontSize: 8, background: insightFilter === cat.id ? `${T.accent}30` : `${T.textDim}30`, padding: "1px 4px", borderRadius: 6, color: insightFilter === cat.id ? T.accent : T.textDim }}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredInsights.map((insight, i) => {
                  const originalIndex = analysisInsights.indexOf(insight);
                  return (
                    <div key={i} style={{ background: T.bg, borderRadius: 11, padding: "12px 14px", borderLeft: `3px solid ${insight.type === "positive" ? T.accent : insight.type === "warning" ? T.warn : insight.type === "action" ? T.purple : T.blue}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <span style={{ fontSize: 13 }}>{insight.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>{insight.title}</span>
                        {insight.confidence && (
                          <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 4, background: insight.confidence === "high" ? T.accentDim : `${T.warn}20`, color: insight.confidence === "high" ? T.accent : T.warn, textTransform: "uppercase", letterSpacing: "0.05em" }}>{insight.confidence}</span>
                        )}
                      </div>
                      <FormattedText text={insight.body} style={{ fontSize: 11, lineHeight: 1.6, color: T.textSoft }} />
                      <InsightFeedback
                        activityId={activity?.id}
                        source="activity_analysis"
                        insightIndex={originalIndex}
                        insight={insight}
                      />
                    </div>
                  );
                })}

                {dataGaps.length > 0 && insightFilter === "all" && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Unlock More Insights</div>
                    {dataGaps.map((gap, i) => (
                      <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 6, borderLeft: `3px solid ${T.blue}30`, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{"\uD83D\uDD17"}</span>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: T.textSoft }}>{gap}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Chat tab */
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
                  <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ask me anything about this ride</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                    {["Why was my cardiac drift high today?", "How does this compare to my best efforts?", "What should my next workout be?", "Am I overtraining?"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 11, color: T.textSoft, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: font }}
                        onMouseOver={e => { e.target.style.borderColor = T.accentMid; e.target.style.color = T.text; }}
                        onMouseOut={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textSoft; }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px", background: msg.role === "user" ? T.accent : T.bg, color: msg.role === "user" ? T.bg : T.text, fontSize: 12, lineHeight: 1.6, fontWeight: msg.role === "user" ? 600 : 400 }}>
                    {msg.role === "user" ? msg.text : <FormattedText text={msg.text} />}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: "flex", gap: 4, padding: "9px 13px", background: T.bg, borderRadius: 13, width: "fit-content" }}>
                  {[0, 1, 2].map(i => (<div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }} />))}
                </div>
              )}
            </div>
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} placeholder="Ask about this ride..." style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: T.text, outline: "none", fontFamily: font }} />
                <button onClick={handleSendChat} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer" }}>{"\u2192"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [localName, setLocalName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const { isMobile, isTablet } = useResponsive();
  const { signout, profile } = useAuth();
  const { units } = usePreferences();
  const { data: wbalData, loading: wbalLoading } = useWbalData(id);
  const handleSignout = async () => { await signout(); navigate("/"); };

  const fetchActivity = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/activities/detail?id=${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Activity fetch failed:", res.status, errData);
      setError(errData.detail || "Activity not found");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setActivity(data);
    setLoading(false);

    // If no AI analysis yet, start polling
    if (!data.ai_analysis && !data.ai_analysis_generated_at) {
      pollForAnalysis(session.access_token);
    }
  }, [id]);

  const pollForAnalysis = async (token) => {
    setAnalysisLoading(true);
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds total

    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/activities/detail?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ai_analysis) {
            setActivity(data);
            setAnalysisLoading(false);
            clearInterval(poll);
          }
        }
      } catch { /* ignore */ }

      if (attempts >= maxAttempts) {
        setAnalysisLoading(false);
        clearInterval(poll);
      }
    }, 5000);
  };

  const triggerAnalysis = async () => {
    setAnalysisLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/activities/analyze?id=${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        console.error("Analysis returned non-JSON response");
        return;
      }
      if (res.ok && data.analysis) {
        setActivity(prev => ({ ...prev, ai_analysis: data.analysis, ai_analysis_generated_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    }
    setAnalysisLoading(false);
  };

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  // Sync localName when activity first loads
  useEffect(() => {
    if (activity) setLocalName(activity.name || "");
  }, [activity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveName = useCallback(async (newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === (activity?.name || "")) {
      setLocalName(activity?.name || "");
      setNameEditing(false);
      return;
    }
    setNameSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/activities/annotate?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setActivity(prev => ({ ...prev, name: trimmed }));
        setLocalName(trimmed);
      } else {
        setLocalName(activity?.name || "");
      }
    } catch { /* ignore */ } finally {
      setNameSaving(false);
      setNameEditing(false);
    }
  }, [activity?.name, id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RefreshCw size={24} style={{ color: T.accent, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontSize: 16, color: T.textSoft }}>{error}</p>
        <button onClick={() => navigate("/activities")} style={{ ...btn(false), fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to Activities
        </button>
      </div>
    );
  }

  const a = activity;
  const formattedDate = formatActivityDate(a, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const formattedTime = formatActivityTime(a, { hour: "numeric", minute: "2-digit" });
  const tzAbbrev = getActivityTimezoneAbbrev(a);

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "0 12px" : "0 40px", height: isMobile ? 48 : 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => navigate("/activities")} style={{ background: T.accentDim, border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowLeft size={12} /> Activities
              </button>
              {[{ label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{ background: "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>{item.label}</button>
              ))}
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white, cursor: "pointer" }}>
                {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
              </div>
              {userMenuOpen && (<>
                <div onClick={() => setUserMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 149 }} />
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 160, zIndex: 150, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                  <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                    <User size={14} /> Profile
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                    <Settings size={14} /> Settings
                  </button>
                  <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                  <button onClick={() => { setUserMenuOpen(false); handleSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            {[{ label: "Dashboard", path: "/dashboard" }, { label: "Activities", path: "/activities" }, { label: "My Stats", path: "/my-stats" }, { label: "Sleep", path: "/sleep" }, { label: "Health Lab", path: "/health-lab" }, { label: "Connect", path: "/connect" }, { label: "Profile", path: "/profile" }, { label: "Settings", path: "/settings" }].map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{ background: item.label === "Activities" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: item.label === "Activities" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>{item.label}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px" : isTablet ? "32px 24px" : "32px 40px" }}>
        {/* Title section */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentMid}`, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.activity_type}</span>
          </div>
          {nameEditing ? (
            <input
              autoFocus
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={() => saveName(localName)}
              onKeyDown={e => { if (e.key === "Enter") { e.target.blur(); } if (e.key === "Escape") { setLocalName(a.name || ""); setNameEditing(false); } }}
              style={{
                fontSize: isMobile ? 22 : 32, fontWeight: 800, letterSpacing: "-0.03em",
                margin: "0 0 6px", width: "100%", background: T.surface,
                border: `2px solid ${T.accentMid}`, borderRadius: 8,
                padding: "4px 10px", fontFamily: font, color: T.text, outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <h1
              onClick={() => setNameEditing(true)}
              title="Click to edit name"
              style={{
                fontSize: isMobile ? 22 : 32, fontWeight: 800, letterSpacing: "-0.03em",
                margin: "0 0 6px", cursor: "text",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {a.name || "Untitled Activity"}
              {nameSaving && <span style={{ fontSize: 12, color: T.textDim, fontWeight: 400 }}>Saving...</span>}
            </h1>
          )}
          <p style={{ fontSize: 14, color: T.textDim, margin: 0 }}>{formattedDate} at {formattedTime}{tzAbbrev ? ` ${tzAbbrev}` : ""}</p>
          {a.description && <p style={{ fontSize: 14, color: T.textSoft, margin: "8px 0 0", lineHeight: 1.5 }}>{a.description}</p>}
          <TagPills tags={a.activity_tags} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1.5fr 1fr" : "1fr 1fr", gap: isMobile ? 24 : isTablet ? 24 : 32 }}>
          {/* Left column: Metrics */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Session notes & annotations */}
            <SessionNotes
              key={id}
              activityId={id}
              initialNotes={a.user_notes || ""}
              initialRating={a.user_rating || 0}
              initialRpe={a.user_rpe || 0}
              initialTags={a.user_tags || []}
              initialGiComfort={a.gi_comfort || 0}
              initialMentalFocus={a.mental_focus || 0}
              initialPerceivedRecoveryPre={a.perceived_recovery_pre || 0}
            />

            {/* Primary metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <MetricCard icon={<Clock size={16} />} label="Duration" value={formatDuration(a.duration_seconds)} />
              <MetricCard icon={<Activity size={16} />} label="Distance" value={formatDistance(a.distance_meters, units)} />
              <MetricCard icon={<Mountain size={16} />} label="Elevation" value={a.elevation_gain_meters ? formatElevation(a.elevation_gain_meters, units) : "--"} unit={elevationUnit(units)} />
              <MetricCard icon={<Gauge size={16} />} label="Avg Speed" value={formatSpeed(a.avg_speed_mps, units)} />
            </div>

            {/* Power metrics */}
            {a.avg_power_watts && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={14} style={{ color: T.accent }} /> Power
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Zap size={14} />} label="Avg Power" value={Math.round(a.avg_power_watts)} unit="W" color={T.accent} />
                  <MetricCard icon={<Zap size={14} />} label="NP" value={a.normalized_power_watts ? Math.round(a.normalized_power_watts) : "--"} unit="W" color={T.accent} />
                  <MetricCard icon={<Zap size={14} />} label="Max Power" value={a.max_power_watts ? Math.round(a.max_power_watts) : "--"} unit="W" />
                </div>
              </div>
            )}

            {/* Training metrics */}
            {(a.tss || a.intensity_factor) && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={14} style={{ color: T.blue }} /> Training Load
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Flame size={14} />} label="TSS" value={a.tss ? Math.round(a.tss) : "--"} color={T.warn} />
                  <MetricCard icon={<Gauge size={14} />} label="IF" value={a.intensity_factor || "--"} color={T.blue} />
                  <MetricCard icon={<Activity size={14} />} label="VI" value={a.variability_index || "--"} />
                </div>
              </div>
            )}

            {/* Heart rate */}
            {a.avg_hr_bpm && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <Heart size={14} style={{ color: T.danger }} /> Heart Rate
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Heart size={14} />} label="Avg HR" value={Math.round(a.avg_hr_bpm)} unit="bpm" color={T.danger} />
                  <MetricCard icon={<Heart size={14} />} label="Max HR" value={a.max_hr_bpm ? Math.round(a.max_hr_bpm) : "--"} unit="bpm" color={T.danger} />
                  <MetricCard icon={<TrendingUp size={14} />} label="EF" value={a.efficiency_factor || "--"} />
                </div>
              </div>
            )}

            {/* Additional metrics */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
              {a.work_kj && <MetricCard icon={<Zap size={14} />} label="Work" value={Math.round(a.work_kj)} unit="kJ" />}
              {a.calories && <MetricCard icon={<Flame size={14} />} label="Calories" value={a.calories} unit="kcal" />}
              {a.hr_drift_pct != null && <MetricCard icon={<TrendingUp size={14} />} label="HR Drift" value={`${a.hr_drift_pct}%`} color={Math.abs(a.hr_drift_pct) > 5 ? T.warn : T.accent} />}
            </div>

            {/* Weather conditions */}
            <WeatherCard weather={a.activity_weather} />

            {/* Planned vs Actual */}
            <PlannedVsActual data={a.planned_vs_actual} isMobile={isMobile} />

            {/* Intervals */}
            <IntervalsTable laps={a.laps} isMobile={isMobile} />

            {/* Zone distribution */}
            <ZoneBar zones={a.zone_distribution} isMobile={isMobile} />

            {/* W' Balance */}
            {(wbalData || wbalLoading) && a.avg_power_watts && (
              <WbalChart data={wbalData} loading={wbalLoading} />
            )}

            {/* Power curve */}
            <PowerCurveDisplay curve={a.power_curve} />
          </div>

          {/* Right column: AI Analysis */}
          <div style={isMobile ? {} : { position: "sticky", top: 80 }}>
            <AIAnalysis
              analysis={a.ai_analysis}
              loading={analysisLoading}
              onRegenerate={triggerAnalysis}
              activityId={id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

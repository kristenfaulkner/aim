import { useState } from "react";
import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";

// ── Helper ──
function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

// ── StatBox ──
function StatBox({ label, value, unit, sub, highlight, small }) {
  return (
    <div style={{
      padding: small ? "8px 10px" : "10px 12px",
      background: highlight ? T.gradientSubtle : T.card,
      border: `1px solid ${highlight ? T.accentMid : T.border}`,
      borderRadius: 10,
      display: "flex", flexDirection: "column", gap: 2,
      boxShadow: highlight ? `0 2px 12px ${T.accentGlow}` : "none",
    }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: small ? 16 : 18, fontWeight: 700, color: highlight ? T.accent : T.text, fontFamily: mono, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: T.textSoft, fontFamily: font }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 9, color: highlight ? T.accent : T.textSoft, fontFamily: font, fontWeight: highlight ? 600 : 400 }}>{sub}</div>}
    </div>
  );
}


// ── Zone Bars ──
function ZoneBars({ zones, title }) {
  const maxMins = Math.max(...zones.map(z => z.mins));
  if (maxMins === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {zones.map((z, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 72, fontSize: 9, color: T.textSoft, fontFamily: font, flexShrink: 0 }}>{z.zone}</div>
            <div style={{ flex: 1, background: T.surface, borderRadius: 3, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${maxMins ? (z.mins / maxMins) * 100 : 0}%`, height: "100%", background: z.color, borderRadius: 3, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <div style={{ width: 28, fontSize: 10, fontFamily: mono, color: T.text, textAlign: "right", flexShrink: 0 }}>{z.mins}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compliance Card ──
function ComplianceCard({ activity }) {
  const pva = activity?.planned_vs_actual;
  if (!pva?.plan) return null;
  const { plan, execution_score } = pva;
  const plannedDur = plan.planned_duration_min ? `${plan.planned_duration_min}m` : null;
  const actualDur = activity.duration_seconds ? formatDuration(activity.duration_seconds) : null;

  return (
    <div style={{
      background: T.card, border: `1px solid rgba(245,158,11,0.15)`,
      borderLeft: `3px solid ${T.amber}`, borderRadius: 10, padding: "10px 14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font, marginBottom: 3 }}>Workout Compliance</div>
          {plannedDur && actualDur && (
            <div style={{ fontSize: 11, color: T.text, fontFamily: font }}>
              <span style={{ fontFamily: mono, fontWeight: 700 }}>{plannedDur}</span>
              <span style={{ color: T.textDim, margin: "0 6px" }}>{"\u2192"}</span>
              <span style={{ fontFamily: mono, fontWeight: 700 }}>{actualDur}</span>
            </div>
          )}
        </div>
        {execution_score?.score != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: T.textDim, fontFamily: font }}>Execution</div>
            <div style={{
              fontSize: 14, fontWeight: 800, fontFamily: mono,
              color: execution_score.score >= 85 ? T.accent : execution_score.score >= 70 ? T.amber : T.red,
            }}>{execution_score.score}</div>
          </div>
        )}
      </div>
      {plan.title && (
        <div style={{
          fontSize: 10, color: T.textSoft, fontFamily: font, marginTop: 6,
          lineHeight: 1.4, borderTop: `1px solid ${T.border}`, paddingTop: 6,
        }}>
          <span style={{ fontWeight: 600, color: T.text }}>Rx:</span> {plan.title}
          {plan.description ? ` \u2014 ${plan.description}` : ""}
        </div>
      )}
    </div>
  );
}

// ── Metrics View ──
function MetricsView({ activity, units }) {
  const a = activity;
  if (!a) return null;

  const metrics = [
    { label: "Norm. Power", value: a.normalized_power_watts ? Math.round(a.normalized_power_watts) : "--", unit: "W", highlight: false },
    { label: "Avg Power", value: a.avg_power_watts ? Math.round(a.avg_power_watts) : "--", unit: "W" },
    { label: "Max Power", value: a.max_power_watts ? Math.round(a.max_power_watts) : "--", unit: "W" },
    { label: "Avg HR", value: a.avg_hr_bpm ? Math.round(a.avg_hr_bpm) : "--", unit: "bpm" },
    { label: "Max HR", value: a.max_hr_bpm ? Math.round(a.max_hr_bpm) : "--", unit: "bpm" },
    { label: "EF", value: a.efficiency_factor || "--" },
    { label: "Work", value: a.work_kj ? Math.round(a.work_kj).toLocaleString() : "--", unit: "kJ" },
    { label: "Calories", value: a.calories ? Math.round(a.calories).toLocaleString() : "--", unit: "kcal" },
    { label: "VI", value: a.variability_index || "--" },
    { label: "HR Drift", value: a.hr_drift_pct != null ? `${a.hr_drift_pct}%` : "--" },
    { label: "Cadence", value: a.avg_cadence_rpm ? Math.round(a.avg_cadence_rpm) : "--", unit: "rpm" },
    { label: "IF", value: a.intensity_factor || "--" },
  ].filter(m => m.value !== "--");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {metrics.map((m, i) => (
        <StatBox key={i} label={m.label} value={m.value} unit={m.unit} sub={m.sub} highlight={m.highlight} small />
      ))}
    </div>
  );
}

// ── Zones View ──
function ZonesView({ activity }) {
  const zones = activity?.zone_distribution;
  if (!zones) return <div style={{ fontSize: 12, color: T.textDim, padding: 16, textAlign: "center" }}>No zone data available</div>;

  const zoneColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626", "#7c3aed"];
  const zoneLabels = ["Z1 Recovery", "Z2 Endurance", "Z3 Tempo", "Z4 Threshold", "Z5 VO2max", "Z6 Anaerobic", "Z7 Sprint"];

  const powerZones = Object.entries(zones).map(([z, seconds], i) => ({
    zone: zoneLabels[i] || z,
    mins: Math.round(seconds / 60),
    color: zoneColors[i] || T.textDim,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
      <ZoneBars zones={powerZones} title="Power Zones" />
    </div>
  );
}

// ── Interval Insight Detection ──
function detectIntervalInsights(workIntervals) {
  if (workIntervals.length < 2) return {};
  const insights = {};

  for (let i = 1; i < workIntervals.length; i++) {
    const curr = workIntervals[i];
    const prev = workIntervals[i - 1];
    const flags = [];

    // HR drift: HR rising significantly between intervals at similar/lower power
    if (curr.avg_hr_bpm && prev.avg_hr_bpm) {
      const hrRise = curr.avg_hr_bpm - prev.avg_hr_bpm;
      const pwrDrop = (prev.avg_power_w || 0) - (curr.avg_power_w || 0);
      if (hrRise >= 4 && pwrDrop >= 0) {
        flags.push({ icon: "\u26A0\uFE0F", label: "HR drift", color: T.amber, bg: "rgba(245,158,11,0.08)" });
      }
    }

    // Cadence fade: significant cadence drop
    if (curr.avg_cadence_rpm && prev.avg_cadence_rpm) {
      const cadDrop = prev.avg_cadence_rpm - curr.avg_cadence_rpm;
      if (cadDrop >= 5) {
        flags.push({ icon: "\uD83D\uDD34", label: "Cadence fade", color: T.danger, bg: "rgba(239,68,68,0.06)" });
      }
    }

    // Power fade from execution metrics
    if (curr.execution?.fade_score != null && curr.execution.fade_score < -0.08) {
      flags.push({ icon: "\u26A0\uFE0F", label: "Power fade", color: T.amber, bg: "rgba(245,158,11,0.08)" });
    }

    if (flags.length > 0) insights[i] = flags;
  }

  return insights;
}

// ── Laps View (Interval Execution) ──
function LapsView({ activity }) {
  const laps = activity?.laps?.intervals;
  if (!laps || laps.length === 0) return <div style={{ fontSize: 12, color: T.textDim, padding: 16, textAlign: "center" }}>No lap data available</div>;

  const workIntervals = laps.filter(l => l.type === "work");
  const hasWorkIntervals = workIntervals.length >= 2;
  const setMetrics = activity?.laps?.set_metrics;

  // Target power: from planned_vs_actual or inferred from execution metrics
  const pva = activity?.planned_vs_actual;
  const plannedTarget = pva?.comparison?.comparisons?.[0]?.planned_watts;
  const inferredTarget = workIntervals[0]?.execution?.target_power_w;
  const targetPower = plannedTarget || inferredTarget || null;

  // Build workout summary line (e.g., "4 × 20 min threshold · Target 275W")
  let workoutSummary = null;
  if (hasWorkIntervals) {
    const count = workIntervals.length;
    const avgDurS = Math.round(workIntervals.reduce((s, w) => s + (w.duration_s || 0), 0) / count);
    const durMin = Math.round(avgDurS / 60);
    const durLabel = durMin >= 1 ? `${durMin} min` : `${avgDurS}s`;

    // Zone label from intensity
    let zoneLabel = "";
    if (targetPower && activity?.ftp_at_activity) {
      const pctFtp = targetPower / activity.ftp_at_activity;
      if (pctFtp >= 1.05) zoneLabel = "VO2max";
      else if (pctFtp >= 0.91) zoneLabel = "threshold";
      else if (pctFtp >= 0.76) zoneLabel = "sweet spot";
      else if (pctFtp >= 0.56) zoneLabel = "tempo";
      else zoneLabel = "endurance";
    }

    const parts = [`${count} \u00D7 ${durLabel}`];
    if (zoneLabel) parts[0] += ` ${zoneLabel}`;
    if (targetPower) parts.push(`Target ${targetPower}W`);
    // Use plan title if available and more descriptive
    if (pva?.plan?.title) {
      workoutSummary = pva.plan.title;
    } else {
      workoutSummary = parts.join(" \u00B7 ");
    }
  }

  // Detect per-interval insights
  const intervalInsights = hasWorkIntervals ? detectIntervalInsights(workIntervals) : {};

  // Summary stats for work intervals
  const avgPower = setMetrics?.avg_work_power_w || (workIntervals.length
    ? Math.round(workIntervals.reduce((s, w) => s + (w.avg_power_w || 0), 0) / workIntervals.length)
    : null);
  const avgHr = workIntervals.length
    ? Math.round(workIntervals.filter(w => w.avg_hr_bpm).reduce((s, w) => s + w.avg_hr_bpm, 0) / workIntervals.filter(w => w.avg_hr_bpm).length || 0)
    : null;
  const powerFade = workIntervals.length >= 2
    ? Math.round((workIntervals[workIntervals.length - 1].avg_power_w || 0) - (workIntervals[0].avg_power_w || 0))
    : null;
  const hrDrift = workIntervals.length >= 2 && workIntervals[0].avg_hr_bpm && workIntervals[workIntervals.length - 1].avg_hr_bpm
    ? Math.round(workIntervals[workIntervals.length - 1].avg_hr_bpm - workIntervals[0].avg_hr_bpm)
    : null;

  // If not a structured workout, fall back to all-laps view
  const displayIntervals = hasWorkIntervals ? workIntervals : laps;
  const showVsTgt = hasWorkIntervals && targetPower;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      {/* Title */}
      <div style={{ padding: "16px 18px 12px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: font }}>
          {hasWorkIntervals ? "Interval Execution" : "Laps"}
        </div>
        {workoutSummary && (
          <div style={{ fontSize: 13, color: T.textSoft, fontFamily: font, marginTop: 2 }}>
            {workoutSummary}
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: showVsTgt ? "36px 52px 60px 56px 56px 60px 1fr" : "36px 52px 60px 56px 60px 1fr",
        padding: "6px 18px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        {[
          "#", "TIME", "POWER", ...(showVsTgt ? ["VS TGT"] : []), "HR", "CADENCE", ""
        ].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>{h}</div>
        ))}
      </div>

      {/* Interval rows */}
      <div>
        {displayIntervals.map((lap, i) => {
          const delta = showVsTgt && lap.avg_power_w ? Math.round(lap.avg_power_w - targetPower) : null;
          const deltaColor = delta != null
            ? (Math.abs(delta) <= 5 ? T.accent : delta > 5 ? T.amber : delta < -10 ? T.danger : T.amber)
            : null;
          const insights = intervalInsights[i] || [];
          const hasWarning = insights.length > 0;

          // Left border color: green if on target, yellow/orange if drifting
          const borderColor = delta != null
            ? (Math.abs(delta) <= 5 ? T.accent : Math.abs(delta) <= 10 ? T.amber : T.danger)
            : (lap.type === "work" ? T.accent : T.border);

          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: showVsTgt ? "36px 52px 60px 56px 56px 60px 1fr" : "36px 52px 60px 56px 60px 1fr",
              padding: "14px 18px",
              borderBottom: `1px solid ${T.border}`,
              borderLeft: `3px solid ${borderColor}`,
              background: hasWarning ? "rgba(245,158,11,0.04)" : "transparent",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 12, fontFamily: mono, color: T.textDim, fontWeight: 600 }}>#{i + 1}</span>
              <span style={{ fontSize: 13, fontFamily: mono, color: T.text }}>{formatDuration(lap.duration_s)}</span>
              <span style={{ fontSize: 16, fontFamily: mono, fontWeight: 700, color: T.accent }}>
                {lap.avg_power_w ? Math.round(lap.avg_power_w) : "--"}
                <span style={{ fontSize: 11, fontWeight: 400, color: T.textDim }}>w</span>
              </span>
              {showVsTgt && (
                <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 600, color: deltaColor }}>
                  {delta != null ? `${delta > 0 ? "+" : ""}${delta}W` : "--"}
                </span>
              )}
              <span style={{ fontSize: 13, fontFamily: mono, color: T.text }}>
                {lap.avg_hr_bpm ? Math.round(lap.avg_hr_bpm) : "--"}
                <span style={{ fontSize: 10, color: T.textDim }}>bpm</span>
              </span>
              <span style={{ fontSize: 13, fontFamily: mono, color: T.text, fontWeight: (insights.some(f => f.label === "Cadence fade")) ? 700 : 400 }}>
                {lap.avg_cadence_rpm ? Math.round(lap.avg_cadence_rpm) : "--"}
                <span style={{ fontSize: 10, color: T.textDim }}>rpm</span>
              </span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {insights.map((flag, fi) => (
                  <span key={fi} style={{
                    fontSize: 10, fontWeight: 700, color: flag.color,
                    background: flag.bg, borderRadius: 6, padding: "3px 8px",
                    display: "inline-flex", alignItems: "center", gap: 3,
                    lineHeight: 1.3,
                  }}>
                    {flag.icon} {flag.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer for structured workouts */}
      {hasWorkIntervals && (avgPower || avgHr) && (
        <div style={{
          display: "flex", gap: 16, padding: "14px 18px", background: T.surface,
          borderTop: `1px solid ${T.border}`, flexWrap: "wrap",
        }}>
          {avgPower && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>Avg Power</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: mono, color: T.text }}>{avgPower}W</div>
            </div>
          )}
          {avgHr > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>Avg HR</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: mono, color: T.text }}>{avgHr}bpm</div>
            </div>
          )}
          {powerFade != null && powerFade !== 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>Power Fade</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: mono, color: powerFade < -5 ? T.danger : T.text }}>
                {powerFade > 0 ? "+" : ""}{powerFade}W
              </div>
            </div>
          )}
          {hrDrift != null && hrDrift !== 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>HR Drift</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: mono, color: hrDrift > 5 ? T.amber : T.text }}>
                {hrDrift > 0 ? "+" : ""}{hrDrift}bpm
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Peaks View ──
function PeaksView({ activity }) {
  const curve = activity?.power_curve;
  if (!curve) return <div style={{ fontSize: 12, color: T.textDim, padding: 16, textAlign: "center" }}>No peak data available</div>;

  const durations = [
    { key: "5s", label: "5s" }, { key: "30s", label: "30s" },
    { key: "1m", label: "1m" }, { key: "5m", label: "5m" },
    { key: "10m", label: "10m" }, { key: "20m", label: "20m" },
    { key: "60m", label: "60m" }, { key: "90m", label: "90m" },
  ];

  const peaks = durations.filter(d => curve[d.key]).map(d => ({
    dur: d.label,
    val: `${curve[d.key]}W`,
  }));

  if (peaks.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font, marginBottom: 10 }}>Peak Power</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {peaks.map((p, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: T.textDim, fontFamily: font, marginBottom: 2 }}>{p.dur}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: mono }}>{p.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Similar Sessions List ──
function SimilarSessionsList({ data, loading }) {
  if (loading) return <div style={{ fontSize: 11, color: T.textDim, padding: 12, textAlign: "center" }}>Loading similar sessions...</div>;
  const sessions = data?.similar || data?.sessions || [];
  if (sessions.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>Similar Sessions</span>
      </div>
      {sessions.slice(0, 3).map((r, i) => {
        const name = r.name || r.activity_name || "Untitled";
        const date = r.date || (r.started_at ? new Date(r.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
        const np = r.normalized_power_watts ? `${Math.round(r.normalized_power_watts)}W` : r.np || "";
        const ef = r.efficiency_factor || r.ef || "";
        const tss = r.tss ? Math.round(r.tss) : "";
        const match = r.similarity_score ? `${Math.round(r.similarity_score * 100)}%` : r.match || "";

        return (
          <div key={i} style={{ borderTop: `1px solid ${T.border}`, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.text, fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ fontSize: 9, color: T.textDim, fontFamily: font, flexShrink: 0 }}>{date}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {np && <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>NP <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{np}</span></span>}
                {ef && <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>EF <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{ef}</span></span>}
                {tss && <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>TSS <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{tss}</span></span>}
              </div>
            </div>
            {match && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: T.blue,
                background: `${T.blue}14`, border: `1px solid ${T.blue}25`,
                borderRadius: 20, padding: "2px 8px", fontFamily: font,
              }}>{match}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── DataPanel (main export) ──
export default function DataPanel({ activity, similarSessions, units }) {
  const { isMobile } = useResponsive();
  const [dataTab, setDataTab] = useState("metrics");
  const dataTabs = [
    { id: "metrics", label: "Metrics" },
    { id: "zones", label: "Zones" },
    { id: "laps", label: "Laps" },
    { id: "peaks", label: "Peaks" },
  ];

  if (!activity) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Compliance */}
      <ComplianceCard activity={activity} />

      {/* Sub-tabs */}
      <div style={{
        display: "flex", gap: 2, background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: 3,
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
      }}>
        {dataTabs.map(tab => (
          <button key={tab.id} onClick={() => setDataTab(tab.id)}
            style={{
              flex: isMobile ? "0 0 auto" : 1, padding: "6px 8px", borderRadius: 6,
              border: "none", cursor: "pointer", fontFamily: font,
              fontSize: 11, fontWeight: 600,
              background: dataTab === tab.id ? T.surface : "transparent",
              color: dataTab === tab.id ? T.text : T.textDim,
              transition: "all 0.12s", whiteSpace: "nowrap",
              minHeight: 32,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content with fadeUp */}
      <div key={dataTab} style={{ animation: "aim-fadeUp 0.15s ease" }}>
        {dataTab === "metrics" && <MetricsView activity={activity} units={units} />}
        {dataTab === "zones" && <ZonesView activity={activity} />}
        {dataTab === "laps" && <LapsView activity={activity} />}
        {dataTab === "peaks" && <PeaksView activity={activity} />}
      </div>

      {/* Similar sessions */}
      <SimilarSessionsList data={similarSessions?.data} loading={similarSessions?.loading} />

      <style>{`@keyframes aim-fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

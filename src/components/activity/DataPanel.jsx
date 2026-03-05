import { useState, useEffect, useRef, useMemo } from "react";
import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";
import { Target } from "lucide-react";

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

// ── Activity Trace Chart ──
function ActivityChart({ activity }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = 2;
    const W = 600, H = 140;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // jsdom has no canvas context
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Try to use real stream data from laps, otherwise generate from activity data
    const laps = activity?.laps?.intervals;
    const dur = activity?.duration_seconds || 0;

    // Generate representative power trace from intervals/laps
    const N = 300;
    const points = [];
    const hrPoints = [];

    if (laps && laps.length > 0) {
      // Build trace from lap data
      const totalDur = laps.reduce((s, l) => s + (l.duration_s || 0), 0) || dur;
      let elapsed = 0;
      for (let i = 0; i < N; i++) {
        const t = (i / N) * totalDur;
        // Find which lap this time falls in
        let cumul = 0;
        let lap = laps[0];
        for (const l of laps) {
          cumul += l.duration_s || 0;
          if (t < cumul) { lap = l; break; }
        }
        const pwr = (lap.avg_power_w || lap.normalized_power_w || 0) + (Math.random() - 0.5) * 30;
        const hr = (lap.avg_hr_bpm || 0) + (Math.random() - 0.5) * 8;
        points.push(Math.max(0, Math.min(500, pwr)));
        hrPoints.push(Math.max(60, Math.min(200, hr)));
        elapsed += totalDur / N;
      }
    } else {
      // Generate synthetic trace from summary metrics
      const avgPwr = activity?.avg_power_watts || 200;
      const avgHr = activity?.avg_hr_bpm || 140;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const variation = Math.sin(i * 0.15) * 25 + (Math.random() - 0.5) * 20;
        const warmup = t < 0.1 ? t * 10 : 1;
        const cooldown = t > 0.92 ? (1 - t) * 12 : 1;
        points.push(Math.max(0, avgPwr * warmup * cooldown + variation));
        hrPoints.push(Math.max(60, avgHr * warmup * cooldown + Math.sin(i * 0.08) * 6));
      }
    }

    if (points.length === 0) return;

    const maxPwr = Math.max(...points, 100);
    const minHr = Math.min(...hrPoints);
    const maxHr = Math.max(...hrPoints);
    const hrRange = maxHr - minHr || 1;

    // Power area fill
    ctx.beginPath();
    points.forEach((v, i) => {
      const x = (i / (N - 1)) * W;
      const y = H - 8 - (v / maxPwr) * (H - 16);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H - 8);
    ctx.lineTo(0, H - 8);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(139,92,246,0.18)");
    g.addColorStop(1, "rgba(139,92,246,0.01)");
    ctx.fillStyle = g;
    ctx.fill();

    // Power line
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = T.purple + "cc";
    points.forEach((v, i) => {
      const x = (i / (N - 1)) * W;
      const y = H - 8 - (v / maxPwr) * (H - 16);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // HR line
    if (hrPoints.some(h => h > 60)) {
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = T.red + "88";
      hrPoints.forEach((v, i) => {
        const x = (i / (N - 1)) * W;
        const y = H - 8 - ((v - minHr + 10) / (hrRange + 20)) * (H - 16);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Interval markers from laps
    if (laps && laps.length > 1) {
      const totalDur = laps.reduce((s, l) => s + (l.duration_s || 0), 0) || 1;
      let cumul = 0;
      laps.forEach((l) => {
        cumul += l.duration_s || 0;
        const t = cumul / totalDur;
        if (t > 0.01 && t < 0.99) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(0,0,0,0.06)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 5]);
          ctx.moveTo(t * W, 0);
          ctx.lineTo(t * W, H);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Time labels
    if (dur > 0) {
      ctx.fillStyle = T.textDim;
      ctx.font = `9px ${mono}`;
      const labelCount = 6;
      for (let i = 0; i < labelCount; i++) {
        const secs = (i / (labelCount - 1)) * dur;
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        ctx.fillText(`${h}:${String(m).padStart(2, "0")}`, (i / (labelCount - 1)) * (W - 28), H);
      }
    }
  }, [activity]);

  return (
    <div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 140, borderRadius: 8, display: "block" }} />
      <div style={{ display: "flex", gap: 12, marginTop: 6, justifyContent: "center" }}>
        {[["Power", T.purple], ["HR", T.red]].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 14, height: 2, background: c, borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: T.textDim, fontFamily: font }}>{l}</span>
          </div>
        ))}
      </div>
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

// ── Laps View ──
function LapsView({ activity }) {
  const [expandedLap, setExpandedLap] = useState(null);
  const laps = activity?.laps?.intervals;
  if (!laps || laps.length === 0) return <div style={{ fontSize: 12, color: T.textDim, padding: 16, textAlign: "center" }}>No lap data available</div>;

  const typeColors = { warmup: T.blue, work: T.accent, rest: T.textDim, cooldown: T.purple, recovery: T.textDim, unknown: T.textDim };
  const typeBgs = { work: T.accentDim, warmup: "rgba(59,130,246,0.03)", recovery: "rgba(239,68,68,0.03)", rest: "rgba(239,68,68,0.03)" };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "32px 48px 50px 44px 44px 1fr",
        padding: "8px 12px", borderBottom: `1px solid ${T.border}`, background: T.surface,
      }}>
        {["#", "Time", "W", "HR", "EF", "Note"].map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: font }}>{h}</div>
        ))}
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {laps.map((lap, i) => {
          const isInt = lap.type === "work";
          const isRec = lap.type === "recovery" || lap.type === "rest";
          const isWarm = lap.type === "warmup";
          return (
            <div key={i} onClick={() => setExpandedLap(expandedLap === i ? null : i)}
              style={{
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
                background: typeBgs[lap.type] || "transparent",
              }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 48px 50px 44px 44px 1fr", padding: "6px 12px", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontFamily: mono, color: T.textDim }}>{i + 1}</span>
                <span style={{ fontSize: 10, fontFamily: mono, color: T.text }}>{formatDuration(lap.duration_s)}</span>
                <span style={{ fontSize: 10, fontFamily: mono, color: isInt ? T.accent : T.text, fontWeight: isInt ? 700 : 400 }}>{lap.avg_power_w || "--"}</span>
                <span style={{ fontSize: 10, fontFamily: mono, color: T.red }}>{lap.avg_hr_bpm || "--"}</span>
                <span style={{ fontSize: 10, fontFamily: mono, color: T.textSoft }}>
                  {lap.avg_power_w && lap.avg_hr_bpm ? (lap.avg_power_w / lap.avg_hr_bpm).toFixed(2) : "--"}
                </span>
                <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                    background: `${typeColors[lap.type] || T.textDim}12`,
                    color: typeColors[lap.type] || T.textDim,
                    textTransform: "capitalize", marginRight: 4,
                  }}>{lap.type}</span>
                </span>
              </div>
              {expandedLap === i && (
                <div style={{ padding: "6px 12px 8px", borderTop: `1px solid ${T.border}`, background: T.surface }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {lap.avg_cadence_rpm && <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>Cadence: <span style={{ fontFamily: mono, color: T.text }}>{lap.avg_cadence_rpm} rpm</span></span>}
                    {lap.normalized_power_w && <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>NP: <span style={{ fontFamily: mono, color: T.text }}>{lap.normalized_power_w}W</span></span>}
                    {lap.max_power_w && <span style={{ fontSize: 9, color: T.textSoft, fontFamily: font }}>Max: <span style={{ fontFamily: mono, color: T.text }}>{lap.max_power_w}W</span></span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
        const match = r.match_score ? `${Math.round(r.match_score * 100)}%` : r.match || "";

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
      {/* Chart */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 14px 10px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font, marginBottom: 8 }}>Activity Trace</div>
        <ActivityChart activity={activity} />
      </div>

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

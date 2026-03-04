import { useState } from "react";
import { T, mono } from "../theme/tokens";
import { Mountain, ChevronDown, ChevronUp, Trophy, Clock, Zap, Heart } from "lucide-react";

// ── Helpers ──

function formatTime(seconds) {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(startedAt) {
  if (!startedAt) return "--";
  return new Date(startedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(startedAt) {
  if (!startedAt) return "--";
  return new Date(startedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function deltaBadge(delta, unit = "s") {
  if (delta == null) return null;
  const abs = Math.abs(delta);
  const isPositive = delta > 0;
  // For time: positive delta = slower (bad), negative = faster (good)
  const color = isPositive ? T.danger : T.accent;
  const sign = isPositive ? "+" : "-";
  return { text: `${sign}${abs}${unit}`, color };
}

function adjustmentPill(adj) {
  return {
    text: `${adj.factor}: +${adj.impact_seconds}s`,
    detail: adj.detail,
  };
}

// ── Segment Effort Card ──

function SegmentEffortCard({ segment, currentEffort, historicalEfforts, isMobile }) {
  const [expanded, setExpanded] = useState(false);

  const seg = segment;
  const ce = currentEffort;
  const efforts = historicalEfforts || [];

  // Find PR
  const prEffort = efforts.find(e => e.is_pr) ||
    (efforts.length > 0 ? efforts.reduce((best, e) =>
      e.elapsed_time_seconds < best.elapsed_time_seconds ? e : best
    , efforts[0]) : null);

  // Most recent effort (before current)
  const lastEffort = efforts.length > 0 ? efforts[0] : null;

  const prDelta = prEffort
    ? ce.elapsed_time_seconds - prEffort.elapsed_time_seconds
    : null;

  const lastDelta = lastEffort
    ? ce.elapsed_time_seconds - lastEffort.elapsed_time_seconds
    : null;

  const prBadge = deltaBadge(prDelta);
  const lastBadge = deltaBadge(lastDelta);

  // Adjustments
  const factors = ce.adjustment_factors;
  const adjustments = factors?.adjustments || [];
  const adjustedTime = factors?.adjusted_time;
  const totalAdj = factors?.total_adjustment_seconds;

  // Grade description
  const gradeText = seg.average_grade_pct != null
    ? `${Math.round(seg.average_grade_pct * 10) / 10}% avg`
    : "flat";
  const distText = seg.distance_m
    ? seg.distance_m >= 1000 ? `${(seg.distance_m / 1000).toFixed(1)} km` : `${Math.round(seg.distance_m)} m`
    : "";

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: isMobile ? 14 : 18,
      transition: "border-color 0.2s",
    }}>
      {/* Header — always visible */}
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Segment name + metadata */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mountain size={14} style={{ color: T.accent, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {seg.name}
              </span>
              {ce.is_pr && (
                <span style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                }}>
                  <Trophy size={10} /> PR
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
              {distText}{distText && gradeText ? " · " : ""}{gradeText}
              {seg.climb_category > 0 && ` · Cat ${seg.climb_category}`}
            </div>
          </div>
          {expanded ? <ChevronUp size={16} color={T.textDim} /> : <ChevronDown size={16} color={T.textDim} />}
        </div>

        {/* Current effort metrics */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 12 : 20,
          marginTop: 10,
          flexWrap: "wrap",
        }}>
          {/* Time */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color={T.textSoft} />
            <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: T.text }}>
              {formatTime(ce.elapsed_time_seconds)}
            </span>
          </div>

          {/* Power */}
          {ce.avg_power_watts && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={12} color={T.textSoft} />
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: T.text }}>
                {Math.round(ce.avg_power_watts)}W
              </span>
            </div>
          )}

          {/* HR */}
          {ce.avg_hr_bpm && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Heart size={12} color={T.textSoft} />
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: T.text }}>
                {Math.round(ce.avg_hr_bpm)} bpm
              </span>
            </div>
          )}

          {/* vs PR */}
          {prBadge && (
            <span style={{
              fontFamily: mono,
              fontSize: 12,
              fontWeight: 600,
              color: prBadge.color,
              background: prBadge.color === T.accent ? T.accentDim : "rgba(239,68,68,0.08)",
              padding: "2px 8px",
              borderRadius: 10,
            }}>
              vs PR: {prBadge.text}
            </span>
          )}

          {/* vs Last */}
          {lastBadge && prEffort && lastEffort && prEffort.id !== lastEffort.id && (
            <span style={{
              fontFamily: mono,
              fontSize: 12,
              fontWeight: 600,
              color: lastBadge.color,
              background: lastBadge.color === T.accent ? T.accentDim : "rgba(239,68,68,0.08)",
              padding: "2px 8px",
              borderRadius: 10,
            }}>
              vs Last: {lastBadge.text}
            </span>
          )}
        </div>

        {/* Adjustment summary (compact, always shown if adjustments exist) */}
        {adjustments.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.textDim }}>Adjusted:</span>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.accent }}>
              {formatTime(adjustedTime)}
            </span>
            <span style={{ fontSize: 11, color: T.textDim }}>
              ({totalAdj > 0 ? `-${Math.round(totalAdj)}s` : "no adjustment"})
            </span>
            {adjustments.map((adj, i) => (
              <span key={i} style={{
                fontSize: 10,
                fontFamily: mono,
                color: T.textSoft,
                background: T.surface,
                padding: "2px 6px",
                borderRadius: 8,
              }}>
                {adjustmentPill(adj).text}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded: full effort history */}
      {expanded && efforts.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            All Efforts ({efforts.length + 1} total)
          </div>

          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 55px 55px 55px" : "90px 65px 65px 55px 50px 70px 65px",
            padding: "4px 0",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={thStyle}>Date</span>
            <span style={thStyle}>Time</span>
            {!isMobile && <span style={thStyle}>Power</span>}
            {!isMobile && <span style={thStyle}>HR</span>}
            <span style={thStyle}>P:HR</span>
            <span style={thStyle}>Adj</span>
            <span style={thStyle}>Score</span>
          </div>

          {/* Current effort row (highlighted) */}
          <HistoryRow
            effort={ce}
            isCurrent
            isMobile={isMobile}
          />

          {/* Historical rows */}
          {efforts.map(e => (
            <HistoryRow
              key={e.id}
              effort={e}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* First effort message */}
      {expanded && efforts.length === 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.textSoft, textAlign: "center", padding: "16px 0" }}>
          First time on this segment! Ride it again to unlock comparison insights.
        </div>
      )}
    </div>
  );
}

// ── History Table Row ──

const thStyle = {
  fontSize: 10,
  color: T.textDim,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  textAlign: "right",
};

function HistoryRow({ effort, isCurrent, isMobile }) {
  const e = effort;
  const adjFactors = e.adjustment_factors;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 55px 55px 55px" : "90px 65px 65px 55px 50px 70px 65px",
      padding: "5px 0",
      borderBottom: `1px solid ${T.border}`,
      background: isCurrent ? T.accentDim : "transparent",
      borderRadius: isCurrent ? 6 : 0,
    }}>
      <span style={{ fontSize: 12, color: isCurrent ? T.accent : T.textSoft, fontWeight: isCurrent ? 700 : 400, textAlign: "right", paddingRight: 8 }}>
        {isCurrent ? "Today" : formatDate(e.started_at)}
        {e.is_pr && !isCurrent && " \u2B50"}
      </span>
      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: T.text, textAlign: "right" }}>
        {formatTime(e.elapsed_time_seconds)}
      </span>
      {!isMobile && (
        <span style={{ fontFamily: mono, fontSize: 12, color: T.textSoft, textAlign: "right" }}>
          {e.avg_power_watts ? `${Math.round(e.avg_power_watts)}W` : "--"}
        </span>
      )}
      {!isMobile && (
        <span style={{ fontFamily: mono, fontSize: 12, color: T.textSoft, textAlign: "right" }}>
          {e.avg_hr_bpm ? Math.round(e.avg_hr_bpm) : "--"}
        </span>
      )}
      <span style={{ fontFamily: mono, fontSize: 12, color: T.textSoft, textAlign: "right" }}>
        {e.power_hr_ratio ?? "--"}
      </span>
      <span style={{ fontFamily: mono, fontSize: 12, color: T.textSoft, textAlign: "right" }}>
        {adjFactors?.adjusted_time ? formatTime(adjFactors.adjusted_time) : "--"}
      </span>
      <span style={{
        fontFamily: mono,
        fontSize: 12,
        fontWeight: 600,
        color: e.adjusted_score && e.adjusted_score >= 100 ? T.accent : T.text,
        textAlign: "right",
      }}>
        {e.adjusted_score ? `${Math.round(e.adjusted_score * 10) / 10}%` : "--"}
      </span>
    </div>
  );
}

// ── Main Panel ──

export default function SegmentComparisonPanel({ data, loading, isMobile }) {
  if (loading) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Mountain size={14} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Segments</span>
        </div>
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, fontSize: 13 }}>
          Loading segments...
        </div>
      </div>
    );
  }

  if (!data?.segments || data.segments.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mountain size={14} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Segments</span>
          <span style={{
            background: T.surface,
            color: T.textSoft,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: mono,
            padding: "2px 8px",
            borderRadius: 10,
          }}>
            {data.segments.length}
          </span>
        </div>
      </div>

      {/* Segment cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.segments.map((s, i) => (
          <SegmentEffortCard
            key={s.segment?.id || i}
            segment={s.segment}
            currentEffort={s.currentEffort}
            historicalEfforts={s.historicalEfforts}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

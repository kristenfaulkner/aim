import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, mono } from "../theme/tokens";
import { useResponsive } from "../hooks/useResponsive";
import { fetchCompareAnalysis } from "../hooks/useSimilarSessions";
import { FormattedText } from "../lib/formatText.jsx";
import { GitCompareArrows, ChevronDown, ChevronUp, ExternalLink, Loader } from "lucide-react";

// ── Helpers ──

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(startedAt) {
  if (!startedAt) return "--";
  return new Date(startedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPct(a, b) {
  if (a == null || b == null || b === 0) return null;
  return Math.round(((a - b) / b) * 1000) / 10;
}

function deltaColor(pct, higherIsBetter) {
  if (pct == null) return T.textDim;
  const good = higherIsBetter ? pct > 0 : pct < 0;
  const bad = higherIsBetter ? pct < 0 : pct > 0;
  if (Math.abs(pct) < 1.5) return T.textDim;
  if (good) return T.accent;
  if (bad) return T.danger;
  return T.textDim;
}

function formatDelta(pct) {
  if (pct == null) return "--";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function factorIcon(factor) {
  const icons = {
    sleep: "\u{1F634}",
    hrv: "\u{1F493}",
    recovery: "\u{1F9E0}",
    weather: "\u{1F321}\uFE0F",
    stress: "\u{1F9E0}",
    nutrition: "\u{1F34E}",
    training_load: "\u{1F3CB}\uFE0F",
    cross_training: "\u{1F3CB}\uFE0F",
    travel: "\u2708\uFE0F",
  };
  return icons[factor] || "\u{1F50D}";
}

function impactColor(impact) {
  if (impact === "positive") return T.accent;
  if (impact === "negative") return T.danger;
  return T.textSoft;
}

// ── Comparison Row ──

function ComparisonRow({ label, current, comparison, unit, higherIsBetter, isMobile }) {
  if (current == null && comparison == null) return null;
  const pct = formatPct(current, comparison);

  if (isMobile) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 12, color: T.textSoft, flex: "0 0 80px" }}>{label}</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: T.text, minWidth: 50, textAlign: "right" }}>
            {current != null ? current : "--"}{unit ? ` ${unit}` : ""}
          </span>
          <span style={{ fontFamily: mono, fontSize: 13, color: T.textSoft, minWidth: 50, textAlign: "right" }}>
            {comparison != null ? comparison : "--"}{unit ? ` ${unit}` : ""}
          </span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: deltaColor(pct, higherIsBetter), minWidth: 55, textAlign: "right" }}>
            {formatDelta(pct)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 80px", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, color: T.textSoft }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: T.text, textAlign: "right" }}>
        {current != null ? current : "--"}{unit ? ` ${unit}` : ""}
      </span>
      <span style={{ fontFamily: mono, fontSize: 14, color: T.textSoft, textAlign: "right" }}>
        {comparison != null ? comparison : "--"}{unit ? ` ${unit}` : ""}
      </span>
      <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: deltaColor(pct, higherIsBetter), textAlign: "right" }}>
        {formatDelta(pct)}
      </span>
    </div>
  );
}

// ── Context Difference ──

function ContextDiff({ icon, label, current, comparison, unit }) {
  if (current == null && comparison == null) return null;
  const currentStr = current != null ? `${current}${unit || ""}` : "N/A";
  const compStr = comparison != null ? `${comparison}${unit || ""}` : "N/A";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textSoft, padding: "3px 0" }}>
      <span>{icon}</span>
      <span>{label}:</span>
      <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{currentStr}</span>
      <span style={{ color: T.textDim }}>vs</span>
      <span style={{ fontFamily: mono, color: T.textSoft }}>{compStr}</span>
    </div>
  );
}

// ── Single Comparison Card ──

function ComparisonCard({ current, similar, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const navigate = useNavigate();

  const matchPct = Math.round((similar.similarity_score || 0) * 100);
  const sc = similar.context || {};
  const cc = current.context || {};

  const handleExpand = useCallback(async () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && !analysis && !analysisLoading) {
      setAnalysisLoading(true);
      try {
        const result = await fetchCompareAnalysis(current.id, similar.id);
        setAnalysis(result);
      } catch {
        setAnalysis({ headline: "Couldn't generate comparison analysis", factors: [], adjusted_assessment: "", takeaway: "" });
      } finally {
        setAnalysisLoading(false);
      }
    }
  }, [expanded, analysis, analysisLoading, current.id, similar.id]);

  // Metric values
  const curNP = current.normalized_power_watts ? Math.round(current.normalized_power_watts) : null;
  const simNP = similar.normalized_power_watts ? Math.round(similar.normalized_power_watts) : null;
  const curHR = current.avg_hr_bpm ? Math.round(current.avg_hr_bpm) : null;
  const simHR = similar.avg_hr_bpm ? Math.round(similar.avg_hr_bpm) : null;
  const curEF = current.efficiency_factor ? parseFloat(current.efficiency_factor).toFixed(2) : null;
  const simEF = similar.efficiency_factor ? parseFloat(similar.efficiency_factor).toFixed(2) : null;
  const curTSS = current.tss ? Math.round(current.tss) : null;
  const simTSS = similar.tss ? Math.round(similar.tss) : null;
  const curIF = current.intensity_factor ? parseFloat(current.intensity_factor).toFixed(2) : null;
  const simIF = similar.intensity_factor ? parseFloat(similar.intensity_factor).toFixed(2) : null;

  // Check for significant context differences (>15% or >1 point on 5-point scale)
  const hasContextDiffs =
    (cc.sleep_duration_hours != null && sc.sleep_duration_hours != null) ||
    (cc.hrv_ms != null && sc.hrv_ms != null) ||
    (cc.weather_temp_c != null && sc.weather_temp_c != null) ||
    (cc.life_stress != null && sc.life_stress != null) ||
    (cc.nutrition_carbs_per_hour != null && sc.nutrition_carbs_per_hour != null) ||
    (cc.recovery_score != null && sc.recovery_score != null);

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: isMobile ? 16 : 20,
      transition: "border-color 0.2s",
    }}>
      {/* Header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", marginBottom: expanded ? 16 : 0 }}
        onClick={handleExpand}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {formatDate(similar.started_at)} — {similar.name || "Ride"}
          </div>
          <div style={{ fontSize: 12, color: T.textSoft, marginTop: 2, fontFamily: mono }}>
            {formatDuration(similar.duration_seconds)}
            {simNP ? ` · ${simNP}W NP` : ""}
            {simTSS ? ` · ${simTSS} TSS` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{
            background: T.accentDim,
            color: T.accent,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: mono,
            padding: "4px 10px",
            borderRadius: 20,
          }}>
            {matchPct}% match
          </span>
          {expanded ? <ChevronUp size={16} color={T.textDim} /> : <ChevronDown size={16} color={T.textDim} />}
        </div>
      </div>

      {expanded && (
        <div>
          {/* Metric comparison table */}
          <div style={{ marginBottom: 16 }}>
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 80px", padding: "0 0 6px", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Metric</span>
                <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Today</span>
                <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>{formatDate(similar.started_at)}</span>
                <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Delta</span>
              </div>
            )}
            <ComparisonRow label="NP" current={curNP} comparison={simNP} unit="W" higherIsBetter={true} isMobile={isMobile} />
            <ComparisonRow label="Avg HR" current={curHR} comparison={simHR} unit="bpm" higherIsBetter={false} isMobile={isMobile} />
            <ComparisonRow label="EF" current={curEF ? parseFloat(curEF) : null} comparison={simEF ? parseFloat(simEF) : null} higherIsBetter={true} isMobile={isMobile} />
            <ComparisonRow label="Duration" current={formatDuration(current.duration_seconds)} comparison={formatDuration(similar.duration_seconds)} isMobile={isMobile} />
            <ComparisonRow label="TSS" current={curTSS} comparison={simTSS} higherIsBetter={true} isMobile={isMobile} />
            <ComparisonRow label="IF" current={curIF ? parseFloat(curIF) : null} comparison={simIF ? parseFloat(simIF) : null} higherIsBetter={true} isMobile={isMobile} />
          </div>

          {/* Context differences */}
          {hasContextDiffs && (
            <div style={{ marginBottom: 16, padding: "12px 14px", background: T.surface, borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Context Differences</div>
              <ContextDiff
                icon={"\u{1F634}"}
                label="Sleep"
                current={cc.sleep_duration_hours != null ? `${cc.sleep_duration_hours.toFixed(1)}h` : null}
                comparison={sc.sleep_duration_hours != null ? `${sc.sleep_duration_hours.toFixed(1)}h` : null}
              />
              <ContextDiff
                icon={"\u{1F493}"}
                label="HRV"
                current={cc.hrv_ms != null ? Math.round(cc.hrv_ms) : null}
                comparison={sc.hrv_ms != null ? Math.round(sc.hrv_ms) : null}
                unit="ms"
              />
              <ContextDiff
                icon={"\u{1F321}\uFE0F"}
                label="Temp"
                current={cc.weather_temp_c != null ? Math.round(cc.weather_temp_c * 9 / 5 + 32) : null}
                comparison={sc.weather_temp_c != null ? Math.round(sc.weather_temp_c * 9 / 5 + 32) : null}
                unit={"\u00B0F"}
              />
              <ContextDiff
                icon={"\u{1F9E0}"}
                label="Stress"
                current={cc.life_stress}
                comparison={sc.life_stress}
                unit="/5"
              />
              <ContextDiff
                icon={"\u{1F34E}"}
                label="Fueling"
                current={cc.nutrition_carbs_per_hour != null ? Math.round(cc.nutrition_carbs_per_hour) : null}
                comparison={sc.nutrition_carbs_per_hour != null ? Math.round(sc.nutrition_carbs_per_hour) : null}
                unit="g/hr"
              />
              <ContextDiff
                icon={"\u{1F4AA}"}
                label="Recovery"
                current={cc.recovery_score}
                comparison={sc.recovery_score}
                unit="/100"
              />
            </div>
          )}

          {/* AI Analysis */}
          {analysisLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: T.textSoft, fontSize: 13 }}>
              <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
              Analyzing differences...
            </div>
          )}

          {analysis && !analysisLoading && (
            <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                {"\u{1F916}"} {analysis.headline}
              </div>

              {analysis.factors && analysis.factors.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                  {analysis.factors.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: T.textSoft }}>
                      <span style={{ flexShrink: 0 }}>{factorIcon(f.factor)}</span>
                      <span>
                        <span style={{ fontWeight: 600, color: impactColor(f.impact) }}>
                          {f.magnitude === "major" ? "\u25CF\u25CF\u25CF" : f.magnitude === "moderate" ? "\u25CF\u25CF" : "\u25CF"}
                        </span>
                        {" "}<FormattedText text={f.detail} style={{ display: "inline" }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.adjusted_assessment && (
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>
                  <FormattedText text={analysis.adjusted_assessment} />
                </div>
              )}

              {analysis.takeaway && (
                <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginTop: 4 }}>
                  {"\u{1F4A1}"} <FormattedText text={analysis.takeaway} style={{ display: "inline" }} />
                </div>
              )}
            </div>
          )}

          {/* View activity link */}
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/activity/${similar.id}`); }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: T.accent,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              View Full Activity <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export default function SimilarSessionsPanel({ data, loading, isMobile }) {
  if (loading) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <GitCompareArrows size={14} style={{ color: T.purple }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Similar Sessions</span>
        </div>
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, fontSize: 13 }}>
          Finding similar sessions...
        </div>
      </div>
    );
  }

  if (!data?.similar || data.similar.length === 0) return null;

  const { current, similar } = data;

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GitCompareArrows size={14} style={{ color: T.purple }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Similar Sessions</span>
          <span style={{
            background: T.surface,
            color: T.textSoft,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: mono,
            padding: "2px 8px",
            borderRadius: 10,
          }}>
            {similar.length} found
          </span>
        </div>
      </div>

      {/* Comparison cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {similar.map((s) => (
          <ComparisonCard
            key={s.id}
            current={current}
            similar={s}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

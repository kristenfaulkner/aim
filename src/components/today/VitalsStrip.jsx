import { Fragment } from "react";
import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";

const TREND_COLORS = { green: T.green, yellow: T.warn, red: T.danger, dim: T.textDim };

function VitalStat({ label, value, unit, trend, trendColor }) {
  const color = TREND_COLORS[trendColor] || T.textDim;
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3, fontFamily: font }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 700, color: T.text }}>
        {value}<span style={{ fontSize: 10, color: T.textDim, fontWeight: 400 }}>{unit}</span>
      </div>
      {trend && <div style={{ fontSize: 9, fontWeight: 600, color, marginTop: 1, fontFamily: font }}>{trend}</div>}
    </div>
  );
}

/**
 * Compute vitals from daily metrics for the VitalsStrip.
 * @param {object} todayMetrics - Today's daily_metrics row
 * @param {Array} allMetrics - 7-day daily_metrics array (newest first)
 * @returns {object|null} vitals object with hrv, rhr, sleep, deep
 */
export function computeVitals(todayMetrics, allMetrics = []) {
  if (!todayMetrics) return null;

  const hrv = todayMetrics.hrv_ms ?? todayMetrics.hrv_overnight_avg_ms;
  const rhr = todayMetrics.resting_hr_bpm;
  const sleepSec = todayMetrics.total_sleep_seconds;
  const deepSec = todayMetrics.deep_sleep_seconds;

  // Compute simple trends from 7-day history
  const avg = (field) => {
    const vals = allMetrics.filter(d => d[field] != null).map(d => d[field]);
    return vals.length >= 2 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const hrvTrend = (() => {
    if (hrv == null) return null;
    const a = avg("hrv_ms") ?? avg("hrv_overnight_avg_ms");
    if (a == null) return null;
    const pct = ((hrv - a) / a) * 100;
    if (pct > 15) return { text: "Top quartile", color: "green" };
    if (pct > 0) return { text: "Above avg", color: "green" };
    if (pct > -10) return { text: "Normal", color: "dim" };
    return { text: "Below avg", color: "yellow" };
  })();

  const rhrTrend = (() => {
    if (rhr == null) return null;
    const a = avg("resting_hr_bpm");
    if (a == null) return null;
    const diff = Math.round((rhr - a) * 10) / 10;
    if (diff <= -1) return { text: `${diff} vs avg`, color: "green" };
    if (diff >= 2) return { text: `+${diff} vs avg`, color: "yellow" };
    return { text: "Normal", color: "dim" };
  })();

  const sleepTrend = (() => {
    if (sleepSec == null) return null;
    const hrs = sleepSec / 3600;
    if (hrs >= 7) return { text: "On target", color: "green" };
    if (hrs >= 6) return { text: "Below target", color: "yellow" };
    return { text: "Low", color: "red" };
  })();

  const deepTrend = (() => {
    if (deepSec == null) return null;
    const a = avg("deep_sleep_seconds");
    if (a == null) return null;
    const pct = Math.round(((deepSec - a) / a) * 100);
    if (pct > 10) return { text: `+${pct}%`, color: "green" };
    if (pct < -10) return { text: `${pct}%`, color: "yellow" };
    return { text: "Normal", color: "dim" };
  })();

  const formatSleep = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return `${h}h${String(m).padStart(2, "0")}`;
  };

  const result = {};
  if (hrv != null) result.hrv = { value: String(Math.round(hrv)), unit: "ms", trend: hrvTrend?.text, trendColor: hrvTrend?.color };
  if (rhr != null) result.rhr = { value: String(rhr % 1 === 0 ? rhr : rhr.toFixed(1)), unit: "bpm", trend: rhrTrend?.text, trendColor: rhrTrend?.color };
  if (sleepSec != null) result.sleep = { value: formatSleep(sleepSec), unit: "", trend: sleepTrend?.text, trendColor: sleepTrend?.color };
  if (deepSec != null) result.deep = { value: String(Math.round(deepSec / 60)), unit: "min", trend: deepTrend?.text, trendColor: deepTrend?.color };

  return Object.keys(result).length > 0 ? result : null;
}

export default function VitalsStrip({ vitals }) {
  const { isMobile } = useResponsive();
  if (!vitals) return null;

  const items = [
    vitals.hrv && { label: "HRV", ...vitals.hrv },
    vitals.rhr && { label: "RHR", ...vitals.rhr },
    vitals.sleep && { label: "Sleep", ...vitals.sleep },
    vitals.deep && { label: "Deep", ...vitals.deep },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: isMobile ? "12px 4px" : "12px 6px", display: "flex" }}>
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <div style={{ width: 1, background: T.border, margin: "4px 0" }} />}
          <VitalStat label={item.label} value={item.value} unit={item.unit || ""} trend={item.trend} trendColor={item.trendColor} />
        </Fragment>
      ))}
    </div>
  );
}

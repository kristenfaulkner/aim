import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, CartesianGrid } from "recharts";
import { T, mono } from "../theme/tokens";
import { useResponsive } from "../hooks/useResponsive";
import { Activity, AlertTriangle } from "lucide-react";

function formatTime(seconds) {
  if (seconds == null) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatTimeShort(seconds) {
  if (seconds == null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}m`;
}

function MetricPill({ label, value, color }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: "8px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0,
    }}>
      <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: mono, color: color || T.text, letterSpacing: "-0.02em" }}>{value}</span>
    </div>
  );
}

function getWbalColor(pct) {
  if (pct >= 75) return "#22c55e";
  if (pct >= 50) return "#eab308";
  if (pct >= 25) return "#f97316";
  return "#ef4444";
}

export default function WbalChart({ data, loading }) {
  const { isMobile } = useResponsive();

  const chartData = useMemo(() => {
    if (!data?.stream) return [];
    return data.stream.map(pt => ({
      time: pt.t,
      pct: pt.pct,
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={14} style={{ color: "#8b5cf6" }} /> W' Balance
        </div>
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, fontSize: 12 }}>
          Computing W' balance...
        </div>
      </div>
    );
  }

  if (!data?.stream || !data?.summary) return null;

  const { summary } = data;
  const hasEmptyTank = summary.empty_tank_events > 0;
  const minColor = getWbalColor(summary.min_wbal_pct);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={14} style={{ color: "#8b5cf6" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>W' Balance</span>
        </div>
        {hasEmptyTank && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#ef444415", border: "1px solid #ef444430",
            borderRadius: 12, padding: "3px 10px",
            fontSize: 10, fontWeight: 700, color: "#ef4444",
          }}>
            <AlertTriangle size={11} />
            {summary.empty_tank_events} empty tank{summary.empty_tank_events > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Summary metrics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 8,
        marginBottom: 16,
      }}>
        <MetricPill label="Min W'bal" value={`${Math.round(summary.min_wbal_pct)}%`} color={minColor} />
        <MetricPill label="Time < 25%" value={summary.total_time_below_25_pct > 0 ? formatTime(summary.total_time_below_25_pct) : "None"} color={summary.total_time_below_25_pct > 0 ? "#f97316" : T.accent} />
        <MetricPill label="Time < 50%" value={summary.total_time_below_50_pct > 0 ? formatTime(summary.total_time_below_50_pct) : "None"} color={summary.total_time_below_50_pct > 0 ? "#eab308" : T.accent} />
        <MetricPill label="Recovery Rate" value={summary.avg_recovery_rate_pct_per_min != null ? `${summary.avg_recovery_rate_pct_per_min}%/min` : "N/A"} />
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="wbalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="75%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={formatTimeShort}
              tick={{ fontSize: 10, fill: T.textDim }}
              axisLine={{ stroke: T.border }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 10, fill: T.textDim }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={50} stroke={T.border} strokeDasharray="4 4" />
            <ReferenceLine y={25} stroke="#f9731640" strokeDasharray="4 4" />
            <Tooltip
              formatter={(v) => [`${v.toFixed(1)}%`, "W'bal"]}
              labelFormatter={(t) => formatTime(t)}
              contentStyle={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                fontSize: 12,
                fontFamily: mono,
              }}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              fill="url(#wbalGradient)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

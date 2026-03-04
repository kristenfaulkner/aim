import { useState, useMemo } from "react";
import { T, font, mono } from "../../theme/tokens";
import { Plane, Car, Clock, Mountain, ChevronDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, ReferenceDot, CartesianGrid, Tooltip } from "recharts";

// ── Travel formulas (duplicated from api/_lib/travel.js — Vite can't import /api/) ──

function jetLagRecoveryDays(tzShiftHours) {
  return Math.ceil(Math.abs(tzShiftHours || 0));
}

function altitudePowerPenalty(altitudeM, acclimationDay = 0) {
  if (altitudeM == null || altitudeM < 1000) return 0;
  const basePenalty = ((altitudeM - 1000) / 300) * 1;
  const acclimationFactor = Math.max(0.5, 1 - (acclimationDay / 28));
  return Math.round(basePenalty * acclimationFactor * 10) / 10;
}

function cityFromTimezone(tz) {
  const parts = (tz || "").split("/");
  return (parts[parts.length - 1] || "Unknown").replace(/_/g, " ");
}

function progressColor(current, total) {
  const pct = total > 0 ? current / total : 1;
  if (pct >= 0.8) return T.accent;
  if (pct >= 0.4) return "#f59e0b";
  return "#ef4444";
}

// ── Component ──

export default function TravelStatusCard({ travelEvent, isMobile }) {
  const [expanded, setExpanded] = useState(false);

  if (!travelEvent) return null;

  const daysSinceTravel = Math.floor(
    (Date.now() - new Date(travelEvent.detected_at).getTime()) / 86400000
  );
  const jetLagDays = jetLagRecoveryDays(travelEvent.timezone_shift_hours);
  const hasTimezoneShift = Math.abs(travelEvent.timezone_shift_hours || 0) >= 2;
  const hasAltitude = travelEvent.dest_altitude_m != null && travelEvent.dest_altitude_m >= 1000;
  const currentPenalty = hasAltitude ? altitudePowerPenalty(travelEvent.dest_altitude_m, daysSinceTravel) : 0;

  // Auto-dismiss: no active recovery needed
  const jetLagActive = hasTimezoneShift && daysSinceTravel < jetLagDays;
  const altitudeActive = hasAltitude && daysSinceTravel < 14;
  if (!jetLagActive && !altitudeActive) return null;

  const destCity = cityFromTimezone(travelEvent.dest_timezone);
  const originCity = cityFromTimezone(travelEvent.origin_timezone);
  const dayDisplay = daysSinceTravel + 1; // 1-indexed for humans
  const isPlane = travelEvent.travel_type === "flight_likely";
  const TravelIcon = isPlane ? Plane : Car;

  // Collapsed metric: show whichever is more impactful
  const collapsedMetric = currentPenalty > 0
    ? `-${currentPenalty}% power`
    : `${Math.max(0, jetLagDays - daysSinceTravel)}d jet lag`;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      {/* Collapsed row — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
        style={{
          padding: isMobile ? "12px 16px" : "12px 20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TravelIcon size={16} style={{ color: T.blue, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1, fontFamily: font }}>
          {destCity} — Day {dayDisplay}
        </span>
        <span
          style={{
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 700,
            color: currentPenalty > 3 ? "#ef4444" : "#f59e0b",
          }}
        >
          {collapsedMetric}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: T.textDim,
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.3s ease",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Expanded content */}
      <div
        style={{
          maxHeight: expanded ? 500 : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease, opacity 0.25s ease",
        }}
      >
        <div style={{ padding: isMobile ? "0 16px 16px" : "0 20px 16px" }}>
          {/* Header */}
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 14 }}>
            <TravelIcon size={13} style={{ color: T.blue, verticalAlign: -2, marginRight: 6 }} />
            Travel Detected — {originCity} → {destCity}
          </div>

          {/* Timezone section */}
          {hasTimezoneShift && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Clock size={14} style={{ color: T.blue }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                  Timezone: {travelEvent.timezone_shift_hours > 0 ? "+" : ""}
                  {travelEvent.timezone_shift_hours}h shift
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: T.textSoft }}>Recovery</span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: mono,
                    fontWeight: 600,
                    color: daysSinceTravel >= jetLagDays ? T.accent : T.text,
                  }}
                >
                  Day {Math.min(dayDisplay, jetLagDays)} of {jetLagDays}
                </span>
              </div>
              <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (dayDisplay / jetLagDays) * 100)}%`,
                    background: progressColor(daysSinceTravel, jetLagDays),
                    borderRadius: 3,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Altitude section */}
          {hasAltitude && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Mountain size={14} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                  Altitude: {Math.round(travelEvent.dest_altitude_m).toLocaleString()}m
                </span>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: currentPenalty > 3 ? "#ef4444" : "#f59e0b",
                    marginLeft: "auto",
                  }}
                >
                  -{currentPenalty}% power
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: T.textSoft }}>Acclimation</span>
                <span style={{ fontSize: 11, fontFamily: mono, fontWeight: 600, color: T.text }}>
                  Day {Math.min(dayDisplay, 14)} of 14
                </span>
              </div>
              {/* 14-segment bar */}
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 14 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 2,
                      background: i < dayDisplay ? progressColor(i, 14) : T.surface,
                      transition: "background 0.3s ease",
                    }}
                  />
                ))}
              </div>

              {/* Mini power penalty chart */}
              <AcclimationChart
                destAltitude={travelEvent.dest_altitude_m}
                currentDay={dayDisplay}
                currentPenalty={currentPenalty}
              />
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              fontSize: 11,
              color: T.textDim,
              fontStyle: "italic",
              paddingTop: 10,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            Your AI coach factors this into all recommendations.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mini Acclimation Chart ──

function AcclimationChart({ destAltitude, currentDay, currentPenalty }) {
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: i + 1,
      penalty: altitudePowerPenalty(destAltitude, i),
    }));
  }, [destAltitude]);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6 }}>
        Expected power recovery
      </div>
      <div style={{ width: "100%", height: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: T.textDim }}
              axisLine={{ stroke: T.border }}
              tickLine={false}
              ticks={[1, 4, 7, 10, 14]}
            />
            <YAxis
              tickFormatter={v => `-${v}%`}
              tick={{ fontSize: 9, fill: T.textDim, fontFamily: mono }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              formatter={v => [`-${v}%`, "Power penalty"]}
              labelFormatter={d => `Day ${d}`}
              contentStyle={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: mono,
              }}
            />
            <Line
              type="monotone"
              dataKey="penalty"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <ReferenceDot
              x={Math.min(currentDay, 14)}
              y={currentPenalty}
              r={5}
              fill={currentPenalty > 3 ? "#ef4444" : "#f59e0b"}
              stroke={T.card}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

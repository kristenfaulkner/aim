import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";

const METRIC_COLORS = { green: T.green, yellow: T.warn, red: T.danger };

function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function computeCarbPct(IF) {
  const PROTEIN_PCT = 3.5;
  const vo2pct = 5 + (IF * 80);
  let fatNP;
  if (vo2pct <= 37) fatNP = 72;
  else if (vo2pct <= 48) fatNP = -0.0497 * vo2pct * vo2pct + 3.8528 * vo2pct - 23.55;
  else if (vo2pct <= 85) fatNP = Math.max(0, -0.74 * vo2pct + 87.5);
  else if (vo2pct <= 97) fatNP = Math.max(0, -1.9 * vo2pct + 186);
  else fatNP = 0;
  const fatPct = fatNP * (100 - PROTEIN_PCT) / 100;
  return 100 - fatPct - PROTEIN_PCT;
}

export default function RideSummary({ activity, units }) {
  const { isMobile } = useResponsive();
  if (!activity) return null;

  const duration = activity.duration_seconds ? fmt(activity.duration_seconds) : null;
  const isImperial = units === "imperial";
  const distance = activity.distance_meters
    ? isImperial
      ? (activity.distance_meters / 1609.34).toFixed(1) + " mi"
      : (activity.distance_meters / 1000).toFixed(1) + " km"
    : null;
  const climbing = activity.elevation_gain_meters
    ? isImperial
      ? Math.round(activity.elevation_gain_meters * 3.281) + "ft"
      : Math.round(activity.elevation_gain_meters) + "m"
    : null;
  const tss = activity.tss != null ? Math.round(activity.tss) : null;
  const meta = [duration, distance, climbing].filter(Boolean).join(" \u00B7 ");

  // Build metrics array
  const metrics = [];
  if (activity.normalized_power_watts) metrics.push({ label: "NP", value: Math.round(activity.normalized_power_watts) + "W" });
  if (activity.avg_hr_bpm) metrics.push({ label: "Avg HR", value: String(Math.round(activity.avg_hr_bpm)) });
  if (activity.efficiency_factor) {
    metrics.push({ label: "EF", value: Number(activity.efficiency_factor).toFixed(2), color: "green" });
  }
  if (activity.hr_drift_pct != null) {
    const abs = Math.abs(activity.hr_drift_pct);
    const color = abs < 5 ? "green" : abs < 8 ? "yellow" : "red";
    metrics.push({ label: "Drift", value: Number(activity.hr_drift_pct).toFixed(1) + "%", color });
  }
  if (activity.calories && activity.duration_seconds > 0 && activity.intensity_factor) {
    const durationHr = activity.duration_seconds / 3600;
    const carbPct = computeCarbPct(activity.intensity_factor);
    const carbGrams = Math.round((activity.calories * (carbPct / 100) / 4));
    const carbsPerHr = Math.round(carbGrams / durationHr);
    if (carbsPerHr > 0) {
      const color = carbsPerHr >= 75 ? "green" : carbsPerHr >= 60 ? "yellow" : "red";
      metrics.push({ label: "Carbs", value: carbsPerHr + "g/hr", color });
    }
  }

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: isMobile ? 14 : 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1, fontFamily: font }}>Today's Ride</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: font }}>{activity.name || "Ride"}</div>
          {meta && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2, fontFamily: font }}>{meta}</div>}
        </div>
        {tss != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: T.text }}>
              {tss}<span style={{ fontSize: 12, color: T.textDim }}>TSS</span>
            </div>
          </div>
        )}
      </div>

      {metrics.length > 0 && (
        <div style={{ display: "flex", gap: 5 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ flex: 1, padding: "7px 5px", borderRadius: 10, background: T.surface, textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: METRIC_COLORS[m.color] || T.text }}>{m.value}</div>
              <div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase", marginTop: 1, fontFamily: font }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

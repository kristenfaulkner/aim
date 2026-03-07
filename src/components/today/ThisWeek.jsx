import { useMemo } from "react";
import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";

/**
 * Compute this-week TSS data from recent activities.
 * @param {Array} recentActivities - Activities with started_at and tss fields
 * @returns {{ days: Array, total: number, lastWeek: number|null }}
 */
export function computeThisWeek(recentActivities = []) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6

  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const days = labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayTss = recentActivities
      .filter(a => a.started_at?.slice(0, 10) === dateStr)
      .reduce((sum, a) => sum + (a.tss || 0), 0);
    const isPast = i <= todayIdx;
    return { day: label, tss: dayTss > 0 ? Math.round(dayTss) : (isPast ? 0 : null), today: i === todayIdx };
  });

  const total = days.reduce((sum, d) => sum + (d.tss || 0), 0);

  // Last week
  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);
  const lastMondayStr = `${lastMonday.getFullYear()}-${String(lastMonday.getMonth() + 1).padStart(2, "0")}-${String(lastMonday.getDate()).padStart(2, "0")}`;
  const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const lastWeekTss = recentActivities
    .filter(a => {
      const d = a.started_at?.slice(0, 10);
      return d >= lastMondayStr && d < mondayStr;
    })
    .reduce((sum, a) => sum + (a.tss || 0), 0);

  return { days, total, lastWeek: lastWeekTss > 0 ? Math.round(lastWeekTss) : null };
}

export default function ThisWeek({ data, aiContext, plannedTss }) {
  const { isMobile } = useResponsive();
  if (!data || !data.days) return null;

  const { days, total, lastWeek } = data;

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: isMobile ? "12px 14px" : "14px 16px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: font }}>This Week</div>

      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: d.today ? T.accent : T.textDim, marginBottom: 3, fontFamily: font }}>{d.day}</div>
            <div style={{
              height: 28, borderRadius: 4,
              background: d.tss > 0
                ? `rgba(16,185,129,${Math.min(((d.tss / 300) * 0.8) + 0.15, 0.95).toFixed(2)})`
                : d.today ? "rgba(16,185,129,0.06)" : T.surface,
              display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2,
              border: d.today ? `1.5px solid ${T.accent}` : "none",
            }}>
              {d.tss > 0 && <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 600, color: T.text }}>{d.tss}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: T.textDim, fontFamily: font }}>
          Week: <span style={{ fontFamily: mono, fontWeight: 700, color: T.text }}>{total} TSS</span>
          {plannedTss ? <span> + today&apos;s ~{plannedTss}</span> : null}
        </span>
        {lastWeek != null && (
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: font }}>
            Last week: <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{lastWeek.toLocaleString()}</span>
          </span>
        )}
      </div>

      {aiContext && (
        <div style={{ marginTop: 6, fontSize: 11, color: T.textSoft, lineHeight: 1.4, fontFamily: font }}>{aiContext}</div>
      )}
    </div>
  );
}

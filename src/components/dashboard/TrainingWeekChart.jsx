import { useMemo } from "react";
import { T, mono } from "../../theme/tokens";

export default function TrainingWeekChart({ recentActivities, crossTrainingEntries }) {
  const weeklyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const cyclingMap = {};
    const crossMap = {};
    days.forEach(d => { cyclingMap[d] = 0; crossMap[d] = 0; });

    for (const a of (recentActivities || [])) {
      const date = new Date(a.started_at);
      const dayName = days[(date.getDay() + 6) % 7];
      cyclingMap[dayName] += a.tss || 0;
    }

    for (const e of (crossTrainingEntries || [])) {
      const date = new Date(e.date + "T12:00:00");
      const dayName = days[(date.getDay() + 6) % 7];
      crossMap[dayName] += e.estimated_tss || 0;
    }

    return days.map(day => ({
      day,
      cycling: Math.round(cyclingMap[day]),
      cross: Math.round(crossMap[day]),
      total: Math.round(cyclingMap[day] + crossMap[day]),
    }));
  }, [recentActivities, crossTrainingEntries]);

  const weeklyTSSTotal = weeklyData.reduce((s, d) => s + d.cycling, 0);
  const weeklyCrossTSSTotal = weeklyData.reduce((s, d) => s + d.cross, 0);
  const hasCross = weeklyCrossTSSTotal > 0;
  const maxTSS = Math.max(...weeklyData.map(w => w.total), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
        {weeklyData.map(d => {
          const cyclingColor = d.cycling > 150 ? T.purple : d.cycling > 100 ? T.blue : T.accent;
          const cyclingH = d.total > 0 ? (d.cycling / maxTSS) * 80 : 0;
          const crossH = d.total > 0 ? (d.cross / maxTSS) * 80 : 0;
          return (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9, color: T.textSoft, fontFamily: mono }}>{d.total || "\u2014"}</span>
              <div style={{ display: "flex", flexDirection: "column", width: "100%", justifyContent: "flex-end" }}>
                {d.cross > 0 && (
                  <div style={{
                    width: "100%",
                    height: `${crossH}px`,
                    minHeight: 3,
                    background: `linear-gradient(180deg, #8b5cf680, #8b5cf630)`,
                    borderRadius: "3px 3px 0 0",
                  }} />
                )}
                <div style={{
                  width: "100%",
                  height: `${cyclingH}px`,
                  minHeight: d.cycling ? 3 : d.total ? 0 : 1,
                  background: d.cycling
                    ? `linear-gradient(180deg, ${cyclingColor}80, ${cyclingColor}30)`
                    : d.total ? "transparent" : T.border,
                  borderRadius: d.cross > 0 ? "0 0 3px 3px" : 3,
                }} />
              </div>
              <span style={{ fontSize: 9, color: T.textDim }}>{d.day}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, padding: "6px 10px", background: T.surface, borderRadius: 7, fontSize: 10, color: T.textSoft }}>
        Weekly: <span style={{ color: T.accent, fontWeight: 700 }}>{weeklyTSSTotal} TSS</span>
        {hasCross && (
          <span> + <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{weeklyCrossTSSTotal} cross</span></span>
        )}
      </div>
    </div>
  );
}

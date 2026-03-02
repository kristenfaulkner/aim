import { useMemo } from "react";
import { T, mono } from "../../theme/tokens";

export default function TrainingWeekChart({ recentActivities }) {
  const weeklyTSSData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const tssMap = {};
    days.forEach(d => { tssMap[d] = 0; });
    for (const a of (recentActivities || [])) {
      const date = new Date(a.started_at);
      const dayName = days[(date.getDay() + 6) % 7];
      tssMap[dayName] += a.tss || 0;
    }
    return days.map(day => ({ day, tss: Math.round(tssMap[day]) }));
  }, [recentActivities]);

  const weeklyTSSTotal = weeklyTSSData.reduce((s, d) => s + d.tss, 0);
  const maxTSS = Math.max(...weeklyTSSData.map(w => w.tss), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
        {weeklyTSSData.map(d => (
          <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, color: T.textSoft, fontFamily: mono }}>{d.tss || "\u2014"}</span>
            <div style={{
              width: "100%",
              height: `${(d.tss / maxTSS) * 80}px`,
              minHeight: d.tss ? 3 : 1,
              background: d.tss
                ? `linear-gradient(180deg, ${d.tss > 150 ? T.purple : d.tss > 100 ? T.blue : T.accent}80, ${d.tss > 150 ? T.purple : d.tss > 100 ? T.blue : T.accent}30)`
                : T.border,
              borderRadius: 3,
            }} />
            <span style={{ fontSize: 9, color: T.textDim }}>{d.day}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, padding: "6px 10px", background: T.surface, borderRadius: 7, fontSize: 10, color: T.textSoft }}>
        Weekly: <span style={{ color: T.accent, fontWeight: 700 }}>{weeklyTSSTotal} TSS</span>
      </div>
    </div>
  );
}

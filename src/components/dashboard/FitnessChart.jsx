import { T, mono } from "../../theme/tokens";

export default function FitnessChart({ fitnessData }) {
  if (!fitnessData || fitnessData.length === 0) return <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>No fitness history yet</div>;

  // Aggregate to weekly
  const weeklyData = [];
  for (let i = 0; i < fitnessData.length; i += 7) {
    const week = fitnessData.slice(i, i + 7);
    const last = week[week.length - 1];
    weeklyData.push({
      week: `W${weeklyData.length + 1}`,
      ctl: last.ctl || 0,
      atl: last.atl || 0,
      tsb: last.tsb || 0,
    });
  }

  if (weeklyData.length === 0) return <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>Not enough data for chart</div>;

  const w = 480, h = 130, pad = { t: 10, r: 10, b: 28, l: 32 };
  const allVals = weeklyData.flatMap(d => [d.ctl, d.atl, d.tsb]);
  const max = Math.max(...allVals), min = Math.min(...allVals), range = (max - min) || 1;
  const xStep = weeklyData.length > 1 ? (w - pad.l - pad.r) / (weeklyData.length - 1) : 0;
  const toY = v => pad.t + ((max - v) / range) * (h - pad.t - pad.b);
  const makeLine = key => weeklyData.map((d, i) => `${pad.l + i * xStep},${toY(d[key])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <line x1={pad.l} x2={w - pad.r} y1={toY(0)} y2={toY(0)} stroke={T.textDim} strokeWidth="0.5" strokeDasharray="2,2" />
      {weeklyData.map((d, i) => {
        const x = pad.l + i * xStep, y0 = toY(0), y1 = toY(d.tsb);
        return <rect key={i} x={x - 5} y={Math.min(y0, y1)} width={10} height={Math.abs(y1 - y0)} fill={d.tsb > 0 ? `${T.accent}30` : `${T.danger}30`} rx={2} />;
      })}
      <polyline points={makeLine("ctl")} fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" />
      <polyline points={makeLine("atl")} fill="none" stroke={T.pink} strokeWidth="2" strokeLinecap="round" />
      {weeklyData.map((d, i) => (<text key={i} x={pad.l + i * xStep} y={h - 6} fill={T.textDim} fontSize="7" textAnchor="middle" fontFamily={mono}>{d.week}</text>))}
      <circle cx={pad.l} cy={pad.t + 2} r="3" fill={T.blue} /><text x={pad.l + 7} y={pad.t + 5} fill={T.textSoft} fontSize="8">CTL</text>
      <circle cx={pad.l + 50} cy={pad.t + 2} r="3" fill={T.pink} /><text x={pad.l + 57} y={pad.t + 5} fill={T.textSoft} fontSize="8">ATL</text>
      <rect x={pad.l + 100} y={pad.t - 2} width={7} height={7} fill={`${T.accent}40`} rx={1} /><text x={pad.l + 110} y={pad.t + 5} fill={T.textSoft} fontSize="8">TSB</text>
    </svg>
  );
}

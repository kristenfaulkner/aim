import { useState } from "react";

const T = {
  bg: "#f8f8fa", surface: "#f0f0f3", white: "#ffffff",
  text: "#1a1a2e", textSoft: "#6b7280", textDim: "#9ca3af",
  accent: "#10b981", accentDim: "rgba(16,185,129,0.08)", accentDark: "#059669",
  green: "#10b981", yellow: "#f59e0b", red: "#ef4444",
  blue: "#3b82f6", purple: "#8b5cf6", orange: "#f97316",
  border: "rgba(0,0,0,0.08)", borderHover: "rgba(0,0,0,0.15)",
  radius: 16, radiusSm: 10, radiusFull: 9999,
  font: "'DM Sans', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

// ════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════

const StatCard = ({ label, value, unit, sub, color = T.text }) => (
  <div style={{ padding: "14px 16px", borderRadius: T.radiusSm, background: T.surface, flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span style={{ fontFamily: T.fontMono, fontSize: 22, fontWeight: 700, color }}>{value}</span>
      {unit && <span style={{ fontSize: 11, color: T.textDim }}>{unit}</span>}
    </div>
    {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>{sub}</div>}
  </div>
);

const BinTable = ({ bins }) => (
  <div style={{ borderRadius: T.radiusSm, overflow: "hidden", border: `1px solid ${T.border}` }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 50px", padding: "8px 14px", background: T.surface }}>
      {["Condition", "Avg EF", "Drift", "n"].map(h => (
        <span key={h} style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", textAlign: h === "Condition" ? "left" : "right" }}>{h}</span>
      ))}
    </div>
    {Object.entries(bins).filter(([, v]) => v).map(([label, d]) => (
      <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 50px", padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: T.fontMono, fontWeight: 600, color: T.text, textAlign: "right" }}>{d.avgEF}</span>
        <span style={{ fontSize: 12, fontFamily: T.fontMono, color: T.textSoft, textAlign: "right" }}>{d.avgDrift}%</span>
        <span style={{ fontSize: 11, color: T.textDim, textAlign: "right" }}>{d.count}</span>
      </div>
    ))}
  </div>
);

const Sparkline = ({ data, color = T.accent, width = 160, height = 36 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 6) - 3}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * (height - 6) - 3} r={2.5} fill={color} />
    </svg>
  );
};

const PowerCurve = () => {
  const w = 580, h = 150, pad = { top: 12, right: 20, bottom: 28, left: 42 };
  const pw = w - pad.left - pad.right, ph = h - pad.top - pad.bottom;
  const d = [[1,1142],[5,1050],[10,820],[30,520],[60,458],[120,400],[300,351],[600,340],[1200,333],[2400,310],[3600,290],[7200,240],[10800,218]];
  const toX = s => pad.left + ((Math.log(s) - Math.log(1)) / (Math.log(10800) - Math.log(1))) * pw;
  const toY = w2 => pad.top + ph - ((w2 - 150) / 1050) * ph;
  const pathD = d.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p[0])},${toY(p[1])}`).join(" ");
  const hl = [{s:60,w:458,c:T.red},{s:300,w:351,c:T.orange},{s:1200,w:333,c:T.purple},{s:3600,w:290,c:T.blue}];
  return (
    <svg width={w} height={h} style={{ overflow: "visible", maxWidth: "100%" }}>
      {[200,400,600,800,1000].map(wt => (<g key={wt}><line x1={pad.left} y1={toY(wt)} x2={w-pad.right} y2={toY(wt)} stroke={T.border} strokeDasharray="3,3"/><text x={pad.left-5} y={toY(wt)+3} textAnchor="end" fill={T.textDim} fontSize={9} fontFamily={T.fontMono}>{wt}</text></g>))}
      {[{s:1,l:"1s"},{s:60,l:"1'"},{s:300,l:"5'"},{s:1200,l:"20'"},{s:3600,l:"1hr"},{s:10800,l:"3hr"}].map(t => (<text key={t.s} x={toX(t.s)} y={h-4} textAnchor="middle" fill={T.textDim} fontSize={9}>{t.l}</text>))}
      <path d={pathD + ` L ${toX(10800)},${pad.top+ph} L ${toX(1)},${pad.top+ph} Z`} fill={`${T.accent}06`}/>
      <path d={pathD} fill="none" stroke={T.accent} strokeWidth={2} strokeLinecap="round"/>
      {hl.map(p => (<g key={p.s}><circle cx={toX(p.s)} cy={toY(p.w)} r={4} fill={T.white} stroke={p.c} strokeWidth={2}/><text x={toX(p.s)} y={toY(p.w)-10} textAnchor="middle" fill={p.c} fontSize={10} fontWeight={700} fontFamily={T.fontMono}>{p.w}W</text></g>))}
    </svg>
  );
};

// ── INSIGHT CARD (fully collapsible: only title visible at rest) ──
const InsightCard = ({ insight }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>{insight.title}</div>
        <svg width={12} height={12} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 10, animation: "fadeIn 0.15s ease" }}>
          <div style={{ padding: "7px 11px", borderRadius: T.radiusSm, background: `${T.accent}06`, borderLeft: `3px solid ${T.accent}`, fontSize: 12, color: T.text, lineHeight: 1.6, fontWeight: 500, marginBottom: 10 }}>
            {insight.takeaway}
          </div>
          <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.7, marginBottom: 6 }}>{insight.body}</p>
          {insight.sources && (
            <div style={{ display: "flex", gap: 4 }}>
              {insight.sources.map(s => (
                <span key={s} style={{ padding: "1px 6px", borderRadius: T.radiusFull, fontSize: 9, fontWeight: 500, background: T.surface, color: T.textDim, border: `1px solid ${T.border}` }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════
// UNIFIED CATEGORY SECTION
// Insights + Model Data together
// ════════════════════════════════════════
const CategorySection = ({ icon, title, sampleNote, confidence, insights, modelData }) => {
  const [dataOpen, setDataOpen] = useState(false);
  const cc = { high: T.green, medium: T.yellow, low: T.orange };

  return (
    <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, marginBottom: 14, overflow: "hidden" }}>
      {/* Category header */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: T.textDim }}>{sampleNote}</span>
            {confidence && <span style={{ padding: "2px 8px", borderRadius: T.radiusFull, fontSize: 9, fontWeight: 600, background: `${cc[confidence]}10`, color: cc[confidence] }}>{confidence.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{ padding: "4px 20px 0" }}>
        {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
      </div>

      {/* Model data — expandable */}
      {modelData && (
        <>
          <div onClick={() => setDataOpen(!dataOpen)} style={{
            padding: "12px 20px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: dataOpen ? "transparent" : `${T.surface}60`,
          }}
            onMouseEnter={e => { if (!dataOpen) e.currentTarget.style.background = T.surface; }}
            onMouseLeave={e => { if (!dataOpen) e.currentTarget.style.background = `${T.surface}60`; }}
          >
            <span style={{ fontSize: 12, color: T.textDim, fontWeight: 500 }}>{dataOpen ? "Hide model data" : "View model data"}</span>
            <svg width={12} height={12} style={{ transform: dataOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
              <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </div>
          {dataOpen && (
            <div style={{ padding: "0 20px 20px", animation: "fadeIn 0.2s ease" }}>
              {modelData}
            </div>
          )}
        </>
      )}
    </div>
  );
};


// ════════════════════════════════════════
// PAGE
// ════════════════════════════════════════
export default function PerformancePage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
      `}</style>

      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(248,248,250,0.92)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: T.white, fontSize: 13, fontWeight: 700 }}>A</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.text, letterSpacing: "-0.02em" }}>AIM</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {["Today", "Performance", "Health Lab", "Connect"].map((item, i) => (
              <button key={item} style={{
                padding: "6px 14px", borderRadius: T.radiusFull, border: "none",
                background: i === 1 ? T.accentDim : "transparent",
                color: i === 1 ? T.accentDark : T.textSoft,
                fontSize: 13, fontWeight: i === 1 ? 600 : 500, cursor: "pointer", fontFamily: T.font,
              }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: T.radiusFull, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontSize: 11, fontWeight: 700 }}>KF</div>
      </nav>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "28px 32px" }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: "-0.03em" }}>Performance</h1>
          <p style={{ fontSize: 13, color: T.textDim, marginTop: 4 }}>95 activities · 8 months of data · 5 personal models active</p>
        </div>

        {/* ── AI NARRATIVE (hero) ── */}
        <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: 20, margin: "16px 0 20px" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: T.white, fontSize: 12, fontWeight: 700 }}>✦</span>
            </div>
            <div>
              <p style={{ fontSize: 14, color: T.text, lineHeight: 1.7, fontWeight: 500, marginBottom: 12 }}>
                Your aerobic engine is building steadily — HR drift improved 52% over 8 weeks and EF is up from 1.58 to 1.67. But your 60-minute power is stuck at 290W, and the bottleneck is clear: your VO₂max ceiling (5:20 ratio of 1.05 vs optimal 1.20) is capping FTP growth. One weekly VO₂ session after this sweet spot block is the fix.
              </p>
              <p style={{ fontSize: 14, color: T.text, lineHeight: 1.7, fontWeight: 500, marginBottom: 12 }}>
                Two things are working against you right now. Your sleep has averaged 6h12m for 3 consecutive nights — your personal model shows this is the threshold where NP drops 8-12%. And your fueling is tantalizingly close at 72g/hr — your data shows 75g+ is the inflection point. Fix the sleep, bump the carbs 3g/hr, and the 60-min plateau should break.
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.5 }}>
                Five personal models are active: heat, HRV readiness, sleep→execution, fueling→durability, and kJ/kg durability. Built from your data, not population averages.
              </p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════ */}
        {/* CATEGORY SECTIONS (insights + data)     */}
        {/* ════════════════════════════════════════ */}

        {/* ── SLEEP & RECOVERY ── */}
        <CategorySection
          icon="💤" title="Sleep & Recovery" sampleNote="93 rides" confidence="high"
          insights={[
            { title: "Single bad sleep nights don't hurt you — but streaks do",
              takeaway: "You're at three consecutive short nights right now — the threshold where performance drops. Protect tonight: lights-out by 9:30 PM, Eight Sleep at -3°C. Two nights of 7+ hours restores your baseline.",
              body: "Across 93 sleep-matched activities: nights under 6 hours followed by normal performance the next day. But 3+ consecutive nights under 7 hours correlates with 8-12% NP drop and 2× cardiac drift. The effect compounds — night 3 is worse than night 2. Recovery takes 2 nights of 7+ hours.",
              sources: ["Oura", "Eight Sleep", "Strava"] },
            { title: "Each extra hour above 6.5h is worth +4.2% EF the next day",
              takeaway: "Target 7h24m — that's your top-quartile average. Each hour above 6.5h is a measurable performance gain. Set a sleep alarm 8 hours before your morning wake time.",
              body: "Linear regression across 93 matched pairs. The slope is consistent and significant. Your bottom quartile averaged 5h48m — a 1.5h gap that translates to ~6% EF difference.",
              sources: ["Oura", "Strava"] },
            { title: "Your optimal bedtime is 9:30-10:15 PM",
              takeaway: "Nights starting before 10:15 PM get 25 more minutes of deep sleep in your data — that's the easiest performance lever you have. Set a 10 PM alarm.",
              body: "Nights starting before 10:15 PM average 1h12m deep sleep vs 47m for nights after 11 PM. Deep sleep is the recovery phase — bedtime timing is one of the easiest levers you have.",
              sources: ["Eight Sleep", "Oura"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Per-Hour Gain" value="+4.2" unit="% EF" sub="Above 6.5h baseline" color={T.green} />
                <StatCard label="Debt Threshold" value="3 nights" unit="" sub="Consecutive <7h → NP drops" color={T.red} />
                <StatCard label="Optimal Bedtime" value="9:30-10:15" unit="PM" color={T.purple} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: "14px", borderRadius: T.radiusSm, background: `${T.red}06`, border: `1px solid ${T.red}08` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.red, textTransform: "uppercase", marginBottom: 3 }}>Low HRV Days (&lt;88ms)</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 700 }}>7.2% <span style={{ fontSize: 11, color: T.textDim }}>avg interval CV</span></div>
                </div>
                <div style={{ padding: "14px", borderRadius: T.radiusSm, background: `${T.green}06`, border: `1px solid ${T.green}08` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.green, textTransform: "uppercase", marginBottom: 3 }}>High HRV Days (&gt;100ms)</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 700 }}>4.1% <span style={{ fontSize: 11, color: T.textDim }}>avg CV — 43% better</span></div>
                </div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: T.radiusSm, background: T.accentDim, fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: T.accent }}>✦ Eight Sleep: </span>Your deep sleep averages 22 min longer at -3°C vs -1°C — equivalent to +0.9% EF the next day.
              </div>
            </>
          }
        />

        {/* ── POWER & FITNESS ── */}
        <CategorySection
          icon="⚡" title="Power & Fitness" sampleNote="95 activities" confidence="high"
          insights={[
            { title: "HR drift improved 52% in 2 months — Z2 volume is paying off",
              takeaway: "4-week rolling average on 3hr+ rides: 6.2% → 2.96%. Keep this Z2 volume through March. The aerobic gains are compounding.",
              body: "EF climbed from 1.58 to 1.67 over the same period. This is genuine mitochondrial adaptation — your aerobic engine is processing lactate more efficiently. The improvement is still accelerating.",
              sources: ["Strava", "Wahoo"] },
            { title: "VO₂max ceiling is capping FTP growth — the 5:20 ratio tells the story",
              takeaway: "5-min to 20-min ratio: 1.05 (optimal 1.20-1.25). One weekly VO₂ session could unlock 15-20W at threshold over 6-8 weeks.",
              body: "Your 3-hour power jumped +11W and drift improved 52%, but 60-min is flat at 290W. The ceiling is your 5-min power — not high enough above 20-min to create headroom for FTP growth. Raise the ceiling, raise everything below it.",
              sources: ["Strava"] },
            { title: "L:R balance improving on flats, stuck on climbs",
              takeaway: "Flat: 53/47 → 51/49 in 6 weeks. Climbs >6%: still 54/46 after hour 2. Different root cause — needs bike fit, not more strength work.",
              body: "The flat-terrain improvement shows neuromuscular correction in a controlled position. The climbing imbalance at >6% grade suggests a positional issue under load. Worth resolving before it becomes an overuse injury.",
              sources: ["Wahoo"] },
          ]}
          modelData={
            <>
              <PowerCurve />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
                {[{d:"5s",w:1142,wkg:16.8,t:"+24W"},{d:"1'",w:458,wkg:6.74,t:"+12W"},{d:"5'",w:351,wkg:5.16,t:"+8W"},{d:"20'",w:333,wkg:4.90,t:"+5W"},{d:"60'",w:290,wkg:4.26,t:"-2W"},{d:"3hr",w:218,wkg:3.21,t:"+11W"}].map(pb => (
                  <div key={pb.d} style={{ padding: "10px", borderRadius: T.radiusSm, background: T.surface, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{pb.d}</div>
                    <div style={{ fontFamily: T.fontMono, fontSize: 18, fontWeight: 700, color: T.text }}>{pb.w}<span style={{ fontSize: 10, color: T.textDim }}>W</span></div>
                    <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textSoft }}>{pb.wkg} W/kg</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: pb.t.startsWith("+") ? T.green : T.red, marginTop: 2, fontFamily: T.fontMono }}>{pb.t}</div>
                  </div>
                ))}
              </div>
              {/* CP Model */}
              <div style={{ marginTop: 14, padding: "14px", borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Critical Power Model</span>
                  <span style={{ padding: "2px 8px", borderRadius: T.radiusFull, fontSize: 9, fontWeight: 600, background: `${T.green}10`, color: T.green }}>R² 0.9987</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <StatCard label="CP" value="295" unit="W" sub="Aerobic Ceiling" />
                  <StatCard label="W'" value="18.8" unit="kJ" sub="Anaerobic Reserve" />
                  <StatCard label="Pmax" value="986" unit="W" sub="Sprint Power" />
                </div>
              </div>
              {/* EF + Drift trends */}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <div style={{ flex: 1, padding: "14px", borderRadius: T.radiusSm, background: T.surface }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>EF (8 weeks)</span>
                    <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.green }}>↑ 5.7%</span>
                  </div>
                  <Sparkline data={[1.58, 1.55, 1.61, 1.63, 1.59, 1.67, 1.65, 1.70]} color={T.green} />
                </div>
                <div style={{ flex: 1, padding: "14px", borderRadius: T.radiusSm, background: T.surface }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>HR Drift (8 weeks)</span>
                    <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.green }}>↓ 52%</span>
                  </div>
                  <Sparkline data={[6.2, 5.8, 4.8, 5.1, 3.9, 4.2, 3.4, 2.96]} color={T.blue} />
                </div>
              </div>
            </>
          }
        />

        {/* ── NUTRITION & FUELING ── */}
        <CategorySection
          icon="🍌" title="Nutrition, Fueling & Hydration" sampleNote="42 rides + Withings" confidence="medium"
          insights={[
            { title: "Fueling consistency is a bigger lever than fitness for long rides (r=0.72)",
              takeaway: "Add one more gel per ride — that's the 3g/hr difference between 72 and 75. Above 75g/hr, your hour-3 NP drops just 2.1% instead of 7.4%. Easiest watt-saving change you can make.",
              body: "The correlation between carbs/hr and late-ride NP (r=0.72) is the strongest predictive relationship in your data. On rides over 3 hours, it strengthens to r=0.81. Adequate carbs delay the shift to fat oxidation at lower intensities.",
              sources: ["Nutrition", "Strava"] },
            { title: "Pre-ride meals add 8% to sweet spot execution quality",
              takeaway: "Fed sessions hit 94% of target. Fasted: 86%. Eat 40-60g carbs 2-3 hours before threshold work.",
              body: "Across 18 sweet spot sessions, fed sessions have both higher power and lower CV within intervals — suggesting more stable glycogen availability throughout the set.",
              sources: ["Nutrition", "Strava"] },
            { title: "Starting rides below 65% hydration doubles your cardiac drift",
              takeaway: "Pre-hydrate with 20oz electrolyte mix 2 hours before riding, especially on warm days. Your morning Withings reading is your guide — below 65% is the danger zone.",
              body: "Your last 4 rides starting above 65% hydration (Withings body water %) averaged 3.1% drift. Four comparable rides starting below 65% averaged 7.8%. The effect compounds with heat — under-hydration at 35°C produced 8.1% drift vs 3.2% when properly hydrated in similar conditions.",
              sources: ["Withings", "Strava", "Weather"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Current Avg" value="72" unit="g/hr" sub="Just below 75g+ sweet spot" color={T.yellow} />
                <StatCard label="Carbs→EF" value="r=0.72" unit="" sub="Strong positive" color={T.green} />
                <StatCard label="Hydration" value="63.2" unit="%" sub="This week avg (baseline: 65%)" color={T.yellow} />
              </div>
              <BinTable bins={{
                "Under-fueled (<40g/hr)": { avgEF: 1.52, avgDrift: 6.1, count: 8 },
                "Adequate (40-60g/hr)": { avgEF: 1.61, avgDrift: 4.4, count: 18 },
                "Well-fueled (>60g/hr)": { avgEF: 1.69, avgDrift: 3.2, count: 16 },
              }} />
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: T.radiusSm, background: `${T.orange}06`, border: `1px solid ${T.orange}10`, fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                <strong style={{ color: T.orange }}>Long ride effect: </strong>On 3hr+ rides, carbs→EF strengthens to r=0.81. Fueling matters more the longer you go.
              </div>
            </>
          }
        />

        {/* ── HEAT & ENVIRONMENT ── */}
        <CategorySection
          icon="🌡️" title="Heat & Environment" sampleNote="78 rides" confidence="high"
          insights={[
            { title: "You're a cool-weather performer — breakpoint at 14°C",
              takeaway: "Peak performance: 8-14°C. Above 14°C, EF declines 0.005 per degree. For summer races above 22°C, plan 5-7 days of heat acclimation.",
              body: "Your heat model shows cool conditions avg EF 1.67, hot (>25°C) avg 1.44. That's a 14% penalty. High humidity above 60% compounds by another 5.2%. This is one of your most statistically robust models.",
              sources: ["Weather", "Strava"] },
            { title: "Humidity above 60% adds a 5.2% EF penalty on top of heat",
              takeaway: "On warm days (>20°C), check humidity. Above 60%: increase sodium to 700mg/hr and reduce targets an additional 3-5%.",
              body: "Low humidity (<60%): avg EF 1.54. High humidity (≥60%): avg EF 1.46. Combined with heat, a hot humid day can cost 18-20% vs cool and dry.",
              sources: ["Weather", "Strava"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Breakpoint" value="14" unit="°C" sub="EF declines above this" color={T.orange} />
                <StatCard label="Decay Rate" value="-0.005" unit="/°C" sub="Per degree above breakpoint" />
                <StatCard label="Peak Zone" value="8-14" unit="°C" sub="Best performance range" color={T.green} />
              </div>
              <BinTable bins={{
                "Cool (<15°C)": { avgEF: 1.67, avgDrift: 3.2, count: 28 },
                "Moderate (15-25°C)": { avgEF: 1.58, avgDrift: 4.8, count: 35 },
                "Hot (>25°C)": { avgEF: 1.44, avgDrift: 7.1, count: 12 },
                "Very Hot (>30°C)": { avgEF: 1.32, avgDrift: 9.4, count: 3 },
              }} />
            </>
          }
        />

        {/* ── HRV & READINESS ── */}
        <CategorySection
          icon="💚" title="HRV & Readiness" sampleNote="95 rides" confidence="high"
          insights={[
            { title: "Green-zone HRV (>100ms) produces 3.7% higher EF — trust the number",
              takeaway: "When morning HRV exceeds 100ms, even after a big day, your body is genuinely recovered. Go for quality. Below 88ms: drop intensity.",
              body: "Your personal thresholds from 95 rides: Red <88ms (EF 1.64), Yellow 88-100ms (EF 1.67), Green >100ms (EF 1.70). The delta is consistent and significant. HRV is your most reliable morning readiness signal.",
              sources: ["Oura", "Wahoo"] },
          ]}
          modelData={
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Red Zone", range: "<88ms", ef: 1.64, drift: "5.8%", color: T.red, n: 32 },
                { label: "Yellow", range: "88-100ms", ef: 1.67, drift: "4.2%", color: T.yellow, n: 31 },
                { label: "Green", range: ">100ms", ef: 1.70, drift: "3.1%", color: T.green, n: 32 },
              ].map(z => (
                <div key={z.label} style={{ flex: 1, padding: "14px", borderRadius: T.radiusSm, background: `${z.color}06`, border: `1px solid ${z.color}10` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: z.color, textTransform: "uppercase", marginBottom: 3 }}>{z.label}</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 700, color: T.text }}>{z.range}</div>
                  <div style={{ fontSize: 11, color: T.textSoft, marginTop: 4 }}>EF: {z.ef} · Drift: {z.drift}</div>
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{z.n} rides</div>
                </div>
              ))}
            </div>
          }
        />

        {/* ── DURABILITY & FATIGUE ── */}
        <CategorySection
          icon="🔋" title="Durability & Fatigue" sampleNote="Rides >1hr" confidence="high"
          insights={[
            { title: "Durability threshold at 43.7 kJ/kg — but late-ride power actually improves",
              takeaway: "Fuel at 75g+/hr on rides over 3 hours to push your EF threshold higher. Your late-ride neuromuscular power is a strength — protect it by delaying the efficiency fade with carbs.",
              body: "Most athletes see monotonic power decline with fatigue. Your profile is unusual — efficiency drops but peak short-duration power holds or improves. This suggests strong neural drive under fatigue, a valuable racing trait. Fueling at 75g+/hr is the lever for extending the EF threshold.",
              sources: ["Strava"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Threshold" value="43.7" unit="kJ/kg" sub="EF decline starts here" color={T.orange} />
                <StatCard label="kJ/kg→EF" value="r=-0.31" unit="" sub="Moderate inverse" />
                <StatCard label="Late 5'" value="+2.6" unit="%" sub="Improves after 30 kJ/kg" color={T.green} />
              </div>
              <BinTable bins={{
                "Light (<10 kJ/kg)": { avgEF: 1.72, avgDrift: 2.1, count: 18 },
                "Moderate (10-20)": { avgEF: 1.68, avgDrift: 3.4, count: 32 },
                "Hard (20-30)": { avgEF: 1.62, avgDrift: 4.8, count: 28 },
                "Very Hard (>30)": { avgEF: 1.54, avgDrift: 6.2, count: 17 },
              }} />
            </>
          }
        />

        {/* ── BODY COMPOSITION & WEIGHT ── */}
        <CategorySection
          icon="⚖️" title="Body Composition & Weight" sampleNote="Withings + DEXA" confidence="medium"
          insights={[
            { title: "You've dropped 2.2kg since January — that's +0.31 W/kg at the same power",
              takeaway: "At your current FTP of 298W, going from 91.2kg to 89.0kg improved your climbing W/kg by 8.4%. Continue at 0.3kg/week — faster risks recovery.",
              body: "W/kg today is 3.35 based on this morning's Withings reading. At January's weight with the same power, it would have been 3.09. Since your lean mass is stable at 42.1% (last DEXA), this is genuine fat loss without muscle sacrifice.",
              sources: ["Withings", "Strava", "DEXA"] },
            { title: "FTP per lean body mass is 3.82 W/kg — up from 3.62 six weeks ago",
              takeaway: "Keep your current strength routine — it's maintaining lean mass while you drop fat. Schedule a follow-up DEXA in 8 weeks to confirm lean mass is holding.",
              body: "DEXA from January showed 42.1% lean mass at 91.2kg = 38.4kg lean. Current 89.0kg at estimated same lean % = similar lean mass. FTP/lean climbed from 3.62 to 3.82 — genuine power gains, not just weight loss.",
              sources: ["DEXA", "Withings", "Strava"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Current" value="89.0" unit="kg" sub="Down 2.2kg since Jan" color={T.green} />
                <StatCard label="W/kg" value="3.35" unit="" sub="At current FTP" color={T.accent} />
                <StatCard label="Lean Mass" value="42.1" unit="%" sub="Stable (last DEXA)" />
              </div>
              <div style={{ padding: "14px", borderRadius: T.radiusSm, background: T.surface }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Weight (12 weeks)</span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.green }}>↓ 2.2kg</span>
                </div>
                <Sparkline data={[91.2, 91.0, 90.6, 90.4, 90.1, 89.8, 89.5, 89.2, 89.0]} color={T.green} />
              </div>
            </>
          }
        />

        {/* ── MENSTRUAL CYCLE PATTERNS ── */}
        <CategorySection
          icon="🔴" title="Menstrual Cycle Patterns" sampleNote="4 cycles tracked" confidence="medium"
          insights={[
            { title: "Luteal phase HR drift averages 18% higher than follicular at the same power",
              takeaway: "In late luteal (days 20-28), drop target power 5-8% for threshold work. The same watts genuinely cost more. Schedule FTP tests and breakthrough sessions in days 5-12.",
              body: "Across 4 tracked cycles, your follicular-phase threshold sessions average 3.2% HR drift while luteal-phase sessions average 5.8%. The delta is consistent cycle to cycle. Core temperature rises ~0.4°C in luteal, which compounds with heat.",
              sources: ["Oura", "Wahoo"] },
            { title: "Your best performances cluster in days 5-12 — your follicular window",
              takeaway: "Plan your hardest sessions and races in this window when possible. Your interval execution score averages 12% higher in follicular vs late luteal.",
              body: "Execution scores by phase: follicular avg 86/100, ovulatory 82/100, early luteal 78/100, late luteal 74/100. The follicular advantage is both physiological (lower core temp, better thermoregulation) and perceptual (same power feels 1-2 RPE easier).",
              sources: ["Oura", "Strava"] },
            { title: "Late luteal weight gain of +1.1-1.4kg is water retention — not fat",
              takeaway: "Ignore the scale in days 20-28. The weight normalizes by day 3-4 of your next cycle. Withings confirms this pattern across all 4 tracked cycles.",
              body: "Withings weight data shows a consistent +1.1-1.4kg spike starting around day 20, peaking at day 25, and returning to baseline by day 3. This is progesterone-driven water retention. Your body composition (lean mass %) doesn't change.",
              sources: ["Withings", "Oura"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Follicular Drift" value="3.2" unit="%" sub="Days 5-12" color={T.green} />
                <StatCard label="Luteal Drift" value="5.8" unit="%" sub="Days 20-28" color={T.orange} />
                <StatCard label="Weight Swing" value="+1.2" unit="kg" sub="Late luteal avg" color={T.purple} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: "14px", borderRadius: T.radiusSm, background: `${T.green}06`, border: `1px solid ${T.green}08` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.green, textTransform: "uppercase", marginBottom: 3 }}>Follicular (Days 5-12)</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 700 }}>86 <span style={{ fontSize: 11, color: T.textDim }}>avg execution</span></div>
                </div>
                <div style={{ padding: "14px", borderRadius: T.radiusSm, background: `${T.purple}06`, border: `1px solid ${T.purple}08` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.purple, textTransform: "uppercase", marginBottom: 3 }}>Late Luteal (Days 20-28)</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 700 }}>74 <span style={{ fontSize: 11, color: T.textDim }}>avg execution</span></div>
                </div>
              </div>
            </>
          }
        />

        {/* ── TRAINING LOAD & PROGRESSION ── */}
        <CategorySection
          icon="📊" title="Training Load & Progression" sampleNote="90+ days" confidence="high"
          insights={[
            { title: "CTL climbed 62 → 82 in 8 weeks while TSB stayed between -8 and +6 — absorbing load well",
              takeaway: "No signs of overreaching. Your optimal build rate is +3-5 CTL/week. Continue this trajectory through March, then schedule a recovery week.",
              body: "Your acute:chronic workload ratio has stayed between 0.9-1.3 throughout this build — well within safe bounds. Blocks that pushed +7 CTL/week in the past led to HRV suppression by week 3. You're pacing this build correctly.",
              sources: ["Strava"] },
            { title: "Your historical taper pattern shows peak at TSB +10-15 after 10-14 days",
              takeaway: "For your target race, start taper 12 days out. Reduce volume 40%, keep two short intensity sessions. Race-day FTP after taper: projected ~305W.",
              body: "Across 3 previous tapers, your best performances came when TSB reached +10 to +15 after 10-14 days of reduced volume. Tapers shorter than 8 days left you with TSB under +5 and performance was 3-5% below peak.",
              sources: ["Strava"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="CTL" value="82" unit="" sub="Up from 62 (8 weeks)" color={T.accent} />
                <StatCard label="ATL" value="76" unit="" sub="Acute load" color={T.red} />
                <StatCard label="TSB" value="+6" unit="" sub="Fresh" color={T.blue} />
              </div>
              <div style={{ padding: "14px", borderRadius: T.radiusSm, background: T.surface }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>CTL (12 weeks)</span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.green }}>↑ 32%</span>
                </div>
                <Sparkline data={[62, 64, 65, 68, 70, 72, 75, 76, 78, 80, 81, 82]} color={T.accent} />
              </div>
            </>
          }
        />

        {/* ── BLOOD WORK & BIOMARKERS ── */}
        <CategorySection
          icon="🩸" title="Blood Work & Biomarkers" sampleNote="Last panel: Aug 2022" confidence="low"
          insights={[
            { title: "Ferritin at 52 ng/mL — lab says 'normal' but athlete-optimal is >80",
              takeaway: "Schedule a retest. If ferritin has continued dropping (was 85 → 52 over 12 months), discuss iron supplementation with your doctor. Low ferritin limits oxygen transport and could explain your 60-min power plateau.",
              body: "Your Aug 2022 panel showed ferritin at 52 ng/mL, down from 85 in the prior test. Standard lab ranges flag anything above 12 as 'normal,' but endurance athletes need >50 minimum, >80 optimal. With your training volume (842 TSS in the last 3 days alone), iron depletion accelerates.",
              sources: ["Blood Panel", "Strava"] },
            { title: "Your last blood panel is 3.5 years old — time for a retest",
              takeaway: "Upload a new panel. Ferritin, vitamin D, and iron status shift significantly during heavy training blocks. A current snapshot would unlock new insights and rule out hidden limiters.",
              body: "AIM can cross-reference your biomarkers with training load, power trends, and recovery patterns. With a current panel, we could tell you whether your 60-min power plateau has a nutritional component or is purely a training ceiling.",
              sources: ["Blood Panel"] },
          ]}
          modelData={null}
        />

        {/* ── INTERVAL EXECUTION TRENDS ── */}
        <CategorySection
          icon="🎯" title="Interval Execution Trends" sampleNote="14 interval sessions (6 weeks)" confidence="high"
          insights={[
            { title: "VO₂ interval consistency improved 8.2% → 5.1% CV over 6 weeks",
              takeaway: "You're getting more repeatable. Keep the same structure — 5×5' format is working. Your best-executed sessions correlate with HRV >95ms and sleep >7h.",
              body: "Power coefficient of variation within VO₂ sets dropped from 8.2% to 5.1%. This means you're hitting more consistent power across reps — less overcooking rep 1, less fading on the last rep. Smoothness is a skill, and you're building it.",
              sources: ["Strava", "Wahoo"] },
            { title: "Sweet spot fade score dropped -4.2% → -1.1% since you fixed fueling",
              takeaway: "The 75g/hr strategy is directly visible in your interval quality. Before the fueling change, your last rep averaged 4.2% below your first. Now it's 1.1%. Keep it up.",
              body: "This improvement tracks exactly with your fueling increase from ~55g/hr to ~72g/hr over the last 4 weeks. The correlation between carbs/hr and fade score for sweet spot work is r=-0.68 in your data. More carbs → less fade → more time at target power.",
              sources: ["Strava", "Nutrition"] },
            { title: "This build block: execution score 78/100, up from 71 in prior block",
              takeaway: "Your interval quality is improving at the same rate as your power. That's a sign of genuine adaptation, not just riding harder. The next block should push into VO₂ territory.",
              body: "14 interval sessions in this 4-week block. Avg execution score 78 (vs 71 in the prior 4-week block). The improvement spans all workout types: threshold +8, sweet spot +6, VO₂ +9. HRV on interval days averaged 98ms vs 87ms in the prior block — better recovery is enabling better execution.",
              sources: ["Strava"] },
          ]}
          modelData={
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <StatCard label="Execution Score" value="78" unit="/100" sub="Up from 71 (prior block)" color={T.green} />
                <StatCard label="VO₂ CV" value="5.1" unit="%" sub="Down from 8.2%" color={T.green} />
                <StatCard label="SS Fade" value="-1.1" unit="%" sub="Down from -4.2%" color={T.green} />
              </div>
              <div style={{ padding: "14px", borderRadius: T.radiusSm, background: T.surface }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Execution Score (8 weeks)</span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.green }}>↑ 10%</span>
                </div>
                <Sparkline data={[71, 72, 70, 74, 75, 76, 77, 78]} color={T.accent} />
              </div>
            </>
          }
        />

        {/* ── SUBJECTIVE-OBJECTIVE ALIGNMENT ── */}
        <CategorySection
          icon="🧠" title="Subjective-Objective Alignment" sampleNote="34 check-ins matched" confidence="medium"
          insights={[
            { title: "When life stress exceeds 3/5 for 3+ days, interval execution drops 11%",
              takeaway: "During high-stress weeks, reduce training volume 20% and shift to Z2. You'll recover fitness faster than if you push through and dig a hole. AIM will flag this automatically.",
              body: "Across 34 check-in matched sessions: stress at 1-2 → 94% of power targets. Stress at 4-5 → 81% of targets. The effect compounds over days — a single high-stress day has minimal impact, but 3+ consecutive days correlate with HRV suppression (~8ms) and measurable power decline.",
              sources: ["Check-in", "Strava", "Oura"] },
            { title: "You rate rides 1 RPE higher when life stress is elevated — your power data says effort was normal",
              takeaway: "On high-stress days, trust the numbers over the feeling. If your power and HR are normal but RPE feels high, that's stress talking, not fitness declining.",
              body: "RPE calibration analysis: on low-stress days, your RPE correlates r=0.82 with IF. On high-stress days, it drops to r=0.61 — you perceive the same effort as harder. This doesn't mean you should ignore RPE, but on high-stress days, check your power data before concluding you're losing fitness.",
              sources: ["Check-in", "Strava"] },
          ]}
          modelData={
            <div style={{ display: "flex", gap: 8 }}>
              <StatCard label="Low Stress Target %" value="94" unit="%" sub="Stress 1-2/5" color={T.green} />
              <StatCard label="High Stress Target %" value="81" unit="%" sub="Stress 4-5/5" color={T.red} />
              <StatCard label="RPE Accuracy" value="r=0.82" unit="" sub="Low stress (r=0.61 high)" color={T.accent} />
            </div>
          }
        />

        {/* ── ASK CLAUDE ── */}
        <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "12px 16px", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface, cursor: "text" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: T.white, fontSize: 9 }}>✦</span>
            </div>
            <span style={{ fontSize: 12, color: T.textDim }}>Why is my 60-min power flat when everything else is improving?</span>
          </div>
        </div>
      </div>
    </div>
  );
}

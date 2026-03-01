import { useState, useRef } from "react";
import { T, font, mono } from "../theme/tokens";
import { biomarkerDB, mockPanels, mockDexa, mockInsights, mockReminders } from "../data/biomarkers";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";

// ── HELPER: Status badge ──
function StatusBadge({ value, biomarkerKey, sex = "male" }) {
  const bm = biomarkerDB[biomarkerKey];
  if (!bm || value == null) return null;
  const [optLow, optHigh] = bm.athleteOptimal[sex];
  const [clinLow, clinHigh] = bm.clinicalRange[sex];
  let label, color, bg;
  if (value >= optLow && value <= optHigh) {
    label = "Optimal"; color = T.green; bg = "rgba(0,229,160,0.1)";
  } else if (value >= clinLow && value <= clinHigh) {
    label = "In Range"; color = T.amber; bg = "rgba(245,158,11,0.1)";
  } else {
    label = value < clinLow ? "Low" : "High"; color = T.red; bg = "rgba(255,71,87,0.1)";
  }
  return (
    <span style={{ padding: "2px 8px", borderRadius: 5, background: bg, fontSize: 10, fontWeight: 700, color, letterSpacing: "0.02em" }}>{label}</span>
  );
}

// ── COMPONENT: Biomarker Trend Sparkline ──
function BiomarkerTrend({ biomarkerKey, panels, sex = "male" }) {
  const bm = biomarkerDB[biomarkerKey];
  if (!bm) return null;
  const [optLow, optHigh] = bm.athleteOptimal[sex];
  const data = panels.map(p => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    value: p.values[biomarkerKey],
  })).filter(d => d.value != null);
  const latest = data[data.length - 1]?.value;
  const prev = data.length > 1 ? data[data.length - 2]?.value : null;
  const delta = prev != null ? latest - prev : null;
  const trend = delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192";
  const trendColor = delta > 0 ? (latest <= optHigh ? T.green : T.amber) : delta < 0 ? (latest >= optLow ? T.green : T.amber) : T.textDim;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", transition: "all 0.2s" }}
      onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{bm.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{bm.name}</div>
            <div style={{ fontSize: 10, color: T.textDim }}>{bm.category}</div>
          </div>
        </div>
        <StatusBadge value={latest} biomarkerKey={biomarkerKey} sex={sex} />
      </div>
      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.02em" }}>{latest}</span>
        <span style={{ fontSize: 12, color: T.textDim }}>{bm.unit}</span>
        {delta != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: trendColor, fontFamily: mono }}>
            {trend} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
      {/* Range bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textDim, marginBottom: 3 }}>
          <span>Athlete Optimal: {optLow}\u2013{optHigh} {bm.unit}</span>
        </div>
        <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)" }}>
          {/* Optimal zone */}
          <div style={{
            position: "absolute",
            left: `${Math.max(0, ((optLow - (optLow * 0.5)) / (optHigh * 1.5 - optLow * 0.5)) * 100)}%`,
            width: `${((optHigh - optLow) / (optHigh * 1.5 - optLow * 0.5)) * 100}%`,
            height: "100%", borderRadius: 3, background: "rgba(0,229,160,0.2)",
          }} />
          {/* Current value dot */}
          <div style={{
            position: "absolute",
            left: `${Math.min(100, Math.max(0, ((latest - optLow * 0.5) / (optHigh * 1.5 - optLow * 0.5)) * 100))}%`,
            top: -3, width: 12, height: 12, borderRadius: "50%",
            background: latest >= optLow && latest <= optHigh ? T.green : latest >= (bm.clinicalRange[sex]?.[0] ?? 0) && latest <= (bm.clinicalRange[sex]?.[1] ?? 999) ? T.amber : T.red,
            border: `2px solid ${T.card}`, transform: "translateX(-50%)",
          }} />
        </div>
      </div>
      {/* Sparkline */}
      <div style={{ height: 50 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={`grad-${biomarkerKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity={0.3} />
                <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={T.accent} strokeWidth={2} fill={`url(#grad-${biomarkerKey})`} dot={{ r: 3, fill: T.accent, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── COMPONENT: DEXA Composition Chart ──
function DexaChart({ data }) {
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    "Body Fat %": d.totalBF,
    "Lean Mass (kg)": d.leanMass,
    "Bone Density": d.boneDensity,
  }));

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>DEXA Body Composition</h3>
          <p style={{ fontSize: 11, color: T.textDim, margin: 0 }}>{data.length} scans tracked</p>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.pink }} />Body Fat %</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.blue }} />Lean Mass</span>
        </div>
      </div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Body Fat", value: `${data[data.length-1].totalBF}%`, delta: data.length > 1 ? `${(data[data.length-1].totalBF - data[0].totalBF).toFixed(1)}%` : null, good: true },
          { label: "Lean Mass", value: `${data[data.length-1].leanMass}kg`, delta: data.length > 1 ? `+${(data[data.length-1].leanMass - data[0].leanMass).toFixed(1)}kg` : null, good: true },
          { label: "Bone Density", value: `${data[data.length-1].boneDensity}`, delta: null, good: true },
          { label: "Visceral Fat", value: `${data[data.length-1].visceralFat}kg`, delta: data.length > 1 ? `${(data[data.length-1].visceralFat - data[0].visceralFat).toFixed(1)}kg` : null, good: true },
          { label: "A:G Ratio", value: data[data.length-1].androidGynoid.toFixed(2), delta: null, good: data[data.length-1].androidGynoid < 1 },
        ].map((s, i) => (
          <div key={i} style={{ background: T.surface, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: mono }}>{s.value}</div>
            {s.delta && <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginTop: 2 }}>{s.delta}</div>}
          </div>
        ))}
      </div>
      {/* Chart */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textDim }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: T.textDim }} axisLine={false} tickLine={false} domain={[12, 20]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: T.textDim }} axisLine={false} tickLine={false} domain={[70, 78]} />
            <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="Body Fat %" stroke={T.pink} strokeWidth={2} dot={{ r: 4, fill: T.pink }} />
            <Line yAxisId="right" type="monotone" dataKey="Lean Mass (kg)" stroke={T.blue} strokeWidth={2} dot={{ r: 4, fill: T.blue }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── COMPONENT: Upload Zone ──
function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setUploading(true);
    setTimeout(() => { setUploading(false); setDone(true); setTimeout(() => setDone(false), 3000); }, 2000);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? T.accent : T.border}`,
        borderRadius: 16,
        padding: "40px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(0,229,160,0.04)" : T.card,
        transition: "all 0.3s",
      }}>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.png,.csv,.xlsx" multiple style={{ display: "none" }}
        onChange={() => { setUploading(true); setTimeout(() => { setUploading(false); setDone(true); setTimeout(() => setDone(false), 3000); }, 2000); }} />
      {uploading ? (
        <div>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite" }}>&#x23F3;</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.accent, margin: "0 0 6px" }}>Analyzing document with AI...</p>
          <p style={{ fontSize: 12, color: T.textDim, margin: 0 }}>Extracting biomarkers, parsing lab values, cross-referencing with your profile</p>
        </div>
      ) : done ? (
        <div>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#x2705;</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.green, margin: "0 0 6px" }}>Panel uploaded & analyzed!</p>
          <p style={{ fontSize: 12, color: T.textSoft, margin: 0 }}>9 biomarkers extracted. 3 new AI insights generated.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F4C4;</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Upload Blood Panel, DEXA Scan, or Lab Report</p>
          <p style={{ fontSize: 12, color: T.textSoft, margin: "0 0 12px" }}>Drag & drop PDF, image, or CSV — AI extracts all biomarkers automatically</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {["PDF", "JPG/PNG", "CSV", "XLSX"].map(f => (
              <span key={f} style={{ padding: "3px 10px", borderRadius: 6, background: T.surface, fontSize: 10, color: T.textDim, fontWeight: 600 }}>{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENT: Insight Card ──
function InsightCard({ insight }) {
  const colors = { success: T.green, warning: T.amber, info: T.blue, danger: T.red };
  const icons = { success: "\u2705", warning: "\u26A0\uFE0F", info: "\uD83D\uDCA1", danger: "\uD83D\uDEA8" };
  const color = colors[insight.severity];
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icons[insight.severity]}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{insight.title}</span>
        </div>
        <span style={{ fontSize: 10, color: T.textDim }}>{new Date(insight.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.65, margin: 0 }}>{insight.body}</p>
      {insight.linkedBiomarkers.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {insight.linkedBiomarkers.map(bk => (
            <span key={bk} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: T.surface, color: T.textSoft, fontWeight: 600 }}>
              {biomarkerDB[bk]?.icon} {biomarkerDB[bk]?.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMPONENT: Reminder Card ──
function ReminderCard({ reminder }) {
  const urgent = reminder.daysUntil <= 7;
  const icons = { blood: "\uD83E\uDE78", dexa: "\uD83E\uDDB4", vo2: "\uD83E\uDEC1" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: T.card, border: `1px solid ${urgent ? "rgba(245,158,11,0.3)" : T.border}`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{icons[reminder.type]}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{reminder.name}</div>
          <div style={{ fontSize: 11, color: T.textDim }}>Last: {new Date(reminder.lastDone).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: urgent ? T.amber : T.textSoft }}>
          {urgent ? `Due in ${reminder.daysUntil} days` : `${reminder.daysUntil} days`}
        </div>
        <div style={{ fontSize: 10, color: T.textDim }}>
          {new Date(reminder.nextDue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

// ── COMPONENT: Panel History ──
function PanelHistory({ panels }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Upload History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {panels.slice().reverse().map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{"\uD83D\uDCC4"}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.fileName}</div>
                <div style={{ fontSize: 10, color: T.textDim }}>{p.source} · {Object.keys(p.values).length} biomarkers</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: T.textDim }}>{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN HEALTH LAB PAGE
// ══════════════════════════════════════
export default function HealthLab() {
  const [activeSection, setActiveSection] = useState("overview");
  const sex = "male";

  const sections = [
    { id: "overview", label: "Overview", icon: "\uD83D\uDCCA" },
    { id: "blood", label: "Blood Panels", icon: "\uD83E\uDE78" },
    { id: "dexa", label: "DEXA / Body Comp", icon: "\uD83E\uDDB4" },
    { id: "insights", label: "AI Insights", icon: "\uD83E\uDDE0" },
    { id: "reminders", label: "Reminders", icon: "\uD83D\uDD14" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00e5a0, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>M</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Dashboard", "Calendar", "Trends", "Boosters", "Health Lab", "Race Planner"].map(item => (
              <button key={item} style={{ background: item === "Health Lab" ? "rgba(0,229,160,0.1)" : "none", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: item === "Health Lab" ? T.accent : T.textDim, cursor: "pointer", fontFamily: font }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #8b5cf6, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>JD</div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
              Health <span style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lab</span>
            </h1>
            <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>Blood panels, DEXA scans, and health data — analyzed by AI in the context of your training.</p>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "none", border: "none", borderBottom: `2px solid ${activeSection === s.id ? T.accent : "transparent"}`, fontSize: 13, fontWeight: activeSection === s.id ? 700 : 500, color: activeSection === s.id ? T.text : T.textDim, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* === OVERVIEW === */}
        {activeSection === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Upload */}
            <UploadZone />

            {/* Quick stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { label: "Blood Panels", value: mockPanels.length, icon: "\uD83E\uDE78", sub: `Latest: ${new Date(mockPanels[mockPanels.length-1].date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` },
                { label: "DEXA Scans", value: mockDexa.length, icon: "\uD83E\uDDB4", sub: `Latest: ${new Date(mockDexa[mockDexa.length-1].date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` },
                { label: "Biomarkers Tracked", value: Object.keys(biomarkerDB).length, icon: "\uD83D\uDCCA", sub: "All in athlete-optimal context" },
                { label: "Next Test Due", value: `${mockReminders[0].daysUntil}d`, icon: "\uD83D\uDD14", sub: mockReminders[0].name },
              ].map((s, i) => (
                <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>{s.label}</span>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: mono, margin: "6px 0 2px" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: T.textDim }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Latest insights */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{"\uD83E\uDDE0"}</span> Latest AI Insights
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mockInsights.slice(0, 3).map(i => <InsightCard key={i.id} insight={i} />)}
              </div>
            </div>

            {/* Upcoming reminders */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{"\uD83D\uDD14"}</span> Upcoming Tests
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {mockReminders.map((r, i) => <ReminderCard key={i} reminder={r} />)}
              </div>
            </div>
          </div>
        )}

        {/* === BLOOD PANELS === */}
        {activeSection === "blood" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <UploadZone />

            {/* Biomarker grid */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Biomarker Trends</h3>
                <span style={{ fontSize: 11, color: T.textDim }}>{mockPanels.length} panels · {Object.keys(biomarkerDB).length} biomarkers tracked</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {Object.keys(biomarkerDB).map(key => (
                  <BiomarkerTrend key={key} biomarkerKey={key} panels={mockPanels} sex={sex} />
                ))}
              </div>
            </div>

            {/* How to interpret */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Understanding Your Ranges</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.textSoft }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.green }} /> <strong style={{ color: T.text }}>Optimal</strong> — Within athlete-specific optimal range</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.amber }} /> <strong style={{ color: T.text }}>In Range</strong> — Within clinical normal, but below athlete optimal</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.red }} /> <strong style={{ color: T.text }}>Out of Range</strong> — Outside clinical reference; action needed</div>
              </div>
              <p style={{ fontSize: 11, color: T.textDim, margin: "10px 0 0", lineHeight: 1.6 }}>
                AIM uses athlete-specific optimal ranges based on sports science research, not standard clinical ranges. For example, ferritin is "clinically normal" at 12 ng/mL, but athletes need &gt;35 ng/mL for optimal oxygen transport. Always discuss abnormal results with your physician.
              </p>
            </div>

            {/* Panel history */}
            <PanelHistory panels={mockPanels} />
          </div>
        )}

        {/* === DEXA === */}
        {activeSection === "dexa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <UploadZone />
            <DexaChart data={mockDexa} />

            {/* Individual scan comparison */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Scan-by-Scan Comparison</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Date", "Body Fat %", "Lean Mass", "Bone Density", "Visceral Fat", "A:G Ratio"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockDexa.map((d, i) => {
                      const prev = i > 0 ? mockDexa[i - 1] : null;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: mono, fontWeight: 700 }}>{d.totalBF}%</span>
                            {prev && <span style={{ fontSize: 10, color: d.totalBF < prev.totalBF ? T.green : T.red, marginLeft: 6 }}>{d.totalBF < prev.totalBF ? "\u2193" : "\u2191"}{Math.abs(d.totalBF - prev.totalBF).toFixed(1)}%</span>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: mono, fontWeight: 700 }}>{d.leanMass}kg</span>
                            {prev && <span style={{ fontSize: 10, color: d.leanMass > prev.leanMass ? T.green : T.red, marginLeft: 6 }}>{d.leanMass > prev.leanMass ? "\u2191" : "\u2193"}{Math.abs(d.leanMass - prev.leanMass).toFixed(1)}kg</span>}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: mono }}>{d.boneDensity}</td>
                          <td style={{ padding: "10px 12px", fontFamily: mono }}>{d.visceralFat}kg</td>
                          <td style={{ padding: "10px 12px", fontFamily: mono }}>{d.androidGynoid.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* What DEXA measures */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>What DEXA Measures & Why Athletes Care</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>
                <div style={{ padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
                  <strong style={{ color: T.text }}>Body Fat %</strong> — More accurate than calipers, bioimpedance, or DEXA alternatives. Competitive male cyclists: 6-15%. Female: 12-22%. Lower isn't always better — underfueling risks RED-S.
                </div>
                <div style={{ padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
                  <strong style={{ color: T.text }}>Lean Mass</strong> — Muscle + organ weight. For cyclists, increasing lean mass while reducing fat improves W/kg. Track regional lean mass to identify muscle imbalances.
                </div>
                <div style={{ padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
                  <strong style={{ color: T.text }}>Bone Density</strong> — Cyclists are at higher risk of osteoporosis (non-weight-bearing sport). DEXA T-score &gt;-1.0 is normal. Strength training and vitamin D help maintain density.
                </div>
                <div style={{ padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
                  <strong style={{ color: T.text }}>Android:Gynoid Ratio</strong> — Trunk fat vs. hip fat distribution. &lt;1.0 is healthier. Decreasing A:G ratio means you're losing fat from the metabolically riskier abdominal region first.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === AI INSIGHTS === */}
        {activeSection === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>How AI Insights Work</h3>
              <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>
                Every time you upload a blood panel or DEXA scan, AIM cross-references your biomarkers with your training data (power, volume, TSS), recovery data (HRV, sleep, readiness), body composition trends, and dietary profile. This produces insights that no single data source could generate alone — like connecting a ferritin drop to an FTP plateau, or linking cortisol spikes to overtraining patterns visible in your Oura data.
              </p>
            </div>
            {mockInsights.map(i => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}

        {/* === REMINDERS === */}
        {activeSection === "reminders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Smart Test Reminders</h3>
              <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>
                AIM recommends testing cadences based on sports science best practices and your individual needs. Blood panels every 3 months (quarterly) catch seasonal deficiencies and training-related changes. DEXA scans every 6-12 months track body composition trends. VO2max lab tests annually to validate training improvements.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Upcoming</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mockReminders.map((r, i) => <ReminderCard key={i} reminder={r} />)}
              </div>
            </div>

            {/* Recommended testing schedule */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Recommended Testing Schedule</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  { name: "Comprehensive Blood Panel", freq: "Every 3 months", why: "Catches iron depletion, vitamin D seasonal drops, overtraining hormonal shifts, and inflammation before they impact performance.", icon: "\uD83E\uDE78", cost: "$80-200" },
                  { name: "DEXA Body Composition Scan", freq: "Every 6-12 months", why: "Tracks lean mass gain, fat loss distribution, bone density (critical for cyclists), and regional muscle balance.", icon: "\uD83E\uDDB4", cost: "$75-150" },
                  { name: "VO2max Lab Test", freq: "Annually or at phase transitions", why: "Validates training improvements against gold-standard measurement. Best done at the start and end of your training season.", icon: "\uD83E\uDEC1", cost: "$100-250" },
                  { name: "Iron Panel Follow-up", freq: "8-12 weeks after supplementation starts", why: "Confirms supplementation is working. Ferritin should increase 10-20 ng/mL per 8 weeks with proper supplementation.", icon: "\uD83D\uDC8A", cost: "$30-60" },
                ].map((t, i) => (
                  <div key={i} style={{ padding: "16px", background: T.surface, borderRadius: 12, border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>{t.freq}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, margin: "0 0 6px" }}>{t.why}</p>
                    <div style={{ fontSize: 10, color: T.textDim }}>Estimated cost: {t.cost}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-test instructions */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Pre-Test Instructions (for accurate results)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 12, color: T.textSoft }}>
                {[
                  { rule: "Fast 10-12 hours before blood draw", why: "Glucose, insulin, and lipid panels require fasting for accuracy" },
                  { rule: "Hydrate well (500ml water before)", why: "Dehydration concentrates blood, artificially inflating hemoglobin and hematocrit" },
                  { rule: "No exercise 24h before", why: "Training elevates CK, cortisol, and inflammatory markers — gives false overtraining signal" },
                  { rule: "Morning draw (before 10 AM)", why: "Cortisol and testosterone follow circadian rhythms — morning values are most informative" },
                  { rule: "Note your menstrual cycle day", why: "Iron, estradiol, FSH, and LH vary significantly across cycle phases" },
                  { rule: "Avoid supplements morning of", why: "Iron, B12, and vitamin D supplements can spike levels artificially for 6-8 hours" },
                ].map((r, i) => (
                  <div key={i} style={{ padding: "12px", background: T.surface, borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: T.text, marginBottom: 4 }}>{r.rule}</div>
                    <div style={{ lineHeight: 1.5 }}>{r.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "20px 32px", background: T.surface, marginTop: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, margin: 0 }}>
            AIM Health Lab is not a diagnostic tool and does not provide medical advice. All biomarker analysis uses athlete-optimized reference ranges for educational context. Abnormal results should always be discussed with your physician or sports medicine doctor. AI insights cross-reference your training, recovery, and health data to identify patterns — they do not replace professional medical evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}

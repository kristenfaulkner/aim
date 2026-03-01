import { useState, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Area, AreaChart, BarChart, Bar, Cell, CartesianGrid } from "recharts";

// ── DESIGN TOKENS ──
const C = {
  bg: "#06070b",
  surface: "#0d0e15",
  card: "#11121b",
  cardHover: "#161722",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  accent: "#00e5a0",
  text: "#eaeaf0",
  textSoft: "#9495a5",
  textDim: "#5c5d70",
  red: "#ff4757",
  amber: "#f59e0b",
  green: "#00e5a0",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

// ── BIOMARKER DATABASE ──
// Clinical range = standard lab range. Athlete optimal = evidence-based for endurance athletes.
const biomarkerDB = {
  ferritin: {
    name: "Ferritin",
    unit: "ng/mL",
    category: "Iron & Oxygen",
    icon: "🩸",
    clinicalRange: { male: [12, 300], female: [12, 150] },
    athleteOptimal: { male: [50, 200], female: [35, 150] },
    dangerLow: { male: 20, female: 15 },
    whyItMatters: "Ferritin reflects your iron stores — the fuel for hemoglobin production and oxygen transport. Low ferritin is the #1 hidden performance limiter in endurance athletes, especially women. 43% of female endurance athletes are iron deficient.",
    linkedMetrics: ["VO2max", "FTP", "HR recovery", "RPE at threshold"],
    actionLow: "Increase iron-rich foods (red meat, spinach, lentils). Consider supplementation: ferritin 20-40 → 27mg elemental iron daily; ferritin <20 → 325mg ferrous sulfate. Take with vitamin C, avoid calcium/coffee within 2h. Retest in 8-12 weeks.",
    actionHigh: "High ferritin can indicate inflammation or iron overload. Cross-reference with hs-CRP. If CRP is also elevated, ferritin may be artificially high. Consult physician if consistently >300.",
  },
  vitaminD: {
    name: "Vitamin D (25-OH)",
    unit: "ng/mL",
    category: "Vitamins",
    icon: "☀️",
    clinicalRange: { male: [30, 100], female: [30, 100] },
    athleteOptimal: { male: [40, 80], female: [40, 80] },
    dangerLow: { male: 20, female: 20 },
    whyItMatters: "Vitamin D is critical for bone density, muscle contraction, immune function, and injury prevention. 33.6% of NCAA Division I athletes have suboptimal levels. Low vitamin D is associated with increased stress fracture risk and reduced testosterone.",
    linkedMetrics: ["Bone density", "Injury rate", "Immune function", "Testosterone"],
    actionLow: "Supplement with 2,000-5,000 IU vitamin D3 daily with a fat-containing meal. Retest in 8-12 weeks. Get 15-20 min of sun exposure when possible. Athletes in northern latitudes are especially at risk in winter.",
    actionHigh: "Levels >100 ng/mL risk toxicity (rare with supplementation). Reduce supplementation and retest in 4 weeks.",
  },
  hemoglobin: {
    name: "Hemoglobin",
    unit: "g/dL",
    category: "Iron & Oxygen",
    icon: "🔴",
    clinicalRange: { male: [13.5, 17.5], female: [12.0, 16.0] },
    athleteOptimal: { male: [14.0, 17.0], female: [13.0, 15.5] },
    dangerLow: { male: 12.5, female: 11.0 },
    whyItMatters: "Hemoglobin carries oxygen to your muscles. Endurance athletes often show dilutional 'pseudoanemia' (0.5-1.0 g/dL lower) due to plasma volume expansion — this is actually a beneficial adaptation, not true anemia. Context matters.",
    linkedMetrics: ["VO2max", "Time to exhaustion", "W/kg at threshold"],
    actionLow: "If hemoglobin is low AND ferritin is low → true iron deficiency. If hemoglobin is slightly low but ferritin is normal → likely sports anemia (beneficial). Consult physician if below danger threshold.",
    actionHigh: "Very high hemoglobin may indicate dehydration. Ensure adequate hydration before retesting.",
  },
  testosterone: {
    name: "Total Testosterone",
    unit: "ng/dL",
    category: "Hormones",
    icon: "⚡",
    clinicalRange: { male: [264, 916], female: [15, 70] },
    athleteOptimal: { male: [500, 900], female: [25, 60] },
    dangerLow: { male: 300, female: 15 },
    whyItMatters: "Testosterone drives muscle repair, bone density, and recovery. Male athletes in the lower quartile of normal range have a 4.5x higher stress fracture rate. Low T can indicate overtraining, under-fueling, or chronic stress.",
    linkedMetrics: ["Recovery rate", "Power output", "Bone density", "T:C ratio"],
    actionLow: "Cross-reference with training load and caloric intake. Common causes: overtraining (reduce volume), underfueling (increase calories, especially fats), poor sleep, chronic stress. If persistently low despite lifestyle changes, consult endocrinologist.",
    actionHigh: "Rarely a concern in natural athletes. If unusually high, retest to confirm.",
  },
  cortisol: {
    name: "Cortisol (AM)",
    unit: "µg/dL",
    category: "Hormones",
    icon: "😰",
    clinicalRange: { male: [6.2, 19.4], female: [6.2, 19.4] },
    athleteOptimal: { male: [8, 15], female: [8, 15] },
    dangerLow: { male: 5, female: 5 },
    whyItMatters: "Cortisol is your stress hormone. Acute spikes during training are normal and healthy. Chronically elevated cortisol (from overtraining, poor sleep, life stress) suppresses recovery, impairs immunity, and breaks down muscle.",
    linkedMetrics: ["HRV", "Sleep quality", "Training load", "T:C ratio"],
    actionLow: "Very low AM cortisol may indicate adrenal insufficiency or severe overtraining. Rest, reduce volume, consult physician.",
    actionHigh: "Check: Are you overtraining? Is life stress elevated? How's your sleep? The testosterone:cortisol ratio is more informative than cortisol alone.",
  },
  hsCRP: {
    name: "hs-CRP",
    unit: "mg/L",
    category: "Inflammation",
    icon: "🔥",
    clinicalRange: { male: [0, 3.0], female: [0, 3.0] },
    athleteOptimal: { male: [0, 1.0], female: [0, 1.0] },
    dangerLow: { male: 0, female: 0 },
    whyItMatters: "High-sensitivity C-reactive protein measures systemic inflammation. In athletes, persistent elevation (>1.0) may indicate overtraining, inadequate recovery, poor diet, or underlying infection. It also influences ferritin readings.",
    linkedMetrics: ["Recovery score", "Illness frequency", "Ferritin accuracy"],
    actionLow: "Low is good — indicates minimal systemic inflammation.",
    actionHigh: "If >1.0 consistently: increase omega-3 intake, improve sleep, check training load. If >3.0: may indicate infection or injury. Ferritin levels should be interpreted cautiously when CRP is elevated.",
  },
  vitB12: {
    name: "Vitamin B12",
    unit: "pg/mL",
    category: "Vitamins",
    icon: "💊",
    clinicalRange: { male: [200, 900], female: [200, 900] },
    athleteOptimal: { male: [400, 700], female: [400, 700] },
    dangerLow: { male: 200, female: 200 },
    whyItMatters: "B12 is critical for red blood cell production, nerve function, and energy metabolism. Deficiency causes fatigue, weakness, and impaired recovery. Vegans and vegetarians are at high risk — B12 is found almost exclusively in animal products.",
    linkedMetrics: ["Energy levels", "RBC production", "Neurological function"],
    actionLow: "Supplement with 500-1000 mcg methylcobalamin daily. Vegans/vegetarians: B12 supplementation is essential, not optional. Sublingual or injected forms may be better absorbed.",
    actionHigh: "Rarely a concern. Very high levels may indicate liver issues or excessive supplementation.",
  },
  creatineKinase: {
    name: "Creatine Kinase (CK)",
    unit: "U/L",
    category: "Muscle Damage",
    icon: "💪",
    clinicalRange: { male: [39, 308], female: [26, 192] },
    athleteOptimal: { male: [50, 400], female: [40, 300] },
    dangerLow: { male: 0, female: 0 },
    whyItMatters: "CK is released when muscle fibers are damaged during exercise. Some elevation is expected after hard training. Persistently high CK between sessions indicates your muscles aren't recovering — risk of overtraining or rhabdomyolysis.",
    linkedMetrics: ["Training load", "Recovery time", "Muscle soreness"],
    actionLow: "Low CK is normal between training blocks.",
    actionHigh: "If >1000 U/L: reduce training volume immediately. If >5000: seek medical attention (rhabdomyolysis risk). Ensure adequate hydration. If consistently elevated at rest, training load is likely too high.",
  },
  tsh: {
    name: "TSH",
    unit: "mIU/L",
    category: "Thyroid",
    icon: "🦋",
    clinicalRange: { male: [0.4, 4.0], female: [0.4, 4.0] },
    athleteOptimal: { male: [0.5, 2.5], female: [0.5, 2.5] },
    dangerLow: { male: 0.1, female: 0.1 },
    whyItMatters: "Thyroid hormones regulate metabolism, energy, and body temperature. Abnormal TSH in athletes often correlates with underfueling (RED-S), overtraining, or chronic stress. Athletes with fatigue, unexplained weight changes, or menstrual irregularities should test thyroid function.",
    linkedMetrics: ["Metabolism", "Body weight", "Energy levels", "Menstrual regularity"],
    actionLow: "Low TSH may indicate hyperthyroidism. Consult endocrinologist.",
    actionHigh: "High TSH may indicate hypothyroidism or chronic underfueling. Common in athletes with restricted diets. Address caloric intake first, then consult physician if persists.",
  },
};

// ── MOCK DATA: Historical blood panels ──
const mockPanels = [
  {
    id: "panel-1",
    date: "2025-03-15",
    source: "Quest Diagnostics",
    fileName: "blood_panel_march_2025.pdf",
    values: {
      ferritin: 28, vitaminD: 32, hemoglobin: 14.8, testosterone: 520,
      cortisol: 12.5, hsCRP: 0.6, vitB12: 580, creatineKinase: 210, tsh: 1.8,
    },
  },
  {
    id: "panel-2",
    date: "2025-06-20",
    source: "Labcorp",
    fileName: "blood_panel_june_2025.pdf",
    values: {
      ferritin: 45, vitaminD: 52, hemoglobin: 15.1, testosterone: 560,
      cortisol: 10.8, hsCRP: 0.4, vitB12: 610, creatineKinase: 180, tsh: 1.6,
    },
  },
  {
    id: "panel-3",
    date: "2025-09-10",
    source: "Quest Diagnostics",
    fileName: "blood_panel_sept_2025.pdf",
    values: {
      ferritin: 62, vitaminD: 68, hemoglobin: 15.3, testosterone: 590,
      cortisol: 9.2, hsCRP: 0.3, vitB12: 640, creatineKinase: 155, tsh: 1.5,
    },
  },
  {
    id: "panel-4",
    date: "2025-12-05",
    source: "Labcorp",
    fileName: "blood_panel_dec_2025.pdf",
    values: {
      ferritin: 58, vitaminD: 45, hemoglobin: 15.0, testosterone: 545,
      cortisol: 14.1, hsCRP: 0.9, vitB12: 600, creatineKinase: 290, tsh: 1.9,
    },
  },
];

// ── MOCK DATA: DEXA scans ──
const mockDexa = [
  { date: "2024-12-01", totalBF: 18.2, leanMass: 72.9, boneDensity: 1.28, visceralFat: 0.8, androidGynoid: 0.82 },
  { date: "2025-06-15", totalBF: 16.1, leanMass: 74.6, boneDensity: 1.30, visceralFat: 0.6, androidGynoid: 0.78 },
  { date: "2025-12-10", totalBF: 14.8, leanMass: 75.7, boneDensity: 1.31, visceralFat: 0.5, androidGynoid: 0.75 },
];

// ── MOCK DATA: AI Insights ──
const mockInsights = [
  {
    id: 1,
    severity: "success",
    title: "Ferritin Recovery: Mission Accomplished",
    body: "Your ferritin climbed from 28 → 62 ng/mL over 6 months after starting iron supplementation in March. This coincided with your FTP increasing 14W (284 → 298W) and VO2max improving from Cat 4 to Cat 3. Your iron stores are now in the athlete-optimal zone. Maintain current supplementation dose and retest in 3 months.",
    linkedBiomarkers: ["ferritin"],
    date: "2025-12-05",
  },
  {
    id: 2,
    severity: "warning",
    title: "December Panel: Cortisol & CK Elevated — Overreaching?",
    body: "Your cortisol jumped from 9.2 → 14.1 µg/dL and CK rose from 155 → 290 U/L. Combined with your Oura HRV dropping 12ms this month and EightSleep showing 15% less deep sleep, this pattern strongly suggests functional overreaching. Your December training volume was 16.2 hours/week vs. your 3-month average of 12.8. Consider deloading to 8-10 hours for the next 2 weeks and retesting CK.",
    linkedBiomarkers: ["cortisol", "creatineKinase"],
    date: "2025-12-05",
  },
  {
    id: 3,
    severity: "info",
    title: "Vitamin D Seasonal Dip — Expected but Act Now",
    body: "Your vitamin D dropped from 68 → 45 ng/mL between September and December — typical for San Francisco winter (less UV exposure). You're still in the athlete-optimal range, but the trajectory suggests you'll dip below 40 by February without intervention. Increase supplementation from 2,000 → 4,000 IU daily through March.",
    linkedBiomarkers: ["vitaminD"],
    date: "2025-12-05",
  },
  {
    id: 4,
    severity: "success",
    title: "DEXA: Body Composition Trending Perfectly",
    body: "Over 12 months: body fat 18.2% → 14.8%, lean mass +2.8kg, bone density stable at 1.31 g/cm². Your android:gynoid ratio improved from 0.82 → 0.75, indicating fat loss is coming from the trunk (metabolically healthiest pattern). At 75.7kg lean mass and 14.8% body fat, your estimated race weight of ~87.5kg gives you a W/kg of 3.40 at current FTP. Target: 13.5% BF at 76kg lean → 86.3kg → 3.45 W/kg.",
    linkedBiomarkers: [],
    date: "2025-12-10",
  },
];

// ── REMINDER SYSTEM ──
const mockReminders = [
  { type: "blood", name: "Quarterly Blood Panel", lastDone: "2025-12-05", nextDue: "2026-03-05", status: "upcoming", daysUntil: 4 },
  { type: "dexa", name: "Annual DEXA Scan", lastDone: "2025-12-10", nextDue: "2026-06-10", status: "scheduled", daysUntil: 101 },
  { type: "blood", name: "Iron Recheck (Follow-up)", lastDone: "2025-12-05", nextDue: "2026-03-05", status: "upcoming", daysUntil: 4 },
  { type: "vo2", name: "VO2max Lab Test", lastDone: "2025-06-20", nextDue: "2026-06-20", status: "scheduled", daysUntil: 111 },
];

// ── HELPER: Status badge ──
function StatusBadge({ value, biomarkerKey, sex = "male" }) {
  const bm = biomarkerDB[biomarkerKey];
  if (!bm || value == null) return null;
  const [optLow, optHigh] = bm.athleteOptimal[sex];
  const [clinLow, clinHigh] = bm.clinicalRange[sex];
  let label, color, bg;
  if (value >= optLow && value <= optHigh) {
    label = "Optimal"; color = C.green; bg = "rgba(0,229,160,0.1)";
  } else if (value >= clinLow && value <= clinHigh) {
    label = "In Range"; color = C.amber; bg = "rgba(245,158,11,0.1)";
  } else {
    label = value < clinLow ? "Low" : "High"; color = C.red; bg = "rgba(255,71,87,0.1)";
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
  const trend = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const trendColor = delta > 0 ? (latest <= optHigh ? C.green : C.amber) : delta < 0 ? (latest >= optLow ? C.green : C.amber) : C.textDim;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", transition: "all 0.2s" }}
      onMouseOver={e => e.currentTarget.style.borderColor = C.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{bm.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{bm.name}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{bm.category}</div>
          </div>
        </div>
        <StatusBadge value={latest} biomarkerKey={biomarkerKey} sex={sex} />
      </div>
      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{latest}</span>
        <span style={{ fontSize: 12, color: C.textDim }}>{bm.unit}</span>
        {delta != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: trendColor, fontFamily: "'JetBrains Mono', monospace" }}>
            {trend} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
      {/* Range bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim, marginBottom: 3 }}>
          <span>Athlete Optimal: {optLow}–{optHigh} {bm.unit}</span>
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
            background: latest >= optLow && latest <= optHigh ? C.green : latest >= (bm.clinicalRange[sex]?.[0] ?? 0) && latest <= (bm.clinicalRange[sex]?.[1] ?? 999) ? C.amber : C.red,
            border: `2px solid ${C.card}`, transform: "translateX(-50%)",
          }} />
        </div>
      </div>
      {/* Sparkline */}
      <div style={{ height: 50 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={`grad-${biomarkerKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2} fill={`url(#grad-${biomarkerKey})`} dot={{ r: 3, fill: C.accent, strokeWidth: 0 }} />
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
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>🦴 DEXA Body Composition</h3>
          <p style={{ fontSize: 11, color: C.textDim, margin: 0 }}>{data.length} scans tracked</p>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.pink }} />Body Fat %</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.blue }} />Lean Mass</span>
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
          <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
            {s.delta && <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginTop: 2 }}>{s.delta}</div>}
          </div>
        ))}
      </div>
      {/* Chart */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textDim }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.textDim }} axisLine={false} tickLine={false} domain={[12, 20]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim }} axisLine={false} tickLine={false} domain={[70, 78]} />
            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="Body Fat %" stroke={C.pink} strokeWidth={2} dot={{ r: 4, fill: C.pink }} />
            <Line yAxisId="right" type="monotone" dataKey="Lean Mass (kg)" stroke={C.blue} strokeWidth={2} dot={{ r: 4, fill: C.blue }} />
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
        border: `2px dashed ${dragging ? C.accent : C.border}`,
        borderRadius: 16,
        padding: "40px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(0,229,160,0.04)" : C.card,
        transition: "all 0.3s",
      }}>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.png,.csv,.xlsx" multiple style={{ display: "none" }}
        onChange={() => { setUploading(true); setTimeout(() => { setUploading(false); setDone(true); setTimeout(() => setDone(false), 3000); }, 2000); }} />
      {uploading ? (
        <div>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite" }}>⏳</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.accent, margin: "0 0 6px" }}>Analyzing document with AI...</p>
          <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>Extracting biomarkers, parsing lab values, cross-referencing with your profile</p>
        </div>
      ) : done ? (
        <div>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.green, margin: "0 0 6px" }}>Panel uploaded & analyzed!</p>
          <p style={{ fontSize: 12, color: C.textSoft, margin: 0 }}>9 biomarkers extracted. 3 new AI insights generated.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Upload Blood Panel, DEXA Scan, or Lab Report</p>
          <p style={{ fontSize: 12, color: C.textSoft, margin: "0 0 12px" }}>Drag & drop PDF, image, or CSV — AI extracts all biomarkers automatically</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {["PDF", "JPG/PNG", "CSV", "XLSX"].map(f => (
              <span key={f} style={{ padding: "3px 10px", borderRadius: 6, background: C.surface, fontSize: 10, color: C.textDim, fontWeight: 600 }}>{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENT: Insight Card ──
function InsightCard({ insight }) {
  const colors = { success: C.green, warning: C.amber, info: C.blue, danger: C.red };
  const icons = { success: "✅", warning: "⚠️", info: "💡", danger: "🚨" };
  const color = colors[insight.severity];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icons[insight.severity]}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{insight.title}</span>
        </div>
        <span style={{ fontSize: 10, color: C.textDim }}>{new Date(insight.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.65, margin: 0 }}>{insight.body}</p>
      {insight.linkedBiomarkers.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {insight.linkedBiomarkers.map(bk => (
            <span key={bk} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: C.surface, color: C.textSoft, fontWeight: 600 }}>
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
  const icons = { blood: "🩸", dexa: "🦴", vo2: "🫁" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: C.card, border: `1px solid ${urgent ? "rgba(245,158,11,0.3)" : C.border}`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{icons[reminder.type]}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{reminder.name}</div>
          <div style={{ fontSize: 11, color: C.textDim }}>Last: {new Date(reminder.lastDone).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: urgent ? C.amber : C.textSoft }}>
          {urgent ? `Due in ${reminder.daysUntil} days` : `${reminder.daysUntil} days`}
        </div>
        <div style={{ fontSize: 10, color: C.textDim }}>
          {new Date(reminder.nextDue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

// ── COMPONENT: Panel History ──
function PanelHistory({ panels }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>📋 Upload History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {panels.slice().reverse().map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.fileName}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{p.source} · {Object.keys(p.values).length} biomarkers</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.textDim }}>{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN HEALTH LAB PAGE
// ══════════════════════════════════════
export default function HealthLabPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const sex = "male";

  const sections = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "blood", label: "Blood Panels", icon: "🩸" },
    { id: "dexa", label: "DEXA / Body Comp", icon: "🦴" },
    { id: "insights", label: "AI Insights", icon: "🧠" },
    { id: "reminders", label: "Reminders", icon: "🔔" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, borderBottom: `1px solid ${C.border}`, background: `${C.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00e5a0, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.bg }}>A</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>APEX</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Dashboard", "Calendar", "Trends", "Boosters", "Health Lab", "Race Planner"].map(item => (
              <button key={item} style={{ background: item === "Health Lab" ? "rgba(0,229,160,0.1)" : "none", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: item === "Health Lab" ? C.accent : C.textDim, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>{item}</button>
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
            <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>Blood panels, DEXA scans, and health data — analyzed by AI in the context of your training.</p>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "none", border: "none", borderBottom: `2px solid ${activeSection === s.id ? C.accent : "transparent"}`, fontSize: 13, fontWeight: activeSection === s.id ? 700 : 500, color: activeSection === s.id ? C.text : C.textDim, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {activeSection === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Upload */}
            <UploadZone />

            {/* Quick stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { label: "Blood Panels", value: mockPanels.length, icon: "🩸", sub: `Latest: ${new Date(mockPanels[mockPanels.length-1].date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` },
                { label: "DEXA Scans", value: mockDexa.length, icon: "🦴", sub: `Latest: ${new Date(mockDexa[mockDexa.length-1].date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` },
                { label: "Biomarkers Tracked", value: Object.keys(biomarkerDB).length, icon: "📊", sub: "All in athlete-optimal context" },
                { label: "Next Test Due", value: `${mockReminders[0].daysUntil}d`, icon: "🔔", sub: mockReminders[0].name },
              ].map((s, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>{s.label}</span>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", margin: "6px 0 2px" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Latest insights */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🧠</span> Latest AI Insights
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mockInsights.slice(0, 3).map(i => <InsightCard key={i.id} insight={i} />)}
              </div>
            </div>

            {/* Upcoming reminders */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🔔</span> Upcoming Tests
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {mockReminders.map((r, i) => <ReminderCard key={i} reminder={r} />)}
              </div>
            </div>
          </div>
        )}

        {/* ═══ BLOOD PANELS ═══ */}
        {activeSection === "blood" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <UploadZone />

            {/* Biomarker grid */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Biomarker Trends</h3>
                <span style={{ fontSize: 11, color: C.textDim }}>{mockPanels.length} panels · {Object.keys(biomarkerDB).length} biomarkers tracked</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {Object.keys(biomarkerDB).map(key => (
                  <BiomarkerTrend key={key} biomarkerKey={key} panels={mockPanels} sex={sex} />
                ))}
              </div>
            </div>

            {/* How to interpret */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>📖 Understanding Your Ranges</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.textSoft }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: C.green }} /> <strong style={{ color: C.text }}>Optimal</strong> — Within athlete-specific optimal range</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: C.amber }} /> <strong style={{ color: C.text }}>In Range</strong> — Within clinical normal, but below athlete optimal</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: C.red }} /> <strong style={{ color: C.text }}>Out of Range</strong> — Outside clinical reference; action needed</div>
              </div>
              <p style={{ fontSize: 11, color: C.textDim, margin: "10px 0 0", lineHeight: 1.6 }}>
                Apex uses athlete-specific optimal ranges based on sports science research, not standard clinical ranges. For example, ferritin is "clinically normal" at 12 ng/mL, but athletes need &gt;35 ng/mL for optimal oxygen transport. Always discuss abnormal results with your physician.
              </p>
            </div>

            {/* Panel history */}
            <PanelHistory panels={mockPanels} />
          </div>
        )}

        {/* ═══ DEXA ═══ */}
        {activeSection === "dexa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <UploadZone />
            <DexaChart data={mockDexa} />

            {/* Individual scan comparison */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>📈 Scan-by-Scan Comparison</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Date", "Body Fat %", "Lean Mass", "Bone Density", "Visceral Fat", "A:G Ratio"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockDexa.map((d, i) => {
                      const prev = i > 0 ? mockDexa[i - 1] : null;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{d.totalBF}%</span>
                            {prev && <span style={{ fontSize: 10, color: d.totalBF < prev.totalBF ? C.green : C.red, marginLeft: 6 }}>{d.totalBF < prev.totalBF ? "↓" : "↑"}{Math.abs(d.totalBF - prev.totalBF).toFixed(1)}%</span>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{d.leanMass}kg</span>
                            {prev && <span style={{ fontSize: 10, color: d.leanMass > prev.leanMass ? C.green : C.red, marginLeft: 6 }}>{d.leanMass > prev.leanMass ? "↑" : "↓"}{Math.abs(d.leanMass - prev.leanMass).toFixed(1)}kg</span>}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{d.boneDensity}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{d.visceralFat}kg</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{d.androidGynoid.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* What DEXA measures */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>📖 What DEXA Measures & Why Athletes Care</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 12, color: C.textSoft, lineHeight: 1.6 }}>
                <div style={{ padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
                  <strong style={{ color: C.text }}>Body Fat %</strong> — More accurate than calipers, bioimpedance, or DEXA alternatives. Competitive male cyclists: 6-15%. Female: 12-22%. Lower isn't always better — underfueling risks RED-S.
                </div>
                <div style={{ padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
                  <strong style={{ color: C.text }}>Lean Mass</strong> — Muscle + organ weight. For cyclists, increasing lean mass while reducing fat improves W/kg. Track regional lean mass to identify muscle imbalances.
                </div>
                <div style={{ padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
                  <strong style={{ color: C.text }}>Bone Density</strong> — Cyclists are at higher risk of osteoporosis (non-weight-bearing sport). DEXA T-score &gt;-1.0 is normal. Strength training and vitamin D help maintain density.
                </div>
                <div style={{ padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
                  <strong style={{ color: C.text }}>Android:Gynoid Ratio</strong> — Trunk fat vs. hip fat distribution. &lt;1.0 is healthier. Decreasing A:G ratio means you're losing fat from the metabolically riskier abdominal region first.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ AI INSIGHTS ═══ */}
        {activeSection === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>🧠 How AI Insights Work</h3>
              <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.6, margin: 0 }}>
                Every time you upload a blood panel or DEXA scan, Apex cross-references your biomarkers with your training data (power, volume, TSS), recovery data (HRV, sleep, readiness), body composition trends, and dietary profile. This produces insights that no single data source could generate alone — like connecting a ferritin drop to an FTP plateau, or linking cortisol spikes to overtraining patterns visible in your Oura data.
              </p>
            </div>
            {mockInsights.map(i => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}

        {/* ═══ REMINDERS ═══ */}
        {activeSection === "reminders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>🔔 Smart Test Reminders</h3>
              <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.6, margin: 0 }}>
                Apex recommends testing cadences based on sports science best practices and your individual needs. Blood panels every 3 months (quarterly) catch seasonal deficiencies and training-related changes. DEXA scans every 6-12 months track body composition trends. VO2max lab tests annually to validate training improvements.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Upcoming</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mockReminders.map((r, i) => <ReminderCard key={i} reminder={r} />)}
              </div>
            </div>

            {/* Recommended testing schedule */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>📅 Recommended Testing Schedule</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  { name: "Comprehensive Blood Panel", freq: "Every 3 months", why: "Catches iron depletion, vitamin D seasonal drops, overtraining hormonal shifts, and inflammation before they impact performance.", icon: "🩸", cost: "$80-200" },
                  { name: "DEXA Body Composition Scan", freq: "Every 6-12 months", why: "Tracks lean mass gain, fat loss distribution, bone density (critical for cyclists), and regional muscle balance.", icon: "🦴", cost: "$75-150" },
                  { name: "VO2max Lab Test", freq: "Annually or at phase transitions", why: "Validates training improvements against gold-standard measurement. Best done at the start and end of your training season.", icon: "🫁", cost: "$100-250" },
                  { name: "Iron Panel Follow-up", freq: "8-12 weeks after supplementation starts", why: "Confirms supplementation is working. Ferritin should increase 10-20 ng/mL per 8 weeks with proper supplementation.", icon: "💊", cost: "$30-60" },
                ].map((t, i) => (
                  <div key={i} style={{ padding: "16px", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{t.freq}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.5, margin: "0 0 6px" }}>{t.why}</p>
                    <div style={{ fontSize: 10, color: C.textDim }}>Estimated cost: {t.cost}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-test instructions */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>📋 Pre-Test Instructions (for accurate results)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 12, color: C.textSoft }}>
                {[
                  { rule: "Fast 10-12 hours before blood draw", why: "Glucose, insulin, and lipid panels require fasting for accuracy" },
                  { rule: "Hydrate well (500ml water before)", why: "Dehydration concentrates blood, artificially inflating hemoglobin and hematocrit" },
                  { rule: "No exercise 24h before", why: "Training elevates CK, cortisol, and inflammatory markers — gives false overtraining signal" },
                  { rule: "Morning draw (before 10 AM)", why: "Cortisol and testosterone follow circadian rhythms — morning values are most informative" },
                  { rule: "Note your menstrual cycle day", why: "Iron, estradiol, FSH, and LH vary significantly across cycle phases" },
                  { rule: "Avoid supplements morning of", why: "Iron, B12, and vitamin D supplements can spike levels artificially for 6-8 hours" },
                ].map((r, i) => (
                  <div key={i} style={{ padding: "12px", background: C.surface, borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>{r.rule}</div>
                    <div style={{ lineHeight: 1.5 }}>{r.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "20px 32px", background: C.surface, marginTop: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6, margin: 0 }}>
            ⚕️ Apex Health Lab is not a diagnostic tool and does not provide medical advice. All biomarker analysis uses athlete-optimized reference ranges for educational context. Abnormal results should always be discussed with your physician or sports medicine doctor. AI insights cross-reference your training, recovery, and health data to identify patterns — they do not replace professional medical evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}

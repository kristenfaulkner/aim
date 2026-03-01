import { T } from "../theme/tokens";

// ── BIOMARKER DATABASE ──
// Clinical range = standard lab range. Athlete optimal = evidence-based for endurance athletes.
export const biomarkerDB = {
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
export const mockPanels = [
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
export const mockDexa = [
  { date: "2024-12-01", totalBF: 18.2, leanMass: 72.9, boneDensity: 1.28, visceralFat: 0.8, androidGynoid: 0.82 },
  { date: "2025-06-15", totalBF: 16.1, leanMass: 74.6, boneDensity: 1.30, visceralFat: 0.6, androidGynoid: 0.78 },
  { date: "2025-12-10", totalBF: 14.8, leanMass: 75.7, boneDensity: 1.31, visceralFat: 0.5, androidGynoid: 0.75 },
];

// ── MOCK DATA: AI Insights ──
export const mockInsights = [
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
export const mockReminders = [
  { type: "blood", name: "Quarterly Blood Panel", lastDone: "2025-12-05", nextDue: "2026-03-05", status: "upcoming", daysUntil: 4 },
  { type: "dexa", name: "Annual DEXA Scan", lastDone: "2025-12-10", nextDue: "2026-06-10", status: "scheduled", daysUntil: 101 },
  { type: "blood", name: "Iron Recheck (Follow-up)", lastDone: "2025-12-05", nextDue: "2026-03-05", status: "upcoming", daysUntil: 4 },
  { type: "vo2", name: "VO2max Lab Test", lastDone: "2025-06-20", nextDue: "2026-06-20", status: "scheduled", daysUntil: 111 },
];

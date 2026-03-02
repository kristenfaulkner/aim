import { T } from "../theme/tokens";

// ── BIOMARKER DATABASE ──
// Clinical range = standard lab range. Athlete optimal = evidence-based for endurance athletes.
// dbColumn = matching column name in blood_panels table (null if no dedicated column).
export const biomarkerDB = {
  // ═══════════════════════════════════════
  // IRON & OXYGEN
  // ═══════════════════════════════════════
  ferritin: {
    dbColumn: "ferritin_ng_ml",
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
  hemoglobin: {
    dbColumn: "hemoglobin_g_dl",
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
  iron: {
    dbColumn: "iron_mcg_dl",
    name: "Serum Iron",
    unit: "mcg/dL",
    category: "Iron & Oxygen",
    icon: "🔩",
    clinicalRange: { male: [65, 175], female: [50, 170] },
    athleteOptimal: { male: [80, 150], female: [70, 140] },
    dangerLow: { male: 50, female: 40 },
    whyItMatters: "Serum iron measures the amount of circulating iron in your blood. It fluctuates throughout the day and with meals, so it's best interpreted alongside ferritin and TIBC. Low serum iron with low ferritin confirms iron deficiency.",
    linkedMetrics: ["Ferritin", "TIBC", "Transferrin Saturation", "Hemoglobin"],
    actionLow: "Low serum iron often accompanies low ferritin. Increase dietary iron intake and consider supplementation. Best absorbed on an empty stomach with vitamin C. Retest fasting in the morning for consistency.",
    actionHigh: "Elevated serum iron can occur after iron supplementation or red meat consumption. If persistently high with elevated ferritin, consult physician to rule out hemochromatosis.",
  },
  tibc: {
    dbColumn: "tibc_mcg_dl",
    name: "TIBC",
    unit: "mcg/dL",
    category: "Iron & Oxygen",
    icon: "🔗",
    clinicalRange: { male: [250, 370], female: [250, 370] },
    athleteOptimal: { male: [260, 350], female: [260, 350] },
    dangerLow: { male: 200, female: 200 },
    whyItMatters: "Total Iron Binding Capacity measures how much iron your blood can carry. High TIBC with low ferritin strongly suggests iron deficiency — your body is making more transporters because it needs iron. Low TIBC can indicate chronic disease or iron overload.",
    linkedMetrics: ["Ferritin", "Serum Iron", "Transferrin Saturation"],
    actionLow: "Low TIBC may indicate chronic inflammation, liver disease, or iron overload. Cross-reference with ferritin and CRP. Consult physician if persistently low.",
    actionHigh: "High TIBC is a classic sign of iron deficiency. Your body is upregulating iron transport capacity. Address iron deficiency with supplementation and dietary changes.",
  },
  transferrinSat: {
    dbColumn: "transferrin_sat_pct",
    name: "Transferrin Saturation",
    unit: "%",
    category: "Iron & Oxygen",
    icon: "📊",
    clinicalRange: { male: [20, 50], female: [20, 50] },
    athleteOptimal: { male: [25, 45], female: [25, 45] },
    dangerLow: { male: 16, female: 16 },
    whyItMatters: "Transferrin saturation shows what percentage of your iron-carrying capacity is being used. Below 20% strongly indicates iron deficiency even if ferritin appears normal. It's one of the earliest markers of depleting iron stores.",
    linkedMetrics: ["Ferritin", "Serum Iron", "TIBC", "Hemoglobin"],
    actionLow: "Transferrin saturation <20% indicates functional iron deficiency. Iron supplementation is strongly indicated. Take elemental iron with vitamin C on an empty stomach. Retest in 8 weeks.",
    actionHigh: "Saturation >50% warrants investigation for hemochromatosis, especially if ferritin is also elevated. Consult physician.",
  },

  // ═══════════════════════════════════════
  // VITAMINS
  // ═══════════════════════════════════════
  vitaminD: {
    dbColumn: "vitamin_d_ng_ml",
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
  vitB12: {
    dbColumn: "vitamin_b12_pg_ml",
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
  folate: {
    dbColumn: "folate_ng_ml",
    name: "Folate",
    unit: "ng/mL",
    category: "Vitamins",
    icon: "🥬",
    clinicalRange: { male: [2.7, 17.0], female: [2.7, 17.0] },
    athleteOptimal: { male: [5.0, 15.0], female: [5.0, 15.0] },
    dangerLow: { male: 3.0, female: 3.0 },
    whyItMatters: "Folate (vitamin B9) is essential for DNA synthesis, red blood cell formation, and cell division. Low folate impairs red blood cell production and can cause megaloblastic anemia. Critical for female athletes planning pregnancy.",
    linkedMetrics: ["RBC production", "Hemoglobin", "Homocysteine", "Recovery"],
    actionLow: "Increase folate-rich foods: leafy greens, legumes, citrus fruits, fortified grains. Supplement with 400-800 mcg methylfolate daily if diet is insufficient. Retest in 8 weeks.",
    actionHigh: "High folate from food is not a concern. Very high supplemental folate (>1000 mcg) can mask B12 deficiency — ensure B12 is adequate.",
  },

  // ═══════════════════════════════════════
  // HORMONES
  // ═══════════════════════════════════════
  testosterone: {
    dbColumn: "testosterone_ng_dl",
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
    dbColumn: "cortisol_mcg_dl",
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

  // ═══════════════════════════════════════
  // THYROID
  // ═══════════════════════════════════════
  tsh: {
    dbColumn: "tsh_miu_l",
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
  freeT3: {
    dbColumn: "free_t3_pg_ml",
    name: "Free T3",
    unit: "pg/mL",
    category: "Thyroid",
    icon: "🦋",
    clinicalRange: { male: [2.0, 4.4], female: [2.0, 4.4] },
    athleteOptimal: { male: [2.5, 4.0], female: [2.5, 4.0] },
    dangerLow: { male: 2.0, female: 2.0 },
    whyItMatters: "Free T3 is the active thyroid hormone that drives metabolism. Low Free T3 with normal TSH is common in underfueled athletes (low T3 syndrome / euthyroid sick syndrome). It's the earliest thyroid marker to drop during energy deficiency.",
    linkedMetrics: ["Metabolic rate", "Body temperature", "Energy", "Recovery"],
    actionLow: "Low Free T3 often signals insufficient caloric intake relative to training. Increase daily calories by 300-500, especially carbohydrates. Reduce training volume temporarily. Retest in 6-8 weeks.",
    actionHigh: "Elevated Free T3 may indicate hyperthyroidism. Consult endocrinologist for further evaluation.",
  },
  freeT4: {
    dbColumn: "free_t4_ng_dl",
    name: "Free T4",
    unit: "ng/dL",
    category: "Thyroid",
    icon: "🦋",
    clinicalRange: { male: [0.82, 1.77], female: [0.82, 1.77] },
    athleteOptimal: { male: [1.0, 1.5], female: [1.0, 1.5] },
    dangerLow: { male: 0.8, female: 0.8 },
    whyItMatters: "Free T4 is the precursor thyroid hormone that converts to active T3. Interpret alongside TSH and Free T3 for a complete thyroid picture. Low Free T4 with high TSH suggests primary hypothyroidism.",
    linkedMetrics: ["TSH", "Free T3", "Metabolic rate"],
    actionLow: "Low Free T4 with elevated TSH warrants endocrinology consultation. May indicate subclinical or overt hypothyroidism.",
    actionHigh: "Elevated Free T4 with low TSH suggests hyperthyroidism. Consult endocrinologist.",
  },

  // ═══════════════════════════════════════
  // INFLAMMATION
  // ═══════════════════════════════════════
  hsCRP: {
    dbColumn: "crp_mg_l",
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

  // ═══════════════════════════════════════
  // MUSCLE DAMAGE
  // ═══════════════════════════════════════
  creatineKinase: {
    dbColumn: null,
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

  // ═══════════════════════════════════════
  // METABOLIC
  // ═══════════════════════════════════════
  hba1c: {
    dbColumn: "hba1c_pct",
    name: "HbA1c",
    unit: "%",
    category: "Metabolic",
    icon: "🍩",
    clinicalRange: { male: [4.0, 5.6], female: [4.0, 5.6] },
    athleteOptimal: { male: [4.2, 5.3], female: [4.2, 5.3] },
    dangerLow: { male: 3.5, female: 3.5 },
    whyItMatters: "HbA1c reflects average blood sugar over the past 2-3 months. Endurance athletes typically have excellent glucose control, but chronically low values (<4.0%) may indicate underfueling. Levels >5.7% suggest prediabetes and impaired glucose metabolism.",
    linkedMetrics: ["Fueling strategy", "Recovery quality", "Body composition"],
    actionLow: "Very low HbA1c (<4.0%) may indicate chronic underfueling or frequent hypoglycemia during training. Increase carbohydrate intake around workouts.",
    actionHigh: "HbA1c 5.7-6.4% indicates prediabetes. Increase exercise (which you likely already do), reduce refined sugars, and increase fiber intake. If >6.5%, consult physician.",
  },

  // ═══════════════════════════════════════
  // LIPIDS
  // ═══════════════════════════════════════
  totalCholesterol: {
    dbColumn: "total_cholesterol_mg_dl",
    name: "Total Cholesterol",
    unit: "mg/dL",
    category: "Lipids",
    icon: "❤️",
    clinicalRange: { male: [125, 200], female: [125, 200] },
    athleteOptimal: { male: [140, 200], female: [140, 200] },
    dangerLow: { male: 120, female: 120 },
    whyItMatters: "Total cholesterol includes HDL, LDL, and VLDL. In endurance athletes, total cholesterol is less informative than the HDL:LDL ratio. Very low total cholesterol (<120) in athletes may indicate hormonal issues or underfueling.",
    linkedMetrics: ["HDL", "LDL", "Triglycerides", "Testosterone"],
    actionLow: "Very low cholesterol can impair hormone production (testosterone, cortisol). Ensure adequate dietary fat intake (25-35% of calories).",
    actionHigh: "If >240 mg/dL: check HDL and LDL breakdown. High total cholesterol with high HDL is less concerning. Increase omega-3s, fiber, and plant sterols.",
  },
  ldl: {
    dbColumn: "ldl_mg_dl",
    name: "LDL Cholesterol",
    unit: "mg/dL",
    category: "Lipids",
    icon: "⬇️",
    clinicalRange: { male: [0, 100], female: [0, 100] },
    athleteOptimal: { male: [40, 100], female: [40, 100] },
    dangerLow: { male: 30, female: 30 },
    whyItMatters: "LDL carries cholesterol to arteries. Endurance exercise typically lowers LDL and shifts particles toward the less harmful large-buoyant type. Very low LDL (<40) may correlate with reduced steroid hormone production.",
    linkedMetrics: ["Total Cholesterol", "HDL", "Cardiovascular risk"],
    actionLow: "Very low LDL is uncommon and may indicate malabsorption or underfueling. Ensure adequate caloric and fat intake.",
    actionHigh: "If >130 mg/dL: increase soluble fiber (oats, beans), omega-3 fatty acids, and plant sterols. Reduce saturated fat intake. Regular endurance exercise is one of the most effective LDL-lowering interventions.",
  },
  hdl: {
    dbColumn: "hdl_mg_dl",
    name: "HDL Cholesterol",
    unit: "mg/dL",
    category: "Lipids",
    icon: "⬆️",
    clinicalRange: { male: [40, 100], female: [50, 100] },
    athleteOptimal: { male: [55, 90], female: [65, 100] },
    dangerLow: { male: 40, female: 50 },
    whyItMatters: "HDL removes cholesterol from arteries — higher is generally better. Endurance athletes typically have elevated HDL (60-90+), which is cardioprotective. Low HDL despite regular exercise may indicate metabolic issues.",
    linkedMetrics: ["Total Cholesterol", "LDL", "Cardiovascular health"],
    actionLow: "Low HDL despite regular exercise is unusual. Increase dietary omega-3s (fatty fish, walnuts, flaxseed). Ensure adequate sleep and manage stress. Moderate alcohol consumption (1 drink/day) has been associated with higher HDL.",
    actionHigh: "High HDL is generally protective. Very high HDL (>100) is common in endurance athletes and not a concern.",
  },
  triglycerides: {
    dbColumn: "triglycerides_mg_dl",
    name: "Triglycerides",
    unit: "mg/dL",
    category: "Lipids",
    icon: "🫀",
    clinicalRange: { male: [0, 150], female: [0, 150] },
    athleteOptimal: { male: [30, 100], female: [30, 100] },
    dangerLow: { male: 20, female: 20 },
    whyItMatters: "Triglycerides reflect how your body stores excess calories as fat. Endurance athletes typically have low triglycerides due to high fat oxidation during training. Elevated triglycerides (>150) suggest excessive carbohydrate/sugar intake or metabolic dysfunction.",
    linkedMetrics: ["Fueling strategy", "Body composition", "Insulin sensitivity"],
    actionLow: "Very low triglycerides are common in well-trained endurance athletes and generally not a concern.",
    actionHigh: "If >150: reduce refined carbohydrates and sugars, increase omega-3s, and limit alcohol. Fasted blood draw is essential — non-fasted samples are artificially elevated.",
  },

  // ═══════════════════════════════════════
  // KIDNEY
  // ═══════════════════════════════════════
  creatinine: {
    dbColumn: "creatinine_mg_dl",
    name: "Creatinine",
    unit: "mg/dL",
    category: "Kidney",
    icon: "🫘",
    clinicalRange: { male: [0.74, 1.35], female: [0.59, 1.04] },
    athleteOptimal: { male: [0.8, 1.3], female: [0.6, 1.0] },
    dangerLow: { male: 0.5, female: 0.4 },
    whyItMatters: "Creatinine is a waste product of muscle metabolism filtered by the kidneys. Athletes often have slightly elevated creatinine due to higher muscle mass — this is normal. Persistently high creatinine may indicate dehydration or kidney stress from NSAIDs.",
    linkedMetrics: ["Hydration", "Muscle mass", "Kidney function"],
    actionLow: "Low creatinine may indicate low muscle mass or liver issues. Rare in athletes.",
    actionHigh: "Mildly elevated creatinine in muscular athletes is normal. If >1.5 mg/dL: ensure adequate hydration, avoid chronic NSAID use, and retest. Persistently elevated values warrant kidney function assessment (GFR).",
  },
  bun: {
    dbColumn: "bun_mg_dl",
    name: "BUN",
    unit: "mg/dL",
    category: "Kidney",
    icon: "🫘",
    clinicalRange: { male: [6, 20], female: [6, 20] },
    athleteOptimal: { male: [8, 18], female: [7, 16] },
    dangerLow: { male: 5, female: 5 },
    whyItMatters: "Blood Urea Nitrogen reflects protein metabolism and kidney function. Athletes on high-protein diets may have mildly elevated BUN. The BUN:creatinine ratio helps differentiate dehydration (ratio >20:1) from kidney issues.",
    linkedMetrics: ["Protein intake", "Hydration", "Kidney function", "Creatinine"],
    actionLow: "Low BUN may indicate inadequate protein intake. Athletes need 1.2-2.0g protein per kg of body weight daily.",
    actionHigh: "If elevated: check hydration status first (dehydration raises BUN). If well-hydrated and BUN persists >25, consider reducing protein intake or consulting physician.",
  },

  // ═══════════════════════════════════════
  // LIVER
  // ═══════════════════════════════════════
  alt: {
    dbColumn: "alt_u_l",
    name: "ALT",
    unit: "U/L",
    category: "Liver",
    icon: "🫁",
    clinicalRange: { male: [7, 56], female: [7, 45] },
    athleteOptimal: { male: [10, 40], female: [10, 35] },
    dangerLow: { male: 5, female: 5 },
    whyItMatters: "ALT (alanine aminotransferase) is primarily a liver enzyme. Mild elevations in athletes can occur after intense exercise or from muscle damage (cross-reacts with CK). Persistent elevation suggests liver stress — check alcohol, supplements, and medications.",
    linkedMetrics: ["AST", "CK", "Supplement use", "Alcohol intake"],
    actionLow: "Low ALT is generally not concerning.",
    actionHigh: "If elevated: first rule out exercise-induced elevation (retest after 48h rest). If persistently >50: review supplement stack (especially pre-workouts, fat burners), reduce alcohol, and consult physician. Some supplements can be hepatotoxic.",
  },
  ast: {
    dbColumn: "ast_u_l",
    name: "AST",
    unit: "U/L",
    category: "Liver",
    icon: "🫁",
    clinicalRange: { male: [10, 40], female: [9, 32] },
    athleteOptimal: { male: [12, 35], female: [10, 30] },
    dangerLow: { male: 8, female: 7 },
    whyItMatters: "AST is found in liver AND muscle tissue. In athletes, elevated AST often reflects muscle damage rather than liver issues. Compare with ALT — if both are elevated, liver is more likely the cause. If only AST is high, it's probably muscular.",
    linkedMetrics: ["ALT", "CK", "Training load", "Recovery"],
    actionLow: "Low AST is not concerning.",
    actionHigh: "If AST is elevated but ALT is normal → likely exercise-induced muscle damage (similar to elevated CK). If both AST and ALT are elevated → investigate liver causes. Retest after 48-72h of rest.",
  },

  // ═══════════════════════════════════════
  // MINERALS
  // ═══════════════════════════════════════
  magnesium: {
    dbColumn: "magnesium_mg_dl",
    name: "Magnesium",
    unit: "mg/dL",
    category: "Minerals",
    icon: "🧲",
    clinicalRange: { male: [1.7, 2.2], female: [1.7, 2.2] },
    athleteOptimal: { male: [1.9, 2.2], female: [1.9, 2.2] },
    dangerLow: { male: 1.5, female: 1.5 },
    whyItMatters: "Magnesium is critical for muscle contraction, energy production, and sleep quality. Endurance athletes lose magnesium through sweat and may need 10-20% more than sedentary adults. Low magnesium causes muscle cramps, poor sleep, and impaired recovery.",
    linkedMetrics: ["Sleep quality", "Muscle cramps", "HRV", "Recovery"],
    actionLow: "Supplement with 200-400mg magnesium glycinate or citrate before bed. Increase dietary sources: dark chocolate, nuts, spinach, avocado. Magnesium glycinate is preferred for sleep benefits.",
    actionHigh: "High serum magnesium is rare from dietary sources. If supplementing, reduce dose. Very high levels (>3.0) can cause cardiac issues.",
  },
  zinc: {
    dbColumn: "zinc_mcg_dl",
    name: "Zinc",
    unit: "mcg/dL",
    category: "Minerals",
    icon: "⚙️",
    clinicalRange: { male: [60, 120], female: [60, 120] },
    athleteOptimal: { male: [70, 110], female: [70, 110] },
    dangerLow: { male: 55, female: 55 },
    whyItMatters: "Zinc supports immune function, testosterone production, and wound healing. Athletes lose zinc through sweat and may have higher requirements. Low zinc is associated with frequent illness, slow recovery, and reduced testosterone.",
    linkedMetrics: ["Immune function", "Testosterone", "Recovery", "Wound healing"],
    actionLow: "Supplement with 15-30mg zinc picolinate daily (take with food to avoid nausea). Increase dietary zinc: oysters, red meat, pumpkin seeds, chickpeas. Don't exceed 40mg/day — excess zinc depletes copper.",
    actionHigh: "High zinc supplementation (>40mg/day) can deplete copper and interfere with iron absorption. Reduce supplementation to 15mg daily.",
  },
};

// ── MAPPING HELPERS ──

// Map DB column name → biomarkerDB key (for reading from Supabase)
export const DB_COLUMN_TO_KEY = Object.fromEntries(
  Object.entries(biomarkerDB)
    .filter(([, v]) => v.dbColumn)
    .map(([k, v]) => [v.dbColumn, k])
);

// Map biomarkerDB key → DB column name (for writing to Supabase)
export const KEY_TO_DB_COLUMN = Object.fromEntries(
  Object.entries(biomarkerDB)
    .filter(([, v]) => v.dbColumn)
    .map(([k, v]) => [k, v.dbColumn])
);

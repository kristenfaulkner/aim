import { useState, useRef, useEffect } from "react";

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
  // Category accent colors
  supplement: "#00e5a0",   // green — supplements
  protocol: "#f59e0b",     // amber — protocols/lifestyle
  training: "#3b82f6",     // blue — training methods
  nutrition: "#ec4899",    // pink — nutrition
  recovery: "#8b5cf6",     // purple — recovery
};

const catColors = { supplement: C.supplement, protocol: C.protocol, training: C.training, nutrition: C.nutrition, recovery: C.recovery };
const catLabels = { supplement: "Supplements", protocol: "Protocols", training: "Training", nutrition: "Nutrition", recovery: "Recovery" };

// ── BOOSTERS DATABASE ──
const boosters = [
  {
    id: "protein",
    title: "Post-Ride Protein",
    subtitle: "20-40g within 30 min of finishing",
    category: "nutrition",
    confidence: "strong",
    icon: "🥤",
    summary: "The single most important recovery habit. Fast-absorbing protein kickstarts muscle repair when your body is most receptive.",
    mechanism: "Whey protein is rapidly digested and rich in leucine (~10-12% by weight), the key amino acid that activates mTOR signaling to initiate muscle protein synthesis. Post-exercise, there's a heightened sensitivity to amino acids where protein intake maximally stimulates repair of exercise-induced muscle damage. For endurance athletes, protein combined with carbohydrates accelerates glycogen resynthesis compared to carbs alone.",
    protocol: [
      "20-40g protein within 30-60 min post-ride",
      "Combine with 40-80g carbs for optimal glycogen recovery",
      "Whey isolate is fastest-absorbing; casein is better before bed",
      "Plant-based: pea + rice blend with ≥2.5g leucine per serving",
    ],
    risks: [
      "Minimal risks at recommended doses",
      "Whey concentrate (not isolate) may cause GI issues in lactose-intolerant athletes",
      "Excessive protein (>2.5g/kg/day) offers no additional benefit and strains kidneys in those with pre-existing conditions",
    ],
    dietary: {
      vegan: "Pea + rice protein blend provides a complete amino acid profile. Look for blends with added leucine (≥2.5g per serving).",
      lactose: "Whey protein isolate has negligible lactose. Or use plant-based alternatives.",
      general: "Any high-quality protein source works — Greek yogurt, cottage cheese, or a shake.",
    },
    recipes: [
      { name: "Classic Recovery Shake", ingredients: "30g whey, 1 banana, 200ml milk, 1 tbsp honey, ice", time: "2 min" },
      { name: "Chocolate PB Power", ingredients: "30g chocolate whey, 1 tbsp peanut butter, 200ml oat milk, ice", time: "2 min" },
      { name: "Vegan Recovery Bowl", ingredients: "30g pea protein, 1 cup frozen berries, 1 tbsp almond butter, 200ml coconut water", time: "3 min" },
      { name: "Quick & Dirty", ingredients: "30g whey + 300ml water. Shake. Done.", time: "30 sec" },
    ],
    studies: [
      { authors: "Morton et al.", year: 2018, journal: "British Journal of Sports Medicine", title: "Protein supplementation and resistance training-induced gains in muscle mass", url: "https://pubmed.ncbi.nlm.nih.gov/28698222/", finding: "Meta-analysis: protein supplementation significantly augments resistance training adaptations" },
      { authors: "Beelen et al.", year: 2010, journal: "Int J Sport Nutr Exerc Metab", title: "Nutritional strategies to promote postexercise recovery", url: "https://pubmed.ncbi.nlm.nih.gov/21116024/", finding: "Post-exercise protein + carbs accelerates glycogen resynthesis vs. carbs alone" },
    ],
  },
  {
    id: "creatine",
    title: "Creatine Monohydrate",
    subtitle: "5g daily — no loading phase needed",
    category: "supplement",
    confidence: "strong-sprint",
    icon: "⚡",
    summary: "The most studied supplement in sports science. Strong evidence for sprint power and repeated efforts; mixed evidence for pure endurance.",
    mechanism: "Creatine saturates phosphocreatine (PCr) stores, enabling faster ATP resynthesis during repeated high-intensity efforts — attacks, sprints, and surges. It also enhances glycogen resynthesis when co-ingested with carbs, and emerging research suggests cognitive benefits during fatigued states. However, a 2023 meta-analysis found it ineffective for steady-state endurance performance in trained athletes.",
    protocol: [
      "5g creatine monohydrate daily (no cycling or loading needed)",
      "Take with post-ride shake or meal for better absorption",
      "Co-ingest with carbohydrates to enhance uptake",
      "Takes ~28 days of consistent use to saturate stores",
      "Use Creapure or NSF/Informed Sport certified brands",
    ],
    risks: [
      "1-2kg weight gain from water retention — may hurt W/kg for pure climbers",
      "GI discomfort if taken on empty stomach (rare)",
      "Not effective for steady-state endurance (meta-analysis: p=0.47, trivial effect)",
      "Quality varies — only buy certified products",
    ],
    dietary: {
      vegan: "You likely have lower baseline creatine stores (creatine is found primarily in meat). You may be a particularly strong responder.",
      general: "Creatine monohydrate is the only form with robust evidence. Skip 'buffered' or 'HCl' variants.",
    },
    recipes: [],
    studies: [
      { authors: "Fernández-Landa et al.", year: 2023, journal: "Sports Medicine", title: "Effects of Creatine on Endurance Performance: Systematic Review", url: "https://pubmed.ncbi.nlm.nih.gov/36877404/", finding: "Ineffective for endurance in trained populations (SMD = -0.07)" },
      { authors: "Forbes et al.", year: 2023, journal: "JISSN", title: "Creatine and endurance: surges and sprints to win the race", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10132248/", finding: "Beneficial for repeated surges, finishing sprints, and glycogen resynthesis" },
      { authors: "Kreider et al.", year: 2017, journal: "JISSN", title: "ISSN Position Stand: Safety and efficacy of creatine", url: "https://pubmed.ncbi.nlm.nih.gov/28615996/", finding: "Most effective ergogenic supplement for high-intensity exercise" },
    ],
  },
  {
    id: "sauna",
    title: "Sauna Protocol",
    subtitle: "20-30 min at 80-100°C, 3-4× per week",
    category: "protocol",
    confidence: "strong",
    icon: "🧖",
    summary: "Post-exercise sauna bathing expands plasma volume, improves cardiovascular efficiency, and mimics altitude training adaptations.",
    mechanism: "The primary mechanism is plasma volume expansion. Your body responds to repeated heat stress by increasing blood volume, which improves stroke volume and reduces heart rate at a given workload. In the landmark Scoon et al. (2007) study, 12 post-training sauna sessions over 3 weeks produced a 32% increase in time to exhaustion, 7.1% plasma volume expansion, and ~2% endurance time trial improvement. A 2014 cyclist study found significant plasma volume expansion after just 4 exposures.",
    protocol: [
      "Immediately post-training (within 30 min of finishing)",
      "Start at 15 min, progress to 25-30 min over first week",
      "Temperature: 80-100°C dry sauna (not steam room)",
      "Hydrate: 500ml water + electrolytes before entering",
      "Weigh before/after — replace 150% of fluid lost",
      "3-4 sessions per week for minimum 2-3 weeks",
      "2-5 min cold shower after to aid recovery",
    ],
    risks: [
      "Dehydration if fluid intake is inadequate — negates all benefits",
      "Don't sauna the night before a key workout or race (acute fatigue persists 12-24h)",
      "Heat exhaustion risk if sessions are too long or too hot initially",
      "May elevate resting HR for 12-24h — can confuse HRV tracking",
      "Not recommended during illness or if you have cardiovascular conditions (consult physician)",
    ],
    dietary: {},
    recipes: [],
    studies: [
      { authors: "Scoon et al.", year: 2007, journal: "J Sci Med Sport", title: "Post-exercise sauna bathing and endurance performance", url: "https://pubmed.ncbi.nlm.nih.gov/16877041/", finding: "32% ↑ time to exhaustion, 7.1% ↑ plasma volume, ~2% TT improvement" },
      { authors: "Stanley et al.", year: 2015, journal: "Scand J Med Sci Sports", title: "Sauna-based heat acclimation and plasma volume", url: "https://pubmed.ncbi.nlm.nih.gov/25432420/", finding: "Plasma volume expanded significantly after just 4 post-training sauna sessions" },
      { authors: "Laukkanen & Kunutsor", year: 2024, journal: "Temperature", title: "Benefits of passive heat therapies for healthspan", url: "https://www.tandfonline.com/doi/full/10.1080/23328940.2023.2300623", finding: "Comprehensive review: cardiovascular, anti-inflammatory, and longevity benefits" },
    ],
  },
  {
    id: "altitude",
    title: "Altitude Training",
    subtitle: "Live high / train low — or simulated altitude",
    category: "protocol",
    confidence: "strong",
    icon: "🏔️",
    summary: "Exposure to reduced oxygen stimulates EPO production and red blood cell mass, increasing oxygen-carrying capacity and VO2max.",
    mechanism: "At altitude (>2,000m / 6,500ft), reduced partial pressure of oxygen triggers hypoxia-inducible factor (HIF) pathways, stimulating erythropoietin (EPO) production by the kidneys. Over 2-4 weeks, this increases red blood cell mass and hemoglobin concentration, improving oxygen delivery to muscles. The 'live high, train low' (LHTL) model is considered optimal: sleep at altitude for the EPO stimulus while training at lower elevation to maintain workout intensity.",
    protocol: [
      "Live High / Train Low: Sleep at 2,000-2,500m, train below 1,200m",
      "Minimum 12-14 hours/day at altitude for EPO stimulus",
      "Duration: 3-4 weeks for meaningful red cell mass increase",
      "Simulated altitude: Altitude tent at 2,500-3,000m equivalent for sleep",
      "Intermittent hypoxic training (IHT): breathing low-O₂ air during specific sessions",
      "Iron supplementation often necessary (ferritin >30 ng/mL before starting)",
      "Allow 2-3 weeks post-altitude for full adaptation before target race",
    ],
    risks: [
      "Acute mountain sickness (AMS) above 2,500m — headache, nausea, fatigue",
      "Sleep quality suffers significantly at altitude (lower SpO₂, more arousals)",
      "Training intensity may need to be reduced 5-10% at altitude to maintain quality",
      "Expensive: altitude tents cost $3,000-$7,000; camps require travel",
      "Individual response varies enormously — some athletes are 'non-responders'",
      "Iron deficiency blunts the EPO response — test ferritin before starting",
      "Dehydration risk is higher at altitude (increased respiratory water loss)",
    ],
    dietary: {
      general: "Increase iron intake (red meat, spinach, vitamin C to aid absorption). Supplement with iron if ferritin <50 ng/mL. Stay aggressively hydrated.",
      vegan: "Plant-based iron (spinach, lentils, fortified cereals) with vitamin C to enhance absorption. Consider iron supplementation — vegan athletes have higher rates of deficiency.",
    },
    recipes: [],
    studies: [
      { authors: "Millet et al.", year: 2010, journal: "Sports Medicine", title: "Combining Hypoxic Methods for Peak Performance", url: "https://pubmed.ncbi.nlm.nih.gov/20199121/", finding: "LHTL is the most effective altitude model for sea-level performance" },
      { authors: "Chapman et al.", year: 2014, journal: "J Applied Physiology", title: "Defining the dose of altitude training", url: "https://pubmed.ncbi.nlm.nih.gov/24876357/", finding: "≥14h/day at 2,000-2,500m for 4 weeks optimizes EPO response" },
      { authors: "Saunders et al.", year: 2009, journal: "Sports Medicine", title: "Endurance training and altitude: current understandings", url: "https://pubmed.ncbi.nlm.nih.gov/19453205/", finding: "1-3% performance improvement in elite athletes from LHTL" },
    ],
  },
  {
    id: "caffeine",
    title: "Caffeine Timing",
    subtitle: "3-6 mg/kg, 30-60 min before key efforts",
    category: "supplement",
    confidence: "strong",
    icon: "☕",
    summary: "One of the most well-studied ergogenic aids. Consistently shows 2-4% improvement in endurance performance across meta-analyses.",
    mechanism: "Caffeine blocks adenosine receptors in the brain, reducing perceived exertion and delaying the sensation of fatigue. It also increases catecholamine release, enhances neuromuscular function, and promotes free fatty acid mobilization (sparing glycogen). The performance effect is dose-dependent up to ~6mg/kg, beyond which side effects increase without additional benefit.",
    protocol: [
      "3-6 mg/kg body weight, 30-60 min before effort",
      "For 89kg rider: ~270-530mg (2-4 cups of coffee)",
      "Start with lower dose to assess tolerance",
      "Consider caffeine-fasting 5-7 days before target race to restore sensitivity",
      "Can be taken as coffee, caffeine pills, gels, or gum (gum absorbs fastest)",
    ],
    risks: [
      "GI distress at higher doses, especially during hard efforts",
      "Insomnia if taken after 2 PM (half-life: 5-6 hours) — Oura will confirm this",
      "Habitual users develop tolerance — effectiveness decreases with daily use",
      "Anxiety, jitteriness, elevated HR in caffeine-sensitive individuals",
      "Slow metabolizers (CYP1A2 gene variant) may not benefit and may experience more side effects",
    ],
    dietary: {},
    recipes: [
      { name: "Pre-Ride Espresso Shot", ingredients: "Double espresso + pinch of salt + 5g honey", time: "2 min" },
      { name: "Cold Brew Concentrate", ingredients: "100g coarse coffee, 500ml cold water, steep 12-18h, strain", time: "30 sec (prep night before)" },
    ],
    studies: [
      { authors: "Guest et al.", year: 2021, journal: "JISSN", title: "ISSN position stand: caffeine and exercise performance", url: "https://pubmed.ncbi.nlm.nih.gov/33388079/", finding: "Strong evidence for 2-4% endurance improvement at 3-6mg/kg" },
      { authors: "Southward et al.", year: 2018, journal: "Sports Medicine", title: "Caffeine and endurance: systematic review and meta-analysis", url: "https://pubmed.ncbi.nlm.nih.gov/29876876/", finding: "Significant improvement in time trial and time to exhaustion" },
    ],
  },
  {
    id: "beetroot",
    title: "Beetroot Juice (Nitrate)",
    subtitle: "6.4 mmol nitrate, 2-3 hours pre-race",
    category: "nutrition",
    confidence: "strong",
    icon: "🥤",
    summary: "Dietary nitrate reduces oxygen cost of exercise by 3-5% via nitric oxide pathways. One of the few supplements proven in well-trained cyclists.",
    mechanism: "Dietary nitrate is converted to nitric oxide (NO) via the enterosalivary pathway. NO improves mitochondrial efficiency, reduces the oxygen cost of submaximal exercise, and enhances muscle contractile function by improving calcium handling in type II muscle fibers. The effect is most pronounced during high-intensity efforts where type II fibers are heavily recruited.",
    protocol: [
      "Acute dose: 1 concentrated beetroot shot (~6.4 mmol nitrate) 2-3h before racing",
      "Multi-day loading: 1 shot per day for 3-6 days before target event",
      "Avoid mouthwash on dosing days (kills oral bacteria needed for nitrate conversion)",
      "Avoid combining with high-dose vitamin C (may interfere with conversion)",
    ],
    risks: [
      "Beeturia — harmless red/pink urine and stool (don't panic)",
      "GI discomfort in some athletes (test in training first)",
      "May be less effective in highly trained athletes (already high baseline NO)",
      "Effect diminishes with chronic daily use beyond 2 weeks",
    ],
    dietary: {
      fructose: "Commercial concentrated beetroot shots are typically fructose-free. Check labels.",
    },
    recipes: [],
    studies: [
      { authors: "Jones et al.", year: 2018, journal: "Annual Rev Nutrition", title: "Dietary Nitrate and Physical Performance", url: "https://pubmed.ncbi.nlm.nih.gov/30130468/", finding: "3-5% reduction in O₂ cost of exercise; improved TT performance" },
      { authors: "McMahon et al.", year: 2017, journal: "Sports Medicine", title: "Nitrate Supplementation and Endurance Exercise", url: "https://pubmed.ncbi.nlm.nih.gov/27600147/", finding: "Meta-analysis: significant improvement in time to exhaustion and time trial" },
    ],
  },
  {
    id: "strength",
    title: "Strength Training for Cyclists",
    subtitle: "2× per week in off-season / base phase",
    category: "training",
    confidence: "strong",
    icon: "🏋️",
    summary: "Heavy resistance training improves cycling economy by 3-5%, delays fatigue, and protects against injury — without adding bulk.",
    mechanism: "Strength training improves neuromuscular recruitment efficiency, increases tendon stiffness (better power transfer), and shifts muscle fiber type toward more fatigue-resistant profiles. Multiple RCTs show 2-5% improvement in cycling economy (lower oxygen cost at a given power) with no change in body mass when properly periodized. It's especially important for masters athletes to counteract age-related sarcopenia.",
    protocol: [
      "2-3 sessions per week during off-season / base phase",
      "Reduce to 1× per week during build/race phase (maintenance)",
      "Focus on: squats, deadlifts, single-leg press, step-ups, hip thrusts",
      "Heavy: 3-5 sets of 3-6 reps at 80-90% 1RM (after adaptation period)",
      "Avoid hypertrophy-focused training (8-12 rep range) if weight gain is a concern",
      "Always after cycling or on separate days — never before key rides",
    ],
    risks: [
      "DOMS can impair cycling for 24-48h if you're new to strength work",
      "Risk of injury with poor form — consider a coach for initial technique",
      "Must be periodized — heavy lifting during peak race season can cause fatigue",
      "Body weight may increase 1-2kg initially (muscle + glycogen) before stabilizing",
    ],
    dietary: {},
    recipes: [],
    studies: [
      { authors: "Rønnestad & Mujika", year: 2014, journal: "Scand J Med Sci Sports", title: "Optimizing strength training for running and cycling endurance performance", url: "https://pubmed.ncbi.nlm.nih.gov/23914932/", finding: "Heavy strength training improves cycling economy 3-5% without mass gain" },
      { authors: "Beattie et al.", year: 2014, journal: "JSCR", title: "The effect of strength training on performance in endurance athletes", url: "https://pubmed.ncbi.nlm.nih.gov/24149748/", finding: "Improved time to exhaustion, economy, and maximal sprint power" },
    ],
  },
  {
    id: "core",
    title: "Core Stability & Activation",
    subtitle: "10-15 min pre-ride or daily",
    category: "training",
    confidence: "moderate",
    icon: "🎯",
    summary: "A stable core improves power transfer to the pedals, reduces lower back pain, and helps maintain form during fatigue.",
    mechanism: "Core muscles (transversus abdominis, obliques, multifidus, glutes) act as the kinetic link between upper and lower body. When they fatigue, pelvic stability decreases, leading to wasted lateral movement, lower back pain, and reduced pedaling efficiency — especially in the later hours of long rides. Pre-ride activation 'switches on' these stabilizers so they're ready to work.",
    protocol: [
      "Pre-ride activation: 5-10 min of glute bridges, dead bugs, bird dogs, planks",
      "Dedicated core session: 15-20 min, 3× per week",
      "Key exercises: dead bugs, pallof press, side plank rotations, single-leg RDL",
      "Progress from stability (isometric holds) to dynamic (rotational work)",
      "Pair with hip mobility work for cycling-specific range of motion",
    ],
    risks: [
      "Minimal risk when performed correctly",
      "Avoid heavy spinal loading (weighted sit-ups) — use anti-rotation and anti-extension exercises instead",
      "Don't fatigue your core before a key ride — keep pre-ride activation light",
    ],
    dietary: {},
    recipes: [],
    studies: [
      { authors: "Prieske et al.", year: 2016, journal: "Sports Medicine", title: "Role of trunk muscle strength for physical fitness in trained athletes", url: "https://pubmed.ncbi.nlm.nih.gov/26497149/", finding: "Core training improves sport-specific performance and reduces injury rates" },
    ],
  },
  {
    id: "yoga",
    title: "Yoga & Mobility",
    subtitle: "20-30 min, 2-3× per week on recovery days",
    category: "recovery",
    confidence: "moderate",
    icon: "🧘",
    summary: "Improves flexibility, breathing efficiency, body awareness, and mental focus. Hot yoga adds a heat acclimation stimulus similar to sauna.",
    mechanism: "Cycling creates significant anterior-posterior muscular imbalance (tight hip flexors, weak glutes, shortened hamstrings). Yoga addresses this through sustained stretching, proprioceptive challenge, and diaphragmatic breathing practice. The breathing component may improve cycling efficiency by training more effective respiratory patterns. Hot yoga (Bikram, 40°C rooms) provides additional heat acclimation stimulus, though less controlled than sauna.",
    protocol: [
      "2-3 sessions per week, ideally on recovery or easy days",
      "Focus on: hip openers, hamstring lengthening, thoracic spine mobility, glute activation",
      "Hot yoga: treat it as a training stimulus — account for the heat stress load",
      "Best styles for cyclists: Yin yoga (deep stretching), Vinyasa (dynamic flexibility)",
      "Start with 20-30 min sessions; avoid 90-min hot yoga when fatigued",
    ],
    risks: [
      "Hot yoga can dehydrate significantly — weigh before/after and replace fluids",
      "Don't push deep stretches to the point of pain — flexibility gains are gradual",
      "Hot yoga before a key workout can leave you fatigued and dehydrated",
      "Over-stretching can reduce muscle stiffness needed for power production",
    ],
    dietary: {},
    recipes: [],
    studies: [
      { authors: "Polsgrove et al.", year: 2016, journal: "Int J Yoga", title: "Impact of 10-weeks of yoga practice on flexibility and balance of college athletes", url: "https://pubmed.ncbi.nlm.nih.gov/27512319/", finding: "Significant improvements in flexibility and balance after 10 weeks" },
    ],
  },
  {
    id: "sleep",
    title: "Sleep Optimization",
    subtitle: "The most potent performance enhancer available",
    category: "recovery",
    confidence: "strong",
    icon: "😴",
    summary: "Sleep is the multiplier for everything else. Poor sleep negates the benefits of every other booster on this page.",
    mechanism: "During deep sleep, growth hormone peaks (up to 75% of daily secretion), driving muscle repair and glycogen resynthesis. REM sleep consolidates motor learning and emotional regulation. Sleep deprivation (<6h) reduces time to exhaustion by 10-30%, impairs glucose metabolism, increases cortisol, and blunts training adaptations. Your Apex data can show exactly how your sleep maps to next-day performance.",
    protocol: [
      "Target: 7.5-9 hours total sleep",
      "Consistency: same bedtime ± 30 min, even on weekends",
      "Temperature: bedroom 18-19°C; EightSleep bed temp -3°C to -5°C",
      "Light: no screens 60 min before bed (or use blue light blockers)",
      "Caffeine: none after 2 PM (half-life 5-6 hours)",
      "Alcohol: even 1-2 drinks suppresses deep sleep by 20-40%",
      "Pre-sleep protein: 30-40g casein before bed supports overnight MPS",
    ],
    risks: [
      "Obsessing over sleep metrics (orthosomnia) can paradoxically worsen sleep",
      "Track trends, not individual nights — one bad night doesn't ruin you",
    ],
    dietary: {},
    recipes: [
      { name: "Casein Sleep Shake", ingredients: "30g casein, 200ml milk, 1 tbsp almond butter, pinch cinnamon", time: "2 min" },
      { name: "Tart Cherry Nightcap", ingredients: "200ml tart cherry juice (natural melatonin source), ice", time: "1 min" },
    ],
    studies: [
      { authors: "Watson", year: 2017, journal: "Curr Sports Med Rep", title: "Sleep and Athletic Performance", url: "https://pubmed.ncbi.nlm.nih.gov/29135639/", finding: "Sleep extension improves reaction time, sprint time, and accuracy" },
      { authors: "Vitale et al.", year: 2019, journal: "Int J Sports Physiol Perform", title: "Sleep Hygiene for Optimizing Recovery in Athletes", url: "https://pubmed.ncbi.nlm.nih.gov/30957468/", finding: "Sleep <7h associated with significantly higher injury rates" },
    ],
  },
  {
    id: "carbs",
    title: "Periodized Carbohydrate Intake",
    subtitle: "Match fuel to training demands",
    category: "nutrition",
    confidence: "strong",
    icon: "🍚",
    summary: "Under-fueling is the #1 performance limiter for amateur cyclists. Matching carbs to training load drives performance and recovery.",
    mechanism: "Glycogen is the primary fuel for high-intensity cycling. At threshold, you burn ~3-4g carbs per minute. On a 2-hour hard ride, you can deplete ~300-500g of glycogen. Research consistently shows that athletes who match carbohydrate intake to training load perform better, recover faster, and maintain hormonal balance (cortisol, testosterone, thyroid).",
    protocol: [
      "Hard/key training days: 8-12g carbs/kg body weight",
      "Moderate training days: 5-7g carbs/kg",
      "Rest/easy days: 3-5g carbs/kg",
      "During rides >90 min: 60-90g carbs/hour (gels, drink mix, real food)",
      "Post-ride: 1-1.2g carbs/kg within 30 min for rapid glycogen recovery",
    ],
    risks: [
      "Chronic under-fueling causes relative energy deficiency in sport (RED-S)",
      "Over-restricting carbs during high-intensity phases impairs performance and recovery",
      "GI distress if fueling rate exceeds trained gut capacity — practice in training",
      "Keto/low-carb significantly impairs threshold+ performance",
    ],
    dietary: {
      gluten: "Rice, potatoes, gluten-free oats, quinoa, and fruit are excellent carb sources. Most energy gels are gluten-free.",
      general: "Simple carbs during exercise (maltodextrin, fructose mix). Complex carbs for meals (rice, oats, sweet potato).",
    },
    recipes: [
      { name: "Race Day Rice Cakes", ingredients: "200g sushi rice, 2 eggs, soy sauce, sesame oil, wrap in foil", time: "15 min" },
      { name: "Homemade Energy Drink", ingredients: "500ml water, 40g maltodextrin, 20g fructose, pinch salt, squeeze lemon", time: "2 min" },
    ],
    studies: [
      { authors: "Thomas et al.", year: 2016, journal: "JAND", title: "ACSM Position Stand: Nutrition and Athletic Performance", url: "https://pubmed.ncbi.nlm.nih.gov/26920240/", finding: "Carbohydrate periodization optimizes performance and training adaptations" },
    ],
  },
  {
    id: "omega3",
    title: "Omega-3 Fatty Acids",
    subtitle: "2-3g EPA+DHA per day with food",
    category: "supplement",
    confidence: "moderate",
    icon: "🐟",
    summary: "Reduces exercise-induced inflammation and muscle soreness. May improve heart rate recovery and support cardiovascular health.",
    mechanism: "Omega-3s (EPA and DHA) are incorporated into cell membranes where they modulate inflammatory signaling pathways. They reduce production of pro-inflammatory prostaglandins and cytokines, potentially accelerating recovery from intense training and reducing DOMS severity. Some evidence suggests they enhance muscle protein synthesis when combined with protein intake.",
    protocol: [
      "2-3g combined EPA+DHA per day",
      "Take with a meal containing fat for better absorption",
      "Consistent daily use for at least 4 weeks to see benefits",
      "Choose quality: look for IFOS-certified fish oil or algae-based",
    ],
    risks: [
      "Fishy aftertaste/burps (minimized by refrigerating capsules)",
      "May increase bleeding time at very high doses (>4g/day)",
      "Quality varies enormously — heavy metal contamination in cheap brands",
    ],
    dietary: {
      vegan: "Algae-based omega-3 supplements provide EPA+DHA without fish oil.",
      general: "Fish oil capsules or liquid. Aim for >60% EPA+DHA concentration.",
    },
    recipes: [],
    studies: [
      { authors: "Philpott et al.", year: 2019, journal: "Res Sports Medicine", title: "Omega-3 supplementation for sport performance", url: "https://pubmed.ncbi.nlm.nih.gov/30484714/", finding: "Reduced inflammation and DOMS; emerging evidence for recovery enhancement" },
    ],
  },
];

// ── CONFIDENCE BADGE ──
function ConfidenceBadge({ level }) {
  const configs = {
    "strong": { label: "Strong Evidence", color: C.supplement, bg: "rgba(0,229,160,0.1)" },
    "strong-sprint": { label: "Strong for Sprints · Mixed for Endurance", color: C.protocol, bg: "rgba(245,158,11,0.1)" },
    "moderate": { label: "Moderate Evidence", color: C.protocol, bg: "rgba(245,158,11,0.1)" },
    "emerging": { label: "Emerging Research", color: C.textSoft, bg: "rgba(148,149,165,0.1)" },
  };
  const c = configs[level] || configs.moderate;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, background: c.bg, fontSize: 11, fontWeight: 600, color: c.color, letterSpacing: "0.01em" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
      {c.label}
    </span>
  );
}

// ── STUDY CARD ──
function StudyCard({ study }) {
  return (
    <a href={study.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "12px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, textDecoration: "none", transition: "all 0.2s", cursor: "pointer" }}
      onMouseOver={e => e.currentTarget.style.borderColor = C.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4, lineHeight: 1.4 }}>{study.title}</div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>{study.authors} ({study.year}) · {study.journal}</div>
      <div style={{ fontSize: 11, color: C.textSoft, lineHeight: 1.5, fontStyle: "italic" }}>→ {study.finding}</div>
    </a>
  );
}

// ── RECIPE POPUP ──
function RecipeCard({ recipe }) {
  return (
    <div style={{ padding: "12px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{recipe.name}</span>
        <span style={{ fontSize: 10, color: C.textDim }}>⏱ {recipe.time}</span>
      </div>
      <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.5 }}>{recipe.ingredients}</div>
    </div>
  );
}

// ── EXPANDED BOOSTER DETAIL ──
function BoosterDetail({ booster, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const color = catColors[booster.category];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "protocol", label: "Protocol" },
    { id: "risks", label: "Risks & Cautions" },
    { id: "science", label: `Research (${booster.studies.length})` },
    ...(booster.recipes.length ? [{ id: "recipes", label: "Recipes" }] : []),
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />
      {/* Modal */}
      <div style={{ position: "relative", width: "100%", maxWidth: 720, maxHeight: "85vh", background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>
        {/* Top accent line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />

        {/* Header */}
        <div style={{ padding: "24px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{booster.icon}</span>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", fontFamily: "'Outfit', sans-serif" }}>{booster.title}</h2>
                  <p style={{ fontSize: 14, color: C.textSoft, margin: "4px 0 0" }}>{booster.subtitle}</p>
                </div>
              </div>
              <ConfidenceBadge level={booster.confidence} />
            </div>
            <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSoft, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: `2px solid ${activeTab === t.id ? color : "transparent"}`, fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? C.text : C.textDim, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px 28px" }}>
          {activeTab === "overview" && (
            <div>
              <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, margin: "0 0 20px" }}>{booster.summary}</p>
              <h3 style={{ fontSize: 13, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 600 }}>How It Works</h3>
              <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, margin: 0 }}>{booster.mechanism}</p>
              {Object.keys(booster.dietary).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 13, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 600 }}>Dietary Notes</h3>
                  {Object.entries(booster.dietary).map(([key, val]) => (
                    <div key={key} style={{ padding: "10px 14px", background: C.surface, borderRadius: 10, marginBottom: 8, borderLeft: `3px solid ${color}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "capitalize" }}>{key === "general" ? "General" : key === "vegan" ? "Vegan / Plant-Based" : key === "lactose" ? "Lactose Intolerant" : key === "gluten" ? "Gluten Free" : key === "fructose" ? "Fructose Intolerant" : key}</span>
                      <p style={{ fontSize: 13, color: C.textSoft, margin: "4px 0 0", lineHeight: 1.5 }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "protocol" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Step-by-Step Protocol</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {booster.protocol.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</div>
                    <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, margin: "2px 0 0" }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "risks" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "#ff6b7a" }}>⚠️ Risks, Cautions & Considerations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {booster.risks.map((risk, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: "rgba(255,71,87,0.04)", borderRadius: 10, borderLeft: "3px solid rgba(255,71,87,0.3)" }}>
                    <span style={{ color: "#ff6b7a", fontSize: 12, flexShrink: 0, marginTop: 1 }}>●</span>
                    <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, margin: 0 }}>{risk}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: "14px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, margin: 0 }}>⚕️ These are evidence-based educational suggestions, not medical advice. Consult your physician before starting any supplement or protocol, especially if you have pre-existing health conditions.</p>
              </div>
            </div>
          )}

          {activeTab === "science" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>📚 Peer-Reviewed Research</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {booster.studies.map((s, i) => <StudyCard key={i} study={s} />)}
              </div>
            </div>
          )}

          {activeTab === "recipes" && booster.recipes.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>🍴 Quick Recipes</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {booster.recipes.map((r, i) => <RecipeCard key={i} recipe={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN BOOSTERS PAGE
// ══════════════════════════════════════
export default function BoostersPage() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = boosters.filter(b => {
    const matchesCat = filter === "all" || b.category === filter;
    const matchesSearch = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const allCats = ["all", "supplement", "nutrition", "protocol", "training", "recovery"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, borderBottom: `1px solid ${C.border}`, background: `${C.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00e5a0, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.bg }}>A</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>APEX</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Dashboard", "Calendar", "Trends", "Boosters", "Race Planner"].map(item => (
              <button key={item} style={{ background: item === "Boosters" ? "rgba(0,229,160,0.1)" : "none", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: item === "Boosters" ? C.accent : C.textDim, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #8b5cf6, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>JD</div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: "48px 32px 0", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
              Performance <span style={{ background: "linear-gradient(135deg, #00e5a0, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Boosters</span>
            </h1>
            <p style={{ fontSize: 15, color: C.textSoft, margin: 0 }}>
              Science-backed supplements, protocols, and training strategies. Every recommendation includes peer-reviewed research.
            </p>
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search boosters..."
              style={{ padding: "10px 16px 10px 36px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, fontFamily: "'Outfit', sans-serif", outline: "none", width: 220, transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = C.borderHover}
              onBlur={e => e.target.style.borderColor = C.border} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textDim }}>🔍</span>
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {allCats.map(cat => {
            const count = cat === "all" ? boosters.length : boosters.filter(b => b.category === cat).length;
            const isActive = filter === cat;
            const color = cat === "all" ? C.accent : catColors[cat];
            return (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: isActive ? `${color}15` : C.surface, border: `1px solid ${isActive ? `${color}40` : C.border}`, borderRadius: 10, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? color : C.textSoft, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" }}>
                {cat === "all" ? "All" : catLabels[cat]}
                <span style={{ fontSize: 11, color: isActive ? color : C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, paddingBottom: 64 }}>
          {filtered.map((b) => {
            const color = catColors[b.category];
            return (
              <div key={b.id} onClick={() => setSelected(b)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 22px", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", position: "relative", overflow: "hidden" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                {/* Top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{b.subtitle}</div>
                    </div>
                  </div>
                </div>

                {/* Category + confidence */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: `${color}12`, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{catLabels[b.category]}</span>
                  <ConfidenceBadge level={b.confidence} />
                </div>

                {/* Summary */}
                <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6, margin: "0 0 16px" }}>{b.summary}</p>

                {/* Footer meta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textDim }}>
                    <span>📚 {b.studies.length} {b.studies.length === 1 ? "study" : "studies"}</span>
                    {b.recipes.length > 0 && <span>🍴 {b.recipes.length} recipes</span>}
                    {b.risks.length > 0 && <span>⚠️ {b.risks.length} cautions</span>}
                  </div>
                  <span style={{ fontSize: 12, color, fontWeight: 600 }}>View →</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 16, color: C.textSoft }}>No boosters match your search.</p>
            <button onClick={() => { setFilter("all"); setSearchQuery(""); }} style={{ marginTop: 12, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 20px", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Clear filters</button>
          </div>
        )}
      </div>

      {/* Disclaimer footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "20px 32px", background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6, margin: 0 }}>
            ⚕️ All recommendations are based on peer-reviewed research and are provided for educational purposes only. This is not medical advice. Individual responses vary. Consult your physician before starting any supplement regimen, particularly if you have pre-existing health conditions. Apex personalizes recommendations based on your dietary profile, health conditions, and training data — update your profile in Settings → Health & Diet to receive tailored suggestions.
          </p>
        </div>
      </div>

      {/* Detail modal */}
      {selected && <BoosterDetail booster={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

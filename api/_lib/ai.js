import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// AIM AI ANALYSIS SYSTEM PROMPT
//
// This prompt embeds the complete AIM Insights Catalog (13 categories + extras)
// so Claude knows exactly WHAT to look for, HOW to phrase it, and what TONE
// and SPECIFICITY we expect. Each category is a modular block — new categories
// can be added without rewriting the whole prompt.
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are the AI analysis engine for AIM, a performance intelligence platform for endurance athletes. AIM was built by Kristen Faulkner, 2x Olympic Gold Medalist in cycling (Paris 2024, Road Race & Team Pursuit).

You will receive a JSON payload containing athlete data from multiple connected sources. Your job is to generate insights that connect data ACROSS sources — this is the core value of AIM. Athletes can already see their power data on Strava. What they can't see is how their sleep, body composition, blood work, recovery, menstrual cycle, and training load all interact to drive performance.

## OUTPUT FORMAT

Return valid JSON with this exact structure:
{
  "summary": "2-3 sentence workout summary addressed to the athlete by first name (from profile.full_name). Start with their name, e.g. 'Kristen, this was a solid threshold session...' — NOT the activity title.",
  "insights": [
    {
      "type": "insight" | "positive" | "warning" | "action",
      "icon": "emoji",
      "category": "performance" | "body" | "recovery" | "training" | "nutrition" | "environment" | "health",
      "title": "Short, specific title with a key number",
      "body": "Detailed explanation connecting 2+ data sources. Use specific numbers. End with actionable takeaway.",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "dataGaps": [
    "If you connected [Source X], we could tell you [specific insight]. Example: 'Connect Oura to see how last night's sleep affected today's cardiac drift.'"
  ]
}

Generate 6-12 insights per analysis. Prioritize cross-domain insights (connecting 2+ data sources) over single-source observations. Every analysis should include at least one from the "dataGaps" array suggesting additional integrations that would unlock richer analysis.

## DATA STRUCTURE

You receive a pre-processed context payload with three layers:

1. **recentWindow** — Raw data from the last 7 days (activities + daily metrics). Use this to identify immediate patterns and day-to-day correlations (e.g., last night's sleep → today's ride).

2. **historicalContext** — Server-computed summaries of 90-day data:
   - \`trainingLoad\` — Current CTL/ATL/TSB snapshot, 7-day and 30-day trend deltas, ACWR (acute:chronic workload ratio), and flags for overtraining risk
   - \`baselines\` — 90-day statistical summaries (avg, stdDev, min, max, p25, p75) for HRV, RHR, sleep, weight, body fat, recovery. Use these to contextualize today's values (e.g., "Your HRV of 38ms is 1.9 SD below your 90-day average of 62ms")
   - \`similarEfforts\` — 3-5 past activities most comparable to the current one, enriched with that day's HRV, recovery score, and sleep score. Use these for direct comparisons (e.g., "On Feb 18 when your HRV was 72ms, your drift was only 3.2% on a similar effort")
   - \`outliers\` — Days where key metrics deviated >1.5 standard deviations from baseline. These are the most analytically interesting data points
   - \`performanceRange\` — Best/worst/average NP, EF, TSS, and duration for this activity type over 90 days
   - \`seasonalComparison\` — Recent 14-day averages vs prior 14-day averages with % changes. Use to detect recent trends
   - \`recentAnnotations\` — Subjective notes, RPE, and ratings from recent sessions

3. **Health snapshot** — Latest blood panel and DEXA scan (if available), plus power profile and how this activity's power curve compares to personal bests (\`activityVsBests\` shows % of personal best at each duration)

## INSIGHT QUALITY RULES

1. **Connect 2+ data sources in most insights** — this is the entire point of AIM. "Your HRV was low" is Whoop-level. "Your HRV was 38ms, which explains why your cardiac drift was 8.1% today vs 3.2% on Feb 18 when HRV was 72ms" is AIM-level.
2. **Use specific numbers from the athlete's own data** — never say "your power was good." Say "Your NP was 272W (91% of FTP), 6W below your 90-day average for comparable efforts."
3. **Tell them something they can't get from any single app** — connect cause → effect across data sources.
4. **DO NOT MAKE ASSUMPTIONS about causation.** If you can't establish clear cause and effect, say "This may be related to..." or "We'll get more clarity on this as we gather more data over time."
5. **Include an actionable takeaway** in each insight — specific watts, durations, protocols, not vague advice.
6. **Reference the athlete's own history first**, then generic benchmarks. Their personal patterns matter more than population averages.
7. **Match the tone to the data** — celebrate genuine breakthroughs, be direct about concerning trends, never be patronizing.
8. **Be dense, not verbose.** Each insight should be 2-4 sentences max.

## INSIGHT CATEGORIES

Scan the athlete's data for patterns in ALL of the following categories. Only include categories where you find meaningful patterns — don't force insights where the data doesn't support them.

### CATEGORY 1: Body Composition → Performance
Required sources: Scale/body comp data (Withings) + power data (Strava/Wahoo/Garmin)

Look for:
- Weight changes correlated with W/kg changes. Calculate real-time impact.
- FTP per lean body mass (more accurate than raw W/kg — filters out fat mass changes)
- Rate of weight loss — flag if too aggressive (>1kg/week) and correlate with recovery decline
- Pre-ride hydration % correlated with cardiac drift and efficiency factor
- Race weight projection: current trend extrapolated to race date → predicted W/kg and performance
- System weight (rider + bike) and climbing physics: watts needed at specific gradients

Example insights:
- "Your W/kg today was 3.35 based on this morning's weight (89.0kg). At your January weight (91.2kg) with the same power, it would have been 3.09 — an 8.4% climbing improvement from weight loss alone."
- "Your FTP per lean body mass is 3.82 W/kg — up from 3.62 six weeks ago. Since muscle mass is stable at 42.1%, these are genuine neuromuscular adaptations, not just weight loss."
- "Pre-ride hydration was 62% (below your 65% baseline). Combined with 95°F heat, this likely added 2-3% to your cardiac drift. On days your pre-ride hydration is ≥65%, your average EF is 0.12 higher."

### CATEGORY 2: Sleep Architecture → Next-Day Performance
Required sources: Sleep data (Oura/Whoop/EightSleep) + ride data

Look for:
- Deep sleep duration vs next-day NP, EF, and cardiac drift (build personal correlation)
- REM sleep vs cognitive/tactical performance and pacing consistency
- Sleep onset time vs next-day performance — identify the athlete's optimal sleep window
- EightSleep bed temperature vs deep sleep duration and morning HRV
- Total sleep over rolling 3-night and 7-night windows vs recovery and ride quality
- NP fade from hour 2→3 correlated with prior night sleep quality

Example insights:
- "Your 5 best rides in the last 90 days all followed nights with >1h 30m deep sleep. Last night you got 48 minutes."
- "Every 30 minutes past 10 PM correlates with a 1.8% decrease in next-day EF in your data."
- "Deep sleep is 34% higher at -4°C vs -1°C bed temp. Tonight set bed to -4°C and lights out by 10 PM. Your HRV should rebound 15-20ms within 48 hours."

### CATEGORY 3: HRV Patterns → Training Prescription
Required sources: HRV data (Oura/Whoop) + training load

Look for:
- Build the athlete's PERSONAL HRV distribution over 90 days — their green/yellow/red zones (not population averages)
- HRV recovery rate after different training loads — personal dose-response curve
- HRV × training load interaction: how much harder they can go when HRV is high vs low
- Multi-day HRV trends predicting performance changes
- Readiness traffic light: synthesize HRV + RHR + sleep + recent load into daily assessment
- HRV coefficient of variation (>20% = overtraining warning)

Example insights:
- "Your HRV below 45ms predicts 3-5 days of reduced performance. Current: 38ms. Z1/Z2 only until HRV rebounds above 55ms."
- "When you do VO2 intervals on days with HRV >60ms, your 5-min power averages 12W higher than on days below 60ms."
- "Your overnight HRV has declined 74ms → 62ms → 38ms over 3 nights. Historically, when this happens, your NP drops 8-14%."

### CATEGORY 4: Environmental Performance Modeling
Required sources: GPS + temperature data + optionally SpO2 (Oura)

Look for:
- Power:HR ratio at different temperatures over weeks — detect heat adaptation (gap narrows)
- Heat penalty model: NP loss per 10°F above 70°F
- Altitude impact on power output; SpO2 changes after altitude exposure
- Wind-adjusted power: heading vs wind direction, speed-adjusted performance

Example insights:
- "Power:HR at 95°F today was 1.79 W/bpm vs 1.83 at 68°F — only a 2.2% gap. Early summer, the gap was 21%. Heat adaptation is nearly complete."
- "At 6,000ft, your historical power drops 5-8%. At sea level your FTP is effectively ~310W."
- "Your average speed was 3 km/h slower than last week's comparable effort, but NP was identical. The difference was entirely wind."

### CATEGORY 5: Fatigue Signature Analysis
Required sources: Power streams with L/R balance, cadence, per-hour splits

Look for:
- L/R power balance shifting as ride duration increases (suggests bike fit or muscular imbalance)
- Self-selected cadence dropping in final hour (fatigued riders who maintain cadence produce 3-5% more power)
- NP decline hour-by-hour, correlated with sleep quality, fueling, and training load
- Pacing analysis: even splits vs positive/negative splits and their impact on total performance
- Match-burning capacity (efforts >120% FTP) declining after hour 2

Example insights:
- "Your L/R shifts from 51/49 to 53/47 after 2 hours, worse on steep climbs >6%. This pattern appeared in 4 of 6 recent long rides — suggests a bike fit issue or hip/glute imbalance."
- "Your self-selected cadence drops from 90 to 82 rpm in the final hour. On races where you held cadence above 85 in the final 30 minutes, your finishing power was 6% higher."
- "You faded 12% in hour 3. On rides where you consumed >60g carbs/hour, fade was only 4%. Likely under-fueled today."

### CATEGORY 6: Long-Term Training Adaptations
Required sources: 90+ days of activities + daily_metrics (CTL/ATL/TSB)

Look for:
- Dose-response: volume at specific intensity zones correlated with FTP/power changes with time delay (4-8 weeks)
- Periodization intelligence: CTL/ATL/TSB patterns that preceded the athlete's best performances — their personal "peak formula"
- Year-over-year progress: same metrics compared to same period last year
- Strain × recovery balance: Whoop strain vs recovery trend — detect when strain exceeds recovery capacity
- Ramp rate monitoring: TSS/week increase rate (>7 TSS/week = overtraining risk)

Example insights:
- "You've accumulated 312 minutes between 88-105% FTP in 8 weeks. Your FTP rose 290W → 298W. Historically, your FTP responds to threshold volume with a ~6 week delay."
- "Your ramp rate hit 8.2 TSS/week — above the 7 TSS/week overtraining threshold. Back off this week."
- "Your ATL (92) is 8% above CTL (85) — productive overreach, but approaching the red line."

### CATEGORY 7: Nutrition & Fueling Intelligence
Required sources: Nutrition tracking (MyFitnessPal/Cronometer) + optionally CGM (Supersapiens/Levels)

Look for:
- Carb intake per hour during rides correlated with power fade in hour 3+
- Glucose drops during rides correlated with effort spikes and power drops
- Daily caloric deficit/surplus correlated with next-day HRV and recovery
- Pre-ride meal timing correlated with first-hour power and GI complaints
- Protein intake vs muscle mass preservation during weight loss

Example insights:
- "Your power faded 12% in hour 3. On rides where you consumed >60g carbs/hour, fade was only 4%. Likely under-fueled today."
- "You burned 2,840 kcal today but logged only 1,900 kcal. A deficit of 940 kcal after a 3h ride will impair recovery."

### CATEGORY 8: Predictive Analytics
Required sources: 90+ days training data + power profile + optionally race calendar

Look for:
- Race-day FTP prediction from CTL trajectory and FTP trend
- Event time prediction from VAM trend + projected weight + course gradient
- Taper protocol: days to event + current CTL/ATL/TSB + historical peak performance TSB values
- Power profile shape matched against demands of goal events

Example insights:
- "CTL 85, TSB -7. Race in 18 days → begin taper in ~4 days. Reduce volume 40% next week, maintain 2 short intensity sessions. Target TSB +15 to +20 by race day."
- "Your power curve shows sprint and threshold are strengths. VO2max is your limiter — addressing this could unlock 15-20W."

### CATEGORY 9: Benchmarking & Classification
Required sources: Power profile (computed from activities)

Look for:
- Coggan power classification at 5s, 1m, 5m, 20m, 60m by sex and weight class
- Weakest link identification: the power duration with the lowest classification relative to others
- VO2/FTP ratio (target 1.25 for balanced riders)
- Progress to next level: watts needed and estimated timeline
- Age-adjusted percentile ranking

Example insights:
- "Your 5-min power classifies as Cat 3 while threshold is Cat 2. That 2-tier gap is your biggest limiter. You need +25W at 5-min to reach Cat 2 — achievable in 6-8 weeks of targeted VO2 work."
- "Your VO2/FTP ratio is 1.19 — well below the 1.25 target. This gap is the single highest-ROI training adaptation available."

### CATEGORY 10: Menstrual Cycle Intelligence
Required sources: Oura (temperature for auto-detection) OR manual logging. ONLY include if the athlete has opted in via uses_cycle_tracking.

Look for:
- Cycle phase detection from basal body temperature (0.3-0.5°C rise = ovulation)
- Luteal phase adjustments: HR 5bpm higher at same power (normal hormonal response, not fitness decline)
- Core temperature elevation in luteal phase → thermal strain in heat, adjust EightSleep temp
- Late luteal / pre-menstrual: worst-performing phase for ~40% of athletes. Don't force intensity.
- Follicular phase opportunity: estrogen peaking, favorable window for hardest sessions
- Personal cycle patterns after 3+ tracked cycles: identify individual performance windows
- Hormonal contraception: note modified patterns, use individual Oura data instead of standard phases

Design principles: Always opt-in. Science-backed, not prescriptive ("Research suggests..." not "You should..."). Individual patterns trump population averages after 3+ cycles. Sensitivity in language — no patronizing tone, no assumptions.

Example insights:
- "You're in your luteal phase (day 22). Your HR is 5bpm higher at the same power — this is normal hormonal response, not a fitness decline."
- "Your best 5-min efforts in the last 6 months occurred on cycle days 8-12 (late follicular). Consider scheduling key workouts in this window."
- "Over your last 5 cycles, your average NP is 4.2% lower on luteal days 22-26. This is your personal 'caution window.'"

### CATEGORY 11: Performance Booster Cross-References
Required sources: Active boosters (from user settings) + ride data + recovery data

Look for:
- Performance changes after starting a booster protocol — compare pre/post metrics
- Protocol compliance tracking: did they actually follow it? Correlate compliance with outcomes
- Recovery booster recommendations when recovery is persistently low
- Caffeine timing optimization

Example insights:
- "Your beetroot juice protocol (started 12 days ago) may have contributed to the 3% higher 5-min power this week. Beetroot juice is strongest for efforts of 1-8 minutes."
- "You've been taking creatine for 3 weeks. Your sprint power (5s) is up 4.2% — consistent with the 3-5% improvement shown in research."
- "Your heat acclimation protocol calls for 30-min sauna sessions 3×/week. You've done 1 in the last 2 weeks. Your heat tolerance gains will start reversing after ~2 weeks without stimulus."

### CATEGORY 12: Blood Work → Training Impact
Required sources: Blood panels (uploaded) + training data + power profile

Look for:
- Ferritin levels correlated with VO2max/endurance (athlete-optimal >50 ng/mL, not clinical >12)
- Vitamin D levels (athlete-optimal 50-80 ng/mL) correlated with injury risk and performance
- Thyroid function trends (TSH creep during high-volume training = possible thyroid suppression)
- Inflammation markers: CRP trends correlated with training load and recovery
- Testosterone-to-cortisol ratio as indicator of recovery capacity
- Hormonal health markers that signal overtraining

Example insights:
- "Your ferritin dropped from 68 to 42 ng/mL over 3 months. While 'normal' clinically, athlete-optimal is >50. This may be contributing to your VO2max plateau. Consider iron supplementation under medical guidance."
- "Your Vitamin D is 28 ng/mL — below athlete-optimal (50-80). Low D is associated with increased stress fracture risk and reduced testosterone. Supplementing 4000-5000 IU daily is standard for athletes at your level."
- "Your testosterone-to-cortisol ratio has dropped 15% since your last panel — associated with accumulated training stress."

### CATEGORY 13: DEXA Scan → Power & Body Composition
Required sources: DEXA scans (uploaded) + training data + Withings data

Look for:
- Lean mass provides the most accurate W/kg denominator — compare to scale-based estimates
- Regional imbalances: left vs right leg lean mass differences that may correlate with L/R power imbalances
- Visceral fat tracking — even in lean athletes, this is a health marker
- Lean mass changes over time: is weight loss coming from fat or muscle?

Example insights:
- "DEXA shows 64.2kg lean mass vs Withings estimate of 65.8kg. Your true FTP per lean kg is 4.64 — higher than the scale-based estimate."
- "DEXA shows your left leg has 0.4kg less lean mass than your right. This may explain the 52/48 L/R power imbalance on steep climbs."
- "Your DEXA lean mass increased 0.8kg over 4 months while total weight dropped 1.2kg. Your W/kg improvement is 70% from fat loss and 30% from power gains — ideal progression."

### CATEGORY 14: Bike Fit & Equipment Impact
Required sources: Power data + positional data (if available) + L/R balance

Look for:
- Saddle height or cleat position changes correlated with power or efficiency changes
- Aero position time vs power/comfort tradeoff
- Equipment changes (wheels, tires, bike) correlated with speed-at-power changes
- Pedaling efficiency patterns: torque effectiveness, pedal smoothness

Example insights:
- "Since your bike fit adjustment 3 weeks ago, your EF has improved 3.2% and L/R balance has stabilized from 53/47 to 51/49. The fit change is working."
- "You're producing 4% less power in your aero position vs hoods. This is better than average (typical 5-8% loss) — your position is well-optimized."

### CATEGORY 15: Injury Risk & Prevention
Required sources: Training load + recovery data + optionally blood work

Look for:
- Acute:chronic workload ratio (ACWR) — flag if >1.5 (injury risk zone)
- Rapid training load increases after periods of rest
- Chronic low recovery combined with high training load
- Biomechanical warning signs (L/R imbalance worsening, cadence changes)

Example insights:
- "Your ACWR is 1.42 — approaching the 1.5 injury risk threshold. Your ATL jumped 40% in 2 weeks after a rest period. Increase load gradually: max 10% per week."
- "Your L/R imbalance has worsened from 51/49 to 54/46 over 3 weeks, and it's worse on climbs. This could indicate a developing hip or knee issue. Consider a bike fit check or physio assessment."

## DATA GAP AWARENESS

The \`connectedSources\` field tells you which integrations the athlete has connected. When data from a source is missing, include specific suggestions in the \`dataGaps\` array about what insights would be unlocked by connecting it. Be specific — don't just say "connect Oura," say "Connect Oura to see how last night's deep sleep (or lack of it) correlated with today's 8.1% cardiac drift."

Examples:
- If no sleep data: "If you connected Oura or Whoop, we could tell you whether last night's sleep quality explains today's cardiac drift of X%."
- If no body comp: "Connect Withings to track how your weight changes are affecting your climbing W/kg — every kg matters on the 6% grades you rode today."
- If no blood work: "Upload a blood panel to check if your ferritin levels might be contributing to your VO2max plateau."
- If no cycle tracking: "If you opt into cycle tracking with Oura, we could identify your personal performance windows across your cycle — research shows 4-8% power variation is common."
- If no nutrition: "Connect MyFitnessPal to analyze whether under-fueling is causing your hour 3 power fade."

## ADDITIONAL RULES

- Keep total response as valid JSON. No markdown outside the JSON structure.
- Aim for 6-12 insights per analysis. More data sources connected = more insights.
- At least 3 insights should connect 2+ data sources.
- Use "type" to indicate the nature: "positive" for good news, "warning" for concerns, "action" for prescriptions, "insight" for observations.
- Assign "confidence" based on data quality: "high" if strong data supports it, "medium" if reasonable inference, "low" if speculative.
- If menstrual cycle data is present and the athlete has opted in (uses_cycle_tracking = true), include cycle-aware insights. Otherwise, never mention it.
- Reference boosters, blood work, and DEXA when that data is available and relevant.
- Build on personal models — the longer the data history, the more personalized insights should be (e.g., "based on your last 60 rides" or "over your last 5 cycles").

## ATHLETE NOTES & SUBJECTIVE DATA

When the athlete has provided session notes, ratings, RPE, or tags, use this subjective data to enrich your analysis:

- **When RPE doesn't match power output**, investigate HRV, sleep, and recovery data to explain the discrepancy. For example, RPE 9 but power was low could indicate accumulated fatigue, poor sleep, or illness.
- **Look for recurring themes in athlete notes across sessions** (e.g., repeated mentions of fatigue, pain, motivation issues). Flag patterns like "you've mentioned knee pain in 3 of your last 5 rides."
- **Cross-reference user_rating trends with training load** (CTL/ATL/TSB) to gauge training tolerance. Consistently low ratings during high ATL periods suggest the athlete is struggling with the load.
- **Use tags to contextualize performance** — indoor vs outdoor, solo vs group ride, race vs training. Group rides often show higher NP due to surges; indoor rides may show lower HR at same power due to cooling.
- **Validate subjective data against objective metrics** — when they align, confidence is high. When they diverge, that's often the most interesting insight.`;

// ─────────────────────────────────────────────────────────────────────────────
// SMART CONTEXT HELPERS
//
// Pure functions that reduce raw data into information-dense summaries.
// These run synchronously on in-memory arrays after the DB queries complete.
// ─────────────────────────────────────────────────────────────────────────────

function statsFor(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const avg = sum / sorted.length;
  const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  const percentile = (p) => {
    const i = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  };
  return {
    avg: Math.round(avg * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: Math.round(percentile(25) * 10) / 10,
    p75: Math.round(percentile(75) * 10) / 10,
  };
}

function trendDirection(values) {
  // values sorted newest-first; compare avg of first 14 vs last 14
  if (values.length < 7) return "insufficient_data";
  const half = Math.min(14, Math.floor(values.length / 2));
  const recent = values.slice(0, half);
  const older = values.slice(-half);
  const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgOlder = older.reduce((s, v) => s + v, 0) / older.length;
  const delta = avgRecent - avgOlder;
  const threshold = avgOlder * 0.02; // 2% change threshold
  if (Math.abs(delta) < threshold) return "stable";
  return delta > 0 ? "increasing" : "declining";
}

/**
 * Reduce 90 days of daily_metrics into statistical summaries.
 */
function computeBaselines(dailyMetrics) {
  if (!dailyMetrics || dailyMetrics.length < 7) return null;

  const vals = (field) => dailyMetrics.map((d) => d[field]).filter((v) => v != null);

  const hrvVals = vals("hrv_ms");
  const rhrVals = vals("resting_hr_bpm");
  const sleepTotalVals = vals("total_sleep_seconds");
  const deepSleepVals = vals("deep_sleep_seconds");
  const remSleepVals = vals("rem_sleep_seconds");
  const sleepScoreVals = vals("sleep_score");
  const weightVals = vals("weight_kg");
  const bodyFatVals = vals("body_fat_pct");
  const recoveryVals = vals("recovery_score");

  return {
    period: `${dailyMetrics.length}d`,
    hrv: statsFor(hrvVals),
    rhr: statsFor(rhrVals),
    sleep: {
      avgTotalSec: sleepTotalVals.length ? Math.round(sleepTotalVals.reduce((s, v) => s + v, 0) / sleepTotalVals.length) : null,
      avgDeepSec: deepSleepVals.length ? Math.round(deepSleepVals.reduce((s, v) => s + v, 0) / deepSleepVals.length) : null,
      avgRemSec: remSleepVals.length ? Math.round(remSleepVals.reduce((s, v) => s + v, 0) / remSleepVals.length) : null,
      avgScore: sleepScoreVals.length ? Math.round(sleepScoreVals.reduce((s, v) => s + v, 0) / sleepScoreVals.length) : null,
    },
    weight: weightVals.length
      ? { avg: Math.round(weightVals.reduce((s, v) => s + v, 0) / weightVals.length * 10) / 10, min: Math.min(...weightVals), max: Math.max(...weightVals), trend: trendDirection(weightVals) }
      : null,
    bodyFat: bodyFatVals.length
      ? { avg: Math.round(bodyFatVals.reduce((s, v) => s + v, 0) / bodyFatVals.length * 10) / 10, trend: trendDirection(bodyFatVals) }
      : null,
    recoveryScore: statsFor(recoveryVals),
  };
}

/**
 * Extract current training load snapshot and trend directions.
 */
function computeTrainingLoadSummary(dailyMetrics) {
  if (!dailyMetrics || !dailyMetrics.length) return null;

  const latest = dailyMetrics[0]; // sorted descending
  const current = {
    ctl: latest.ctl != null ? Math.round(latest.ctl * 10) / 10 : null,
    atl: latest.atl != null ? Math.round(latest.atl * 10) / 10 : null,
    tsb: latest.tsb != null ? Math.round(latest.tsb * 10) / 10 : null,
    rampRate: latest.ramp_rate != null ? Math.round(latest.ramp_rate * 10) / 10 : null,
  };

  // 7-day trend
  const day7 = dailyMetrics.find((d, i) => i >= 6 && d.ctl != null);
  const trend7d = day7
    ? {
        ctlDelta: Math.round(((latest.ctl || 0) - (day7.ctl || 0)) * 10) / 10,
        atlDelta: Math.round(((latest.atl || 0) - (day7.atl || 0)) * 10) / 10,
        tsbDirection: (latest.tsb || 0) > (day7.tsb || 0) ? "improving" : "declining",
      }
    : null;

  // 30-day trend
  const day30 = dailyMetrics.find((d, i) => i >= 28 && d.ctl != null);
  const trend30d = day30
    ? {
        ctlDelta: Math.round(((latest.ctl || 0) - (day30.ctl || 0)) * 10) / 10,
        atlDelta: Math.round(((latest.atl || 0) - (day30.atl || 0)) * 10) / 10,
        tsbDirection: (latest.tsb || 0) > (day30.tsb || 0) ? "improving" : "declining",
      }
    : null;

  // ACWR
  const acwr = current.ctl && current.ctl >= 1
    ? Math.round((current.atl / current.ctl) * 100) / 100
    : null;

  const flags = [];
  if (current.rampRate != null && current.rampRate > 7) flags.push("ramp_rate_high");
  if (acwr != null && acwr > 1.5) flags.push("acwr_danger");
  else if (acwr != null && acwr > 1.3) flags.push("acwr_caution");

  return { current, trend7d, trend30d, acwr, flags };
}

/**
 * Find 3-5 past activities most similar to the current one,
 * enriched with that day's recovery context.
 */
function findSimilarEfforts(activity, allActivities, dailyMetricsByDate) {
  if (!allActivities || !allActivities.length) return [];

  const sameType = allActivities.filter(
    (a) => a.activity_type === activity.activity_type && a.started_at !== activity.started_at
  );
  if (!sameType.length) return [];

  const actDuration = activity.duration_seconds || 0;
  const actPower = activity.normalized_power_watts || activity.avg_power_watts || 0;

  const scored = sameType
    .map((a) => {
      const dur = a.duration_seconds || 0;
      const pow = a.normalized_power_watts || a.avg_power_watts || 0;
      // Duration similarity (0-1, higher = more similar)
      const durSim = actDuration > 0 ? 1 - Math.min(Math.abs(dur - actDuration) / actDuration, 1) : 0.5;
      // Power similarity
      const powSim = actPower > 0 && pow > 0 ? 1 - Math.min(Math.abs(pow - actPower) / actPower, 1) : 0.5;
      const score = durSim * 0.5 + powSim * 0.5;
      return { ...a, _score: score };
    })
    .filter((a) => a._score > 0.5) // at least 50% similar
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);

  return scored.map((a) => {
    const dateStr = a.started_at ? a.started_at.split("T")[0] : null;
    const dayMetrics = dateStr ? dailyMetricsByDate[dateStr] : null;
    return {
      name: a.name,
      started_at: a.started_at,
      duration_seconds: a.duration_seconds,
      normalized_power_watts: a.normalized_power_watts,
      tss: a.tss,
      intensity_factor: a.intensity_factor,
      efficiency_factor: a.efficiency_factor,
      hr_drift_pct: a.hr_drift_pct,
      avg_hr_bpm: a.avg_hr_bpm,
      temperature_celsius: a.temperature_celsius,
      dayHrv: dayMetrics?.hrv_ms ?? dayMetrics?.hrv_overnight_avg_ms ?? null,
      dayRecovery: dayMetrics?.recovery_score ?? null,
      daySleepScore: dayMetrics?.sleep_score ?? null,
    };
  });
}

/**
 * Identify days where key metrics deviated significantly from baseline.
 */
function findNotableOutliers(dailyMetrics, baselines) {
  if (!dailyMetrics || dailyMetrics.length < 14 || !baselines) return [];

  const outliers = [];

  const checks = [
    { field: "hrv_ms", baseline: baselines.hrv, labelLow: "hrv_low", labelHigh: "hrv_high", name: "HRV" },
    { field: "resting_hr_bpm", baseline: baselines.rhr, labelLow: "rhr_low", labelHigh: "rhr_high", name: "RHR" },
    { field: "sleep_score", baseline: baselines.sleep ? { avg: baselines.sleep.avgScore, stdDev: 12 } : null, labelLow: "sleep_poor", labelHigh: "sleep_great", name: "Sleep score" },
    { field: "recovery_score", baseline: baselines.recoveryScore, labelLow: "recovery_low", labelHigh: "recovery_high", name: "Recovery" },
  ];

  for (const day of dailyMetrics) {
    for (const check of checks) {
      if (!check.baseline || !check.baseline.avg || !check.baseline.stdDev) continue;
      const val = day[check.field];
      if (val == null) continue;
      const z = (val - check.baseline.avg) / check.baseline.stdDev;
      if (Math.abs(z) >= 1.5) {
        outliers.push({
          date: day.date,
          type: z < 0 ? check.labelLow : check.labelHigh,
          value: val,
          baseline: check.baseline.avg,
          zScore: Math.round(z * 100) / 100,
          note: `${check.name} ${Math.round(Math.abs((val - check.baseline.avg) / check.baseline.avg) * 100)}% ${z < 0 ? "below" : "above"} baseline`,
        });
      }
    }
  }

  return outliers
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
    .slice(0, 8);
}

/**
 * Summarize best/worst/average performance for this activity type over 90 days.
 */
function computePerformanceRange(activity, allActivities) {
  if (!allActivities || !allActivities.length) return null;

  const sameType = allActivities.filter(
    (a) => a.activity_type === activity.activity_type && a.normalized_power_watts
  );
  if (!sameType.length) return null;

  const byNp = [...sameType].sort((a, b) => b.normalized_power_watts - a.normalized_power_watts);
  const withEf = sameType.filter((a) => a.efficiency_factor);
  const byEf = withEf.length ? [...withEf].sort((a, b) => b.efficiency_factor - a.efficiency_factor) : [];

  return {
    activityType: activity.activity_type,
    count: sameType.length,
    bestNp: { value: byNp[0].normalized_power_watts, date: byNp[0].started_at?.split("T")[0], name: byNp[0].name },
    worstNp: { value: byNp[byNp.length - 1].normalized_power_watts, date: byNp[byNp.length - 1].started_at?.split("T")[0], name: byNp[byNp.length - 1].name },
    bestEf: byEf.length ? { value: Math.round(byEf[0].efficiency_factor * 100) / 100, date: byEf[0].started_at?.split("T")[0] } : null,
    worstEf: byEf.length ? { value: Math.round(byEf[byEf.length - 1].efficiency_factor * 100) / 100, date: byEf[byEf.length - 1].started_at?.split("T")[0] } : null,
    avgNp: Math.round(sameType.reduce((s, a) => s + a.normalized_power_watts, 0) / sameType.length),
    avgTss: Math.round(sameType.filter((a) => a.tss).reduce((s, a) => s + a.tss, 0) / sameType.filter((a) => a.tss).length) || null,
    avgDuration: Math.round(sameType.reduce((s, a) => s + (a.duration_seconds || 0), 0) / sameType.length),
  };
}

/**
 * Compare recent 14-day window to prior 14-day window.
 */
function computeSeasonalComparison(dailyMetrics, allActivities) {
  if (!dailyMetrics || dailyMetrics.length < 14) return null;

  const now = new Date();
  const d14ago = new Date(now - 14 * 86400000);
  const d28ago = new Date(now - 28 * 86400000);

  const recent14dMetrics = dailyMetrics.filter((d) => new Date(d.date) >= d14ago);
  const prior14dMetrics = dailyMetrics.filter((d) => new Date(d.date) >= d28ago && new Date(d.date) < d14ago);

  if (!recent14dMetrics.length || !prior14dMetrics.length) return null;

  const avg = (arr, field) => {
    const vals = arr.map((d) => d[field]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null;
  };

  const recentActivities = allActivities
    ? allActivities.filter((a) => a.started_at && new Date(a.started_at) >= d14ago)
    : [];
  const priorActivities = allActivities
    ? allActivities.filter((a) => a.started_at && new Date(a.started_at) >= d28ago && new Date(a.started_at) < d14ago)
    : [];

  const avgNp = (acts) => {
    const withNp = acts.filter((a) => a.normalized_power_watts);
    return withNp.length ? Math.round(withNp.reduce((s, a) => s + a.normalized_power_watts, 0) / withNp.length) : null;
  };

  const recent = {
    avgTss: avg(recent14dMetrics, "daily_tss"),
    avgNp: avgNp(recentActivities),
    avgHrv: avg(recent14dMetrics, "hrv_ms"),
    avgSleep: avg(recent14dMetrics, "total_sleep_seconds"),
    rideCount: recentActivities.length,
  };

  const prior = {
    avgTss: avg(prior14dMetrics, "daily_tss"),
    avgNp: avgNp(priorActivities),
    avgHrv: avg(prior14dMetrics, "hrv_ms"),
    avgSleep: avg(prior14dMetrics, "total_sleep_seconds"),
    rideCount: priorActivities.length,
  };

  const pctChange = (r, p) => {
    if (r == null || p == null || p === 0) return null;
    const pct = ((r - p) / p) * 100;
    return `${pct >= 0 ? "+" : ""}${Math.round(pct * 10) / 10}%`;
  };

  return {
    recent14d: recent,
    prior14d: prior,
    changes: {
      tss: pctChange(recent.avgTss, prior.avgTss),
      np: pctChange(recent.avgNp, prior.avgNp),
      hrv: pctChange(recent.avgHrv, prior.avgHrv),
      sleep: pctChange(recent.avgSleep, prior.avgSleep),
      volume: pctChange(recent.rideCount, prior.rideCount),
    },
  };
}

/**
 * Compare this activity's power curve to personal bests.
 */
function computeActivityVsBests(activity, powerProfile) {
  if (!activity?.power_curve || !powerProfile) return null;

  const durations = ["5s", "30s", "1m", "5m", "20m", "60m"];
  const profileFields = {
    "5s": "best_5s_watts",
    "30s": "best_30s_watts",
    "1m": "best_1m_watts",
    "5m": "best_5m_watts",
    "20m": "best_20m_watts",
    "60m": "best_60m_watts",
  };

  const result = {};
  for (const dur of durations) {
    const actWatts = activity.power_curve[dur];
    const bestWatts = powerProfile[profileFields[dur]];
    if (actWatts && bestWatts) {
      result[dur] = {
        activityWatts: actWatts,
        bestWatts: bestWatts,
        pctOfBest: Math.round((actWatts / bestWatts) * 1000) / 10,
      };
    }
  }

  return Object.keys(result).length ? result : null;
}

/**
 * Build the athlete context payload for AI analysis.
 * Uses smart pre-filtering: recent window (7d raw) + computed historical summaries.
 */
export async function buildAnalysisContext(userId, activityId) {
  // Fetch activity
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .eq("user_id", userId)
    .single();

  if (!activity) return null;

  // Run all queries in parallel for speed
  const [
    profileResult,
    activitiesResult,
    dailyMetricsResult,
    powerProfileResult,
    bloodWorkResult,
    dexaResult,
    integrationsResult,
    settingsResult,
  ] = await Promise.allSettled([
    // Profile
    supabaseAdmin
      .from("profiles")
      .select("full_name, ftp_watts, weight_kg, height_cm, sex, date_of_birth, riding_level, weekly_hours, goals, uses_cycle_tracking, bike_weight_kg, lthr_bpm, max_hr_bpm")
      .eq("id", userId)
      .single(),

    // 90 days of activities (trimmed fields — no power_curve/zone_distribution)
    supabaseAdmin
      .from("activities")
      .select("name, activity_type, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, avg_hr_bpm, max_hr_bpm, efficiency_factor, hr_drift_pct, avg_cadence_rpm, calories, temperature_celsius, lr_balance, user_notes, user_rating, user_rpe, user_tags")
      .eq("user_id", userId)
      .neq("id", activityId)
      .gte("started_at", new Date(Date.now() - 90 * 86400000).toISOString())
      .order("started_at", { ascending: false })
      .limit(100),

    // 90 days of daily metrics (used for computation, only recent 7d sent raw)
    supabaseAdmin
      .from("daily_metrics")
      .select("date, daily_tss, ctl, atl, tsb, ramp_rate, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, recovery_score, readiness_score, strain_score, weight_kg, body_fat_pct, muscle_mass_kg, hydration_pct, bone_mass_kg, cycle_day, cycle_phase, blood_oxygen_pct, skin_temperature_deviation")
      .eq("user_id", userId)
      .gte("date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0])
      .order("date", { ascending: false }),

    // Latest power profile
    supabaseAdmin
      .from("power_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("computed_date", { ascending: false })
      .limit(1)
      .single(),

    // Latest blood panel (if any)
    supabaseAdmin
      .from("blood_panels")
      .select("test_date, ferritin_ng_ml, hemoglobin_g_dl, iron_mcg_dl, vitamin_d_ng_ml, vitamin_b12_pg_ml, testosterone_ng_dl, cortisol_mcg_dl, crp_mg_l, hba1c_pct, tsh_miu_l, free_t3_pg_ml, free_t4_ng_dl, magnesium_mg_dl, zinc_mcg_dl")
      .eq("user_id", userId)
      .order("test_date", { ascending: false })
      .limit(1)
      .single(),

    // Latest DEXA scan (if any)
    supabaseAdmin
      .from("dexa_scans")
      .select("scan_date, total_body_fat_pct, lean_mass_kg, fat_mass_kg, bone_mineral_density, visceral_fat_area_cm2, regional_data")
      .eq("user_id", userId)
      .order("scan_date", { ascending: false })
      .limit(1)
      .single(),

    // Connected integrations
    supabaseAdmin
      .from("integrations")
      .select("provider, is_active, last_sync_at")
      .eq("user_id", userId)
      .eq("is_active", true),

    // User settings (active boosters, preferences)
    supabaseAdmin
      .from("user_settings")
      .select("active_boosters, race_calendar, preferences")
      .eq("user_id", userId)
      .single(),
  ]);

  // Helper to safely extract data from Promise.allSettled results
  const getData = (result) =>
    result.status === "fulfilled" ? result.value.data : null;

  const profile = getData(profileResult) || {};
  const allActivities = getData(activitiesResult) || [];
  const dailyMetrics = getData(dailyMetricsResult) || [];
  const powerProfile = getData(powerProfileResult) || null;
  const integrations = getData(integrationsResult) || [];
  const settings = getData(settingsResult);

  // Strip source_data from the activity to keep the payload manageable
  const { source_data, ...activityClean } = activity;

  // ── Compute historical summaries server-side ──
  const baselines = computeBaselines(dailyMetrics);
  const trainingLoad = computeTrainingLoadSummary(dailyMetrics);
  const dailyMetricsByDate = Object.fromEntries(dailyMetrics.map((d) => [d.date, d]));
  const similarEfforts = findSimilarEfforts(activityClean, allActivities, dailyMetricsByDate);
  const outliers = findNotableOutliers(dailyMetrics, baselines);
  const performanceRange = computePerformanceRange(activityClean, allActivities);
  const seasonalComparison = computeSeasonalComparison(dailyMetrics, allActivities);
  const activityVsBests = computeActivityVsBests(activityClean, powerProfile);

  // ── Recent window: last 7 days raw ──
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const recentWindowActivities = allActivities
    .filter((a) => a.started_at && new Date(a.started_at) >= sevenDaysAgo)
    .slice(0, 10);
  const recentWindowMetrics = dailyMetrics
    .filter((d) => new Date(d.date) >= sevenDaysAgo);

  // Recent annotated sessions
  const recentAnnotations = allActivities
    .filter((a) => a.user_notes || a.user_rpe)
    .slice(0, 10)
    .map((a) => ({
      name: a.name,
      started_at: a.started_at,
      user_notes: a.user_notes,
      user_rating: a.user_rating,
      user_rpe: a.user_rpe,
      user_tags: a.user_tags,
    }));

  return {
    // Layer 1: Current activity + profile
    activity: activityClean,
    profile,

    // Layer 1: Recent window (7 days raw)
    recentWindow: {
      activities: recentWindowActivities,
      dailyMetrics: recentWindowMetrics,
    },

    // Layer 2: Computed historical summaries (90-day)
    historicalContext: {
      trainingLoad,
      baselines,
      similarEfforts,
      outliers,
      performanceRange,
      seasonalComparison,
      recentAnnotations,
    },

    // Layer 2: Power profile + how this activity compares
    powerProfile,
    activityVsBests,

    // Layer 3: Health snapshot
    bloodWork: getData(bloodWorkResult) || null,
    dexa: getData(dexaResult) || null,

    // Metadata
    activeBoosters: settings?.active_boosters || [],
    connectedSources: integrations.map((i) => i.provider),
    cyclePhase: dailyMetrics[0]?.cycle_phase || null,
    cycleDay: dailyMetrics[0]?.cycle_day || null,
    usesCycleTracking: profile.uses_cycle_tracking || false,
    raceCalendar: settings?.race_calendar || null,
  };
}

/**
 * Generate AI analysis for an activity using Claude.
 */
export async function generateAnalysis(context) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });

  const text = response.content[0].text;

  // Parse the JSON response — handle potential markdown code fences
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try stripping markdown code fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      // Fall back to returning as plain text wrapped in our structure
      parsed = {
        summary: text.slice(0, 200),
        insights: [
          {
            type: "insight",
            icon: "\u2726",
            category: "performance",
            title: "AI Analysis",
            body: text,
            confidence: "high",
          },
        ],
        dataGaps: [],
      };
    }
  }

  return parsed;
}

/**
 * Run the full analysis pipeline: build context → call Claude → store result.
 */
export async function analyzeActivity(userId, activityId) {
  const context = await buildAnalysisContext(userId, activityId);
  if (!context) throw new Error("Activity not found");

  const analysis = await generateAnalysis(context);

  // Store the structured analysis as JSONB
  await supabaseAdmin
    .from("activities")
    .update({
      ai_analysis: analysis,
      ai_analysis_generated_at: new Date().toISOString(),
    })
    .eq("id", activityId)
    .eq("user_id", userId);

  return analysis;
}

# AIM — AI Insights Catalog

## The Secret Sauce

This is the living catalog of every insight AIM's AI engine can generate. These insights are the core product — they're why athletes pay for AIM instead of just using Strava. Every insight here connects data across multiple sources to tell the athlete something they **cannot learn from any single app**.

This document serves two purposes:
1. **For Claude Code:** Feed these insight patterns into the AI system prompt so it knows exactly what to look for in athlete data
2. **For the product team:** A growing library to add to as we learn what resonates with users

### How to Use This Document

The AI system prompt should reference every category below. For each category, Claude receives:
- **What to look for** — the data pattern
- **Example outputs** — how to phrase the insight (specific numbers, cause → effect, actionable)
- **Required data sources** — which integrations need to be connected
- **Confidence level** — how strong the evidence is

### Insight Structure

Every insight follows this format:
- **Specific numbers** from the athlete's own data (not vague statements)
- **Cause → effect** connection across data sources
- **Comparison** to their own history (not generic benchmarks)
- **One actionable takeaway**

---

## CATEGORY 1: Body Composition → Performance

**Required sources:** Withings (weight, body fat, muscle mass, hydration) + Strava/Wahoo/Garmin (power data)

### 1A. Weight ↔ Power (W/kg)

**What to look for:** Weight changes from Withings correlated with power output changes from rides. Calculate real-time W/kg impact.

**Example insights:**
- "Your W/kg today was 3.35 based on this morning's Withings reading (89.0kg). At your January weight (91.2kg) with the same power, it would have been 3.09 — an 8.4% climbing improvement from weight loss alone."
- "At 86.4kg (your projected race weight), you'll need 11W less on 6% grades — saving ~45 seconds per 20-minute climb."
- "Your FTP per lean body mass is 3.82 W/kg — up from 3.62 W/kg six weeks ago. Since muscle mass is stable at 42.1%, these are genuine neuromuscular adaptations, not just weight loss."

### 1B. Weight Loss Rate Monitoring

**What to look for:** Rate of weight change over 7-14 days. Flag aggressive cuts that harm recovery.

**Example insights:**
- "You're losing 0.8kg/week — at the upper limit of healthy loss. Your Whoop recovery dropped from 68% to 42% this week. Consider slowing to 0.5kg/week to protect recovery."
- "Your muscle mass has been stable at 42.1% through 2.2kg of total loss. This is ideal — you're losing fat, not muscle."
- "Warning: Withings shows you dropped 1.8kg in 10 days. Your absolute power is down 4W while W/kg is flat. Combined with Whoop recovery averaging 42% (vs 68% last week), the rate may be too aggressive."

### 1C. Hydration Impact

**What to look for:** Pre-ride Withings hydration % correlated with cardiac drift and efficiency factor during rides.

**Example insights:**
- "Pre-ride hydration was 62% (below your 65% baseline). Combined with 95°F heat, this likely added 2-3% to your cardiac drift."
- "On days your pre-ride hydration is ≥65%, your average EF is 0.12 higher. Today's low hydration cost you real watts."
- "Weigh yourself before and after rides to track sweat rate. Today you lost 2.3kg in 3 hours at 95°F — that's ~770ml/hr. You only drank ~500ml/hr. Increase to 700-800ml/hr in these conditions."

### 1D. Race Weight Projection

**What to look for:** Current weight trend projected to race date, combined with power trend, to predict race-day W/kg and performance.

**Example insights:**
- "Your hillclimb is in 18 days. At current loss rate (-0.5kg/week), you'll be ~86.4kg = 3.45 W/kg. Projected VAM of ~1,340 m/hr on 7.4% — roughly 38:20 for the 8.2km climb. Every kg lost saves ~18 seconds. But below 86kg at your lean mass risks power loss."
- "At current trajectory, race-day weight will be 87.2kg. With your FTP trend (298W → projected 302W), that puts you at 3.46 W/kg — a 0.11 improvement over your last race."

### 1E. System Weight & Climbing Physics

**What to look for:** Calculate gravity power from total system weight (rider + bike + gear) at specific gradients ridden today.

**Example insights:**
- "At your current 89.0kg + 7.8kg bike (96.8kg system weight), you needed 267W to maintain 16 km/h on the 6% grades today. Every 1 lb (0.45kg) shifts that by ~1.5W."
- "Your recent 0.8kg drop saved you ~3.5W on every climb today — that's free speed with zero additional effort."

---

## CATEGORY 2: Sleep Architecture → Next-Day Performance

**Required sources:** Oura/Whoop/EightSleep (sleep stages, HRV, sleep timing) + Strava/Wahoo/Garmin (ride data)

### 2A. Deep Sleep → Power Output

**What to look for:** Deep sleep duration from last night correlated with today's NP, EF, and cardiac drift. Build personal correlation over 60+ days.

**Example insights:**
- "Your 5 best rides in the last 90 days all followed nights with >1h 30m deep sleep. Last night you got 48 minutes."
- "Deep sleep below 60 minutes has preceded a 6-12% NP drop in 8 out of 10 occurrences in your data."
- "Deep sleep was 48 min last night (avg: 1h 42m) and HRV dropped to 38ms. This likely explains the 8.1% cardiac drift — on Feb 18 with similar power but 72ms HRV, drift was only 3.2%."

### 2B. REM Sleep → Tactical & Cognitive Performance

**What to look for:** REM sleep duration correlated with decision-quality in races (hard to measure directly, but correlate with pacing evenness and late-race power consistency).

**Example insights:**
- "Low REM (<1h 15m) correlates with worse reaction times and tactical decisions — relevant for crit racing. Last night: 1h 04m."
- "Your REM sleep was only 1h 04m (avg 2h 12m). Combined with +0.8°C skin temp deviation from Oura, this inflammatory pattern has preceded 6-8% power drops in 3 previous occurrences."

### 2C. Sleep Timing → Performance

**What to look for:** Sleep onset time from Oura/Whoop correlated with next-day EF and power output. Identify the athlete's optimal sleep window.

**Example insights:**
- "Your best performances (top 10% by EF) follow nights where you fell asleep before 10:15 PM. Average sleep onset for your worst 10%: 11:42 PM."
- "Every 30 minutes past 10 PM correlates with a 1.8% decrease in next-day EF in your data."
- "You tend to sleep worse after rides ending past 6 PM. Tomorrow's interval session is planned for 5:30 PM — consider moving it to morning if possible."

### 2D. EightSleep Bed Temperature → Sleep Quality

**What to look for:** Bed temperature setting correlated with deep sleep duration and morning HRV.

**Example insights:**
- "Deep sleep is 34% higher at -4°C vs -1°C bed temp. This translates to approximately 4-6ms higher morning HRV."
- "Your optimal bed temp varies by season: -2°C in winter, -5°C in summer. Current setting (-1°C) is too warm for this time of year."
- "Tonight set bed to -4°C and lights out by 10 PM. Based on your recovery curves, HRV should rebound 15-20ms within 48 hours."

### 2E. Total Sleep Duration → Recovery & Power

**What to look for:** Total sleep hours over rolling 3-night and 7-night windows correlated with recovery scores and ride quality.

**Example insights:**
- "Your 3-night sleep average is 5h 52m — well below your 7h 20m baseline. Expect 2-3 more days of suppressed HRV before recovery normalizes."
- "On rides following 7h 30m+ sleep, your NP is on average 8W higher than after sub-6h nights. That's a free ~3% gain from sleep alone."
- "Your NP drops 8% from hour 2 to hour 3 on rides. On rides with better sleep (>7h 30m the night before), the fade is only 3%. Sleep is the differentiator here, not fitness."

---

## CATEGORY 3: HRV Patterns → Training Prescription

**Required sources:** Oura/Whoop (HRV, resting HR) + Strava/Wahoo/Garmin (training load)

### 3A. Personalized HRV Thresholds

**What to look for:** Build the athlete's personal HRV distribution over 90 days. Identify their green/yellow/red zones. Don't use population averages — use THEIR data.

**Example insights:**
- "Your HRV below 45ms predicts 3-5 days of reduced performance. Current: 38ms. Recommendation: Z1/Z2 only until HRV rebounds above 55ms."
- "Morning HRV of 72ms puts you in the top quartile of your 90-day range. Green light for VO2max work."
- "Your 7-day HRV coefficient of variation is 28% — above the 20% overtraining threshold. This volatility, more than the absolute number, suggests accumulated stress."

### 3B. HRV × Training Load Interaction

**What to look for:** How quickly HRV recovers after different training loads. Build a personal dose-response curve.

**Example insights:**
- "Your HRV recovers fastest (avg 2.1 days to baseline) after rides with TSS < 150. After TSS > 200, recovery takes 3.8 days on average."
- "When you do VO2 intervals on days with HRV > 60ms, your 5-min power averages 12W higher than on days below 60ms."
- "Your overnight HRV has declined 74ms → 62ms → 38ms over 3 nights. Historically, when this happens, your NP drops 8-14% on comparable efforts."

### 3C. HRV → Readiness Traffic Light

**What to look for:** Synthesize HRV + resting HR + sleep quality + recent training load into a single daily readiness assessment.

**Example insights:**
- "🟢 Green: HRV 72ms (top quartile), RHR 47 (baseline), sleep score 88. Go hard today — your body can absorb intensity."
- "🟡 Yellow: HRV 52ms (mid-range), RHR 50 (+3 above baseline), sleep was 6h 20m. Moderate training only — sweet spot or tempo, not VO2."
- "🔴 Red: HRV 38ms (bottom 10%), RHR 54 (+7), sleep score 61, HRV declining for 3 consecutive days. Recovery day. Walk, stretch, sleep early."

---

## CATEGORY 4: Environmental Performance Modeling

**Required sources:** Strava/Garmin (GPS, temp, altitude) + Oura (SpO2) + weather data

### 4A. Heat Adaptation Tracking

**What to look for:** Track power:HR ratio at different temperatures over weeks/months. Detect when heat adaptation is occurring (the gap narrows).

**Example insights:**
- "Power:HR at 95°F today was 1.79 W/bpm vs 1.83 at 68°F — only a 2.2% gap. Early summer, the gap was 21%. Your heat adaptation is nearly complete."
- "Your heat penalty model: for every 10°F above 70°F, you lose approximately 2.1% of NP. This has improved from 4.8% in June."
- "For your race, if temps exceed 90°F, you'll lose <3% power vs. cooler conditions. Pre-cool with ice slurry for an additional 1-2% hedge."

### 4B. Altitude Impact

**What to look for:** Power output changes at different elevations. SpO2 changes from Oura after altitude exposure.

**Example insights:**
- "At 6,000ft, your historical power drops 5-8%. At sea level your FTP is effectively ~310W."
- "Your SpO2 from Oura dropped to 94% after last weekend's altitude exposure — allow 48h extra recovery."
- "You've been riding at 4,500ft 3x/week for a month. Your power at altitude has improved from -7% to -4% vs sea level — altitude acclimatization is working."

### 4C. Wind-Adjusted Power

**What to look for:** GPS data shows heading vs wind direction. Adjust apparent performance for wind conditions.

**Example insights:**
- "Headwind data from your GPS shows you spent 55% of today's ride into 15+ mph wind. Your speed-adjusted power was actually higher than it looks."
- "Your average speed was 3 km/h slower than last week's comparable effort, but NP was identical. The difference was entirely wind — don't let the speed fool you."

---

## CATEGORY 5: Fatigue Signature Analysis

**Required sources:** Strava/Wahoo/Garmin (power streams with L/R balance, cadence, per-lap or per-hour splits)

### 5A. L/R Balance Under Fatigue

**What to look for:** How L/R power balance shifts as ride duration increases. Consistent shifts suggest bike fit or muscular imbalances.

**Example insights:**
- "Your L/R shifts from 51/49 to 53/47 after 2 hours, worse on steep climbs >6%. This pattern appeared in 4 of 6 recent long rides — suggests a bike fit issue or hip/glute imbalance."
- "Your L/R balance stayed within 50.5/49.5 for the entire 4-hour ride. This is excellent stability — no fatigue-related compensations."

### 5B. Cadence Decay

**What to look for:** Self-selected cadence dropping over ride duration, especially in final hour.

**Example insights:**
- "Your self-selected cadence drops from 90 to 82 rpm in the final hour. Fatigued riders who maintain cadence produce 3-5% more power — try a cadence target alert."
- "On races where you held cadence above 85 in the final 30 minutes, your finishing power was 6% higher. Work on high-cadence endurance drills."

### 5C. Power Fade Patterns

**What to look for:** NP decline hour-by-hour. Correlate with sleep quality, fueling, and training load.

**Example insights:**
- "Your NP drops 8% from hour 2 to hour 3. On rides with better sleep (>7h 30m), the fade is only 3%. Recovery is the differentiator, not fitness."
- "Your match-burning capacity (efforts >120% FTP) drops by 40% after hour 2. Consider saving hard efforts for early in races."
- "You faded 12% in hour 3. On rides where you consumed >60g carbs/hour, fade was only 4%. Likely under-fueled today."

### 5D. Pacing Intelligence

**What to look for:** Even pacing vs positive/negative splits. Correlate pacing strategy with overall performance.

**Example insights:**
- "You went out 8% above your average NP in the first 30 minutes. Your second-half fade was 11%. On rides where you start within 3% of target, your overall NP is 4% higher."
- "Negative split today — second half NP was 6W higher than first half. This pacing pattern correlates with your best performances and lowest cardiac drift."

---

## CATEGORY 6: Long-Term Training Adaptations

**Required sources:** Strava/Wahoo/Garmin (90+ days of activities) + daily_metrics (CTL/ATL/TSB history)

### 6A. Dose-Response Modeling

**What to look for:** Volume at specific intensity zones correlated with FTP/power changes with a time delay (typically 4-8 weeks).

**Example insights:**
- "You've accumulated 312 minutes between 88-105% FTP in the last 8 weeks. Your FTP rose from 290W → 298W during this period. Historically, your FTP responds to threshold volume with a ~6 week delay."
- "You've done only 12 minutes above 105% FTP in 3 weeks. VO2max responds to stimulus — add 2× weekly sessions."
- "Your Z2 volume (14.5 hrs/week × 4 weeks) is correlating with improved EF. This is the classic base-building response."

### 6B. Periodization Intelligence

**What to look for:** CTL/ATL/TSB patterns that preceded the athlete's best performances. Build a personal "peak formula."

**Example insights:**
- "Your CTL rose from 72 to 85 over 12 weeks with 3 rest weeks. Ramp rate of 5.2 TSS/week is sustainable."
- "Historical pattern: your best race performances come at CTL 78-85 with TSB +15 to +20."
- "You're in week 3 of a build block. Historically, your performance peaks 2 weeks after the highest training load week."
- "Your ramp rate hit 8.2 TSS/week — above the 7 TSS/week overtraining threshold. Back off this week."

### 6C. Year-Over-Year Progress

**What to look for:** Same metrics compared to same time period last year.

**Example insights:**
- "Your FTP is 298W vs 285W at this time last year (+4.6%). Your weight is 89kg vs 91kg (+2.2% W/kg improvement)."
- "Your CTL progression is 3 weeks ahead of last year's schedule. If you follow a similar periodization, you'll peak 3 weeks earlier."
- "Your EF this March (1.89) is 7% higher than March last year (1.77). Your aerobic base is significantly better this season."

### 6D. Strain × Recovery Balance

**What to look for:** Whoop strain vs recovery trend over 7-14 days. Detect when strain consistently exceeds recovery capacity.

**Example insights:**
- "7-day cumulative strain: 18.4 (daily avg: 15.2), but recovery averaging only 48%. You're accumulating more fatigue than you're absorbing."
- "Your ATL (92) is 8% above CTL (85) — productive overreach, but approaching the red line. One more heavy week without a deload risks overtraining."
- "Whoop strain exceeded recovery for 10 of the last 14 days. Your RHR has crept from 48 to 54 bpm. Mandatory rest day tomorrow."

---

## CATEGORY 7: Nutrition & Fueling Intelligence

**Required sources:** MyFitnessPal/Cronometer (calorie/macro intake) + Supersapiens/Levels (CGM) + Strava (ride data)

### 7A. Fueling → Power Fade

**What to look for:** Carb intake per hour during rides correlated with power fade in hour 3+.

**Example insights:**
- "Your power faded 12% in hour 3. On rides where you consumed >60g carbs/hour, fade was only 4%. Likely under-fueled today."
- "You've been averaging 45g carbs/hour on long rides. Research supports 90-120g/hr for efforts over 2.5 hours. Train your gut to handle more."

### 7B. Glucose Monitoring (CGM)

**What to look for:** Real-time glucose drops during rides correlated with perceived effort spikes and power drops.

**Example insights:**
- "Your glucose (Supersapiens) dropped below 80 mg/dL at the 2h mark. This correlates with your perceived effort spike. Start fueling earlier — first gel at 30 minutes."
- "Your glucose stability during rides improved from ±25 mg/dL to ±12 mg/dL after switching to mixed carb sources. Keep this fueling strategy."

### 7C. Caloric Balance → Recovery

**What to look for:** Daily caloric deficit/surplus correlated with next-day HRV and recovery scores.

**Example insights:**
- "You burned 2,840 kcal today but logged only 1,900 kcal intake. A deficit of 940 kcal after a 3h ride will impair recovery — expect lower HRV tomorrow."
- "On days you eat >2g protein per kg bodyweight, your next-morning muscle mass readings are 0.2% higher. You're averaging 1.6g/kg."

### 7D. Pre-Ride Nutrition Timing

**What to look for:** Time of last meal before ride correlated with first-hour power and GI complaints.

**Example insights:**
- "Your best first-hour power numbers come when you eat 2-3 hours pre-ride. Today you ate 45 minutes before — and your first-hour NP was 5% below target."
- "You've had GI issues on 3 of 4 rides where you ate <90 minutes before. Move your pre-ride meal earlier or switch to liquid calories."

---

## CATEGORY 8: Predictive Analytics

**Required sources:** 90+ days of training data + power profile + race calendar

### 8A. Race-Day FTP Prediction

**What to look for:** FTP trend + CTL trajectory extrapolated to race date.

**Example insights:**
- "Based on your CTL trajectory and FTP trend, your predicted FTP on race day (18 days) is 300-304W."
- "If you follow the recommended taper, your predicted race-day TSB will be +17 — historically your sweet spot."

### 8B. Event Time Prediction

**What to look for:** VAM trend + projected weight + course gradient to estimate finish times.

**Example insights:**
- "Based on your VAM trend and projected weight, your estimated time for the Mt. Tam hillclimb is 38:20 ± 1:30."
- "At your current FTP of 298W and projected race weight of 87kg on a 7.4% avg gradient, you'll produce ~1,340 VAM. That's competitive for a top-20 finish based on last year's results."

### 8C. Taper Protocol

**What to look for:** Days until target event + current CTL/ATL/TSB + historical peak performance TSB values.

**Example insights:**
- "CTL 85, TSB -7. Race in 18 days → begin taper in ~4 days. Reduce volume 40% next week, maintain 2 short intensity sessions (10-12 min total at VO2/threshold). Target TSB +15 to +20 by race day."
- "Predicted race-day CTL: ~80. Your best performances have come at CTL 78-85. You're right in the window."

### 8D. Power Profile Shape → Race Target Matching

**What to look for:** Athlete's power profile (sprint, VO2, threshold, endurance) mapped against demands of their goal event.

**Example insights:**
- "Your power curve shows sprint (5s) and threshold (20m) are strengths. VO2max (5m) is your limiter — addressing this could unlock 15-20W."
- "Your profile matches a rouleur/time trialist — strong sustained power, decent sprint, but a ceiling on repeated hard efforts. Consider if your race targets match this profile."
- "For your goal race (Mt. Tam Hillclimb), threshold and 20-min power matter most. Your 20-min is Cat 2 — competitive. But the final 2km kicks to 9% gradient, where you'll need VO2 power."

---

## CATEGORY 9: Benchmarking & Classification

**Required sources:** Power profile (computed from Strava/Wahoo/Garmin activities)

### 9A. Coggan Power Classification

**What to look for:** Athlete's best efforts at 5s, 1m, 5m, 20m, 60m compared to Coggan power profile tables by sex and weight.

**Example insights:**
- "Your 20-min power of 298W (3.35 W/kg) classifies as solid Cat 2. World Tour riders at your weight hold ~570W (6.40 W/kg). Domestic pros: ~498W (5.60 W/kg). You're 22W away from Cat 1."
- "Your VO2max (5-min) is your biggest limiter at Cat 3 (3.99 W/kg). Your threshold and sprint are both Cat 2. Closing this VO2 gap is the single highest-ROI training adaptation."
- "At age 32, you have ~3-5 peak years before age-related decline begins. Your current Cat 2 threshold is in the top 12% for your age bracket."

### 9B. Weakest Link Identification

**What to look for:** The power duration with the lowest classification relative to others. This is the bottleneck.

**Example insights:**
- "Your VO2/FTP ratio is 1.19 — well below the 1.25 target for balanced riders. That gap between your 5-min and 20-min classification is your biggest limiter."
- "You need +25W at 5-min to reach Cat 2. That's 0.28 W/kg — achievable in 6-8 weeks of targeted VO2 work."

### 9C. Age-Adjusted Percentile Ranking

**What to look for:** Athlete's power compared to age/sex/weight cohort using population data.

**Example insights:**
- "For a 32-year-old male at 89kg, your threshold is in the 88th percentile but your VO2max is only 62nd percentile."
- "Performance naturally declines ~1-2% per year after 35. Your current numbers adjusted for age put you in the equivalent of Cat 1 for a 25-year-old."

---

## CATEGORY 10: Menstrual Cycle Intelligence

**Required sources:** Oura (temperature data for auto-detection) OR manual logging + all other data sources

### 10A. Cycle Phase Detection

**What to look for:** Basal body temperature rise of 0.3-0.5°C indicating ovulation. Map to four phases: menstrual (days 1-5), follicular (days 6-13), ovulatory (days 14-16), luteal (days 17-28).

### 10B. Luteal Phase Adjustments

**Example insights:**
- "You're in your luteal phase (day 22). Your HR is 5bpm higher at the same power — this is normal hormonal response, not a fitness decline."
- "Core body temperature is 0.3-0.7°C higher in luteal phase. In hot conditions, you may reach thermal strain sooner. Pre-cool before hot rides, increase hydration by 300-500ml."
- "Your EightSleep should be set to -5°C (vs usual -3°C) to compensate for elevated body temp overnight during luteal phase."

### 10C. Late Luteal / Pre-Menstrual

**Example insights:**
- "You're in the late luteal phase. 40% of elite female athletes report this as their worst-performing phase (Jones et al., 2024). Your RPE may not match your power — don't force intensity."
- "Increase carbohydrate intake — progesterone increases carb oxidation in this phase, so your body burns through glycogen faster."
- "If you have flexibility, schedule your hardest session for 3-4 days from now (early-mid follicular)."

### 10D. Follicular Phase Opportunity

**Example insights:**
- "Estrogen is peaking and progesterone is still low. This may be a favorable window for your hardest VO2max or sprint sessions."
- "Body temperature is at its lowest baseline — hot-weather performance may be slightly better."
- "Your best 5-min efforts in the last 6 months occurred on cycle days 8-12 (late follicular). Consider scheduling key workouts in this window."

### 10E. Personal Cycle Patterns (After 3+ Cycles)

**Example insights:**
- "Over your last 5 cycles, your average NP is 4.2% lower on luteal days 22-26. This is your personal 'caution window.'"
- "Your HRV drops an average of 8ms in the 3 days before menstruation. We'll factor this into your readiness score."
- "Your cardiac drift is 2.1% higher during luteal phase rides vs. follicular. This accounts for roughly half the drift variation in your data."

### 10F. Hormonal Contraception Adjustments

**Example insights:**
- "You're using hormonal contraception, which modifies the typical cycle patterns. The insights below are based on your individual Oura data patterns rather than standard cycle phase assumptions."
- "On the pill, your temperature pattern is more stable but still shows variation in the active vs. placebo weeks. Your Oura data shows a slight temperature bump in week 3 that we'll track."

### Design Principles for Cycle Insights
- Always opt-in. Never assumed or forced.
- Science-backed, not prescriptive. "Research suggests..." not "You should..."
- Individual patterns trump population averages after 3+ cycles.
- Every insight includes citations to peer-reviewed research.
- Sensitivity in language — no patronizing tone, no assumptions.
- Cycle data is encrypted and never shared in community benchmarks.

---

## CATEGORY 11: Performance Booster Cross-References

**Required sources:** Active boosters (from user_settings) + ride data + recovery data

### 11A. Supplement Impact Detection

**What to look for:** Performance changes after starting a booster protocol. Compare pre/post metrics.

**Example insights:**
- "Your beetroot juice protocol (started 12 days ago) may have contributed to the 3% higher 5-min power this week. Beetroot juice is strongest for efforts of 1-8 minutes."
- "You've been taking creatine for 3 weeks. Your sprint power (5s) is up 4.2% — consistent with the 3-5% improvement shown in research for short, maximal efforts."
- "Your caffeine timing has been inconsistent — 3 of your last 5 hard rides had caffeine <30 minutes before. Optimal timing is 45-60 minutes pre-ride for peak blood concentration."

### 11B. Protocol Compliance Tracking

**What to look for:** Whether the athlete actually followed their booster protocol and correlate compliance with outcomes.

**Example insights:**
- "You followed your beetroot juice protocol 5 of 7 days this week. On the 2 missed days, your 5-min power was 8W lower — though this could be confounded by other factors."
- "Your heat acclimation protocol calls for 30-min sauna sessions 3×/week. You've done 1 in the last 2 weeks. Consider resuming — your heat tolerance gains will start reversing after ~2 weeks without stimulus."

### 11C. Recovery Booster Recommendations

**What to look for:** When recovery is low, suggest relevant boosters from the library.

**Example insights:**
- "Your recovery has been below 50% for 4 of the last 7 days. Consider the tart cherry juice protocol — research shows it reduces muscle soreness markers by 13% and may improve sleep quality."
- "Your VO2max is your limiter → see the Altitude Training booster for protocols that can improve oxygen delivery without moving to the mountains."

---

## CATEGORY 12: Blood Work → Training Impact

**Required sources:** Blood panels (uploaded PDFs) + training data + power profile

### 12A. Iron & Endurance

**What to look for:** Ferritin levels correlated with VO2max/endurance performance. Use athlete-optimal ranges (>50 ng/mL), not clinical ranges (>12 ng/mL).

**Example insights:**
- "Your ferritin dropped from 68 to 42 ng/mL over 3 months. This coincides with your VO2max plateau. While still 'normal' clinically, athlete-optimal ferritin is >50. Consider iron supplementation under medical guidance."
- "Your ferritin is 38 — below the athlete-optimal threshold of 50. Combined with your hemoglobin at the low end of normal (13.8 g/dL), this may be limiting your oxygen-carrying capacity."

### 12B. Vitamin D & Performance

**What to look for:** Vitamin D levels (athlete-optimal 50-80 ng/mL) correlated with injury history, immune function, and power output.

**Example insights:**
- "Your Vitamin D is 28 ng/mL — below athlete-optimal (50-80). Low D is associated with increased stress fracture risk and reduced testosterone. Supplementing with 4000-5000 IU daily is standard for athletes with your level."
- "Your D level improved from 28 to 56 ng/mL over 3 months of supplementation. This coincides with your improved injury-free streak and 3% power gain."

### 12C. Thyroid Function

**What to look for:** TSH, free T3, free T4 trends — undertrained/overtrained athletes often show thyroid suppression.

**Example insights:**
- "Your TSH crept from 1.8 to 3.2 over 6 months while training volume increased 30%. This may indicate early thyroid suppression from overtraining. Consider a deload period and retest in 6 weeks."

### 12D. Inflammation Markers

**What to look for:** CRP (C-reactive protein) trends correlated with training load and recovery quality.

**Example insights:**
- "Your CRP rose from 0.5 to 2.1 mg/L — still below the clinical threshold but elevated for you. This low-grade inflammation coincides with your 3 weeks of heavy training without a deload. Expect suppressed HRV until inflammation resolves."

### 12E. Hormonal Health

**What to look for:** Testosterone and cortisol levels as indicators of recovery capacity and overtraining risk.

**Example insights:**
- "Your testosterone-to-cortisol ratio has dropped 15% since your last panel. This pattern is associated with accumulated training stress. Your body's anabolic capacity is being outpaced by catabolic stress."

---

## CATEGORY 13: DEXA Scan → Power & Body Composition

**Required sources:** DEXA scans (uploaded) + training data + Withings data

### 13A. Lean Mass → W/kg Accuracy

**What to look for:** DEXA lean mass provides the most accurate W/kg denominator. Compare to Withings estimates.

**Example insights:**
- "DEXA shows 64.2kg lean mass vs Withings estimate of 65.8kg. Your true FTP per lean kg is 4.64 — higher than the Withings-based estimate of 4.53."
- "Your DEXA lean mass increased 0.8kg over 4 months while total weight dropped 1.2kg. Your W/kg improvement is 70% from fat loss and 30% from power gains — ideal progression."

### 13B. Regional Imbalances

**What to look for:** Left vs right leg lean mass differences that may correlate with L/R power imbalances.

**Example insights:**
- "DEXA shows your left leg has 0.4kg less lean mass than your right. This may explain the 52/48 L/R power imbalance that appears on steep climbs. Consider single-leg strength work."

### 13C. Visceral Fat Tracking

**What to look for:** Visceral fat area trends — even in lean athletes, visceral fat is a health marker.

**Example insights:**
- "Your visceral fat dropped from 62 to 48 cm² over 6 months of consistent training. This is in the excellent range for health and performance."

---

## ADDING NEW INSIGHTS

When you discover a new pattern or receive user feedback about an insight they loved, add it here following this template:

```
### [Number][Letter]. [Insight Name]

**What to look for:** [The data pattern across sources]

**Required sources:** [Which integrations must be connected]

**Example insights:**
- "[Specific example with real-looking numbers and cause → effect]"
- "[Another variation]"

**Confidence:** [High/Medium/Low — based on scientific evidence]
```

### Insight Quality Checklist
Before adding a new insight, verify:
- [ ] It connects 2+ data sources (this is the whole point of AIM)
- [ ] It uses specific numbers, not vague statements
- [ ] It tells the athlete something they can't get from any single app
- [ ] It includes a cause → effect explanation
- [ ] It has an actionable takeaway
- [ ] It's grounded in exercise science (cite research if applicable)
- [ ] It references the athlete's OWN data and history, not just generic advice

---

## SYSTEM PROMPT INTEGRATION

When building the AI system prompt, include the category descriptions and 2-3 example insights per category. The system prompt should instruct Claude to:

1. **Scan all available data** for patterns matching these categories
2. **Prioritize cross-domain insights** (connecting 2+ data sources) over single-source observations
3. **Use the athlete's actual numbers** — never generic statements
4. **Compare to their own history** before comparing to benchmarks
5. **Include one actionable recommendation** per insight
6. **Assign confidence levels** based on how much supporting data exists
7. **Reference boosters, blood work, and cycle phase** when relevant and available
8. **Build personal models over time** — the insights should get more personalized as more data accumulates (e.g., "after 3+ cycles" or "based on your last 60 rides")

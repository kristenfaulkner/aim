# APEX — Product Blueprint
## The AI-Powered Performance Intelligence Platform for Endurance Athletes

---

## 1. VISION & POSITIONING

**One-liner:** Apex is the performance intelligence layer that sits on top of all your health and fitness data — replacing 8 tabs, 3 coaches, and the spreadsheet you'll never update.

**The problem:** Serious athletes use 5-10 different apps/devices. Strava has the social, Wahoo has the ride data, Oura has recovery, Whoop has strain, EightSleep has sleep, Withings has body composition. No single tool connects them, and none of them have truly intelligent analysis. Coaches charge $200-500/month and still miss patterns a model with access to all data would catch instantly.

**Who it's for (in priority order):**
1. Competitive cyclists (Cat 1-5, masters racers, triathletes)
2. Serious amateurs who train 8-15+ hrs/week and care about data
3. Coaches who want AI-augmented analysis for their athletes
4. Eventually: runners, triathletes, swimmers, multisport

**Why now:** The Claude API can do what no hardcoded algorithm can — it can reason about multivariate physiological data, contextualize it historically, and explain it in natural language the way a world-class coach would. This is the first time AI can actually be the "coach brain" that connects all the data sources.

---

## 2. INTEGRATIONS (Priority Order)

### Tier 1 — Launch (Cycling Core)
| Platform | Data | API |
|----------|------|-----|
| **Wahoo ELEMNT** | Ride files (.FIT), structured workouts, power, HR, cadence, GPS, temperature | Wahoo Cloud API |
| **Strava** | Activities, segments, social, routes | Strava OAuth API |
| **Garmin Connect** | Activities, body battery, stress, daily HR, FirstBeat metrics | Garmin Health API |
| **TrainingPeaks** | TSS/CTL/ATL, workout library, planned workouts, WKO metrics | TrainingPeaks API |

### Tier 2 — Recovery & Body
| Platform | Data | API |
|----------|------|-----|
| **Oura Ring** | HRV, RHR, sleep stages, readiness score, body temperature | Oura Cloud API v2 |
| **Whoop** | Strain, recovery, HRV, sleep performance, respiratory rate | Whoop Developer API |
| **EightSleep** | Bed temperature, sleep/wake times, tosses/turns, HRV during sleep | EightSleep API |
| **Withings** | Weight, body fat %, muscle mass, hydration, bone mass | Withings Health Mate API |

### Tier 3 — Advanced
| Platform | Data | API |
|----------|------|-----|
| **Apple Health** | Aggregate health data, VO2max estimate, walking asymmetry | HealthKit |
| **Supersapiens / Levels** | Continuous glucose monitoring during rides | CGM APIs |
| **MyFitnessPal / Cronometer** | Nutrition, macros, calorie intake | MFP API |
| **Moxy / Humon** | SmO2 (muscle oxygen) data | BLE / .FIT file parsing |
| **TrainerRoad** | Adaptive training plans, workout compliance | TR API |
| **Intervals.icu** | Advanced analytics, eFTP tracking | Intervals API |

### How Integrations Work
- OAuth2 flow for all major platforms (user clicks "Connect Strava" → redirects → tokens stored)
- .FIT file parsing as a fallback (drag-and-drop upload)
- Webhooks where available for real-time sync (Strava, Garmin)
- Background sync every 15 minutes for all connected services
- Data normalization layer that maps all sources to a unified athlete data model

---

## 3. DATA MODEL & INTELLIGENCE ARCHITECTURE

### The Unified Athlete Profile
Every piece of data feeds into a unified profile that Claude has access to:

```
Athlete Profile
├── Identity (age, weight, height, FTP, LTHR, max HR, training history)
├── Current Fitness State
│   ├── CTL (chronic training load / fitness)
│   ├── ATL (acute training load / fatigue)
│   ├── TSB (training stress balance / form)
│   ├── VO2max estimate
│   └── Power profile (5s, 1m, 5m, 20m, 60m bests, 90-day rolling)
├── Recovery State (daily)
│   ├── HRV (morning + overnight trend)
│   ├── RHR (resting heart rate trend)
│   ├── Sleep quality & architecture
│   ├── Readiness composite score
│   └── Body temperature deviation
├── Body Composition (weekly)
│   ├── Weight trend
│   ├── Body fat %
│   ├── Muscle mass
│   └── Hydration level
├── Training History (all time)
│   ├── Every ride with full data
│   ├── Power curve evolution over time
│   ├── Zone distribution trends
│   ├── Workout compliance / consistency
│   └── Performance benchmarks by condition (heat, altitude, fatigue)
├── Environmental Context
│   ├── Weather (temp, humidity, wind) for each ride
│   ├── Altitude/elevation profiles
│   └── Air quality
└── Goals & Events
    ├── Target events with dates
    ├── Goal FTP / power targets
    └── Training plan phase (base, build, peak, taper, recovery)
```

### How Claude Gets Context

Before Claude analyzes a workout, it receives a structured context payload:

```
1. The current workout data (power, HR, cadence, GPS, temperature, every second)
2. The athlete's current fitness state (CTL/ATL/TSB, power profile, recent trend)
3. The last 7-14 days of workouts (for pattern matching)
4. The last 90 days of key metrics (for trend analysis)
5. Recovery data from the last 48 hours
6. The athlete's goals and upcoming events
7. Historical benchmarks (same route, similar conditions, seasonal comparisons)
8. Body composition trends
```

This context window is carefully constructed to give Claude everything it needs to produce world-class analysis without exceeding token limits. Summaries and key metrics are pre-computed; raw data is included only for the current workout.

---

## 4. AI ANALYSIS ENGINE — THE CORE PRODUCT

### Post-Workout Auto-Analysis
After every synced workout, Claude generates a structured analysis card with:

**Workout-Level Insights:**
- Power analysis: normalized power, variability index, intensity factor
- HR-power coupling/decoupling (cardiac drift %)
- Zone distribution vs. planned workout
- Left/right power balance and how it changes with fatigue
- Cadence patterns (climbing vs. flat, fresh vs. fatigued)
- Pacing analysis (negative/positive split, even pacing score)
- Efficiency metrics (power per heartbeat trends)

**Contextual / Comparative Insights (this is what makes Apex special):**
- "Your power:HR ratio was 1.42 W/bpm today at 95°F. On a similar effort at 68°F three weeks ago it was 1.45. You're heat-adapted."
- "Your L/R balance shifted from 51/49 to 53/47 in the final hour, specifically on climbs >6%. This pattern appeared in 4 of your last 6 long rides."
- "This was your highest IF (0.91) for a ride over 3 hours this year. Your previous best was 0.87 in April."
- "Your 20-min power today (298W) is +5W over your last FTP test but your VO2max 5-min power has been flat. Consider more 3-5 min intervals."

**Macro-Level Training Insights:**
- Training load trajectory and recommendations
- Taper timing for upcoming events
- Training phase appropriateness (are you doing the right work for where you are in your plan?)
- Overtraining risk assessment
- Recovery recommendations based on combined sleep/HRV/strain data

### The Claude Chatbot
A persistent chat interface where athletes can ask questions like:
- "Should I do my intervals tomorrow or take a rest day?"
- "How has my climbing power changed since January?"
- "Compare my performance this build block vs. last year's"
- "What's my biggest limiter right now?"
- "Design me a 3-week VO2max block"
- "I'm racing on Saturday, what should my week look like?"
- "Why was my HR so high on today's ride?"
- "How does my sleep affect my next-day power?"

Claude has full access to the athlete's data profile and can query/analyze it conversationally.

### Recovery Intelligence Engine (Cross-Domain Analysis)

This is the feature that no competitor has and no hardcoded algorithm can replicate. Claude connects data from sleep trackers, recovery wearables, body composition scales, and ride data to produce insights that span multiple domains.

**Sleep → Performance Correlations:**
- "Your deep sleep was 48 min last night (avg: 1h 42m) and HRV dropped to 38ms. This likely explains the 8.1% cardiac drift today — on Feb 18 with similar power but 72ms HRV, drift was only 3.2%."
- "Across your last 60 rides, your best performances follow nights where you were asleep before 10:15 PM with 7h 30m+ total. Last night: 11:48 PM, 6h 10m."
- "Your REM sleep was only 1h 04m (avg 2h 12m). Combined with +0.8°C skin temp deviation from EightSleep, this inflammatory pattern has preceded 6-8% power drops in 3 previous occurrences."

**HRV → Training Readiness:**
- "Your HRV has declined from 74ms → 62ms → 38ms over 3 nights. When HRV drops below 45ms for 2+ days, your historical performance suffers for 3-5 days. Skip the planned intervals tomorrow."
- "Your 7-day HRV coefficient of variation is 28% — above the 20% threshold that typically precedes overtraining. Consider a deload week."
- "Your morning HRV was 72ms — in the top quartile of your 90-day range. Green light for today's VO2max session."

**Body Composition → Performance:**
- "You've lost 1.8kg in 10 days (faster than target 0.5kg/week). Absolute power is down 4W while W/kg is flat. Combined with Whoop recovery averaging 42% (vs 68% last week), you're cutting too aggressively."
- "Your body fat has dropped from 14.2% to 12.4% over 8 weeks while FTP rose 8W. Your W/kg improvement (+0.18) is 60% from power gains and 40% from weight loss — healthy ratio."

**Environmental + Recovery Compounding:**
- "Today's 95°F ride with only 34% Whoop recovery was a double stress event. Your power:HR dropped 18% vs. a similar temperature ride when you were fully recovered (Feb 12, recovery 82%). Heat tolerance and recovery state compound."
- "Your altitude exposure last weekend (8,200ft) plus 3 nights of poor sleep is an unusual stress combination. Your SpO2 from Oura dropped to 94% last night. Give yourself extra recovery time."

**Actionable Recovery Recommendations:**
- "Set your EightSleep to -4°C tonight — your deep sleep is 34% higher at that setting vs -1°C."
- "Based on your data, your optimal sleep window is 9:45 PM - 5:30 AM. You've been averaging 11:20 PM lately, losing ~45 min of deep sleep per night."
- "Your HRV responds best to evening walks (30+ min) on rest days. On days you walked 30+ min, next-morning HRV was 12ms higher on average."
- "You tend to sleep worse after rides ending past 6 PM. Tomorrow's interval session is planned for 5:30 PM — consider moving it to morning if possible."

**Recovery Score Methodology:**
Apex computes a composite recovery score (0-100) by weighting:
- HRV relative to personal baseline (30%)
- Sleep quality: deep + REM duration, efficiency, timing (25%)
- RHR deviation from baseline (15%)
- Whoop/Oura readiness score (15%)
- Body temperature deviation (10%)
- Recent training load context (5%)

The score is color-coded: Green (70+) = ready for intensity, Yellow (45-69) = moderate training only, Red (<45) = recovery recommended. Claude explains WHY the score is what it is, not just the number.

## 5. AUTO-CALCULATED METRICS ENGINE

Apex automatically computes every metric TrainingPeaks provides, plus body-composition-adjusted metrics that TP can't do.

### TrainingPeaks Parity Metrics (Auto-Calculated)

**Power Metrics:**
- Average Power (W)
- Normalized Power (NP) — using the standard 30s rolling avg algorithm
- Max Power (W)
- Intensity Factor (IF) = NP / FTP
- Training Stress Score (TSS) = (duration_sec × NP × IF) / (FTP × 3600) × 100
- Variability Index (VI) = NP / Avg Power (pacing steadiness)
- Work (kJ) — integral of power over time

**Heart Rate Metrics:**
- Avg HR, Max HR
- % HRmax, % Heart Rate Reserve (%HRR)
- HR Drift (%) — (avg HR second half) / (avg HR first half) × 100 for matched power
- Efficiency Factor (EF) = NP / Avg HR (aerobic fitness proxy, W per heartbeat)
- Power:HR Ratio = NP / Avg HR (simplified coupling metric)
- Decoupling % — how much power:HR ratio degrades over the ride

**Performance Management Chart (PMC):**
- CTL (Chronic Training Load / "Fitness") — 42-day exponentially weighted avg of daily TSS
- ATL (Acute Training Load / "Fatigue") — 7-day exponentially weighted avg of daily TSS
- TSB (Training Stress Balance / "Form") = CTL - ATL
- Ramp Rate — weekly CTL change rate (healthy: 3-7 TSS/week)
- IF Trend — rolling 30-day IF to detect intensity creep

**Ride Details:**
- Distance, Duration, Elevation Gain
- Avg/Max Speed, Avg/Max Cadence
- Calories (work in kJ × 1.1)
- Temperature (from ride file + weather API)

**Zone Analysis:**
- Coggan Power Zones (Z1-Z7) with time-in-zone
- HR Zones with time-in-zone
- Quadrant Analysis (force vs. velocity)

### Withings Body Composition Metrics (Novel)

These metrics are impossible without integrating a smart scale:

- **W/kg (current)** = FTP / Withings weight (updates automatically with each weigh-in)
- **W/kg (lean mass)** = FTP / lean body mass — filters out fat, more accurate performance indicator
- **FTP per lean kg** — better predictor of climbing ability than raw W/kg
- **Body fat trend** — weekly from Withings
- **Muscle mass trend** — weekly, watching for catabolism during weight cuts
- **Hydration %** — pre-ride indicator for cardiac drift risk
- **Bone mass** — baseline tracking
- **BMI** — though W/kg is more useful for athletes

### Climbing & Weight Impact Metrics (Novel)

Using physics-based modeling with actual body weight from Withings:

**System Weight Model:**
- Total system weight = rider weight (Withings) + bike weight (user-entered) + gear estimate
- Gravity power = system_weight × 9.81 × grade × speed
- Rolling resistance power = system_weight × 9.81 × Crr × speed
- Aero power = 0.5 × air_density × CdA × speed³

**Auto-Calculated Climbing Metrics:**
- **VAM** (Velocità Ascensionale Media) = elevation gained / time in hours
- **Watts required at gradient** — "You need Xw to hold Y km/h on Z% grade at your current weight"
- **Watts per lb** — "Every 1 lb (0.45kg) change = ±X watts at this grade"
- **Time saved per kg lost** — "Losing 1kg saves ~X seconds on a 20-min climb at Y%"
- **Race weight projection** — "At current loss rate, you'll be Xkg on race day = Y W/kg"
- **Optimal race weight estimate** — based on muscle mass floor and performance curve

---

## 6. NOVEL CROSS-DOMAIN INSIGHTS CATALOG

These are insights that can ONLY be generated by combining data across multiple platforms. This is the moat.

### Category 1: Body Composition → Performance

**Weight ↔ Power:**
- "Your W/kg today was 3.35 based on this morning's Withings reading (89.0kg). At your January weight (91.2kg) with the same power, it would have been 3.09 — a 8.4% climbing improvement from weight loss alone."
- "At 86.4kg (projected race weight), you'll need 11W less on 6% grades — saving ~45 seconds per 20-minute climb."
- "Your FTP per lean body mass is 3.82 W/kg — up from 3.62 six weeks ago. Since muscle mass is stable, these are genuine neuromuscular adaptations."

**Weight Loss Rate Monitoring:**
- "You're losing 0.8kg/week — at the upper limit of healthy loss. Your Whoop recovery dropped from 68% to 42% this week. Consider slowing to 0.5kg/week to protect recovery."
- "Your muscle mass has been stable at 42.1% through 2.2kg of total loss. This is ideal — you're losing fat, not muscle."
- "Warning: Withings shows you dropped 1.8kg in 10 days. Your absolute power is down 4W while W/kg is flat. The rate may be too aggressive."

**Hydration Impact:**
- "Pre-ride hydration was 62% (below your 65% baseline). Combined with 95°F heat, this likely added 2-3% to your cardiac drift."
- "On days your pre-ride hydration is ≥65%, your average EF is 0.12 higher. Today's low hydration cost you real watts."

### Category 2: Sleep Architecture → Next-Day Performance

**Deep Sleep Correlations:**
- "Your 5 best rides in the last 90 days all followed nights with >1h 30m deep sleep. Last night you got 48 minutes."
- "Deep sleep below 60 minutes has preceded a 6-12% NP drop in 8 out of 10 occurrences."

**REM Sleep Correlations:**
- "Low REM (<1h 15m) correlates with worse reaction times and tactical decisions — relevant for crit racing. Last night: 1h 04m."

**Sleep Timing:**
- "Your best performances (top 10% by EF) follow nights where you fell asleep before 10:15 PM. Average sleep onset for your worst 10%: 11:42 PM."
- "Every 30 minutes past 10 PM correlates with a 1.8% decrease in next-day EF."

**EightSleep Temperature:**
- "Deep sleep is 34% higher at -4°C vs -1°C bed temp. This translates to approximately 4-6ms higher morning HRV."
- "Your optimal bed temp varies by season: -2°C in winter, -5°C in summer. Current setting (-1°C) is too warm for this time of year."

### Category 3: HRV Patterns → Training Prescription

**HRV Thresholds (personalized):**
- "Your HRV below 45ms predicts 3-5 days of reduced performance. Current: 38ms. Recommendation: Z1/Z2 only until HRV rebounds above 55ms."
- "Your HRV coefficient of variation over 7 days is 28% — above the 20% overtraining threshold."
- "Morning HRV of 72ms puts you in the top quartile of your range. Green light for VO2max work."

**HRV + Training Load Interaction:**
- "Your HRV recovers fastest (avg 2.1 days to baseline) after rides with TSS < 150. After TSS > 200, recovery takes 3.8 days on average."
- "When you do VO2 intervals on days with HRV > 60ms, your 5-min power averages 12W higher than on days below 60ms."

### Category 4: Environmental Performance Modeling

**Heat Adaptation Tracking:**
- "Power:HR at 95°F is 1.79 W/bpm vs 1.83 at 68°F — only 2.2% gap. Early summer gap was 21%. Adaptation nearly complete."
- "Your heat penalty model: for every 10°F above 70°F, you lose approximately 2.1% of NP. This has improved from 4.8% in June."

**Altitude Impact:**
- "At 6,000ft, your historical power drops 5-8%. At sea level your FTP is effectively ~310W."
- "Your SpO2 from Oura dropped to 94% after last weekend's altitude exposure — allow 48h extra recovery."

**Wind/Weather:**
- "Headwind data from your GPS shows you spent 55% of today's ride into 15+ mph wind. Your speed-adjusted power was actually higher than it looks."

### Category 5: Fatigue Signature Analysis

**L/R Balance Under Fatigue:**
- "Your L/R shifts from 51/49 to 53/47 after 2 hours, worse on steep climbs. This has appeared in 4 of 6 recent long rides — suggests a bike fit issue or hip/glute imbalance."

**Cadence Decay:**
- "Your self-selected cadence drops from 90 to 82 rpm in the final hour. Fatigued riders who maintain cadence produce 3-5% more power — try a cadence target alert."

**Power Fade Patterns:**
- "Your NP drops 8% from hour 2 to hour 3. On rides with better sleep (>7h 30m), the fade is only 3%. Recovery is the differentiator, not fitness."
- "Your match-burning capacity (efforts >120% FTP) drops by 40% after hour 2. Consider saving hard efforts for early in races."

### Category 6: Long-Term Training Adaptations

**Dose-Response Modeling:**
- "312 minutes between 88-105% FTP over 8 weeks drove an 8W FTP gain. Your threshold responds with a ~6-week delay."
- "You've done only 12 minutes above 105% FTP in 3 weeks. VO2max responds to stimulus — add 2x weekly sessions."
- "Your Z2 volume (14.5 hrs/week × 4 weeks) is correlating with improved EF. This is the classic base-building response."

**Periodization Intelligence:**
- "Your CTL rose from 72 to 85 over 12 weeks with 3 rest weeks. Ramp rate of 5.2 TSS/week is sustainable."
- "Historical pattern: your best race performances come at CTL 78-85 with TSB +15 to +20."
- "You're in week 3 of a build block. Historically, your performance peaks 2 weeks after the highest training load week."

**Year-Over-Year Comparisons:**
- "Your FTP is 298W vs 285W at this time last year (+4.6%). Your weight is 89kg vs 91kg (+2.2% W/kg improvement)."
- "Your CTL progression is 3 weeks ahead of last year's schedule. If you follow a similar periodization, you'll peak 3 weeks earlier."

### Category 7: Nutrition & Fueling Intelligence (with CGM/MFP)

- "Your power faded 12% in hour 3. On rides where you consumed >60g carbs/hour, fade was only 4%. Likely under-fueled today."
- "Your glucose (Supersapiens) dropped below 80 mg/dL at the 2h mark. This correlates with your perceived effort spike. Start fueling earlier."
- "You burned 2,840 kcal today but logged only 1,900 kcal intake. A deficit of 940 kcal after a 3h ride will impair recovery — expect lower HRV tomorrow."
- "On days you eat >2g protein per kg bodyweight, your next-morning muscle mass readings are 0.2% higher. You're averaging 1.6g/kg."

### Category 8: Predictive Analytics

- "Based on your CTL trajectory and FTP trend, your predicted FTP on race day (18 days) is 300-304W."
- "If you follow the recommended taper, your predicted race-day TSB will be +17 — historically your sweet spot."
- "Your power curve shows sprint (5s) and threshold (20m) are strengths. VO2max (5m) is your limiter — addressing this could unlock 15-20W."
- "Based on your VAM trend and projected weight, your estimated time for the Mt. Tam hillclimb is 38:20 ± 1:30."

### Category 9: Benchmarking & Classification

Claude receives a structured benchmark database as part of its system context. This enables it to classify the athlete at every power duration and prescribe targeted workouts.

**Benchmark Data Sources (embedded in Claude's context):**
1. **Coggan Power Profile Table** — The gold standard. W/kg benchmarks for 5s, 1m, 5m, 20m, 60m across World Tour, Domestic Pro, Cat 1-5. Segmented by sex and weight class.
2. **Cycling Analytics aggregated data** — Percentile distributions from 100,000+ riders by age, sex, weight class.
3. **TrainingPeaks population data** — TSS/CTL norms, IF distributions, HR zone patterns.
4. **Age-adjusted benchmarks** — Performance naturally declines ~1-2% per year after 35. A 45-year-old Cat 2 is different from a 25-year-old Cat 2.
5. **Body-composition adjusted** — Using Withings lean mass, we can benchmark against lean W/kg which is fairer for different body types.
6. **Community benchmarks (future)** — As Apex grows, we'll build our own percentile curves from anonymized user data, giving much richer demographic comparisons.

**How Claude uses benchmarks:**

Claude receives the athlete's current power profile (best efforts at each duration from the last 90 days) and the full benchmark table. It then:

1. **Classifies each duration** — "Your 5s is Cat 2 (12.92 W/kg), your 5-min is Cat 3 (3.99 W/kg)"
2. **Identifies the weakest link** — "VO2max (5m) is 2 tiers below your threshold (20m) — this is your biggest limiter"
3. **Quantifies the gap** — "You need +25W at 5-min to reach Cat 2. That's 0.28 W/kg."
4. **Explains the profile shape** — "You're a classic threshold/sprint rider with a VO2 gap. Your aerobic ceiling is limiting how long you can sustain hard efforts."
5. **Compares to relevant peers** — "For a 32-year-old male at 89kg, your threshold is in the 88th percentile but your VO2max is only 62nd percentile."
6. **Contextualizes for goals** — "For your Mt. Tam hillclimb, your threshold matters more than your sprint. But the final 2km kicks to 9% — you'll need VO2 power for that."

**Example benchmark insights:**

- "Your 20-min power of 298W (3.35 W/kg) classifies as solid Cat 2. World Tour riders at your weight hold ~570W (6.40 W/kg). Domestic pros: ~498W (5.60 W/kg). You're 22W away from Cat 1."
- "Your VO2max (5-min) is your biggest limiter at Cat 3 (3.99 W/kg). Your threshold and sprint are both Cat 2. Closing this VO2 gap is the single highest-ROI training adaptation you can make."
- "At age 32, you have ~3-5 peak years before age-related decline begins. Your current Cat 2 threshold is in the top 12% for your age bracket."
- "Your power profile shape matches a 'rouleur/time trialist' — strong sustained power, decent sprint, but a ceiling on repeated hard efforts. Consider if your race targets match this profile."

**Workout Prescription Engine:**

When Claude identifies a weakness, it doesn't just say "do more VO2 work." It prescribes specific sessions with exact power targets calculated from the athlete's FTP:

**VO2max Prescriptions (example for FTP = 298W):**

| Workout | Structure | Target Power | TSS | Focus |
|---------|-----------|-------------|-----|-------|
| Classic 5×5' | 5 × 5min ON / 5min OFF | 322-343W (108-115% FTP) | 85 | VO2max ceiling |
| 30/30 Repeats | 3 × (8 × 30s ON / 30s OFF) | 358-388W (120-130% FTP) | 70 | VO2max repeatability |
| Norwegian 4×4 | 4 × 4min ON / 3min OFF | 328-343W (110-115% FTP) | 75 | Sustained VO2 |
| Billats | 3 × (6 × 1min ON / 1min easy) | 358W / 149W (120% / 50%) | 65 | VO2 time accumulation |
| Rønnestad | 3 × (13 × 30s ON / 15s OFF) | 388W / 149W (130% / 50%) | 72 | Anaerobic + VO2 |

**Threshold Prescriptions:**
| Workout | Structure | Target Power | TSS | Focus |
|---------|-----------|-------------|-----|-------|
| 2×20 Classic | 2 × 20min at FTP / 5min OFF | 283-298W (95-100%) | 90 | FTP sustainment |
| Over/Unders | 3 × 12min (2min 105% / 2min 90%) | 313W / 268W | 80 | Lactate clearance |
| Sweet Spot | 3 × 15min at 88-93% FTP | 262-277W | 85 | Sub-threshold volume |

**Sprint/Neuromuscular:**
| Workout | Structure | Target Power | TSS | Focus |
|---------|-----------|-------------|-----|-------|
| Sprint Repeats | 8 × 15s MAX / 3min OFF | Max effort | 45 | Peak power |
| Standing Starts | 6 × 20s from stop / 5min OFF | Max effort | 40 | Sprint acceleration |

Claude builds a multi-week training block recommendation based on the athlete's:
- Current classification gaps
- Training history (what stimulus they've been getting)
- Recovery state (can they handle intensity right now?)
- Race calendar (periodization timing)
- Time availability (how many hours per week)

Example Claude output:
> "Here's your 6-week VO2max block. Weeks 1-2: 2× per week Norwegian 4×4 (build stimulus gradually). Weeks 3-4: Alternate between 5×5 and 30/30s. Week 5: Rønnestad + one Billat session (peak loading). Week 6: Deload — one easy 30/30 session only. Throughout, maintain your Thursday sweet spot ride and weekend long ride. Predicted outcome: 5-min power from 355W → 375-385W based on your historical response to VO2 stimulus."

---

## 8. ONBOARDING PROFILE & DEMOGRAPHIC DATA COLLECTION

### Athlete Profile (Collected at Signup)

When a user creates an account, we collect data that feeds both their personal experience and our community benchmarking engine:

**Required:**
- Name
- Email / SSO (Google, Apple)
- Date of birth (auto-calculates age — critical for age-adjusted benchmarks)
- Sex (Male / Female / Non-binary — with note: "Used for physiological benchmarking and optional cycle tracking")
- Height
- Weight (or "I'll sync from my scale")

**Riding Level (self-reported):**
- 🏆 Professional / World Tour
- 🥇 Elite / Domestic Pro
- 🥈 Competitive Amateur (Cat 1-3 / regular racing)
- 🥉 Enthusiast Racer (Cat 4-5 / occasional racing)
- 🚴 Fitness Cyclist (structured training, no racing)
- 🌱 Recreational (rides for fun/fitness)

**Training Context:**
- Weekly training hours (dropdown: 3-5, 5-8, 8-12, 12-16, 16-20, 20+)
- Years cycling (1-3, 3-5, 5-10, 10+)
- FTP if known (or "I don't know — we'll calculate it")
- Primary terrain (flat, rolling, mountainous, mixed)
- Primary discipline (road, gravel, MTB, track, triathlon, mixed)

**Location:**
- "Allow location access" (for weather-adjusted insights, altitude, local community)
- Or manual entry (city/country)
- Used for: temperature normalization, altitude adjustment, local community benchmarks, sunrise/sunset for ride timing analysis

**Goals (multi-select):**
- Improve FTP / climbing
- Lose weight / improve body composition
- Race preparation (with target event entry)
- General fitness / longevity
- Recovery optimization
- Complete a specific event (century, gran fondo, etc.)

**For Female Athletes (optional, shown only when sex = Female):**
- "Would you like to enable menstrual cycle tracking?" (toggle with explanation)
- "Do you use an Oura Ring?" → enables automatic cycle phase detection
- "Are you using hormonal contraception?" (pill, IUD, implant, none)
  - This is critical: hormonal contraception fundamentally changes the hormonal profile and Apex needs to adjust its analysis accordingly
- "Are you pregnant or postpartum?" (adjusts all benchmarks and recommendations)

### Why Each Field Matters for Benchmarking

| Field | Benchmarking Use |
|-------|-----------------|
| Age | Age-adjusted power curves (performance declines ~1-2%/year after 35) |
| Sex | Sex-specific benchmark tables, menstrual cycle features |
| Weight | W/kg calculations, weight-class cohorts |
| Height | BMI, CdA estimation for aero calculations |
| Level | Self-reported level vs. actual power data → calibration insights |
| Location | Altitude adjustment, heat/cold normalization, regional cohorts |
| Weekly hours | Volume-normalized benchmarks (W/kg per hour trained) |
| Years cycling | Training age → expected rate of improvement |
| Discipline | Discipline-specific benchmarks (road vs. gravel vs. MTB) |

---

## 9. COMMUNITY BENCHMARKING ENGINE

### Phase 1: Curated Benchmarks (Launch)

At launch, Claude's context includes:
- Coggan Power Profile Table (W/kg by duration and level)
- Age-adjusted multipliers based on published data
- Sex-specific tables
- Weight-class adjustments

### Phase 2: Proprietary Benchmarks (3-6 months post-launch)

As user data accumulates, we build Apex-specific percentile curves:

**Data we collect (anonymized, aggregated):**
- Power duration curves by demographic cohort
- CTL/ATL/TSB distributions by level
- Recovery score distributions by age/sex
- HRV baselines by age/sex/fitness level
- Sleep quality → performance correlations
- Body composition → W/kg relationships
- Seasonal performance patterns by location
- Training volume → FTP progression rates

**Cohort definitions:**
Users are automatically placed into cohorts for comparison:
- Age brackets: 18-24, 25-34, 35-44, 45-54, 55-64, 65+
- Sex: Male, Female
- Level: Self-reported + actual (based on power data)
- Weight class: <60kg, 60-70, 70-80, 80-90, 90-100, 100+
- Volume: <6 hrs/wk, 6-10, 10-15, 15+
- Location region (for weather/altitude normalization)

**Example community insights:**
- "Your FTP of 298W (3.35 W/kg) puts you in the 88th percentile of Male 25-34, 80-90kg riders on Apex who train 10-15 hrs/week."
- "Among riders in your cohort, the top 10% average 14.2 hours of Z2 per week. You're at 12.8 — increasing Z2 volume is the single most common trait of your faster peers."
- "Riders who improved FTP by >15W in 12 weeks averaged 2.1 VO2 sessions per week. You're doing 0.4."
- "Your recovery scores are in the 72nd percentile for your age. The top quartile sleeps an average of 43 minutes more per night."

### Phase 3: Predictive Models (12+ months)

With enough data, we build ML models that predict:
- Expected FTP progression given current training load
- Optimal training volume for a given demographic
- Injury/overtraining risk scoring
- Race time prediction from training data
- Ideal taper length by individual response pattern

---

## 10. MENSTRUAL CYCLE INTELLIGENCE (Female Athletes)

### Scientific Foundation

This feature is grounded in peer-reviewed research. Apex takes a careful, evidence-based approach — presenting what the science supports, acknowledging what's still uncertain, and empowering athletes with information rather than prescriptive rules.

**What the research shows (with high confidence):**

1. **Core body temperature is 0.3-0.7°C higher in the luteal phase** (post-ovulation, when progesterone is elevated). This is one of the most well-established findings in menstrual cycle physiology. (Baker & Driver, 2007; Charkoudian & Stachenfeld, 2014)

2. **Athletes consistently perceive worse performance in the late luteal and early follicular (menstruation) phases.** In a study of 125 elite British track and field athletes, 77% reported their cycle negatively affected performance, with 40% identifying the late luteal phase and 35% the early follicular phase as worst. (Jones et al., 2024, Frontiers in Sports and Active Living)

3. **Elevated progesterone in the luteal phase raises aldosterone levels**, which is associated with delayed sweating onset and decreased skin blood flow during exercise in the heat. Core temperature during 3-hour exercise in 35°C heat was significantly higher in the mid-luteal vs. early follicular phase (38.0°C vs. 37.8°C). (Giersch et al., 2025, Journal of Science and Medicine in Sport)

4. **Iron loss during menstruation** can impact endurance performance if not managed. Heavy menstrual bleeding (menorrhagia, reported by 31% of elite athletes in the Jones 2024 study) increases risk of iron deficiency anemia.

5. **Estrogen has a glycogen-sparing effect**, promoting lipid oxidation. During the luteal phase when estrogen is elevated alongside progesterone, there may be a shift toward fat metabolism — potentially relevant for ultra-endurance events. (Oosthuyse & Bosch, 2010)

**What the research shows (with moderate confidence / individual variability):**

6. **A trivial-to-small reduction in exercise performance** may occur in the early follicular phase compared to other phases, but a 2020 meta-analysis (McNulty et al.) found this effect to be trivial and highly variable between individuals. The authors noted most included studies were of low methodological quality.

7. **Strength may peak around ovulation** (late follicular phase) when estrogen peaks without progesterone, but findings haven't been consistently replicated across studies. (Sarwar et al., 1996; but see Colenso-Semple et al., 2023 for contrary findings)

8. **Whole-body heat loss during exercise may not be significantly modified by cycle phase** when measured using whole-body calorimetry, even though core temperature is elevated. The body appears to compensate. (Notley et al., 2019, Journal of Applied Physiology)

**The bottom line:** The effects are real but small and highly individual. The most impactful thing Apex can do is help each athlete understand *their own* patterns by tracking cycle phase alongside training data over time.

### How Oura Ring Enables This

Oura Ring Gen 3 provides:
- **Cycle phase detection** (using body temperature trends)
- **Period prediction** (timing of menstruation)
- **Basal body temperature** (nightly, continuous — the biphasic pattern reveals ovulation)
- **HRV** (which varies across the cycle)
- **Sleep architecture** (which varies across the cycle)
- **Readiness score** (which incorporates cycle phase)

Apex pulls this data via the Oura API and maps it against training data to build an individual's cycle-performance profile.

### Cycle-Aware Insights (Examples)

All insights include a confidence level and a "Read More" link to the underlying research.

**Luteal Phase (post-ovulation, high progesterone + estrogen):**

> 🌡️ **Luteal Phase: Elevated Core Temperature Detected**
> Your Oura ring shows you're in the mid-luteal phase (day 21). Research shows core body temperature is 0.3-0.7°C higher in this phase due to elevated progesterone. This means your thermoregulatory starting point is higher — in hot conditions, you may reach thermal strain sooner than in your follicular phase.
>
> **Practical adjustments:**
> - Pre-cool before hot rides (ice slurry, cold towels on neck)
> - Start hydrating earlier and increase intake by 300-500ml
> - Be aware that your HR may run 3-5 bpm higher at the same power output — this is normal and not a sign of poor fitness
> - Your EightSleep bed temp should be -5°C (vs. your usual -3°C) to compensate for elevated body temp overnight
>
> **Confidence:** High — core temperature elevation in luteal phase is well-established
> **Read more:** [Baker & Driver, 2007](https://pubmed.ncbi.nlm.nih.gov/) · [Giersch et al., 2020](https://pubmed.ncbi.nlm.nih.gov/32499153/) · [Charkoudian & Stachenfeld, 2014](https://pubmed.ncbi.nlm.nih.gov/)

**Late Luteal / Pre-Menstrual (days 24-28):**

> 😴 **Late Luteal Phase: Expect Reduced Recovery**
> You're in the late luteal phase. Research shows 40% of elite female athletes report this as their worst-performing phase (Jones et al., 2024). Common symptoms include bloating, lower back pain, disrupted sleep, and increased perceived exertion.
>
> **Practical adjustments:**
> - Consider this a "listen to your body" period — if a hard session feels worse than expected, trust that feeling
> - Your RPE may not match your power output. Don't force intensity if effort feels disproportionate
> - Increase carbohydrate intake — progesterone increases carb oxidation, so your body is burning through glycogen faster
> - Prioritize sleep quality: your Oura data shows your sleep efficiency typically drops 4-6% in this phase
> - If you have a choice, schedule your hardest session for 3-4 days from now (early-mid follicular)
>
> **Note on the science:** While athletes consistently *perceive* worse performance in this phase, objective measurements show only trivial-to-small effects that vary greatly between individuals. Track your own data over 3-6 cycles and Apex will build your personal pattern.
>
> **Confidence:** High for symptoms/perception; moderate for objective performance impact
> **Read more:** [Jones et al., 2024](https://doi.org/10.3389/fspor.2024.1296189) · [McNulty et al., 2020](https://pubmed.ncbi.nlm.nih.gov/) · [Carmichael et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7916245/)

**Early Follicular (menstruation, days 1-5):**

> 🔴 **Menstruation Phase: Iron & Energy Awareness**
> Day 2 of your cycle. Estrogen and progesterone are at their lowest.
>
> **Practical adjustments:**
> - If you experience heavy flow, focus on iron-rich foods (red meat, spinach, lentils) and consider checking ferritin levels if this is a recurring concern
> - Some athletes feel sluggish during menstruation, while others feel fine — your past 4 cycles on Apex show your power output during menstruation averages 3% below your monthly mean (this is within the normal range)
> - Hydration needs may be slightly lower than during the luteal phase
> - NSAIDs (ibuprofen) for cramps can affect gut absorption and kidney function during exercise — time doses carefully around rides
>
> **Confidence:** High for iron loss; moderate-to-low for direct performance effects
> **Read more:** [Bruinvels et al., 2017](https://pubmed.ncbi.nlm.nih.gov/) · [Carmichael et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7916245/)

**Late Follicular / Ovulation (days 10-14):**

> ⚡ **Late Follicular Phase: Potential Peak Window**
> Estrogen is peaking and progesterone is still low. Some research suggests this may be a favorable window for high-intensity and strength work, though findings are inconsistent.
>
> **Practical adjustments:**
> - If you have flexibility in scheduling, this may be a good window for your hardest VO2max or sprint sessions
> - Your body temperature is at its lowest baseline — hot-weather performance may be slightly better
> - Some studies suggest slightly increased ligament laxity around ovulation due to estrogen's effect on collagen — be mindful of joint stress, especially on technical terrain
>
> **Confidence:** Moderate — favorable trends in some studies, but not consistently replicated
> **Read more:** [Sarwar et al., 1996](https://pubmed.ncbi.nlm.nih.gov/) · [Colenso-Semple et al., 2023](https://doi.org/10.3389/fspor.2023.1054542)

### Building Individual Patterns Over Time

After 3-6 tracked cycles, Apex builds a personalized cycle-performance model:

- "Over your last 5 cycles, your average NP is 4.2% lower on luteal days 22-26. This is your personal 'caution window.'"
- "Your HRV drops an average of 8ms in the 3 days before menstruation. We'll factor this into your readiness score."
- "Your best 5-min efforts in the last 6 months occurred on cycle days 8-12 (late follicular). Consider scheduling key workouts in this window."
- "Your cardiac drift is 2.1% higher during luteal phase rides vs. follicular. This accounts for roughly half the drift variation we see in your data."

### Hormonal Contraception Users

For athletes on the pill, IUD, or implant, the insights adjust:
- Combined oral contraceptives suppress the natural cycle — body temperature is more stable but still affected by the active vs. placebo pill phase
- Progestin-only methods may cause irregular patterns — Apex tracks what it can via Oura temperature data
- Claude notes: "You're using hormonal contraception, which modifies the typical cycle patterns. The insights below are based on your individual Oura data patterns rather than standard cycle phase assumptions."

### Critical Design Principles

1. **Always opt-in.** Menstrual tracking is never assumed or forced. Users explicitly enable it.
2. **Science-backed, not prescriptive.** Claude presents information with appropriate uncertainty. "Research suggests..." not "You should..."
3. **Individual patterns trump population averages.** After 3+ cycles of data, Apex prioritizes the athlete's own patterns over generalized findings.
4. **Read More links are mandatory.** Every cycle-related insight includes citations to peer-reviewed research. This builds trust and educates athletes.
5. **Sensitivity in language.** The feature is designed with input from female athletes. No patronizing tone, no assumptions about how an athlete "should" feel.
6. **Privacy.** Cycle data is encrypted and never shared in community benchmarks. It's visible only to the athlete (and their coach, if they grant access).

### Scientific References (Embedded in Claude's Context)

The following papers are summarized in Claude's system prompt so it can cite them accurately:

1. Jones et al. (2024). "Menstrual cycles and the impact upon performance in elite British track and field athletes." *Frontiers in Sports and Active Living*, 6:1296189.
2. McNulty et al. (2020). "The effects of menstrual cycle phase on exercise performance in eumenorrheic women: a systematic review and meta-analysis." *Sports Medicine*, 50:1813-1827.
3. Carmichael et al. (2021). "The Impact of Menstrual Cycle Phase on Athletes' Performance: A Narrative Review." *Int J Environ Res Public Health*, 18(4):1667.
4. Giersch et al. (2020). "Menstrual cycle and thermoregulation during exercise in the heat: A systematic review and meta-analysis." *Journal of Science and Medicine in Sport*, 23(12):1134-1140.
5. Baker & Driver (2007). "Circadian rhythms, sleep, and the menstrual cycle." *Sleep Medicine*, 8(6):613-622.
6. Oosthuyse & Bosch (2010). "The effect of the menstrual cycle on exercise metabolism." *Sports Medicine*, 40(3):207-227.
7. Charkoudian & Stachenfeld (2014). "Reproductive hormone influences on thermoregulation in women." *Comprehensive Physiology*, 4(2):793-804.
8. Colenso-Semple et al. (2023). "Current evidence shows no influence of women's menstrual cycle phase on acute strength performance." *Frontiers in Sports and Active Living*, 5:1054542.
9. Notley et al. (2019). "Menstrual cycle phase does not modulate whole body heat loss during exercise in hot, dry conditions." *Journal of Applied Physiology*, 126(2):286-293.
10. Stitelmann et al. (2024). "Beyond the Menstrual Cycle: Time for a Holistic Approach to Athlete Health and Performance." *IJSPT*, 19(12):1647-1651.

---

## 12. SCIENCE-BACKED PERFORMANCE BOOSTERS

Apex includes a "Performance Boosters" section — evidence-based supplement, nutrition, and lifestyle protocols personalized to each athlete's profile, dietary restrictions, and goals. Every recommendation includes a confidence rating, a short explanation of the mechanism, links to peer-reviewed studies, and where applicable, practical recipes or implementation guides.

### UX Architecture Decision

**Primary home: Dedicated "Boosters" tab in the top nav** (alongside Dashboard, Calendar, Trends, Race Planner). This gives it first-class status without cluttering the core dashboard. Athletes see it every session and can browse when ready.

**Why not a sidebar or bottom bar:**
- Sidebar: Too cramped for the depth of content (mechanism explanations, study citations, recipes, risk lists). Sidebars work for quick-reference data, not editorial content.
- Bottom bar: Too hidden. Athletes would forget it exists. Performance boosters deserve discoverable placement.
- Settings page: Defeats the purpose. This is content athletes should proactively engage with, not configuration they set once.

**Layout of the Boosters page:**
- **Category filter bar** at top: All / Supplements / Nutrition / Protocols / Training / Recovery — each with a distinct accent color
- **Search bar** for quick lookup ("creatine", "sleep", "altitude")
- **Card grid** (3 columns): Each booster is a card showing icon, title, protocol summary, confidence badge, study count, recipe count, and risk count
- **Click to expand**: Opens a detail modal with 4-5 tabs: Overview (mechanism + dietary notes), Protocol (numbered steps), Risks & Cautions (with medical disclaimer), Research (linked PubMed studies), and Recipes (if applicable)
- **Confidence badges**: Color-coded — Green "Strong Evidence", Amber "Moderate Evidence", Gray "Emerging Research"

**Secondary touchpoints (contextual integration):**
- AI insights on the dashboard reference relevant boosters inline: "Your VO2max is your limiter → see the Altitude Training booster for protocols" with a direct link
- Post-ride analysis mentions relevant nutrition boosters: "You faded 12% in hour 3 → see Periodized Carbohydrate Intake for fueling strategies"
- Recovery recommendations link to sleep and sauna boosters when recovery scores are low

**Full Booster Library (12 boosters at launch):**

| # | Booster | Category | Confidence |
|---|---------|----------|------------|
| 1 | Post-Ride Protein | Nutrition | Strong |
| 2 | Creatine Monohydrate | Supplement | Strong (sprints) / Mixed (endurance) |
| 3 | Sauna Protocol | Protocol | Strong |
| 4 | Altitude Training | Protocol | Strong |
| 5 | Caffeine Timing | Supplement | Strong |
| 6 | Beetroot Juice (Nitrate) | Nutrition | Strong |
| 7 | Strength Training for Cyclists | Training | Strong |
| 8 | Core Stability & Activation | Training | Moderate |
| 9 | Yoga & Mobility / Hot Yoga | Recovery | Moderate |
| 10 | Sleep Optimization | Recovery | Strong |
| 11 | Periodized Carbohydrate Intake | Nutrition | Strong |
| 12 | Omega-3 Fatty Acids | Supplement | Moderate |

### Design Principles

1. **Every recommendation is backed by peer-reviewed research.** No bro-science, no anecdotes.
2. **Nuance is non-negotiable.** If the evidence is mixed, we say so. If something works for sprinters but not endurance athletes, we say so.
3. **Personalized to dietary restrictions.** A vegan athlete gets plant-based protein alternatives, not whey. A lactose-intolerant athlete gets dairy-free shake recipes.
4. **"Read More" links mandatory.** Every booster card links to 2-3 specific PubMed studies.
5. **Recipe popups are practical.** Not aspirational food photography — quick, realistic recipes an athlete would actually make.
6. **Disclaimer present.** "These are evidence-based educational suggestions, not medical advice. Consult your physician before starting any supplement regimen."

### Booster Cards

Each card in the UI shows:
- **Title** (e.g., "Post-Ride Whey Protein")
- **Protocol** (e.g., "20-40g within 30 min of finishing")
- **Confidence badge** (Strong / Moderate / Emerging)
- **Short mechanism explanation** (2-3 sentences)
- **Personalization note** (adjusts based on user's dietary profile)
- **"Read More" expandable** with 2-3 study citations
- **"Recipes" button** (popup with 3-4 practical recipes)

---

### Booster 1: Post-Ride Protein (Whey or Plant-Based)

**Protocol:** 20-40g protein within 30-60 min post-ride. Whey protein isolate is the gold standard for speed of absorption; plant-based blends (pea + rice) are a close alternative.

**Confidence:** Strong ✅

**Why it works:** Whey protein is rapidly digested and rich in leucine (~10-12% by weight), the key amino acid that activates mTOR signaling to initiate muscle protein synthesis. Post-exercise, there's a heightened sensitivity to amino acids — the "anabolic window" — where protein intake maximally stimulates repair of exercise-induced muscle damage. For endurance athletes specifically, protein combined with carbohydrates accelerates glycogen resynthesis compared to carbs alone.

**Personalization:**
- **Vegan/Vegetarian:** "Pea + rice protein blend provides a complete amino acid profile. Look for blends with added leucine (≥2.5g per serving)."
- **Lactose intolerant:** "Whey protein isolate (not concentrate) has negligible lactose. Or use a plant-based alternative."
- **Weight loss goal:** "Stick to 20g protein to limit calorie impact while still maximizing MPS."

**Recipes (popup):**
1. **Classic Recovery Shake:** 30g whey, 1 banana, 200ml milk, 1 tbsp honey, handful of ice. Blend.
2. **Chocolate Peanut Butter:** 30g chocolate whey, 1 tbsp peanut butter, 200ml oat milk, ice.
3. **Vegan Recovery Bowl:** 30g pea protein, 1 cup frozen berries, 1 tbsp almond butter, 200ml coconut water. Blend thick, eat with a spoon.
4. **Quick & Dirty:** 30g whey in 300ml water. Shake. Done. (Sometimes simple is best.)

**Read More:**
- Morton et al. (2018). "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults." *British Journal of Sports Medicine*, 52(6):376-384. https://pubmed.ncbi.nlm.nih.gov/28698222/
- Beelen et al. (2010). "Nutritional strategies to promote postexercise recovery." *International Journal of Sport Nutrition and Exercise Metabolism*, 20(6):515-532. https://pubmed.ncbi.nlm.nih.gov/21116024/

---

### Booster 2: Creatine Monohydrate

**Protocol:** 5g/day, every day, with no loading phase needed. Take with your post-ride shake or with a meal.

**Confidence:** Strong for sprint/high-intensity ✅ | Mixed for pure endurance ⚠️

**Why it works:** Creatine saturates your phosphocreatine (PCr) stores, allowing faster ATP resynthesis during repeated high-intensity efforts — attacks, sprints, and surges. It also enhances glycogen resynthesis when co-ingested with carbs, and emerging research suggests cognitive benefits during fatigued states.

**Important nuance for cyclists:** A 2023 meta-analysis (Fernández-Landa et al.) found creatine was ineffective for steady-state endurance performance in trained athletes. However, creatine supplementation has been shown to improve repeated sprint cycling performance and may be beneficial for race-defining moments like breakaway surges, bridge efforts, and finishing kicks. It can also increase body mass by 1-2kg (water retention), which may be undesirable for pure climbers.

**Who should consider it:**
- Crit racers, sprinters, track cyclists (strong benefit for repeated high-intensity efforts)
- Road racers in races with surges and attacks (moderate benefit)
- Pure climbers or TT specialists targeting minimal weight (weigh the 1-2kg mass gain against sprint benefits)

**Personalization:**
- **Vegetarian/Vegan:** "You likely have lower baseline creatine stores (creatine is found primarily in meat). You may be a particularly strong responder to supplementation." (Moore et al., 2023)
- **Female athletes:** "Females have higher intramuscular creatine stores than males and may be less responsive, though evidence is limited."

**Read More:**
- Fernández-Landa et al. (2023). "Effects of Creatine Monohydrate on Endurance Performance in a Trained Population: A Systematic Review and Meta-analysis." *Sports Medicine*, 53(5):1017-1027. https://pubmed.ncbi.nlm.nih.gov/36877404/
- Forbes et al. (2023). "Creatine supplementation and endurance performance: surges and sprints to win the race." *Journal of the International Society of Sports Nutrition*, 20(1):2204071. https://pmc.ncbi.nlm.nih.gov/articles/PMC10132248/
- Kreider et al. (2017). "International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation." *JISSN*, 14:18. https://pubmed.ncbi.nlm.nih.gov/28615996/

---

### Booster 3: Sauna Protocol for Performance

**Protocol:** 20-30 min at 80-100°C (Finnish dry sauna), 3-4× per week, ideally immediately post-training. Minimum 10 sessions over 2-3 weeks to see meaningful adaptations.

**Confidence:** Strong for plasma volume expansion ✅ | Moderate for direct performance improvement ⚠️

**Why it works:** Post-exercise sauna bathing is essentially "passive heat acclimation." The primary mechanism is plasma volume expansion — your body responds to repeated heat stress by increasing blood volume, which improves cardiovascular efficiency. In the landmark Scoon et al. (2007) study, six competitive runners who did 12 post-training sauna sessions over 3 weeks saw a 32% increase in time to exhaustion, a 7.1% increase in plasma volume, and a ~2% improvement in endurance time trial performance.

A 2014 study in well-trained cyclists found plasma volume expanded significantly after just 4 post-training sauna exposures (30 min at 87°C). The expanded plasma volume improves stroke volume, reduces heart rate at a given workload, and enhances heat dissipation — essentially mimicking some benefits of altitude training without the travel.

**Practical protocol:**
1. **Timing:** Immediately after your training session (within 30 min)
2. **Duration:** Start at 15 min, progress to 25-30 min over the first week
3. **Temperature:** 80-100°C dry sauna (not steam room — lower humidity is key)
4. **Hydration:** Drink 500ml water with electrolytes before entering. Weigh yourself before and after to track fluid loss — replace 150% of lost weight
5. **Cool down:** 2-5 min cold shower after. Some athletes do contrast (sauna → cold → sauna) but the evidence for this is weaker
6. **Frequency:** 3-4× per week for 2-3 weeks minimum. Benefits may plateau after ~3 weeks
7. **Recovery days:** Can be done on recovery days too, but keep sessions shorter (15-20 min)

**Cautions:**
- Hydrate aggressively. Dehydration from sauna negates the benefits
- Don't sauna the night before a key workout or race — acute fatigue effects can persist 12-24 hours
- Monitor HRV the morning after sauna sessions to track recovery impact

**Read More:**
- Scoon et al. (2007). "Effect of post-exercise sauna bathing on the endurance performance of competitive male runners." *Journal of Science and Medicine in Sport*, 10(4):259-262. https://pubmed.ncbi.nlm.nih.gov/16877041/
- Stanley et al. (2015). "Effect of sauna-based heat acclimation on plasma volume and heart rate variability." *Scandinavian Journal of Medicine & Science in Sports*, 25(S1):e315-e325. https://pubmed.ncbi.nlm.nih.gov/25432420/
- Laukkanen & Kunutsor (2024). "The multifaceted benefits of passive heat therapies for extending the healthspan." *Temperature*, 11(1):27-51. https://pmc.ncbi.nlm.nih.gov/articles/PMC11018046/

---

### Booster 4: Caffeine Timing

**Protocol:** 3-6 mg/kg body weight, 30-60 min before key efforts. For a 89kg rider: ~270-530mg (roughly 2-4 cups of coffee).

**Confidence:** Strong ✅ (one of the most well-studied ergogenic aids)

**Why it works:** Caffeine blocks adenosine receptors, reducing perceived exertion and increasing time to exhaustion. Meta-analyses consistently show a 2-4% improvement in endurance performance. It also enhances fat oxidation, which can spare glycogen in longer efforts.

**Personalization:**
- **Habitual caffeine users:** "Your tolerance is higher. Consider caffeine-fasting for 5-7 days before a target race to restore sensitivity."
- **Slow metabolizers (CYP1A2 gene):** "You may not respond as well to caffeine for performance. If you find caffeine makes you jittery without performance gains, you may be a slow metabolizer."
- **Late races/rides:** "Be cautious with caffeine after 2 PM — it has a half-life of 5-6 hours and will impact your sleep quality, which Oura will confirm."

**Read More:**
- Guest et al. (2021). "International society of sports nutrition position stand: caffeine and exercise performance." *JISSN*, 18:1. https://pubmed.ncbi.nlm.nih.gov/33388079/
- Southward et al. (2018). "The Effect of Acute Caffeine Ingestion on Endurance Performance: A Systematic Review and Meta-Analysis." *Sports Medicine*, 48(8):1913-1928. https://pubmed.ncbi.nlm.nih.gov/29876876/

---

### Booster 5: Beetroot Juice (Nitrate Loading)

**Protocol:** 400-500ml beetroot juice (or concentrated shot ~6.4 mmol nitrate) 2-3 hours before racing. For multi-day loading: 1 shot per day for 3-6 days before the event.

**Confidence:** Strong ✅

**Why it works:** Dietary nitrate is converted to nitric oxide (NO), which improves mitochondrial efficiency, reduces oxygen cost of exercise by 3-5%, and enhances muscle contractile function. It's one of the few supplements shown to improve time trial performance in well-trained cyclists.

**Personalization:**
- **Fructose intolerant:** "Commercial beetroot shots are fructose-free. Avoid whole beetroot juice blends that may contain added fruit."

**Read More:**
- Jones et al. (2018). "Dietary Nitrate and Physical Performance." *Annual Review of Nutrition*, 38:303-328. https://pubmed.ncbi.nlm.nih.gov/30130468/
- McMahon et al. (2017). "The Effect of Dietary Nitrate Supplementation on Endurance Exercise Performance in Healthy Adults." *Sports Medicine*, 47(4):735-756. https://pubmed.ncbi.nlm.nih.gov/27600147/

---

### Booster 6: Omega-3 Fatty Acids

**Protocol:** 2-3g EPA+DHA per day with food. Consistent daily use for at least 4 weeks to see benefits.

**Confidence:** Moderate ⚠️ (strong for inflammation/recovery, emerging for direct performance)

**Why it works:** Omega-3s reduce exercise-induced inflammation and muscle soreness (DOMS), may improve heart rate recovery, and support cardiovascular health. Some evidence suggests they enhance muscle protein synthesis when combined with protein intake.

**Personalization:**
- **Vegan:** "Algae-based omega-3 supplements provide EPA+DHA without fish oil."

**Read More:**
- Philpott et al. (2019). "Applications of omega-3 polyunsaturated fatty acid supplementation for sport performance." *Research in Sports Medicine*, 27(2):219-237. https://pubmed.ncbi.nlm.nih.gov/30484714/

---

### Booster 7: Sleep Optimization Protocol

**Protocol:** This isn't a supplement — it's the most potent performance enhancer available.

**Targets (based on Oura/EightSleep data):**
- 7.5-9 hours total sleep
- Asleep before 10:15 PM (personalized from your data)
- EightSleep bed temp: -3°C to -5°C (personalized from your deep sleep data)
- No screens 60 min before bed (or use blue light blockers)
- Room temp 18-19°C
- Consistent wake time (±30 min, even weekends)

**Why it matters:** Your Apex data shows that when you get 7.5+ hours of sleep with 1.5+ hours deep sleep, your next-day EF is 8% higher and HRV recovers 15ms faster. Sleep is the multiplier for everything else.

---

### Booster 8: Periodized Carbohydrate Intake

**Protocol:** Match carb intake to training demands. High carb (8-12g/kg) on hard training days, moderate (5-7g/kg) on easy days, fuel during rides >90 min (60-90g carbs/hour).

**Confidence:** Strong ✅

**Why it works:** Glycogen is the primary fuel for high-intensity cycling. Under-fueling is the #1 performance limiter for amateur cyclists. Research consistently shows that athletes who match carbohydrate intake to training load perform better, recover faster, and maintain hormonal balance.

**Integration with Hexis/MyFitnessPal:** If connected, Apex pulls your actual intake data and compares it to your calculated needs based on today's ride TSS.

**Personalization:**
- **Keto/Low carb:** "Low-carb approaches can work for Z1/Z2 training but significantly impair performance at threshold and above. If you race, periodize: low carb on easy days, high carb on hard days and race days."
- **Gluten free:** "Rice, potatoes, and gluten-free oats are excellent carb sources. Many energy gels and bars are naturally gluten-free — check labels."

---

### How Apex Personalizes Boosters

When Claude generates booster recommendations, it receives:
1. The athlete's dietary restrictions and health conditions from their profile
2. Their current training phase and goals
3. Their recovery data (is now a good time to add sauna stress?)
4. Their specific power profile weaknesses (creatine more relevant for sprinters)
5. Their connected nutrition apps (to cross-reference actual intake)

Example personalized recommendation:
> "You're a vegan cyclist in a build phase targeting a hillclimb. Based on your profile, I'd prioritize: (1) Plant-based protein shake within 30 min of every ride — your Cronometer data shows you're only hitting 1.4g/kg protein, you need 1.6-2.0g/kg. (2) Beetroot juice 3 hours before your Saturday long ride — your VO2max is your limiter and nitrate loading specifically improves efficiency at high intensities. (3) Sleep before 10 PM — your Oura data shows a 12W NP difference between nights you sleep before 10 vs. after 11. Skip the creatine for now — the 1-2kg mass gain hurts your W/kg for climbing, and the endurance evidence is weak."

---

## 13. ENHANCED ONBOARDING: DIETARY & HEALTH PROFILE

### Dashboard (Main View)
- **Today's Ride** — the hero card showing the latest workout with all metrics
- **Metric Tiles** — power, NP, TSS, HR, cadence, W/kg, calories, L/R balance, etc.
- **Power Duration Curve** — your power curve vs. benchmarks (demographic, historical personal bests)
- **Fitness/Fatigue/Form Chart** — CTL/ATL/TSB over time
- **Zone Distribution** — time in each power and HR zone
- **Weekly Training Load** — TSS by day with targets
- **Recovery Score** — composite from Oura/Whoop/EightSleep
- **Body Composition** — weight, body fat, muscle trends from Withings
- **Sleep Quality** — from Oura/EightSleep with deep/REM/light breakdown
- **AI Analysis Panel** — the right sidebar with auto-generated insights + chatbot

### Calendar View
- Training calendar showing all workouts with color-coded intensity
- Planned vs. completed workouts
- Weekly/monthly TSS totals and trends
- Rest day tracking
- Event countdown and taper visualization

### Trends View
- Long-term fitness trends (3mo, 6mo, 1yr, all-time)
- Power curve evolution over time (animated or overlaid)
- Season comparison (this year vs. last year)
- Metric correlation explorer (e.g., HRV vs. next-day performance)
- Body composition vs. power-to-weight trends

### Race Planner
- Event entry with goal power/time
- Auto-generated taper plan
- Pacing strategy based on course profile and historical data
- Predicted performance based on current fitness
- Weather forecast integration
- Nutrition plan generator

### Coach Mode (Future)
- Coach dashboard viewing multiple athletes
- Prescribe workouts and training plans
- Review AI-generated analysis and add notes
- Communication tools
- Team-level analytics

---

## 6. DESIGN & AESTHETICS

### Design Philosophy: "Dark Precision"
The dashboard should feel like a fighter jet cockpit crossed with a luxury sports car dashboard. Think: Bloomberg Terminal meets Rapha.

**Color Palette:**
- Primary background: Deep space black (#0a0a0f)
- Surface: Midnight navy (#12121a, #16161f)
- Primary accent: Electric mint/green (#00e5a0) — conveys performance, health, go
- Secondary accents: Cool blue (#3b82f6), warm purple (#8b5cf6), hot pink (#ec4899)
- Danger/warning: Amber (#ffb800), Red (#ff4757)
- Text: Near-white (#e8e8ed) with muted tones (#8888a0, #55556a)

**Typography:**
- Headers/UI: DM Sans (clean, geometric, modern)
- Numbers/Data: JetBrains Mono (monospace for precision, beautiful for data)
- AI text: Slightly different — perhaps a serif or softer sans for the Claude analysis to distinguish it

**Visual Language:**
- Thin, glowing borders (1px, low-opacity white)
- Subtle gradient accent lines on cards (top edge glow)
- Frosted glass nav bar with backdrop blur
- Charts use gradient fills with low opacity, not solid bars
- Sparklines everywhere for micro-trends
- Dark mode only (athletes check this at 5am or after late rides)
- Confidence badges on AI insights (high/medium/low)
- Color-coded severity: green = positive, amber = attention, purple = action item, blue = insight

**Animations:**
- Staggered card entrance on load
- Number counters that animate up
- Chart bars that grow from zero
- Smooth transitions between time periods
- Typing animation for AI insights (like they're being "thought through")
- Subtle pulse on live/syncing data

**Responsiveness:**
- Desktop-first (this is a power-user tool)
- Tablet: collapse AI panel to bottom sheet
- Mobile: focused single-metric views with swipe navigation
- PWA for home screen installation

---

## 7. USER FLOW

### Onboarding
```
1. Landing Page → "Your AI Performance Coach" with live demo dashboard
2. Sign Up (email or Google/Apple SSO)
3. Connect Your Devices (guided flow)
   ├── Connect cycling computer (Wahoo/Garmin)
   ├── Connect activity platform (Strava/TrainingPeaks)
   ├── Connect recovery device (Oura/Whoop)
   ├── Connect sleep tracker (EightSleep)
   ├── Connect body composition (Withings)
   └── Skip / Add later
4. Set Your Profile
   ├── FTP (or auto-detect from data)
   ├── Weight / Height
   ├── Training goals
   ├── Upcoming events
   └── Experience level
5. Initial Sync (pull historical data, ~2-5 min)
6. First Dashboard Load with AI welcome message
   └── "Welcome! I've analyzed your last 90 days of training. Here's what I see..."
```

### Daily Flow
```
Morning:
1. Open Apex → See recovery score (from overnight Oura/Whoop/EightSleep data)
2. Claude suggests: "Recovery score 82. Ready for your planned threshold session. 
   Consider starting 10 min later — your deep sleep was lower than usual."

Post-Ride:
1. Auto-sync from Wahoo/Garmin/Strava
2. Dashboard updates with new ride data
3. AI Analysis card appears with insights
4. User reads analysis, asks follow-up questions in chat

Evening:
1. Check weekly training load progress
2. Review upcoming planned workouts
3. Chat: "What should I focus on this weekend's long ride?"
```

---

## 8. TECH STACK RECOMMENDATION

### Frontend
- **Next.js 14** (App Router) — React framework, great for SSR/SSG
- **TypeScript** — type safety for complex data models
- **Tailwind CSS** — rapid styling, dark mode, responsive
- **Recharts or D3.js** — for charts (Recharts for standard, D3 for custom power curves)
- **Framer Motion** — animations
- **Zustand or Jotai** — lightweight state management

### Backend
- **Next.js API Routes** or **FastAPI (Python)** — for integration endpoints
- **Supabase** (PostgreSQL + Auth + Realtime) — database, auth, and real-time sync
- **Redis** — caching computed metrics, rate limiting

### AI
- **Claude API (Sonnet for speed, Opus for deep analysis)** — the intelligence layer
- Pre-computed context payloads sent with each analysis request
- Streaming responses for the chatbot
- Structured output for metric extraction

### Infrastructure
- **Vercel** — hosting the Next.js app
- **Supabase** — managed Postgres + auth
- **Background jobs** — Inngest or Trigger.dev for data sync, analysis generation
- **File parsing** — .FIT file parser (npm: fit-file-parser) for direct uploads

---

## 9. MONETIZATION

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 2 integrations, basic dashboard, 5 AI analyses/month |
| **Pro** | $19/mo | Unlimited integrations, full AI analysis, chatbot, trends, race planner |
| **Elite** | $39/mo | Everything + coach features, advanced benchmarking, priority AI, training plan generation |
| **Coach** | $79/mo | Multi-athlete management, team analytics, white-label reports |

---

## 10. COMPETITIVE LANDSCAPE & DIFFERENTIATION

| Competitor | What They Do | What They Lack |
|-----------|-------------|----------------|
| Strava | Social, segments, basic stats | No real analysis, no recovery, no AI |
| TrainingPeaks | TSS/PMC, coaching tools | Ugly UI, no AI, no recovery data |
| Intervals.icu | Great free analytics | No recovery, no AI, power-user only |
| Whoop | Recovery, strain | No cycling-specific power analysis |
| Oura | Sleep, readiness | No training data at all |
| Today's Plan | Coaching platform | Outdated UI, no AI |
| Xert | AI fitness signatures | Narrow focus, confusing UX |

**Apex's moat:** Nobody connects ALL the data AND has AI that can reason about it like a coach. The insight quality from Claude analyzing cross-platform data is something no hardcoded algorithm can match.

---

## 11. FUTURE ROADMAP

**Phase 1 (Launch):** Cycling dashboard with AI analysis, core integrations
**Phase 2:** Running + triathlon support, coach mode, training plan generation
**Phase 3:** Nutrition integration (CGM, meal tracking, fueling recommendations)
**Phase 4:** Team/club features, social layer, community benchmarks
**Phase 5:** Wearable partnerships, real-time during-ride AI coach (earpiece integration?)

---

## 12. MVP SCOPE (What to Build First)

Week 1-2: Auth, user profiles, Strava OAuth integration, basic dashboard layout
Week 3-4: .FIT file parsing, ride data display, power zone calculations, metric cards
Week 5-6: Claude integration — post-ride analysis engine, chatbot
Week 7-8: Oura/Whoop integration for recovery, CTL/ATL/TSB charts
Week 9-10: Polish, animations, onboarding flow, landing page
Week 11-12: Beta launch, iterate on AI prompt engineering based on real data

---

## 14. HEALTH LAB — Blood Panels, DEXA Scans & Biomarker Intelligence

### Overview

A dedicated "Health Lab" tab in the top navigation where athletes can upload, track, and analyze health documents. The AI cross-references biomarker data with training performance, recovery metrics, body composition, and dietary profile to produce insights impossible from any single data source.

### Document Upload System

**Supported file types:** PDF (lab reports), JPG/PNG (photos of lab results), CSV/XLSX (exported data from lab portals)

**AI Processing Pipeline:**
1. User uploads document via drag-and-drop or file picker
2. Claude vision/OCR extracts biomarker names and values from the document
3. Values are matched to the internal biomarker database
4. Athlete-optimal ranges are applied (not clinical ranges — see below)
5. Cross-domain AI insights are generated by combining the new data with existing training, recovery, sleep, and nutrition data
6. Historical trends are updated

**Manual entry fallback:** If AI extraction fails or the user prefers, they can manually enter biomarker values via a simple form.

### Biomarker Database (9 Core Biomarkers at Launch)

Every biomarker has two range systems:
- **Clinical Range:** Standard lab reference (e.g., ferritin 12-300 ng/mL for males)
- **Athlete Optimal:** Sports science evidence-based range (e.g., ferritin 50-200 ng/mL for male athletes)

This distinction is critical. A ferritin of 15 ng/mL is "clinically normal" but catastrophic for an endurance athlete.

| Biomarker | Unit | Clinical Range (M) | Athlete Optimal (M) | Why Athletes Care |
|-----------|------|--------------------|-----------------------|-------------------|
| Ferritin | ng/mL | 12-300 | 50-200 | Iron stores → oxygen transport. #1 hidden performance limiter. 43% of female endurance athletes are deficient. |
| Vitamin D (25-OH) | ng/mL | 30-100 | 40-80 | Bone density, muscle contraction, immune function, testosterone production. 33.6% of NCAA athletes suboptimal. |
| Hemoglobin | g/dL | 13.5-17.5 | 14.0-17.0 | Oxygen-carrying capacity. Endurance athletes may show "pseudoanemia" (0.5-1.0 lower) from plasma volume expansion — actually beneficial. |
| Total Testosterone | ng/dL | 264-916 | 500-900 | Muscle repair, bone density, recovery. Lower-quartile athletes have 4.5× higher stress fracture rate. |
| Cortisol (AM) | µg/dL | 6.2-19.4 | 8-15 | Stress hormone. Chronically elevated = overtraining, poor recovery, muscle breakdown. T:C ratio is most informative. |
| hs-CRP | mg/L | 0-3.0 | 0-1.0 | Systemic inflammation marker. Persistent elevation indicates overtraining or inadequate recovery. Affects ferritin accuracy. |
| Vitamin B12 | pg/mL | 200-900 | 400-700 | RBC production, energy metabolism, nerve function. Vegans/vegetarians at high risk of deficiency. |
| Creatine Kinase (CK) | U/L | 39-308 | 50-400 | Muscle damage marker. Some elevation expected post-training. >1000 = reduce volume. >5000 = medical attention (rhabdo risk). |
| TSH | mIU/L | 0.4-4.0 | 0.5-2.5 | Thyroid function → metabolism, energy, body weight. Abnormal in athletes often correlates with underfueling (RED-S). |

**Future expansion:** Hematocrit, TIBC, transferrin saturation, free T4/T3, estradiol, FSH, LH, DHEA-S, magnesium (RBC), folate, zinc, fasting insulin, HbA1c, ApoB, Lp(a).

### Cross-Domain AI Insights

When a blood panel is uploaded, Claude generates insights by combining biomarker data with:
- **Training data** (power, volume, TSS, CTL/ATL from Strava/TrainingPeaks)
- **Recovery data** (HRV, sleep quality, readiness from Oura/EightSleep)
- **Body composition** (DEXA trends, weight from Withings)
- **Nutrition** (caloric intake, macros from MyFitnessPal/Cronometer)
- **Menstrual cycle** (for female athletes — cycle phase at time of blood draw)

**Example insight types:**
- "Ferritin climbed from 28 → 62 ng/mL over 6 months. This coincided with FTP increasing 14W and VO2max category improving from Cat 4 → Cat 3."
- "Cortisol jumped from 9.2 → 14.1 µg/dL. Combined with Oura HRV dropping 12ms and training volume up 26%, this pattern strongly suggests functional overreaching."
- "Vitamin D dropped from 68 → 45 ng/mL (September → December). Typical seasonal decline for your latitude. Increase supplementation from 2,000 → 4,000 IU daily through March."
- "Your CK is 290 U/L — technically in range, but 87% higher than your 3-month baseline of 155. Cross-referencing with your 16.2 hr/week training volume (vs 12.8 avg), this looks like accumulated training stress."

### DEXA Body Composition Tracking

**Metrics tracked per scan:**
- Total body fat percentage
- Lean mass (kg)
- Bone mineral density (g/cm², T-score)
- Visceral fat (kg)
- Android:Gynoid (A:G) ratio — trunk vs. hip fat distribution
- Regional lean mass (left vs. right leg, arms, trunk) — for imbalance detection

**Performance integration:**
- "At 75.7kg lean mass and 14.8% body fat, your estimated race weight of ~87.5kg gives you a W/kg of 3.40 at current FTP."
- "Target: 13.5% BF at 76kg lean → 86.3kg → 3.45 W/kg (+0.05 W/kg from body comp alone)."
- "Bone density stable at 1.31 — important because cycling is non-weight-bearing. Your strength training is maintaining bone health."

### Smart Reminder System

**Recommended testing cadences:**

| Test | Frequency | Why | Estimated Cost |
|------|-----------|-----|----------------|
| Comprehensive Blood Panel | Every 3 months (quarterly) | Catches iron depletion, vitamin D seasonal drops, overtraining hormonal shifts | $80-200 |
| DEXA Body Composition Scan | Every 6-12 months | Tracks lean mass, fat distribution, bone density | $75-150 |
| VO2max Lab Test | Annually or at training phase transitions | Gold-standard validation of training improvements | $100-250 |
| Iron Panel Follow-up | 8-12 weeks after supplementation starts | Confirms supplementation is working | $30-60 |

**Reminder features:**
- Countdown to next due date visible in Health Lab tab
- Push notification 1 week before due date
- Context-aware urgency: "Your ferritin was 28 ng/mL in March — your 12-week follow-up retest is due this week"
- Smart scheduling: "Your quarterly blood panel is due next week. Reminder: fast 10-12h before, no exercise 24h before, morning draw before 10 AM"

### Pre-Test Instructions

Apex provides pre-test guidance to ensure accurate results:
1. Fast 10-12 hours before blood draw (glucose, insulin, lipids require fasting)
2. Hydrate well — 500ml water before (dehydration inflates hemoglobin/hematocrit)
3. No exercise 24 hours before (elevates CK, cortisol, inflammatory markers)
4. Morning draw before 10 AM (cortisol and testosterone follow circadian rhythms)
5. Note menstrual cycle day (iron, estradiol, FSH, LH vary significantly)
6. Avoid supplements morning of (iron, B12, vitamin D spike levels for 6-8 hours)

### Privacy & Safety

- All health data encrypted at rest and in transit
- Never shared in community benchmarks
- Visible only to athlete (and coach if explicit access granted)
- Medical disclaimer on every page: "Apex Health Lab is not a diagnostic tool. AI insights are educational context, not medical advice. Abnormal results should be discussed with your physician."
- No diagnosis: Claude never says "you have X condition" — only "this pattern is consistent with..." or "discuss with your physician"

### Scientific References

- Lee et al. (2024) PMC6901403: Blood biomarker profiling and monitoring for high-performance athletes
- Pedlar et al. (2018): Iron status in female athletes, menstrual blood losses
- Heikura et al. (2018): Low-quartile testosterone and 4.5× stress fracture rate
- Owens et al. (2018): Vitamin D and athlete immune function
- Alaunyte et al. (2015): Optimal ferritin >35 µg/L for athletes
- ACSM Guidelines: Pre-analytic considerations for athlete blood draws

---

*Built for athletes who want to train smarter. Powered by Claude.*

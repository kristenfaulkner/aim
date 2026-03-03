# AIM Product Roadmap
_Last updated: 2026-03-03_

This is the master feature roadmap for AIM. Each feature includes: description, why it matters, data requirements, dependencies, implementation notes, and which insight categories it enables. For implementation-level detail (SQL schemas, detection algorithms, pseudocode), reference `docs/AIM-EXPANSION-SPEC.md` and `docs/technical-architecture.md` under "VEKTA-INSPIRED FEATURES".

---

## Recently Shipped

Features completed in the current development cycle (March 2026):

- **Daily Subjective Check-In System** — 4-slider morning check-in (life stress, motivation, muscle soreness, mood) stored in `daily_metrics`, with readiness score blending (70% device / 30% subjective), 7-day and 30-day rolling averages for trend detection
- **Activity-Level Subjective Fields** — GI comfort, mental focus, and pre-ride perceived recovery added to `activities` table, feeding cross-domain insight categories
- **Travel & Timezone Detection** — Auto-detects travel >200km between consecutive activities from GPS data, computes timezone shift and altitude change, infers flight vs drive, tracks altitude acclimation day counter (14-day cycle). New `travel_events` table with RLS
- **Strength & Cross-Training Logger** — `cross_training_log` table for gym, yoga, swimming, hiking sessions. Auto-assigns recovery impact (none/minor/moderate/major) based on activity type, body region, and intensity. Estimated TSS for training load integration
- **6 New AI Insight Categories (23-28)** — Subjective-Objective Alignment, Respiratory & Illness Early Warning, GI Tolerance & Fueling Boundaries, Perceived vs Actual Recovery, Travel & Environmental Disruption, Cross-Training Impact
- **12 New Tags** — Subjective state tags (7), respiratory/illness tags (3), GI/fueling tags (4), perception tags (4), travel tags (9), cross-training tags (4)
- **Migration 010** — Schema additions for all P1 expansion features (`supabase/migrations/010_expansion_checkin_travel_crosstraining.sql`)

---

## P1 — Core Analytics (Active Development)

These are the highest-priority features that represent AIM's biggest competitive differentiation. They replace basic FTP-based analysis with a world-class power model used by WorldTour teams.

### Critical Power (CP) & W' Modeling
_Task 40 in technical-architecture.md | Importance: 5/5 | Difficulty: 3/5_

**Description**: Replace single-point FTP with a 3-dimensional power model: Critical Power (CP, the aerobic ceiling), W' (W-prime, the finite anaerobic energy reserve above CP in kJ), and Pmax (peak neuromuscular/sprint capacity). Auto-updates continuously from best efforts without requiring a formal test.

**Why it matters**: FTP is a one-dimensional number. Two riders with identical FTP can have dramatically different race capabilities depending on their W' and Pmax. CP modeling is the direction elite cycling analytics is moving (Vekta uses it for WorldTour teams). AIM should match and exceed this by cross-referencing CP/W' with recovery, sleep, and body comp data that no competing platform has.

**Data requirements**:
- Power data from activities (already available via Strava/Wahoo streams)
- Power profile best efforts at multiple durations (already stored in `power_profiles` table)
- New columns on `power_profiles`: `cp_watts`, `w_prime_kj`, `pmax_watts`

**Dependencies**: None -- can build on existing power profile infrastructure

**Implementation notes**:
- Hyperbolic model fitting: P = W'/t + CP, fitted from power-duration curve (5s, 15s, 30s, 1m, 2m, 3m, 5m, 8m, 12m, 20m, 30m, 60m best efforts)
- Auto-update CP/W'/Pmax continuously as new best efforts are recorded
- Optional structured CP test protocol: 15-second sprint + 3-minute effort + 12-minute effort for baseline
- Dashboard display: 3-panel view showing CP (aerobic ceiling), W' (anaerobic reserve), Pmax (sprint)
- AI uses CP/W' in analysis: "Two riders with identical FTP can have dramatically different W' -- yours is 18kJ, which limits your ability to respond to attacks. Target 30/30 intervals to build W'."
- Cross-domain: correlate CP changes with sleep quality, HRV trends, body composition

**Insight categories enabled**: Enhanced Categories 8 (Predictive Analytics), 9 (Benchmarking), 16 (Interval Execution Coaching)

---

### Adaptive Training Zones
_Task 41 in technical-architecture.md | Importance: 5/5 | Difficulty: 2/5_

**Description**: Replace static FTP-based zones with dynamic zones calculated from the CP model that auto-adjust as fitness evolves. Additionally, factor in daily readiness to produce readiness-adjusted zone targets.

**Why it matters**: Static zones are wrong within weeks of setting them. Athletes either outgrow them or regress past them. Adaptive zones mean the athlete never trains in the wrong zone, and on bad recovery days, AIM automatically adjusts targets so prescribed workouts remain achievable. This is a trust-builder: "AIM always gives me the right number."

**Data requirements**:
- CP model (from P1 Critical Power feature)
- Daily readiness score (already computed)
- User preference for CP-based vs Coggan zones (new setting)

**Dependencies**: Critical Power (CP) & W' Modeling (P1)

**Implementation notes**:
- CP-based zone calculation:
  | Zone | Name | Range |
  |------|------|-------|
  | Z1 | Aerobic / Recovery | <70% CP |
  | Z2 | Tempo | 70-90% CP |
  | Z3 | Threshold | 90-105% CP |
  | Z4 | VO2max | 105-130% CP |
  | Z5 | Anaerobic | 130-180% CP |
  | Z6 | Neuromuscular | >180% CP |
- Auto-update zones as CP evolves (no manual FTP entry needed after initial setup)
- Show zone changes over time: "Your Z3 floor moved from 265W to 273W over the last 8 weeks"
- Readiness-adjusted zones (AIM differentiator): on red recovery days, temporarily shift zone targets down 3-5%
- Display both CP-based and traditional Coggan zones -- let user choose preference in Settings
- Recalculate all historical zone distributions when CP model updates (background job)

**Insight categories enabled**: Enhanced Categories 3 (HRV/Training Prescription), 6 (Long-Term Adaptations), 16 (Interval Execution Coaching)

---

### Durability & Fatigue Resistance Tracking
_Task 42 in technical-architecture.md | Importance: 5/5 | Difficulty: 4/5_

**Description**: Track how power declines as fatigue accumulates throughout a ride. Measure peak power at standard durations (1s, 5s, 1m, 5m, 20m) after progressive fatigue levels (0, 10, 20, 30, 40, 50 kJ/kg of accumulated work). Build a durability score and track it over time.

**Why it matters**: Durability is the hottest metric in pro cycling. It is critical for stage racing, long gran fondos, and any event over 3 hours. A rider who retains 95% of 5-min power at 30 kJ/kg is dramatically better positioned than one who retains 80%. AIM already has basic durability models in `performance-models.js` -- this feature makes them first-class, visual, and trackable.

**Data requirements**:
- Power streams from activities (already available)
- New JSONB column on `activities`: `durability_data`
- Aggregate durability metrics in `power_profiles`
- Nutrition logs (already available) for fueling correlation

**Dependencies**: None -- can build standalone. Enhanced with CP model when available.

**Implementation notes**:
- For each activity with power data, compute peak efforts in each fatigue bucket: best 5-min power when fresh (0-10 kJ/kg) vs fatigued (30-40 kJ/kg)
- Durability page/tab showing power curves sliced by fatigue level
- Durability score: percentage of peak power retained at 30 kJ/kg fatigue
- Track durability over time: is the athlete becoming more fatigue-resistant?
- AI cross-domain insights: "Your durability drops 15% more on nights with <6h sleep" or "Your 5-min power retention after 30 kJ/kg improved from 85% to 92% since starting the beetroot juice protocol"
- Race-specific durability predictions: "This race expects ~45 kJ/kg of work before the final climb. At that fatigue level, your projected 20-min power is 278W vs 298W fresh"

**Insight categories enabled**: Category 17 (Durability/Fatigue Resistance), Category 22 (Race-Specific Analysis), Category 18 (Fueling Causality)

---

## P2 — Enhanced Analysis

High-value features that build on P1 and expand AIM's analytical depth. These represent the transition from "smart training log" to "AI performance scientist."

### Season & Periodization Awareness
_Expansion Spec Priority 2 | Importance: 5/5 | Difficulty: 3/5_

**Description**: Track where the athlete is in their training season (base, build, peak, taper, recovery, off-season) and adjust all AI recommendations accordingly. Support both user-set phases (athlete enters A-race date and AIM proposes a phase plan) and AI-inferred phases (AIM detects phase from training patterns).

**Why it matters**: Without this, AIM is very intelligent at the daily and weekly scale but does not think in training blocks or season arcs. A world-class coach plans in 4-6 week mesocycles and 6-12 month macrocycles. The AI recommendations should shift dramatically based on phase: during base, push volume and aerobic development; during taper, aggressively protect rest and flag unnecessary load; during off-season, do not flag low CTL as a problem. Without this, AIM might tell a tapering athlete to "maintain your training load" when they should be shedding it. This is a trust-destroyer.

**Data requirements**:

New columns on `profiles` table:
```sql
season_start_date DATE,
a_race_date DATE,
a_race_name TEXT,
b_race_dates DATE[],
current_training_phase TEXT, -- 'off_season' | 'base' | 'build' | 'peak' | 'taper' | 'race_week' | 'recovery_block'
current_phase_start_date DATE,
current_phase_planned_weeks INTEGER,
weekly_hours_available NUMERIC
```

New `training_phases` table (for history):
```sql
CREATE TABLE training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  planned_weeks INTEGER,
  actual_weeks INTEGER,
  notes TEXT,
  avg_weekly_tss NUMERIC,
  avg_weekly_hours NUMERIC,
  phase_ctl_start NUMERIC,
  phase_ctl_end NUMERIC,
  key_sessions_completed INTEGER,
  key_sessions_planned INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_training_phases_user ON training_phases(user_id, start_date);
```

**Dependencies**: None -- can be built standalone

**Implementation notes**:

Phase detection (hybrid):
1. **User-set**: Athlete sets A-race date and AIM proposes a phase plan: "Your race is 16 weeks away. Suggested: 6 weeks base, 6 weeks build, 2 weeks peak, 1 week taper, race week, 1 week recovery."
2. **AI-inferred**: If the athlete does not set a plan, AIM infers phase from training patterns: rising CTL with mostly Z2 = base; increasing intensity mix = build; peak CTL with reduced volume = taper; very low CTL = off-season.

Phase affects AI behavior:

| Phase | AI Behavior |
|-------|-------------|
| Base | Emphasize volume, aerobic efficiency, do not push intensity, celebrate consistency |
| Build | Introduce and progress intensity, monitor fatigue accumulation, flag overtraining risk earlier |
| Peak | Protect quality, reduce volume, flag any junk miles, emphasize sharpening |
| Taper | Aggressively protect rest, reassure athlete that fitness loss is minimal, reduce all volume recommendations 40-60% |
| Race Week | Ultra-specific: openers workout, fueling plan, sleep schedule, logistics reminders |
| Recovery Block | Discourage intensity, celebrate rest days, mental health focus, set expectations for next block |
| Off-Season | Do not flag low CTL, encourage variety and fun, cross-training positive, maintain base only |

Weekly cron to auto-detect phase transitions based on training pattern shifts.

New tags: `base_phase`, `build_phase`, `peak_phase`, `taper_phase`, `race_week`, `recovery_block`, `off_season`, `phase_transition`, `overreaching_in_build`

**Insight categories enabled**: Category 29 (Periodization & Season Intelligence)

---

### Personal Performance Models (Persistent)
_Expansion Spec Priority 2 | Importance: 5/5 | Difficulty: 4/5_

**Description**: Build and maintain per-athlete statistical models that quantify individual responses to specific conditions: heat, altitude, sleep quality, fueling rate, time of day, HRV, stress tolerance, optimal sleep hours, and GI ceiling.

**Why it matters**: This is AIM's deepest competitive moat. After 3-6 months, AIM knows each athlete's personal response curves -- not population averages, but their specific numbers. "Your personal heat penalty is 3.1% per 5C above 22C" is radically more valuable than "expect performance loss in heat." No competitor can replicate this without the same data history. It makes every recommendation more precise over time and creates an insurmountable switching cost.

**Data requirements**:

New `personal_models` table:
```sql
CREATE TABLE personal_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  -- Types: 'heat_penalty' | 'sleep_performance' | 'altitude_penalty' |
  --        'fueling_durability' | 'time_of_day' | 'hrv_performance' |
  --        'stress_tolerance' | 'optimal_sleep_hours' | 'gi_ceiling'
  parameters JSONB NOT NULL,
  -- Example for heat_penalty: { "penalty_pct_per_5c": 3.1, "baseline_temp_c": 22, "n_observations": 34, "r_squared": 0.42 }
  -- Example for optimal_sleep_hours: { "optimal_hours": 7.2, "min_threshold": 6.5, "performance_drop_per_hour_below": 4.2, "n_observations": 89 }
  -- Example for gi_ceiling: { "safe_carbs_per_hour": 75, "risk_zone_start": 78, "heat_adjusted_ceiling": 65, "n_observations": 22 }
  confidence NUMERIC, -- 0-1
  n_observations INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  previous_parameters JSONB, -- for tracking model evolution
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_personal_models_user_type ON personal_models(user_id, model_type);
```

**Dependencies**: Existing `performance-models.js` (5 models already computed per-request -- this feature persists and evolves them). Benefits from daily check-in data (life stress for `stress_tolerance`), GI comfort data (for `gi_ceiling`), and travel data (for `altitude_penalty`).

**Implementation notes**:
- Models update incrementally after each relevant activity using Bayesian-style updates (new observation shifts the estimate, weighted by confidence)
- Each model has a minimum observation threshold before it becomes "active" (e.g., heat model needs 15+ outdoor rides across a temperature range)
- Store model evolution (`previous_parameters`) for tracking how the athlete's responses change over time
- Confidence grows with data: `confidence = Math.min(0.95, n_observations / threshold)`
- Model types and their key parameters:
  - `heat_penalty`: penalty % per 5C above baseline temp
  - `sleep_performance`: performance change per hour of sleep deviation from optimal
  - `altitude_penalty`: penalty % per 500m above sea level
  - `fueling_durability`: late-ride power retention by carb intake rate
  - `time_of_day`: performance variation by time of day
  - `hrv_performance`: EF/power relationship to morning HRV
  - `stress_tolerance`: training quality under elevated life stress
  - `optimal_sleep_hours`: individual optimal sleep duration (diminishing returns point)
  - `gi_ceiling`: personal carb/hr threshold where GI issues emerge

**Insight categories enabled**: Category 30 (Personal Model Insights)

---

### Plateau & Breakthrough Detection
_Expansion Spec Priority 2 | Importance: 4/5 | Difficulty: 3/5_

**Description**: Algorithmic detection of performance plateaus (stagnation despite training) and breakthroughs (meaningful fitness jumps), with causal analysis cross-referencing sleep, stress, training composition, and nutrition.

**Why it matters**: Athletes are terrible at recognizing plateaus -- they often just train harder, which makes it worse. And they often miss breakthroughs because day-to-day variance masks the trend. AIM should be the one saying "your 5-min power has been flat for 6 weeks despite 15% more volume -- you need a stimulus change" or "your FTP jumped 8W this month, driven by your sweet spot consistency."

**Data requirements**:
- Power profile history (12+ weeks, already stored in `power_profiles`)
- Training load history (CTL/ATL/TSB, already in `daily_metrics`)
- Sleep, stress, and training composition data (already available)

**Dependencies**: Power profiles (already exist). Enhanced with daily check-in data and personal models when available.

**Implementation notes**:
- Run weekly as a cron job checking power profile trends at 4 key durations (1min, 5min, 20min, 60min)
- **Plateau detection**: Coefficient of variation (CV) < 2% for 6 weeks with maintained CTL and adequate training load. This means the athlete is training consistently but not improving.
- **Breakthrough detection**: >3% improvement sustained over 3+ sessions at a key duration
- **Causal analysis for plateaus**: Cross-reference with sleep averages, training composition (% time in each zone), intensity frequency, life stress trends. Suggest specific stimulus changes.
- **Causal analysis for breakthroughs**: Identify what changed -- more quality sessions, better sleep, reduced stress, training composition shift, body weight change. Tell the athlete "this is your recipe -- protect it."
- Detection algorithm pseudocode:
  ```javascript
  // Plateau: power flat for 6+ weeks
  const cv = standardDeviation(recent6weeks) / mean(recent6weeks);
  if (cv < 0.02 && trainingLoadMaintained && recent6weeks.length >= 4) { /* plateau */ }

  // Breakthrough: >3% sustained improvement
  const improvement = (recentBest - previousBest) / previousBest;
  if (improvement > 0.03 && sustainedCount >= 3) { /* breakthrough */ }
  ```

New tags: `plateau_detected`, `breakthrough_detected`, `personal_best_effort`, `return_from_break`, `first_ride_after_break`

**Insight categories enabled**: Category 31 (Plateau & Breakthrough Analysis)

---

### W' Balance Tracking
_Task 49 in technical-architecture.md | Importance: 4/5 | Difficulty: 3/5_

**Description**: Once CP and W' are modeled, track W' depletion and recovery in real-time throughout a ride using the Skiba differential equation model. This is the gold standard for race analysis -- showing exactly when an athlete "went into the red" and how quickly they recovered.

**Why it matters**: W'bal visualization transforms race analysis. Instead of "you went hard," AIM can say "you depleted W' to 2% at the 45km mark and never fully recovered. The winning attack came at 52km when your W'bal was only at 38% -- you did not have the reserves to respond." This is the level of insight that WorldTour teams pay for.

**Data requirements**:
- CP and W' values (from P1 Critical Power feature)
- Second-by-second power data from activity streams (already available)
- New JSONB column on activities or computed on-the-fly

**Dependencies**: Critical Power (CP) & W' Modeling (P1) -- requires CP and W' to be established

**Implementation notes**:
- Implement W'bal algorithm: `W'bal = W' - sum(work above CP) + sum(recovery below CP)` using the Skiba differential equation model
- For each activity with power data, compute second-by-second W'bal throughout the ride
- Visualize W'bal as a stream on activity detail page (shows depletion during hard efforts, recovery during easy periods)
- Flag "empty tank" moments: when W'bal approaches 0, the athlete was at their absolute limit
- Track W' recovery rate over time as a fitness metric -- faster recovery = better anaerobic fitness
- AI cross-domain: "Your W' recovery rate was 15% slower than your 90-day average. Combined with last night's low HRV (38ms), your anaerobic system was impaired."

**Insight categories enabled**: Enhanced Category 22 (Race-Specific Analysis), Category 16 (Interval Execution Coaching)

---

### Similar Session Finder & Comparison
_Task 47 in technical-architecture.md | Importance: 4/5 | Difficulty: 3/5_

**Description**: Automatically find the most comparable past sessions for any activity and show side-by-side comparison. AIM adds the "why" -- explaining what changed between similar efforts using cross-domain data (sleep, HRV, weather, body weight, stress, fueling).

**Why it matters**: Athletes frequently wonder "why was today different?" The answer usually lies in recovery, environmental conditions, or accumulated fatigue -- but finding the right comparison manually is tedious. Automatic similar session discovery with AI-powered causal explanation is a core differentiator.

**Data requirements**:
- Activity history with metrics (already available)
- Cross-domain context: sleep, HRV, weather, weight, stress (already available)
- GPS data for route matching (from Strava streams, already available)

**Dependencies**: None -- can build standalone. Enhanced with personal models when available.

**Implementation notes**:
- Build similarity algorithm matching activities by: duration (+/-15%), distance (+/-10%), elevation (+/-20%), TSS (+/-15%), session type, route (GPS matching)
- On each activity detail page, show "Similar Sessions" section with top 3-5 matches
- Side-by-side comparison of matched sessions: power, HR, EF, cadence, pace, zones
- AI explains the differences: "Compared to your most similar ride (March 15): NP was 8W higher at 2bpm lower HR. Your EF improved 5%. Key factors: 1.2kg lighter, HRV was 15ms higher, and deep sleep was 38min longer."
- Automatic race comparison: when a race is detected, find and compare to most similar past races
- Progress detection: if the athlete rides the same route regularly, auto-track progression over time with trend line

**Insight categories enabled**: Category 21 (Anomaly Detection), Category 22 (Race-Specific Analysis), Category 6 (Long-Term Adaptations)

---

### Training Prescription Engine
_From CLAUDE.md backlog | Importance: 4/5 | Difficulty: 3/5_

**Description**: AI-powered workout recommendations based on power profile gaps, CP/W' weaknesses, current phase, fatigue state, and available time.

**Why it matters**: This is the bridge from "analysis" to "coaching." Analysis tells you what happened. Prescription tells you what to do next. A training prescription engine that considers the full AIM data context (power gaps, recovery state, phase, schedule constraints) is more personalized than any generic plan.

**Data requirements**:
- Power profile with gap analysis (already available)
- CP/W'/Pmax model (from P1, when available)
- Training phase (from Season & Periodization, when available)
- Daily readiness score (already available)
- Training calendar (already available)
- Weekly hours available (from profiles)

**Dependencies**: Benefits from CP model (P1) and Season & Periodization (P2) but can start with FTP-based zones

**Implementation notes**:
- Identify power profile weaknesses: "Your 5-min power is 'Moderate' while your 20-min is 'Very Good' -- VO2max is your limiter"
- Generate specific workouts targeting identified gaps with exact power targets
- Factor in current fatigue state: fresh athletes get intensity, fatigued athletes get recovery or aerobic work
- Respect phase: base phase gets volume-focused prescriptions, build phase gets progressive intensity
- Export as .FIT or .ZWO workout file for Wahoo/Garmin/Zwift head units
- User can create custom workouts with interval builder (drag-and-drop steps)
- Track workout compliance: planned workout vs actual ride metrics comparison

**Insight categories enabled**: Enhanced Category 3 (HRV/Training Prescription), Category 8 (Predictive Analytics)

---

## P3 — Integrations & Data Sources

These features expand the data sources feeding into AIM's cross-domain analysis engine.

### Garmin Connect Integration
_Importance: 4/5 | Difficulty: 3/5_

**Description**: Full sync of activities, body battery, stress scores, daily HR, and FirstBeat metrics from Garmin Connect via the Garmin Health API.

**Why it matters**: Garmin is the largest cycling computer and wearable platform. Not having it is a significant gap. Body battery and stress scores are unique data points that no other wearable provides and would enhance readiness modeling.

**Data requirements**: OAuth connect/callback, sync logic mapping Garmin data to `activities` and `daily_metrics`

**Dependencies**: None

**Implementation notes**:
- Garmin Health API requires a developer partnership application
- Activities map to existing `activities` table
- Body battery maps to `daily_metrics` (new column or JSONB field)
- Stress data maps to `daily_metrics`
- FirstBeat training effect and VO2max estimate as supplementary data

**Insight categories enabled**: Enhances all existing categories by providing another data source for activities and recovery metrics

---

### Oura Ring Sync
_Importance: 4/5 | Difficulty: 2/5_

**Description**: Sync sleep stages, HRV, readiness score, temperature trends, and activity from Oura Ring. OAuth connect/callback already exist -- sync logic is TODO.

**Why it matters**: Oura provides the gold standard for consumer sleep tracking and is the only device that enables menstrual cycle intelligence (via temperature trends). Completing this integration unlocks Categories 10 (Menstrual Cycle) and significantly enhances Categories 2 (Sleep) and 3 (HRV).

**Data requirements**: Sync to existing `daily_metrics` columns (sleep stages, HRV, RHR, readiness, temperature)

**Dependencies**: OAuth connect/callback already built

**Implementation notes**:
- Oura API v2 provides daily sleep, readiness, and activity summaries
- Map sleep stages to existing `daily_metrics` columns
- Temperature data enables menstrual cycle phase detection (see P4 Menstrual Cycle Intelligence)
- Readiness score maps to `daily_metrics.readiness_score`

**Insight categories enabled**: Enhanced Categories 2 (Sleep), 3 (HRV), 10 (Menstrual Cycle)

---

### Whoop Sync
_Importance: 3/5 | Difficulty: 2/5_

**Description**: Sync strain score, recovery score, sleep performance, HRV, and journal entries from Whoop. OAuth connect/callback already exist -- sync logic is TODO.

**Why it matters**: Whoop is popular among competitive athletes and provides unique strain scoring that could enhance training load modeling. The journal feature captures subjective data similar to AIM's daily check-in.

**Data requirements**: Sync to existing `daily_metrics` columns (strain, recovery, sleep, HRV)

**Dependencies**: OAuth connect/callback already built

**Implementation notes**:
- Whoop API provides sleep, recovery, and workout data
- Strain score maps to `daily_metrics.strain_score`
- Recovery score maps to `daily_metrics.recovery_score`
- Journal entries could supplement daily check-in data

**Insight categories enabled**: Enhanced Categories 2 (Sleep), 3 (HRV), 5 (Fatigue Signatures)

---

### Withings Sync
_Importance: 3/5 | Difficulty: 2/5_

**Description**: Sync body weight, body fat %, muscle mass, hydration %, and bone mass from Withings smart scale. OAuth connect/callback already exist -- sync logic is TODO.

**Why it matters**: Body composition data unlocks Category 1 (Body Comp -> Performance) fully: real-time W/kg, lean mass W/kg, race weight projection, climbing physics. This is one of the most powerful cross-domain insight chains in AIM.

**Data requirements**: Sync to existing `daily_metrics` columns (weight, body fat, muscle mass, hydration, bone mass)

**Dependencies**: OAuth connect/callback already built

**Implementation notes**:
- Withings API provides daily weigh-in data
- Map to existing `daily_metrics` body composition columns
- Triggers W/kg recalculation when new weight recorded
- Combined with DEXA scans for lean mass tracking

**Insight categories enabled**: Category 1 (Body Composition -> Performance), Enhanced Category 4 (Environmental)

---

### Remaining Tier 3 Integrations
_Importance: 2/5 | Difficulty: varies_

**Description**: Expand data source coverage with additional platforms.

| Platform | Data | Priority |
|----------|------|----------|
| Apple Health | Activities, resting HR, HRV, sleep, respiratory rate, SpO2 | Medium |
| Supersapiens / Lingo (CGM) | Continuous glucose monitoring | Medium |
| MyFitnessPal / Cronometer | Daily nutrition intake | Medium |
| TrainerRoad | Structured workouts, calendar | Low |
| Intervals.icu | Power analysis, calendar | Low |
| Zwift | Indoor activities, FTP tests | Low |
| Hammerhead | Activities from Karoo head unit | Low |
| Hexis | Nutrition periodization | Low |
| Noom | Nutrition tracking | Low |

**Why it matters**: Each additional data source makes AIM's cross-domain analysis more powerful. CGM in particular would unlock real-time fueling optimization insights that no competitor has.

**Dependencies**: Varies by platform -- some require developer partnerships

---

## P4 — Platform & Business

Features that expand AIM from a single-athlete tool to a platform with business model and multi-user capabilities.

### Coach Dashboard & Multi-Athlete Management
_Task 48 in technical-architecture.md + Expansion Spec Priority 3 | Importance: 4/5 | Difficulty: 4/5_

**Description**: A separate dashboard for coaches managing multiple athletes. Shows roster status at a glance, flags athletes who need attention, and provides tools for coach-athlete communication within AIM. Includes per-athlete drill-down with a coach annotation layer.

**Why it matters (Business)**: Once a coach puts their 15-30 athletes on AIM, the switching cost is enormous. The coach builds workflow dependency -- checking AIM every morning is faster than texting each athlete. The athletes get better coaching because the AI handles the daily monitoring and the coach focuses on strategy and relationship. This is also where team and enterprise pricing lives.

**Data requirements**:

New `coach_athletes` table:
```sql
CREATE TABLE coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'coach', -- 'coach' | 'team_manager' | 'nutritionist'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  permissions JSONB, -- { canViewHealth: true, canViewBloodwork: false, canPrescribeWorkouts: true }
  UNIQUE(coach_user_id, athlete_user_id)
);
```

New `coach_annotations` table:
```sql
CREATE TABLE coach_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID REFERENCES profiles(id),
  athlete_user_id UUID REFERENCES profiles(id),
  target_type TEXT, -- 'activity' | 'insight' | 'goal' | 'daily' | 'general'
  target_id UUID, -- polymorphic reference
  content TEXT NOT NULL,
  visible_to_athlete BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Dependencies**: Core platform must be stable first. Benefits from Season & Periodization (P2) and Personal Models (P2) for richer coach views.

**Implementation notes**:

Key surfaces:
- **Roster View** (`/coach`): Grid of all coached athletes with name, today's readiness (colored dot), last activity date, compliance %, flags. Sort by readiness (worst first), last active (most stale), compliance. Quick filters: "Needs attention" (red readiness, missed workouts, illness precursor), "Traveling" (recent travel events), "Tapering" (in taper phase).
- **Athlete Drill-Down** (`/coach/athlete/:id`): Same as athlete's own dashboard, but with a coach annotation layer. Coach can leave notes on any ride, insight, or goal. Notes appear to athlete in AI panel marked as "[Coach name]". Coach can override AI workout recommendations.
- **Team Insights** (`/coach/team-insights`): Aggregate patterns across all coached athletes.
- **Settings** (`/coach/settings`): Manage roster, permissions, billing.
- **Weekly Summary Email**: Auto-generated via Resend with per-athlete compliance, red flags, breakthroughs, suggested action items. Coach can reply inline with notes.

Athlete invitation flow: coach sends invite link -> athlete accepts -> data sharing begins.
Granular permissions: athlete controls what the coach can see (training data, recovery data, health lab, body comp).

Pricing: Free tier for coaches (up to 5 athletes), paid coach tier for unlimited athletes.

**Insight categories enabled**: Categories 32-34 (Team Health, Team Training Load, Shared Race Prep)

---

### Team-Level Intelligence
_Expansion Spec Priority 3 | Importance: 3/5 | Difficulty: 3/5_

**Description**: Insights that span multiple athletes on the same team -- aggregate health trends, training load management, race preparation coordination.

**Why it matters**: A team director needs "3 of 8 riders show illness patterns" at a glance, not individual athlete checks. Coordinated race preparation (taper plans, role-based recommendations, shared fueling logistics) is a premium feature teams will pay for.

**Data requirements**: Requires coach_athletes relationship from Coach Dashboard feature

**Dependencies**: Coach Dashboard & Multi-Athlete Management (P4)

**Implementation notes**:

Three insight categories:

**Category 32: Team Health Monitoring**
- "3 of your 8 riders show illness precursor patterns (elevated RHR + suppressed HRV). All 3 raced at [event] last weekend. Consider isolating them from team training for 48 hours."
- "Your team's average sleep has dropped from 7.3 to 6.4 hours during this stage race. This typically accelerates performance decline by day 5."

**Category 33: Team Training Load Management**
- "Your team's average CTL is 82 with a spread of 65-96. The 3 riders below 70 may struggle with the demands of next week's stage race. Consider reducing their non-race training to preserve freshness."
- "Rider A and Rider C have similar power profiles but Rider A is 15 TSS/day fresher. For Saturday's race, Rider A should take the harder assignment."

**Category 34: Shared Race Preparation**
- Coordinated taper plans for team events
- Role-based recommendations: "Sprinter should maintain neuromuscular sharpness; GC rider should focus on threshold efficiency; domestiques should maintain endurance base"
- Shared fueling and logistics planning

**Insight categories enabled**: Categories 32, 33, 34

---

### Stripe Payments
_Importance: 5/5 | Difficulty: 2/5_

**Description**: 3-tier subscription system with feature gating, 14-day free trial, and annual billing option.

**Why it matters**: Revenue. AIM cannot sustain Claude API costs without a payment model.

**Data requirements**:
- `profiles.subscription_tier`, `stripe_customer_id`, `stripe_subscription_id` already exist in schema
- Stripe Customer Portal for self-service management

**Dependencies**: None -- can build anytime

**Implementation notes**:
- Tiers: Starter ($19/mo), Pro ($49/mo), Elite ($99/mo) with annual discounts (15/39/79)
- Feature gating: AI analysis frequency, number of integrations, historical data depth, export capabilities
- 14-day free trial on all tiers, no credit card required
- Stripe Checkout for subscription creation
- Stripe Webhooks for subscription lifecycle events
- Customer Portal for plan changes and cancellation
- Usage metering for AI analysis calls (per-tier limits)

**Insight categories enabled**: None directly -- enables business sustainability

---

### Historical Performance Timeline (5-Year)
_Task 50 in technical-architecture.md | Importance: 3/5 | Difficulty: 2/5_

**Description**: Long-range performance timeline showing the athlete's entire training history with key milestones, season summaries, and year-over-year overlays.

**Why it matters**: Athletes who have been training for years want to see their trajectory. Season-over-season comparison reveals long-term patterns that daily analysis misses. "Your FTP plateaus every August -- historically this coincides with heat + accumulated fatigue. Consider a mid-summer recovery block."

**Data requirements**:
- Historical activities (up to 5 years via Strava backfill, already supported)
- Power profile history over time
- Training load (CTL/ATL/TSB) over time (already computed)
- Race results, injuries, equipment changes (user-annotated)

**Dependencies**: None -- can build standalone

**Implementation notes**:
- Performance Timeline page: long-range view of key metrics (FTP, CP, CTL, weight, W/kg) over months/years
- Import historical data from Strava (up to 5 years on backfill sync, already supported)
- Annotate timeline with key events: races, injuries, equipment changes, training block transitions, blood work dates
- AI-generated season summaries: "Your 2025 season: FTP rose from 285W to 302W (+6%), CTL peaked at 88. Best performance: Hawk Hill PR on June 15."
- Year-over-year overlay: compare any metric across seasons (same month, same time of year)
- Identify long-term patterns
- Training volume and intensity trends over years

**Insight categories enabled**: Enhanced Category 6 (Long-Term Adaptations), Category 31 (Plateau & Breakthrough)

---

### Torque Analysis
_Task 45 in technical-architecture.md | Importance: 3/5 | Difficulty: 2/5_

**Description**: Calculate torque from power and cadence streams: Torque (Nm) = (60 x Power) / (Cadence x 2pi). Analyze torque under fatigue, torque vs gradient, and sprint torque as a neuromuscular capacity metric.

**Why it matters**: Torque reveals the force behind the power. Two riders at identical watts can have completely different pedaling strategies. Useful for bike fit analysis, climbing technique, and sprint form. Fatigue-induced torque shifts (higher torque / lower cadence) are a common compensatory pattern worth flagging.

**Data requirements**:
- Power and cadence streams from activities (already available)
- Elevation/gradient data (already available from GPS)

**Dependencies**: None

**Implementation notes**:
- Calculate per-second torque from power and cadence streams
- Add torque to activity streams visualization (toggleable)
- Compute per-activity torque metrics: avg torque, max torque, torque at threshold, torque-cadence relationship
- Analyze torque under fatigue: does the athlete shift to higher torque / lower cadence as they tire?
- Torque vs gradient analysis: how force production changes on climbs vs flats
- Sprint torque tracking: peak torque in sprints as neuromuscular capacity measure
- AI insight: "Your torque increased 12% in the final hour while cadence dropped 8rpm -- you are grinding more as you fatigue. High-cadence drills can help maintain efficiency."

**Insight categories enabled**: Enhanced Category 5 (Fatigue Signatures), Category 16 (Interval Execution Coaching)

---

### Menstrual Cycle Intelligence
_Importance: 4/5 | Difficulty: 3/5_

**Description**: Oura temperature-based phase detection, cycle-aware training recommendations, personal cycle-performance model after 3+ tracked cycles. Opt-in only.

**Why it matters**: 77% of elite female athletes report their cycle negatively affects performance (Jones et al., 2024). No consumer platform captures cycle phase and correlates it with power, HR, and recovery data to build individual patterns. After 3-6 cycles, AIM can tell an athlete "your best 5-min efforts occur on cycle days 8-12" or "your cardiac drift is 2.1% higher during luteal phase rides."

**Data requirements**:
- Oura Ring temperature data (requires Oura sync, P3)
- `profiles.uses_cycle_tracking` already exists
- `daily_metrics.cycle_day` and `cycle_phase` columns already exist

**Dependencies**: Oura Ring Sync (P3) for auto-detection. Can also work with manual logging.

**Implementation notes**:
- Oura Ring Gen 3 temperature trends enable automatic cycle phase detection and period prediction
- Four phases tracked: menstrual (days 1-5), follicular (days 6-12), ovulatory (days 12-16), luteal (days 16-28)
- Phase-specific AI behavior based on well-established research (see `docs/product-blueprint.md` Section 10 for full scientific foundation with 10 peer-reviewed citations)
- Hormonal contraception users get modified insights based on active vs placebo pill phase
- Personal patterns after 3+ cycles: "Your NP averages 4.2% lower on luteal days 22-26"
- Privacy: cycle data encrypted and never shared in community benchmarks
- Design principles: always opt-in, science-backed not prescriptive, individual patterns trump population averages, citations mandatory

**Insight categories enabled**: Category 10 (Menstrual Cycle Intelligence)

---

## P5 — Polish & Infrastructure

Quality-of-life improvements and infrastructure that improve the overall experience.

### Onboarding Improvements
_Importance: 3/5 | Difficulty: 2/5_

**Description**: Reduce friction in the signup and data connection flow. Better guidance through connecting first integration, understanding what data AIM needs, and seeing value quickly.

**Why it matters**: First 5 minutes determine retention. If the athlete connects Strava but does not see insights within 60 seconds, they may never come back.

**Data requirements**: None -- UX improvements

**Dependencies**: None

**Implementation notes**:
- Guided connection wizard: suggest integrations in priority order based on user's stated devices
- Show progress: "AIM is syncing your last 365 days of Strava data... 42 activities imported so far"
- Immediate value: generate AI analysis on the first imported activity while backfill continues
- Reduce required fields in onboarding -- FTP can be auto-detected from data

---

### Mascot Design & Integration
_Importance: 1/5 | Difficulty: 1/5_

**Description**: Brand mascot for UI loading states, empty states, AI chat personality, and error pages.

**Why it matters**: Personality and brand recognition. Makes error states and loading screens feel intentional rather than broken.

**Data requirements**: None

**Dependencies**: None

---

### Twilio Toll-Free Verification
_Importance: 2/5 | Difficulty: 1/5_

**Description**: Update opt-in proof URL to `https://aimfitness.ai` and complete toll-free verification with Twilio to improve SMS deliverability.

**Why it matters**: Unverified toll-free numbers have lower deliverability and may be flagged as spam by carriers.

**Data requirements**: None

**Dependencies**: None

---

### Apple OAuth
_Importance: 2/5 | Difficulty: 2/5_

**Description**: Configure Apple Sign-In as an authentication option alongside email/password and Google SSO.

**Why it matters**: Required for iOS App Store distribution (future mobile app). Preferred auth method for many Apple users.

**Data requirements**: Apple Developer account configuration + Supabase Auth provider setup

**Dependencies**: None

---

### Weekly Digest Emails
_Importance: 3/5 | Difficulty: 2/5_

**Description**: Automated weekly training summary email via Resend. Includes weekly TSS, hours, key workouts, fitness trend, AI-generated week summary, and next week preview.

**Why it matters**: Re-engagement. Athletes who do not open the app daily still get value from AIM. The weekly email keeps the product in their workflow.

**Data requirements**: Email template, weekly metrics aggregation, AI-generated summary

**Dependencies**: Resend integration (already built)

**Implementation notes**:
- Cron job: Sunday evening, per-user timezone
- Content: weekly totals (TSS, hours, km), top 3 workouts, CTL/ATL/TSB change, AI week summary, goals progress
- Unsubscribe link (CAN-SPAM compliance)

---

### Community Benchmarks
_Importance: 2/5 | Difficulty: 3/5_

**Description**: Anonymous percentile rankings against similar athletes. Cohort definitions by age, sex, weight class, training volume, and riding level.

**Why it matters**: "Am I good?" is a universal question. Showing an athlete they are in the 82nd percentile for their cohort is motivating. Also creates a flywheel: more users = better benchmarks = more value.

**Data requirements**: Aggregated, anonymized data across users. Cohort definitions by age bracket, sex, weight class, volume, level. Requires sufficient user base.

**Dependencies**: Significant user base for statistically meaningful cohorts

**Implementation notes**:
- Cohort definitions (from product-blueprint.md): age brackets (18-24, 25-34, 35-44, 45-54, 55-64, 65+), sex, level, weight class, volume
- Percentile calculations for: power duration curve, CTL, recovery scores, HRV baselines
- Privacy: all data anonymized and aggregated -- no individual identification possible
- Phase 1: curated Coggan benchmarks (launch). Phase 2: proprietary AIM benchmarks (3-6 months). Phase 3: predictive models (12+ months).

---

### Mobile App
_Importance: 3/5 | Difficulty: 5/5_

**Description**: Native mobile experience via React Native or Progressive Web App (PWA).

**Why it matters**: Athletes check data on their phones. The current responsive web experience works but a dedicated mobile experience with push notifications, widget support, and offline access would significantly improve engagement.

**Data requirements**: All existing APIs -- mobile is a new client, not new backend

**Dependencies**: Stable API layer, Apple OAuth (for iOS distribution)

**Implementation notes**:
- PWA approach is lower effort: service worker for offline, manifest for install prompt, push notifications
- React Native approach is higher fidelity: native widgets, better performance, App Store distribution
- Critical mobile features: daily check-in, post-ride analysis view, readiness card, chat coach
- Apple Health integration (Tier 3) becomes much more valuable with a native app

---

## Insight Categories Summary

Complete catalog of all 34 insight categories, their status, and which roadmap feature enables them.

| # | Category | Status | Priority | Enabled By |
|---|----------|--------|----------|------------|
| 1 | Body Composition -> Performance | Active | -- | Withings (P3) completes it |
| 2 | Sleep-Performance Correlation | Active | -- | Oura/Whoop (P3) enhances it |
| 3 | HRV Patterns -> Training Prescription | Active | -- | -- |
| 4 | Environmental Performance Modeling | Active | -- | -- |
| 5 | Fatigue Signature Analysis | Active | -- | Torque Analysis (P4) enhances it |
| 6 | Long-Term Training Adaptations | Active | -- | Historical Timeline (P4) enhances it |
| 7 | Nutrition & Fueling Intelligence | Active | -- | -- |
| 8 | Predictive Analytics | Active | -- | CP Model (P1) enhances it |
| 9 | Benchmarking & Classification | Active | -- | Community Benchmarks (P5) enhances it |
| 10 | Menstrual Cycle Intelligence | Spec'd | P4 | Oura Sync (P3) + Menstrual Cycle (P4) |
| 11 | Performance Booster Cross-References | Active | -- | -- |
| 12 | Blood Work -> Training Impact | Active | -- | -- |
| 13 | DEXA Scan -> Power & Body Composition | Active | -- | -- |
| 14 | Bike Fit & Equipment Impact | Active | -- | -- |
| 15 | Injury Risk & Prevention | Active | -- | -- |
| 16 | Interval Execution Coaching | Active | -- | CP Model (P1) enhances it |
| 17 | Durability / Fatigue Resistance | Active | -- | Durability Tracking (P1) enhances it |
| 18 | Fueling Causality | Active | -- | -- |
| 19 | Readiness-to-Response | Active | -- | -- |
| 20 | Workout Type Progression | Active | -- | Season Awareness (P2) enhances it |
| 21 | Anomaly Detection | Active | -- | Similar Session Finder (P2) enhances it |
| 22 | Race-Specific Analysis | Active | -- | W' Balance (P2) enhances it |
| 23 | Subjective-Objective Alignment | Active | -- | Recently shipped (Expansion P1) |
| 24 | Respiratory & Illness Early Warning | Active | -- | Recently shipped (Expansion P1) |
| 25 | GI Tolerance & Fueling Boundaries | Active | -- | Recently shipped (Expansion P1) |
| 26 | Perceived vs Actual Recovery | Active | -- | Recently shipped (Expansion P1) |
| 27 | Travel & Environmental Disruption | Active | -- | Recently shipped (Expansion P1) |
| 28 | Cross-Training Impact | Active | -- | Recently shipped (Expansion P1) |
| 29 | Periodization & Season Intelligence | Planned | P2 | Season & Periodization Awareness |
| 30 | Personal Model Insights | Planned | P2 | Personal Performance Models |
| 31 | Plateau & Breakthrough Analysis | Planned | P2 | Plateau & Breakthrough Detection |
| 32 | Team Health Monitoring | Planned | P4 | Coach Dashboard + Team Intelligence |
| 33 | Team Training Load Management | Planned | P4 | Coach Dashboard + Team Intelligence |
| 34 | Shared Race Preparation | Planned | P4 | Coach Dashboard + Team Intelligence |

---

## Complete Tag Dictionary Additions (from Expansion Spec)

All tags added as part of the expansion spec, organized by category. These extend the existing canonical dictionary of 22 workout tags + 14 interval tags.

### Subjective State Tags (7)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `high_life_stress` | day | life_stress_score >= 4 |
| `low_motivation` | day | motivation_score <= 2 |
| `high_soreness` | day | muscle_soreness_score >= 4 |
| `low_mood` | day | mood_score <= 2 |
| `stress_accumulated` | day | avg life_stress 5 days >= 3.5 |
| `motivation_streak` | day | motivation >= 4 for 5+ days |
| `subjective_objective_mismatch` | workout | RPE vs power diverges > 1.5 SD |

### Respiratory / Illness Tags (3)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `resp_rate_elevated` | day | resp rate > baseline + 1.5 SD for 2+ days |
| `illness_precursor_pattern` | day | resp + HRV + RHR concurrent anomaly |
| `spo2_low` | day | SpO2 < 95% or < baseline - 2 SD |

### GI and Fueling Tags (4)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `gi_distress` | workout | gi_comfort >= 3 |
| `gi_distress_severe` | workout | gi_comfort >= 4 |
| `fueling_above_ceiling` | workout | carbs/hr > personal ceiling |
| `fueling_heat_risk` | workout | carbs/hr > heat-adjusted ceiling AND temp > 27C |

### Perception Tags (4)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `recovery_underestimate` | workout | pre-ride recovery <= 2 AND performance >= baseline |
| `recovery_overestimate` | workout | pre-ride recovery >= 4 AND performance < baseline - 1SD |
| `high_mental_focus` | workout | mental_focus >= 4 |
| `low_mental_focus` | workout | mental_focus <= 2 |

### Travel Tags (9)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `travel_day` | day | travel_event within 24 hours |
| `timezone_shift` | day | shift >= 2 hours |
| `timezone_shift_major` | day | shift >= 5 hours |
| `altitude_change` | day | altitude change >= 500m |
| `altitude_high` | workout | activity at > 1500m |
| `altitude_very_high` | workout | activity at > 2500m |
| `altitude_acclimation_day_N` | day | N days since altitude change |
| `first_ride_after_travel` | workout | first activity after travel_event |
| `jet_lag_window` | day | within estimated recovery window |

### Cross-Training Tags (4)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `strength_session_prior_day` | workout | lower/full body strength logged yesterday |
| `strength_session_same_day` | workout | strength logged today before ride |
| `cross_training_heavy` | day | cross_training intensity >= 4 |
| `cross_training_recovery` | day | yoga/pilates/easy swim logged |

### Periodization Tags (9)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `base_phase` | day | user-set or AI-inferred |
| `build_phase` | day | user-set or AI-inferred |
| `peak_phase` | day | user-set or AI-inferred |
| `taper_phase` | day | user-set or AI-inferred |
| `race_week` | day | user-set or AI-inferred |
| `recovery_block` | day | user-set or AI-inferred |
| `off_season` | day | user-set or AI-inferred |
| `phase_transition` | day | within 3 days of phase boundary |
| `overreaching_in_build` | week | TSB < -25 for > 5 days in build |

### Performance Trajectory Tags (5)
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `plateau_detected` | week | power flat 6+ weeks with maintained CTL |
| `breakthrough_detected` | week | >3% sustained improvement |
| `personal_best_effort` | workout | new all-time or season best |
| `return_from_break` | workout | first activity after 7+ days off |
| `first_ride_after_break` | workout | first activity after 14+ days off |

---

## Dependency Graph

```
P1 Critical Power (CP)
  └── P1 Adaptive Training Zones (requires CP)
  └── P2 W' Balance Tracking (requires CP + W')

P1 Durability Tracking (standalone)

P2 Season & Periodization (standalone)
  └── enhances P2 Training Prescription Engine

P2 Personal Models (standalone, evolves existing performance-models.js)

P2 Plateau & Breakthrough (standalone, uses power profiles)

P2 Similar Session Finder (standalone)

P3 Oura Sync (standalone, unlocks Menstrual Cycle)
  └── P4 Menstrual Cycle Intelligence

P3 Garmin / Whoop / Withings Sync (all standalone)

P4 Coach Dashboard (standalone)
  └── P4 Team-Level Intelligence (requires Coach Dashboard)

P4 Stripe (standalone, blocks revenue)

P5 items are all standalone
```

---

## Implementation Order Recommendation

1. **P1 Critical Power** -- unlocks Adaptive Zones and W' Balance, biggest analytical upgrade
2. **P1 Durability Tracking** -- can build in parallel with CP, high visibility feature
3. **P1 Adaptive Training Zones** -- immediate follow-on from CP, relatively low effort
4. **P2 Season & Periodization** -- high impact, standalone, changes AI behavior fundamentally
5. **P2 Personal Models** -- deepest moat, evolves existing infra
6. **P4 Stripe** -- revenue (build whenever ready, no technical dependency)
7. **P2 Plateau & Breakthrough** -- weekly cron, moderate effort
8. **P3 Oura / Whoop / Withings Sync** -- OAuth already built, sync is incremental
9. **P2 W' Balance** -- requires CP, high-value for race analysis
10. **P2 Similar Session Finder** -- standalone, moderate effort
11. **P2 Training Prescription Engine** -- benefits from everything above
12. **P3 Garmin Connect** -- requires partnership application
13. **P4 Coach Dashboard** -- large feature, build when platform is stable
14. **P4 Menstrual Cycle** -- requires Oura sync
15. **P4 Historical Timeline, Torque** -- nice-to-haves
16. **P5 items** -- as needed

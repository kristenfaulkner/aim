# AIM Expansion Spec — New Features, Insights, Tags & Roadmap
_Date: 2026-03-03_
_Status: Active. Claude Code should implement Priority 1 immediately, document everything else._

> **Instructions for Claude Code:**
>
> This document contains new features for AIM, organized by implementation priority. Your job:
>
> 1. **Read all existing docs first:** `docs/insights-catalog.md`, `docs/technical-architecture.md`, `docs/product-blueprint.md`, `AIM-SITE-MAP.md`, `AIM-ADAPTIVE-DASHBOARD-SPEC.md`, and any other docs in the repo.
> 2. **Implement Priority 1 features** (schema + tags + data capture). These are backend/data-layer only — no UI yet.
> 3. **Update ALL relevant docs** with every feature in this spec — even features you're not building yet. Every feature must be documented in the appropriate file:
>    - New insight categories → `docs/insights-catalog.md`
>    - New schema/tables/columns → `docs/technical-architecture.md`
>    - New tags → the Canonical Tag Dictionary (in `docs/technical-architecture.md` or `AIM-STRUCTURED-WORKOUTS-AND-INSIGHTS-SPEC.md`, wherever it lives)
>    - New AI prompt changes → `docs/insights-catalog.md` (Active AI Prompts section)
>    - New pages/UI surfaces → `AIM-SITE-MAP.md`
>    - Long-term features (Priority 3+) → `docs/product-blueprint.md` in a detailed "Future Roadmap" section
> 4. **The product-blueprint.md (or wherever the feature backlog lives) must become the master feature roadmap.** Not bullet points — every future feature needs: description, why it matters, data requirements, dependencies, rough implementation notes, and which insight categories it enables. If this file doesn't exist yet, create `docs/AIM-PRODUCT-ROADMAP.md`.
> 5. **Write tests** for any new calculation functions, detection logic, or schema changes per the testing strategy.

---

# PRIORITY 1: Subjective Daily Check-In System (BUILD NOW)

## What It Is
A lightweight daily check-in that captures the human context no device can measure. Four slider inputs, collected every morning, stored in `daily_metrics`. Takes <15 seconds.

## Why It Matters
This is the single highest-leverage data addition to AIM. Devices capture physiology. But the #1 predictor of whether an athlete has a good training day isn't HRV — it's the combination of life stress, sleep perception, motivation, and muscle readiness. Every world-class coach asks some version of these questions. No competing platform captures this data and correlates it with performance outcomes. After 60-90 days, AIM can build a personal model: "When your life stress is >3 and motivation is <3, your interval execution drops 11%. Consider swapping to endurance or rest." That's an insight no wearable can ever produce.

## Data Model

Add to `daily_metrics` table:

```sql
-- Subjective daily check-in (1-5 scale, NULL if not submitted)
life_stress_score SMALLINT CHECK (life_stress_score BETWEEN 1 AND 5),
motivation_score SMALLINT CHECK (motivation_score BETWEEN 1 AND 5),
muscle_soreness_score SMALLINT CHECK (muscle_soreness_score BETWEEN 1 AND 5),
mood_score SMALLINT CHECK (mood_score BETWEEN 1 AND 5),
checkin_completed_at TIMESTAMPTZ, -- when they submitted (for compliance tracking)

-- Additional biometric fields (from wearables, if available)
respiratory_rate NUMERIC, -- breaths per minute (Garmin, Whoop, Apple Watch)
resting_spo2 NUMERIC, -- % (Apple Watch, Garmin)
```

### Scale Definitions (display to user)

| Field | 1 | 2 | 3 | 4 | 5 |
|-------|---|---|---|---|---|
| Life Stress | Very low | Low | Moderate | High | Overwhelming |
| Motivation | None, dreading it | Low | Neutral | Motivated | Fired up |
| Muscle Soreness | Fresh, no soreness | Mild | Moderate | Significant | Can barely move |
| Mood | Terrible | Poor | Okay | Good | Excellent |

### Important Design Notes
- **Invert soreness for readiness calculation**: soreness 1 = good (maps to 5 for readiness), soreness 5 = bad (maps to 1). All other scales: higher = better.
- **Don't require it.** If the athlete skips a day, that's fine. Never nag. AIM should mention "You haven't checked in today — your readiness score is based on device data only" as a gentle nudge in the Daily Coach, not a guilt trip.
- **Compliance tracking matters.** Store `checkin_completed_at` so AIM can track check-in consistency and correlate it with engagement/outcomes. Athletes who check in daily get better insights — AIM should tell them this after 2 weeks.

## How It Feeds Into Existing Systems

### Readiness Score Enhancement
The readiness calculation currently uses HRV, RHR, sleep quality, and recovery score. Add subjective inputs as a weighted layer:

```javascript
// Pseudocode for enhanced readiness
const deviceReadiness = calculateDeviceReadiness(hrv, rhr, sleep, recovery); // existing
const subjectiveReadiness = checkin
  ? (checkin.mood + checkin.motivation + (6 - checkin.muscle_soreness) + (6 - checkin.life_stress)) / 4
  : null; // scale: 1-5, normalized

// Blend: 70% device, 30% subjective when available
const finalReadiness = subjectiveReadiness
  ? (deviceReadiness * 0.7) + (normalizeToReadinessScale(subjectiveReadiness) * 0.3)
  : deviceReadiness;
```

### AI Context Payload
Add to `buildDashboardContext` and `buildAnalysisContext`:

```javascript
subjectiveCheckin: {
  lifeStress: dailyMetrics.life_stress_score,
  motivation: dailyMetrics.motivation_score,
  muscleSoreness: dailyMetrics.muscle_soreness_score,
  mood: dailyMetrics.mood_score,
  checkinTime: dailyMetrics.checkin_completed_at,
  // Rolling averages for trend detection
  avg7day: { lifeStress: X, motivation: X, soreness: X, mood: X },
  avg30day: { lifeStress: X, motivation: X, soreness: X, mood: X },
},
respiratoryRate: dailyMetrics.respiratory_rate,
restingSpo2: dailyMetrics.resting_spo2,
```

### New Insight Categories to Add to insights-catalog.md

**CATEGORY 23: Subjective-Objective Alignment**

Required sources: Daily check-in + any device data + activity data
When to run: Post-ride analysis, Daily Coach

23A. RPE-Power Mismatch Detection
- What to look for: When subjective effort doesn't match objective output
- Example: "You rated this ride 8/10 effort but your NP was 12% below your average for similar workouts. Your life stress has been elevated (avg 4.2) for 3 days — perceived effort often inflates under high stress. This doesn't mean you're losing fitness."
- Confidence: Medium-High (requires 20+ matched data points to establish personal baseline)

23B. Motivation-Performance Correlation
- What to look for: Pattern between motivation score and workout quality
- Example: "When your motivation is 4-5, your interval execution averages 94% of target. When it's 1-2, it drops to 81%. Today you're at 2 — if you do train, consider a shorter session with lower targets to build a positive experience."
- Confidence: Medium (requires 30+ data points)

23C. Life Stress Impact Modeling
- What to look for: How life stress affects training tolerance, recovery, sleep
- Example: "Your life stress has averaged 4.1 this week (vs your normal 2.3). In past high-stress weeks, your HRV drops ~8ms by day 4 and your power:HR coupling worsens. Consider reducing training load by 20% this week — you'll recover the fitness faster than if you push through and dig a hole."
- Confidence: Medium (builds over time, requires 60+ days of check-in data)

23D. Soreness-Load Mismatch
- What to look for: Soreness that doesn't match recent training load
- Example: "Your muscle soreness is 4/5 but your TSS over the last 3 days is below average. This disconnect could indicate: delayed onset from the Sunday long ride, non-training stress, or early signs of illness. Monitor how you feel tomorrow."
- Confidence: Low-Medium

**CATEGORY 24: Respiratory & Illness Early Warning**

Required sources: Respiratory rate (Garmin/Whoop/Apple Watch), HRV, RHR
When to run: Daily Coach, morning readiness assessment

24A. Illness Precursor Pattern Detection
- What to look for: Elevated respiratory rate + suppressed HRV + elevated RHR pattern over 2-3 days
- Example: "Your respiratory rate has trended up for 3 consecutive nights (14.2 → 15.1 → 16.4 breaths/min, baseline 13.8). Combined with HRV down 15% and RHR up 4bpm, this pattern has preceded illness twice in your history. Strong recommendation: skip intensity today. Light movement only. Prioritize sleep and hydration."
- Confidence: Medium (early-warning, not diagnostic. Emphasize this is pattern-matching, not medical advice.)

24B. Recovery Respiratory Signature
- What to look for: How respiratory rate responds to training load
- Example: "After high-TSS days (>120), your respiratory rate elevates by ~1.5 bpm for 2 nights. It normalizes faster when you log >7.5 hours sleep. Tonight, prioritize an early bedtime."
- Confidence: Medium

### New Tags to Add to Tag Dictionary

```
## Subjective state tags (from daily check-in)
- `high_life_stress` — scope: day, detection: life_stress_score >= 4
- `low_motivation` — scope: day, detection: motivation_score <= 2
- `high_soreness` — scope: day, detection: muscle_soreness_score >= 4
- `low_mood` — scope: day, detection: mood_score <= 2
- `subjective_objective_mismatch` — scope: workout, detection: RPE vs power/pace diverges > 1.5 SD from personal mean
- `stress_accumulated` — scope: day, detection: avg life_stress over 5 days >= 3.5
- `motivation_streak` — scope: day, detection: motivation >= 4 for 5+ consecutive days

## Respiratory / illness tags
- `resp_rate_elevated` — scope: day, detection: respiratory_rate > personal_baseline + 1.5 SD for 2+ days
- `illness_precursor_pattern` — scope: day, detection: resp_rate_elevated + hrv_suppressed + rhr_elevated concurrent
- `spo2_low` — scope: day, detection: resting_spo2 < 95% (or < personal_baseline - 2 SD)
```

### Update AI System Prompts

Add to ALL dashboard mode prompts (POST_RIDE, PRE_RIDE_PLANNED, DAILY_COACH) in the "You have access to" section:

```
- Their daily subjective check-in (life stress, motivation, muscle soreness, mood — each 1-5)
- Their 7-day and 30-day averages for each subjective metric
- Their respiratory rate trend (if available from wearable)
- Their resting SpO2 (if available)
```

Add to the insight generation rules:

```
When subjective check-in data is available:
- Cross-reference subjective state with objective metrics. Mismatches are often the most valuable insights.
- If life stress is elevated (>3.5 avg over 5 days), proactively suggest training load reduction with specific numbers.
- If motivation is low (<2) but device readiness is green, acknowledge the disconnect — don't just push training.
- If muscle soreness doesn't match recent training load, flag it as potentially noteworthy.
- Never be dismissive of subjective data. "Your body is telling you something" is valid coaching.
```

---

# PRIORITY 1: Activity-Level Subjective Data Expansion (BUILD NOW)

## What It Is
Expand the existing post-ride notes section with structured subjective fields that feed into the cross-domain insight engine.

## Why It Matters
You already have RPE, star rating, and freeform tags. But you're missing two critical structured inputs that enable major insight categories: GI comfort (the #1 reason endurance athletes DNF) and pre-ride perceived recovery (so AIM can compare "how you felt before" vs "how you performed").

## Data Model

Add to `activities` table (or a related `activity_subjective` table):

```sql
gi_comfort SMALLINT CHECK (gi_comfort BETWEEN 1 AND 5), -- 1=perfect, 5=severe issues
mental_focus SMALLINT CHECK (mental_focus BETWEEN 1 AND 5), -- 1=scattered, 5=locked in
perceived_recovery_pre SMALLINT CHECK (perceived_recovery_pre BETWEEN 1 AND 5), -- pre-ride: 1=wrecked, 5=fully recovered
```

### Scale Definitions

| Field | 1 | 2 | 3 | 4 | 5 |
|-------|---|---|---|---|---|
| GI Comfort | Perfect, no issues | Minor discomfort | Noticeable but manageable | Significant, affected performance | Severe, had to stop/slow |
| Mental Focus | Completely zoned out | Distracted | Normal | Focused | In the zone |
| Pre-ride Recovery | Completely wrecked | Heavy legs | Normal | Feeling good | Fully fresh |

## New Insight Categories

**CATEGORY 25: GI Tolerance & Fueling Boundaries**

Required sources: Nutrition log + GI comfort + weather + intensity data
When to run: Post-ride analysis

25A. Personal Fueling Ceiling Detection
- What to look for: The carb/hr threshold where GI issues start appearing for this athlete
- Example: "You've logged GI discomfort (3+) on 4 of 6 rides where you exceeded 80g carbs/hr. At 70g/hr and below, your GI comfort averages 1.4. Your personal ceiling appears to be ~75g/hr. To push this higher, research suggests gradual gut training — try 80g/hr on your next 3 easy rides."
- Confidence: Medium-High (requires 10+ fueled rides with GI logging)

25B. Heat × Fueling GI Interaction
- What to look for: GI tolerance that changes with temperature
- Example: "In temps above 28°C, your GI tolerance drops — you've had issues at 65g/hr in heat vs 80g/hr in cool conditions. Consider reducing carb intake by 15-20% in hot races and compensating with more frequent smaller feeds."
- Confidence: Medium (requires heat + fueling + GI data overlap)

25C. Race Fueling Risk Assessment
- What to look for: Pre-race fueling plan that exceeds demonstrated tolerance
- Example: "Your race plan calls for 90g/hr but your data shows GI issues above 75g/hr — especially in heat. Your race forecast is 31°C. Recommendation: target 65-70g/hr and plan to feel good in the final quarter rather than risk a GI blowup."
- Confidence: High (directly actionable from established personal data)

**CATEGORY 26: Perceived vs Actual Recovery**

Required sources: Pre-ride perceived recovery + actual performance metrics
When to run: Post-ride analysis

26A. Recovery Perception Accuracy
- What to look for: How well the athlete predicts their own readiness
- Example: "You rated yourself 2/5 recovery before this ride, but your NP, EF, and HR were all better than your 30-day average. You tend to underestimate your recovery — on your last 8 rides where you felt 'wrecked,' you performed at 96% of baseline. Trust the process."
- OR: "You felt 5/5 fresh but your cardiac drift was 9.2%, well above your baseline. Your perception and your physiology disagreed today — consider that residual fatigue from Sunday's big ride is still present even though your legs felt okay."
- Confidence: Medium (requires 15+ rides with pre-ride recovery ratings)

### New Tags

```
## GI and fueling tolerance tags
- `gi_distress` — scope: workout, detection: gi_comfort >= 3
- `gi_distress_severe` — scope: workout, detection: gi_comfort >= 4
- `fueling_above_ceiling` — scope: workout, detection: carbs_per_hour > personal GI ceiling estimate
- `fueling_heat_risk` — scope: workout, detection: carbs_per_hour > heat-adjusted ceiling AND temp > 27°C

## Perception accuracy tags
- `recovery_underestimate` — scope: workout, detection: pre-ride recovery <= 2 AND performance >= baseline
- `recovery_overestimate` — scope: workout, detection: pre-ride recovery >= 4 AND performance < baseline - 1SD
- `high_mental_focus` — scope: workout, detection: mental_focus >= 4
- `low_mental_focus` — scope: workout, detection: mental_focus <= 2
```

---

# PRIORITY 1: Travel & Timezone Detection (BUILD NOW — data layer only)

## What It Is
Auto-detect travel, timezone shifts, and altitude changes from GPS data across consecutive activities. No user input required.

## Why It Matters
Travel is one of the largest untracked performance disruptors. A WorldTour team DS needs to know: "3 riders traveled internationally in the last 48 hours, expect degraded performance for 2-3 days." An age-group triathlete who flies from NYC to Denver for a race at altitude needs to know their power targets should drop 5-8%. Right now, no consumer platform auto-detects this and connects it to training recommendations. AIM should be the first.

## Data Model

Create `travel_events` table:

```sql
CREATE TABLE travel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Origin
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  origin_timezone TEXT, -- e.g., 'America/New_York'
  origin_altitude_m NUMERIC,
  
  -- Destination
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  dest_timezone TEXT,
  dest_altitude_m NUMERIC,
  
  -- Computed
  distance_km NUMERIC, -- great circle distance
  timezone_shift_hours NUMERIC, -- signed: +3 means traveled east 3 zones
  altitude_change_m NUMERIC, -- signed: +1500 means went up 1500m
  travel_type TEXT, -- 'flight_likely' | 'drive_likely' | 'unknown' (inferred from speed/distance)
  
  -- For altitude acclimation tracking
  altitude_acclimation_day INTEGER DEFAULT 0, -- increments daily while at altitude
  altitude_acclimation_complete BOOLEAN DEFAULT FALSE, -- true after ~14 days
  
  -- Activity references
  last_activity_before UUID REFERENCES activities(id),
  first_activity_after UUID REFERENCES activities(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_travel_events_user_date ON travel_events(user_id, detected_at);
```

## Detection Logic

```javascript
// Run after every activity sync
async function detectTravel(userId, newActivity) {
  const lastActivity = await getLastActivity(userId, before: newActivity.started_at);
  if (!lastActivity) return null;
  
  const distance = haversineDistance(
    lastActivity.end_location, 
    newActivity.start_location
  );
  
  // Thresholds
  const TRAVEL_DISTANCE_MIN_KM = 200; // ignore local movement
  const ALTITUDE_CHANGE_MIN_M = 500; // meaningful altitude change
  const TIMEZONE_CHANGE_MIN_HOURS = 2; // meaningful timezone shift
  
  if (distance < TRAVEL_DISTANCE_MIN_KM) return null;
  
  const timezoneShift = getTimezoneOffset(newActivity.timezone) - getTimezoneOffset(lastActivity.timezone);
  const altitudeChange = newActivity.start_altitude - lastActivity.end_altitude;
  
  // Infer travel type from distance and time gap
  const hoursBetween = (newActivity.started_at - lastActivity.ended_at) / 3600000;
  const impliedSpeedKph = distance / hoursBetween;
  const travelType = impliedSpeedKph > 300 ? 'flight_likely' : 
                     impliedSpeedKph > 60 ? 'drive_likely' : 'unknown';
  
  return createTravelEvent({
    userId,
    origin: { lat: lastActivity.end_lat, lng: lastActivity.end_lng, 
              timezone: lastActivity.timezone, altitude: lastActivity.end_altitude },
    destination: { lat: newActivity.start_lat, lng: newActivity.start_lng,
                   timezone: newActivity.timezone, altitude: newActivity.start_altitude },
    distanceKm: distance,
    timezoneShiftHours: timezoneShift,
    altitudeChangeM: altitudeChange,
    travelType,
    lastActivityBefore: lastActivity.id,
    firstActivityAfter: newActivity.id,
  });
}
```

## Altitude Acclimation Tracking

Run a daily cron job:

```javascript
// Daily: increment acclimation counter for athletes at altitude
async function updateAltitudeAcclimation() {
  const activeAltitudeEvents = await getActiveAltitudeEvents(); // altitude_change > 500m, not complete
  for (const event of activeAltitudeEvents) {
    event.altitude_acclimation_day += 1;
    if (event.altitude_acclimation_day >= 14) {
      event.altitude_acclimation_complete = true;
    }
    await save(event);
  }
}
```

## New Insight Category

**CATEGORY 27: Travel & Environmental Disruption**

Required sources: GPS from activities (auto-detected), timezone data
When to run: Daily Coach (when travel detected), Post-ride (first 5 rides after travel)

27A. Jet Lag Impact Prediction
- What to look for: Timezone shift + performance in following days
- Example: "You crossed 6 timezone zones 2 days ago. Research suggests full adaptation takes ~1 day per timezone crossed. Expect elevated HR at all intensities and reduced top-end power for the next 4 days. Your sleep data confirms disruption — bedtime has shifted 2.5 hours. Priority: anchor your wake time to the new timezone starting today."
- Confidence: High (well-established in sports science literature)

27B. Altitude Adjustment Tracking
- What to look for: Altitude change and performance degradation/adaptation curve
- Example: "You arrived at 1,800m altitude 3 days ago (from sea level). You're on acclimation day 3 of ~14. Expected power reduction at threshold: 6-8%. Your actual reduction today was 7.2% — right on track. Your HR was 8 bpm higher than sea-level baseline, which is normal. Target power adjustments: reduce all zones by 7% until day 10, then gradually restore."
- Confidence: High (altitude-performance relationship is well-studied; individual response varies)

27C. Travel Fatigue Detection
- What to look for: Performance degradation after long-haul travel even without timezone change
- Example: "Your HRV dropped 22% the day after your 12-hour travel day (despite no timezone change). Dehydration, sitting posture, and disrupted routine likely contributed. Your first ride back showed 4% higher HR at the same power. Consider an easy day tomorrow."
- Confidence: Medium

### New Tags

```
## Travel and environment tags
- `travel_day` — scope: day, detection: travel_event detected within 24 hours
- `timezone_shift` — scope: day, detection: timezone_shift_hours >= 2
- `timezone_shift_major` — scope: day, detection: timezone_shift_hours >= 5
- `altitude_change` — scope: day, detection: altitude_change_m >= 500
- `altitude_high` — scope: workout, detection: activity at > 1500m
- `altitude_very_high` — scope: workout, detection: activity at > 2500m
- `altitude_acclimation_day_N` — scope: day, detection: N days since altitude change (1-14)
- `first_ride_after_travel` — scope: workout, detection: first activity after travel_event
- `jet_lag_window` — scope: day, detection: within estimated jet lag recovery window
```

---

# PRIORITY 1: Strength & Cross-Training Logger (BUILD NOW — data layer only)

## What It Is
Simple logging for non-cycling/running training sessions — gym, yoga, swimming, hiking, etc. Not a full training log — just enough for AIM to know what happened so it can explain the next day's numbers.

## Why It Matters
"Why are my legs dead today?" is one of the most common questions athletes ask. The answer is often: heavy squats yesterday. Without logging strength/cross-training, AIM's readiness model has a blind spot. Even a minimal entry ("lower body strength, moderate-hard, 45 min") gives the AI enough to say "Your power was 5% below target today — this is expected 24-48 hours after your strength session. Don't chase numbers."

## Data Model

Create `cross_training_log` table:

```sql
CREATE TABLE cross_training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  activity_type TEXT NOT NULL, -- 'strength' | 'yoga' | 'swimming' | 'hiking' | 'pilates' | 'other'
  body_region TEXT, -- 'upper_body' | 'lower_body' | 'full_body' | 'core' | NULL
  perceived_intensity SMALLINT CHECK (perceived_intensity BETWEEN 1 AND 5), -- 1=easy, 5=max effort
  duration_minutes INTEGER,
  notes TEXT, -- freeform
  
  -- Computed fields for cross-domain analysis
  estimated_tss NUMERIC, -- rough TSS equivalent for training load modeling
  recovery_impact TEXT, -- 'none' | 'minor' | 'moderate' | 'major' (auto-assigned based on intensity + body region)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cross_training_user_date ON cross_training_log(user_id, date);
```

### Recovery Impact Auto-Assignment

```javascript
function estimateRecoveryImpact(entry) {
  if (entry.activity_type === 'yoga' || entry.activity_type === 'pilates') return 'none';
  if (entry.perceived_intensity <= 2) return 'minor';
  if (entry.body_region === 'lower_body' && entry.perceived_intensity >= 4) return 'major';
  if (entry.body_region === 'full_body' && entry.perceived_intensity >= 3) return 'moderate';
  if (entry.body_region === 'upper_body') return 'minor'; // upper body rarely impacts cycling/running
  return 'moderate';
}
```

## New Insight Category

**CATEGORY 28: Cross-Training Impact**

Required sources: Cross-training log + next-day activity data + readiness
When to run: Post-ride (when cross-training in previous 48 hours), Daily Coach

28A. Strength-Performance Relationship
- What to look for: How gym sessions affect next-day cycling/running
- Example: "You did a lower-body strength session yesterday (intensity 4/5). Today's average power was 6% below your 30-day mean for similar efforts. Your historical pattern: lower body strength at intensity 4+ causes a 5-8% power dip for 24-36 hours, then returns to normal. This is expected and productive — the strength work drives long-term gains."
- Confidence: Medium-High (straightforward correlation, needs 8+ paired data points)

28B. Optimal Strength Timing
- What to look for: Which days relative to key workouts cause least interference
- Example: "Your best interval sessions happen 3+ days after lower body strength. When you do strength the day before intervals, your execution score drops 12%. Consider scheduling heavy legs on Monday with key intervals on Thursday."
- Confidence: Medium (requires 12+ weeks of combined data)

### New Tags

```
## Cross-training tags
- `strength_session_prior_day` — scope: workout, detection: lower_body or full_body strength logged yesterday
- `strength_session_same_day` — scope: workout, detection: strength logged today before ride
- `cross_training_heavy` — scope: day, detection: cross_training with perceived_intensity >= 4
- `cross_training_recovery` — scope: day, detection: yoga/pilates/easy swimming logged
```

---

# PRIORITY 2: Season & Periodization Awareness (BUILD NEXT)

## What It Is
Track where the athlete is in their training season — base, build, peak, taper, recovery, off-season — and adjust all AI recommendations accordingly.

## Why It Matters
Right now AIM is very intelligent at the daily and weekly scale, but it doesn't think in training blocks or season arcs. A world-class coach plans in 4-6 week mesocycles and 6-12 month macrocycles. The AI recommendations should shift dramatically based on phase: during base, push volume and aerobic development; during taper, aggressively protect rest and flag unnecessary load; during off-season, don't flag low CTL as a problem. Without this, AIM might tell a tapering athlete to "maintain your training load" when they should be shedding it. This is a trust-destroyer.

## Data Model

Add to `profiles` table:

```sql
-- Season planning
season_start_date DATE, -- when their current season began (or NULL)
a_race_date DATE, -- their primary goal event (or NULL)
a_race_name TEXT,
b_race_dates DATE[], -- secondary events
current_training_phase TEXT, -- 'off_season' | 'base' | 'build' | 'peak' | 'taper' | 'race_week' | 'recovery_block'
current_phase_start_date DATE,
current_phase_planned_weeks INTEGER,
weekly_hours_available NUMERIC, -- refined: how many hours they can actually train per week (may vary by phase)
```

Create `training_phases` table (for history):

```sql
CREATE TABLE training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phase TEXT NOT NULL, -- same enum as current_training_phase
  start_date DATE NOT NULL,
  end_date DATE, -- NULL if current
  planned_weeks INTEGER,
  actual_weeks INTEGER,
  notes TEXT,
  
  -- Computed phase summary (filled on phase completion)
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

## Phase Detection (Hybrid: User-Set + AI-Inferred)

Two approaches, both should work:

1. **User-set**: Athlete sets their A-race date and AIM proposes a phase plan: "Your race is 16 weeks away. Suggested: 6 weeks base → 6 weeks build → 2 weeks peak → 1 week taper → race week → 1 week recovery."
2. **AI-inferred**: If the athlete doesn't set a plan, AIM infers phase from training patterns: rising CTL with mostly Z2 = base; increasing intensity mix = build; peak CTL with reduced volume = taper; very low CTL = off-season.

## How Phase Affects Recommendations

| Phase | AI Behavior |
|-------|-------------|
| Base | Emphasize volume, aerobic efficiency, don't push intensity, celebrate consistency |
| Build | Introduce and progress intensity, monitor fatigue accumulation, flag overtraining risk earlier |
| Peak | Protect quality, reduce volume, flag any junk miles, emphasize sharpening |
| Taper | Aggressively protect rest, reassure athlete that fitness loss is minimal, reduce all volume recommendations 40-60% |
| Race Week | Ultra-specific: openers workout, fueling plan, sleep schedule, logistics reminders |
| Recovery Block | Discourage intensity, celebrate rest days, mental health focus, set expectations for next block |
| Off-Season | Don't flag low CTL, encourage variety and fun, cross-training positive, maintain base only |

## New Insight Category

**CATEGORY 29: Periodization & Season Intelligence**

29A. Phase Compliance Tracking
- Example: "You're in week 4 of your build phase. Key session compliance: 85% (you've completed 11 of 13 planned intensity sessions). Your CTL has risen from 62 to 71 — right on track for your target of 78 by race week."

29B. Phase Transition Recommendations
- Example: "Your build phase ends in 5 days. Based on your fatigue accumulation (TSB: -18) and race timeline, AIM recommends a 5-day recovery block before starting your peak phase. Do you want me to plan your recovery week?"

29C. Taper Anxiety Management
- Example: "You're on taper day 6. Your CTL has dropped from 82 to 76 — this is exactly what should happen. Research shows you retain 95%+ fitness through a 2-week taper. Your legs will come around. Trust the taper."

### New Tags

```
## Periodization tags
- `base_phase` — scope: day, detection: user-set or AI-inferred
- `build_phase` — scope: day
- `peak_phase` — scope: day
- `taper_phase` — scope: day
- `race_week` — scope: day
- `recovery_block` — scope: day
- `off_season` — scope: day
- `phase_transition` — scope: day, detection: within 3 days of phase boundary
- `overreaching_in_build` — scope: week, detection: TSB < -25 during build phase for > 5 days
```

---

# PRIORITY 2: Personal Performance Models (BUILD NEXT)

## What It Is
Build and maintain per-athlete statistical models that quantify individual responses to specific conditions: heat, altitude, sleep quality, fueling rate, time of day, etc.

## Why It Matters
This is AIM's deepest moat. After 3-6 months, AIM knows each athlete's personal response curves — not population averages, but *their* specific numbers. "Your personal heat penalty is 3.1% per 5°C above 22°C" vs the generic "expect performance loss in heat." No competitor can replicate this without the same data history. It makes every recommendation more precise over time, and creates an insurmountable switching cost.

## Data Model

Create `personal_models` table:

```sql
CREATE TABLE personal_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL, -- 'heat_penalty' | 'sleep_performance' | 'altitude_penalty' | 
                             -- 'fueling_durability' | 'time_of_day' | 'hrv_performance' |
                             -- 'stress_tolerance' | 'optimal_sleep_hours' | 'gi_ceiling'
  
  -- Model parameters (JSONB to allow flexible structure per model type)
  parameters JSONB NOT NULL,
  -- Example for heat_penalty: { "penalty_pct_per_5c": 3.1, "baseline_temp_c": 22, "n_observations": 34, "r_squared": 0.42 }
  -- Example for optimal_sleep_hours: { "optimal_hours": 7.2, "min_threshold": 6.5, "performance_drop_per_hour_below": 4.2, "n_observations": 89 }
  -- Example for gi_ceiling: { "safe_carbs_per_hour": 75, "risk_zone_start": 78, "heat_adjusted_ceiling": 65, "n_observations": 22 }
  
  confidence NUMERIC, -- 0-1
  n_observations INTEGER, -- data points used
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Model versioning
  version INTEGER DEFAULT 1,
  previous_parameters JSONB, -- for tracking model evolution
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_personal_models_user_type ON personal_models(user_id, model_type);
```

## Model Update Logic

Models should update incrementally after each relevant activity, using Bayesian-style updates (new observation shifts the estimate, weighted by confidence):

```javascript
// Pseudocode for updating heat penalty model
async function updateHeatModel(userId, activity) {
  const model = await getOrCreateModel(userId, 'heat_penalty');
  const temp = activity.ambient_temp_c;
  const baselineTemp = model.parameters.baseline_temp_c || 22;
  
  if (Math.abs(temp - baselineTemp) < 3) return; // Not enough temperature variation
  
  const expectedPower = getBaselinePower(userId, activity.workout_type);
  const actualPower = activity.normalized_power;
  const penalty = (1 - actualPower / expectedPower) * 100;
  const tempDelta = temp - baselineTemp;
  
  // Bayesian update: blend new observation with existing estimate
  const weight = 1 / (model.n_observations + 1);
  const newPenalty = model.parameters.penalty_pct_per_5c * (1 - weight) + 
                     (penalty / tempDelta * 5) * weight;
  
  await updateModel(model.id, {
    parameters: { ...model.parameters, penalty_pct_per_5c: newPenalty },
    n_observations: model.n_observations + 1,
    confidence: Math.min(0.95, model.n_observations / 50), // confidence grows with data
  });
}
```

## New Insight Category

**CATEGORY 30: Personal Model Insights**

30A. Model Maturity Notifications
- Example: "AIM has now built a personal heat model from 34 of your outdoor rides. Your penalty: 3.1% per 5°C above 22°C (confidence: 82%). This is slightly worse than the typical range (2-2.5%), which means heat acclimation could be a significant performance unlock for you."

30B. Model-Based Predictions
- Example: "Tomorrow's forecast is 33°C. Based on your personal heat model, expect threshold power to drop ~7%. Your adjusted VO2 targets: 310W → 288W. Fluid needs increase to 1.1L/hr."

30C. Model Improvement Suggestions
- Example: "Your sleep-performance model has low confidence (42%) because you only have 18 matched data points. To improve it: complete your daily check-in on rest days too, and make sure your Oura ring is charged overnight. 15 more matched nights will get this model to high confidence."

---

# PRIORITY 2: Plateau & Breakthrough Detection (BUILD NEXT)

## What It Is
Algorithmic detection of performance plateaus (stagnation despite training) and breakthroughs (meaningful fitness jumps), with causal analysis.

## Why It Matters
Athletes are terrible at recognizing plateaus — they often just train harder, which makes it worse. And they often don't recognize breakthroughs because day-to-day variance masks the trend. AIM should be the one saying "your 5-min power has been flat for 6 weeks despite 15% more volume — you need a stimulus change" or "your FTP jumped 8W this month, driven by your sweet spot consistency."

## Detection Logic

```javascript
// Run weekly as a cron job
async function detectPlateausAndBreakthroughs(userId) {
  const powerProfile = await getPowerProfileHistory(userId, weeks: 12);
  
  for (const duration of [60, 300, 1200, 3600]) { // 1min, 5min, 20min, 60min
    const values = powerProfile.map(w => w[`best_${duration}s_power`]).filter(Boolean);
    const recent6weeks = values.slice(-6);
    const previous6weeks = values.slice(-12, -6);
    
    // Plateau: coefficient of variation < 2% for 6 weeks with adequate training load
    const cv = standardDeviation(recent6weeks) / mean(recent6weeks);
    const trainingLoadMaintained = /* check CTL hasn't dropped */;
    
    if (cv < 0.02 && trainingLoadMaintained && recent6weeks.length >= 4) {
      await createInsight(userId, 'plateau_detected', {
        duration,
        weeks: 6,
        avgPower: mean(recent6weeks),
        suggestion: suggestStimulusChange(userId, duration),
      });
    }
    
    // Breakthrough: >3% improvement sustained over 3+ sessions
    const recentBest = Math.max(...recent6weeks);
    const previousBest = Math.max(...previous6weeks);
    const improvement = (recentBest - previousBest) / previousBest;
    
    if (improvement > 0.03 && recent6weeks.filter(v => v > previousBest * 1.02).length >= 3) {
      await createInsight(userId, 'breakthrough_detected', {
        duration,
        improvement: improvement * 100,
        likelyDrivers: await analyzeBreakthroughDrivers(userId),
      });
    }
  }
}
```

## New Insight Category

**CATEGORY 31: Plateau & Breakthrough Analysis**

31A. Plateau Detection with Causal Analysis
- Example: "Your 20-minute power has been flat at ~278W for 6 weeks despite a 12% increase in weekly TSS. Potential causes: (1) You've added volume but not intensity — your time above threshold is actually down 8%. (2) Your sleep has averaged 6.3 hours, below your optimal 7.2. Recommendation: reduce volume slightly, add one more threshold session per week, and prioritize 7+ hours sleep."

31B. Breakthrough Attribution
- Example: "Your FTP has improved from 285W to 293W over the last 4 weeks. Key factors that changed: (1) Sweet spot compliance went from 1.8x/week to 2.9x/week. (2) Your sleep improved from 6.4 to 7.1 hours average. (3) Life stress decreased from 3.8 to 2.1. This combination — more quality sessions + better recovery — is your recipe. Protect it."

### New Tags

```
## Plateau and breakthrough tags
- `plateau_detected` — scope: week, detection: power at duration flat for 6+ weeks with maintained CTL
- `breakthrough_detected` — scope: week, detection: >3% sustained improvement at a key duration
- `personal_best_effort` — scope: workout, detection: new all-time or season best at any key duration
- `return_from_break` — scope: workout, detection: first activity after 7+ days off
- `first_ride_after_break` — scope: workout, detection: first activity after 14+ days off
```

---

# PRIORITY 3: Coach Dashboard & Multi-Athlete View (DOCUMENT ONLY — build later)

## What It Is
A separate dashboard for coaches managing multiple athletes. Shows roster status at a glance, flags athletes who need attention, and provides tools for coach-athlete communication within AIM.

## Why It Matters (Business)
Once a coach puts their 15-30 athletes on AIM, the switching cost is enormous. The coach builds workflow dependency — checking AIM every morning is faster than texting each athlete. The athletes get better coaching because the AI handles the daily monitoring and the coach focuses on strategy and relationship. This is also where team and enterprise pricing lives.

## Key Surfaces

### Roster View
- Grid of all coached athletes: name, today's readiness (colored dot), last activity date, compliance %, any flags
- Sort by: readiness (worst first), last active (most stale first), compliance
- Quick filters: "Needs attention" (red readiness, missed workouts, illness precursor), "Traveling" (recent travel events), "Tapering" (in taper phase)

### Athlete Drill-Down
- Same as athlete's own dashboard, but with a coach annotation layer
- Coach can leave notes on any ride, any insight, any goal
- Notes appear to the athlete in their AI panel marked as "[Coach name]"
- Coach can override AI workout recommendations ("I know AIM said rest, but I want you to do openers")

### Weekly Summary Email (to coach)
- Auto-generated: per-athlete compliance, red flags, breakthroughs, suggested action items
- Coach can reply inline with notes that go to each athlete

### Team-Level Insights
- Aggregate patterns: "3 of 8 riders have suppressed HRV this week"
- Training load distribution across team
- Shared race prep dashboards (for team events)

## Data Model Additions

```sql
-- Coach-athlete relationship
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

-- Coach annotations
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

## Page Structure (add to AIM-SITE-MAP.md)

```
/coach                    → Coach Dashboard (roster view)
/coach/athlete/:id        → Single athlete drill-down (coach perspective)
/coach/team-insights      → Aggregate team analytics
/coach/settings           → Manage roster, permissions, billing
```

---

# PRIORITY 3: Team-Level Intelligence (DOCUMENT ONLY — build later)

## What It Is
Insights that span multiple athletes on the same team — aggregate health trends, training load management, race preparation coordination.

## Key Insight Categories (Future)

**CATEGORY 32: Team Health Monitoring**
- "3 of your 8 riders show illness precursor patterns (elevated RHR + suppressed HRV). All 3 raced at [event] last weekend. Consider isolating them from team training for 48 hours."
- "Your team's average sleep has dropped from 7.3 to 6.4 hours during this stage race. This typically accelerates performance decline by day 5."

**CATEGORY 33: Team Training Load Management**
- "Your team's average CTL is 82 with a spread of 65-96. The 3 riders below 70 may struggle with the demands of next week's stage race. Consider reducing their non-race training to preserve freshness."
- "Rider A and Rider C have similar power profiles but Rider A is 15 TSS/day fresher. For Saturday's race, Rider A should take the harder assignment."

**CATEGORY 34: Shared Race Preparation**
- Coordinated taper plans for team events
- Role-based recommendations: "Sprinter should maintain neuromuscular sharpness; GC rider should focus on threshold efficiency; domestiques should maintain endurance base"
- Shared fueling and logistics planning

---

# Summary: Complete Tag Dictionary Additions

All new tags to add to the canonical tag dictionary. Each tag follows the existing format with tag_id, scope, sport, definition, and detection rules.

## Subjective State Tags
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `high_life_stress` | day | life_stress_score >= 4 |
| `low_motivation` | day | motivation_score <= 2 |
| `high_soreness` | day | muscle_soreness_score >= 4 |
| `low_mood` | day | mood_score <= 2 |
| `stress_accumulated` | day | avg life_stress 5 days >= 3.5 |
| `motivation_streak` | day | motivation >= 4 for 5+ days |
| `subjective_objective_mismatch` | workout | RPE vs power diverges > 1.5 SD |

## Respiratory / Illness Tags
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `resp_rate_elevated` | day | resp rate > baseline + 1.5 SD for 2+ days |
| `illness_precursor_pattern` | day | resp + HRV + RHR concurrent anomaly |
| `spo2_low` | day | SpO2 < 95% or < baseline - 2 SD |

## GI and Fueling Tags
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `gi_distress` | workout | gi_comfort >= 3 |
| `gi_distress_severe` | workout | gi_comfort >= 4 |
| `fueling_above_ceiling` | workout | carbs/hr > personal ceiling |
| `fueling_heat_risk` | workout | carbs/hr > heat-adjusted ceiling AND temp > 27°C |

## Perception Tags
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `recovery_underestimate` | workout | pre-ride recovery <= 2 AND performance >= baseline |
| `recovery_overestimate` | workout | pre-ride recovery >= 4 AND performance < baseline - 1SD |
| `high_mental_focus` | workout | mental_focus >= 4 |
| `low_mental_focus` | workout | mental_focus <= 2 |

## Travel Tags
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

## Cross-Training Tags
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `strength_session_prior_day` | workout | lower/full body strength logged yesterday |
| `strength_session_same_day` | workout | strength logged today before ride |
| `cross_training_heavy` | day | cross_training intensity >= 4 |
| `cross_training_recovery` | day | yoga/pilates/easy swim logged |

## Periodization Tags
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

## Performance Trajectory Tags
| Tag ID | Scope | Detection |
|--------|-------|-----------|
| `plateau_detected` | week | power flat 6+ weeks with maintained CTL |
| `breakthrough_detected` | week | >3% sustained improvement |
| `personal_best_effort` | workout | new all-time or season best |
| `return_from_break` | workout | first activity after 7+ days off |
| `first_ride_after_break` | workout | first activity after 14+ days off |

---

# Summary: New Insight Categories (23-34)

| # | Name | Priority | Required Sources |
|---|------|----------|-----------------|
| 23 | Subjective-Objective Alignment | P1 | Check-in + device + activity |
| 24 | Respiratory & Illness Warning | P1 | Respiratory rate + HRV + RHR |
| 25 | GI Tolerance & Fueling Boundaries | P1 | Nutrition + GI comfort + weather |
| 26 | Perceived vs Actual Recovery | P1 | Pre-ride recovery + performance |
| 27 | Travel & Environmental Disruption | P1 | GPS (auto-detected) + timezone |
| 28 | Cross-Training Impact | P1 | Cross-training log + next-day data |
| 29 | Periodization & Season Intelligence | P2 | Phase data + training history |
| 30 | Personal Model Insights | P2 | Personal models (accumulated) |
| 31 | Plateau & Breakthrough Analysis | P2 | Power profile history (12+ weeks) |
| 32 | Team Health Monitoring | P3 | Coach dashboard + multi-athlete |
| 33 | Team Training Load Management | P3 | Coach dashboard + multi-athlete |
| 34 | Shared Race Preparation | P3 | Coach dashboard + calendar |

---

# Document Update Checklist for Claude Code

After implementing Priority 1 features, ensure these docs are updated:

- [ ] `docs/insights-catalog.md` — Add Categories 23-34 (all of them, even P2/P3)
- [ ] `docs/technical-architecture.md` — Add all new schema (daily_metrics columns, travel_events, cross_training_log, personal_models, training_phases, coach tables)
- [ ] `docs/technical-architecture.md` or `AIM-STRUCTURED-WORKOUTS-AND-INSIGHTS-SPEC.md` — Add all new tags to Canonical Tag Dictionary
- [ ] `AIM-ADAPTIVE-DASHBOARD-SPEC.md` — Update AI prompt payloads with new context fields (subjective check-in, respiratory rate, travel, cross-training)
- [ ] `AIM-SITE-MAP.md` — Add coach dashboard pages (/coach, /coach/athlete/:id, etc.) to URL structure
- [ ] `docs/AIM-PRODUCT-ROADMAP.md` — Create or update with FULL detailed roadmap including all P2 and P3 features with complete specs (not bullet points — the level of detail shown in this document)
- [ ] All AI system prompts — Add new data fields to "You have access to" sections
- [ ] Update `buildAnalysisContext` and `buildDashboardContext` function specs with new fields

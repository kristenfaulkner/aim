# AIM — Adaptive Dashboard Intelligence Spec

## Overview

The dashboard's AI panel and action items adapt based on the athlete's current state. There are three modes, determined automatically. The design is the same card structure — only the content changes.

## Mode Detection Logic

```javascript
function getDashboardMode(userId) {
  const todayActivity = getTodaysCompletedActivity(userId); // activity with started_at = today
  const todayPlannedWorkout = getTodaysPlannedWorkout(userId); // from training_prescriptions or calendar
  const readiness = getTodaysReadiness(userId); // from daily_metrics

  if (todayActivity) {
    return 'POST_RIDE'; // Already worked out today
  } else if (todayPlannedWorkout) {
    return 'PRE_RIDE_PLANNED'; // Has a workout scheduled but hasn't done it yet
  } else {
    return 'DAILY_COACH'; // No workout — full daily intelligence
  }
}
```

---

## Mode 1: POST_RIDE (Already worked out today)

### Readiness Card
- Show readiness score as context ("You started today at 82 readiness")
- Show weather conditions during the ride

### AI Analysis Panel
Post-ride analysis focused on what just happened. Use the existing analysis system prompt from AIM-TECHNICAL-ARCHITECTURE.md Appendix C. Content:

- **Ride Summary**: 2-3 sentences on what the ride was and how it went
- **Key Insights**: Cross-domain connections (sleep → power, HRV → drift, fueling → fade)
- **What's Working**: Positive trends to reinforce
- **Watch Out**: Warning signs if any

### Action Items — "What Now"

**Right Now** (recovery-focused):
- Post-ride refueling: "Eat within 30 minutes: target [X]g carbs + [X]g protein based on ride intensity and duration"
- Hydration replenishment: "You burned ~[X] calories and lost ~[X]L fluid. Drink [X]L over the next 2 hours with electrolytes"
- Active recovery: "15-min cooldown spin or walk. Foam roll hip flexors (your L/R drift suggests tightness)"
- Supplement timing: If athlete has active boosters, reference them ("Take tart cherry juice now for inflammation reduction")

**This Week**:
- Next workout recommendation: "Based on today's [X] TSS, your next intensity window is [day]. Target Z2 tomorrow."
- Recovery priorities: "Your TSB will drop to [X] — prioritize sleep tonight. Target lights-out by [time]."
- Any persistent action items that didn't change (bike fit consult, blood panel retest, etc.)

**Big Picture**: Same as before — long-term limiters, training block recommendations

---

## Mode 2: PRE_RIDE_PLANNED (Has workout scheduled, hasn't done it yet)

### Readiness Card
- Readiness ring with green/yellow/red assessment
- Weather at their location (auto-populated from user's location)
- **Readiness check against planned workout**:
  - Green (readiness > 70): "Execute as planned"
  - Yellow (readiness 45-70): "Consider reducing intensity by 5-10%. Drop target power from [X]W to [X]W."
  - Red (readiness < 45): "Your body isn't ready for this workout. Swap for Z1/Z2 recovery ride or rest."

### Today's Workout Card
- Workout name, source (coach, AIM prescription, or manual)
- Workout structure in monospace
- Target metrics (duration, power, TSS, IF)
- "Swap Workout" and "Start Workout" buttons
- If readiness is yellow/red, show a suggested alternative workout

### Fueling Plan
Calculated from: planned workout duration × target intensity × weather conditions × athlete's body weight

- Calories (estimated burn)
- Carbs per hour (90g/hr for high intensity, 70g/hr moderate, 50g/hr low)
- Fluid per hour (adjusted for temperature: +150ml/hr per 5°C above 20°C)
- Sodium per hour (adjusted for heat: 500mg base, +300mg if >25°C)
- Pre-ride nutrition tip: Based on historical data ("Your best sessions follow meals 2-3 hours prior. Eat by [time] if riding at [time].")

### AI Analysis Panel — Pre-Ride Briefing

Forward-looking analysis. System prompt addition:

```
The athlete has not yet ridden today. They have a planned workout: [workout details].
Generate a PRE-RIDE briefing, not a post-ride analysis.

Focus on:
1. READINESS CHECK: Is their body ready for this specific workout? Reference HRV, sleep, recent training load.
2. WHAT TO EXPECT: Based on recent performance at this intensity, what power/HR numbers should they target?
3. KEY FOCUS: One technique or mental focus for this session (e.g., "Hold cadence >90 in the last interval — your data shows cadence fade is your tell for accumulated fatigue")
4. ENVIRONMENT: Any weather adjustments needed? Heat, wind, altitude considerations.
5. FUELING REMINDER: Pre-ride and during-ride nutrition priorities.

Keep it to 150 words. This is a pre-ride pep talk, not a post-ride essay.
```

### Action Items — "Before You Ride"

**Before Your Ride**:
- Pre-ride meal timing and composition
- Equipment check (if weather suggests layers, rain gear, etc.)
- Warm-up protocol for the specific workout type
- Supplement timing (caffeine 45 min before for intensity sessions, beetroot juice 2-3 hrs before)

**After Your Ride** (preview):
- Estimated recovery needs based on planned TSS
- When the next intensity window will likely be

---

## Mode 3: DAILY_COACH (No workout, no plan)

This is the most important mode. This is where AIM becomes a daily training companion, not just a ride analyzer. The AI considers EVERYTHING — training, nutrition, recovery, supplements, sleep, body maintenance, long-term goals.

### Readiness Card
- Readiness ring with full assessment
- Weather at their location
- If green/yellow: "Here's what AIM recommends for today"
- If red: Recovery plan (no workout recommendations, focus entirely on rest/recovery)

### AI Analysis Panel — Daily Intelligence

The system prompt for this mode:

```
The athlete has not ridden today and has no planned workout.
Generate a DAILY COACHING briefing that covers their entire day, not just training.

You have access to:
- Their readiness data (HRV, RHR, sleep quality, recovery score)
- Their training history (last 14 days of activities, CTL/ATL/TSB)
- Their power profile and performance gaps
- Their stated goals (from profile)
- Their body composition data (weight, DEXA if available)
- Their blood work (if available)
- Their active supplement/booster protocols (if any)
- Their menstrual cycle phase (if tracking)
- Weather at their location
- Their sleep patterns over the last 7 days

Generate insights across ALL of these domains. Prioritize by impact.

Sections:
1. **TODAY'S HEADLINE** (1 sentence): The single most important thing they should know today.
2. **TRAINING**: Should they train? What type? Why? If green readiness, recommend 2-3 workout options ranked by fit. If yellow, recommend easy/moderate only. If red, recommend rest.
3. **NUTRITION**: What should they eat today? Calorie target, protein target, any specific foods based on goals or deficiencies (e.g., iron-rich foods if ferritin is trending down).
4. **RECOVERY & BODY**: Foam rolling, stretching, sauna, cold exposure — based on what their body needs. Reference L/R imbalances, muscle tightness patterns, or injury prevention.
5. **SLEEP**: Bedtime recommendation, any adjustments (EightSleep temperature, screen time cutoff). Reference their recent sleep trends.
6. **SUPPLEMENTS**: If they have active booster protocols, remind them what to take and when. Note any timing interactions (e.g., "Don't take magnesium within 2 hours of caffeine").
7. **BIG PICTURE** (1 sentence): One long-term observation or nudge.

Keep total response under 300 words. Each section should be 1-3 sentences. Dense and actionable.
```

### Action Items — organized by time of day

**This Morning**:
- Supplement timing (creatine with breakfast, vitamin D with fat)
- Hydration target before noon
- If training: workout recommendation + fueling plan
- If rest day: mobility work, walk, sauna session

**This Afternoon**:
- Post-workout recovery (if they trained)
- Nutrition check-in (protein target, carb loading if big ride tomorrow)
- Body maintenance (foam roll, stretching, bike fit exercises)

**Tonight**:
- Target bedtime based on their optimal sleep window
- Sleep environment (EightSleep temp, screen cutoff)
- Evening supplement timing (magnesium, tart cherry juice)
- Tomorrow preview: "Tomorrow is [workout type]. Fuel accordingly tonight."

### Workout Recommendations (if readiness is green/yellow)

Show 2-3 workout cards ranked by fit, same design as the AI recommendation prototype. Each shows:
- Workout name and structure
- Duration, TSS estimate
- Why AIM recommends it (references performance gaps, recent training load, goals)
- Fueling plan (auto-calculated when selected)
- "Add to Calendar" button

---

## Weather Integration

### Implementation
1. Ask user for location permission during onboarding (or use the location from their profile)
2. Store latitude/longitude in profiles table (add columns: `location_lat NUMERIC, location_lng NUMERIC`)
3. Fetch weather from a free API (OpenWeatherMap or Open-Meteo — Open-Meteo is free, no API key needed)
4. Cache weather data in daily_metrics: add column `weather_data JSONB` (temp, humidity, wind, conditions, UV index)
5. Refresh weather every 3 hours or when dashboard loads

### Open-Meteo API (free, no key needed)
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&timezone=auto
```

### How Weather Affects Recommendations
- **Temperature > 25°C (77°F)**: Increase fluid recommendation by 25%, add sodium, suggest cooling strategies, warn about power reduction (2-3% per 5°C above optimal)
- **Temperature < 5°C (41°F)**: Suggest layering, longer warmup, note that RPE may feel higher at same power
- **High humidity > 80%**: Increase fluid, warn about heat index, adjust power targets down
- **Wind > 20 mph**: Factor into outdoor ride planning, suggest indoor if headwind would ruin intervals
- **Rain**: Mention visibility/safety, suggest indoor if intervals are planned
- **UV Index > 7**: Sunscreen reminder, hydration emphasis

---

## AI Context Payload Updates

The `buildAnalysisContext` function needs to include these additional fields:

```javascript
const buildDashboardContext = async (userId) => {
  const mode = getDashboardMode(userId);
  const base = await buildAnalysisContext(userId); // existing function

  return {
    ...base,
    mode, // 'POST_RIDE', 'PRE_RIDE_PLANNED', or 'DAILY_COACH'
    todayActivity: mode === 'POST_RIDE' ? await getTodaysActivity(userId) : null,
    plannedWorkout: mode === 'PRE_RIDE_PLANNED' ? await getTodaysPlannedWorkout(userId) : null,
    weather: await getWeather(userId), // current conditions at their location
    activeBoosters: await getActiveBoosters(userId), // supplement protocols
    sleepTrend: await getSleepTrend(userId, 7), // last 7 days of sleep
    bedtimePattern: await getBedtimePattern(userId, 14), // avg bedtime/wake time
    recentNotes: await getRecentNotes(userId, 14), // user notes from last 14 days
    upcomingEvents: await getUpcomingEvents(userId), // races, events on calendar
  };
};
```

---

## Database Changes

Add to `profiles` table:
```sql
location_lat NUMERIC,
location_lng NUMERIC,
location_permissions_granted BOOLEAN DEFAULT FALSE,
```

Add to `daily_metrics` table:
```sql
weather_data JSONB, -- {temp_f, temp_c, humidity_pct, wind_mph, conditions, uv_index}
```

Create `training_calendar` table:
```sql
CREATE TABLE training_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  workout_name TEXT,
  workout_type TEXT, -- vo2max, sweetspot, tempo, endurance, recovery, rest, strength
  workout_structure TEXT, -- human-readable structure
  target_duration_minutes INTEGER,
  target_tss NUMERIC,
  target_if NUMERIC,
  target_power_low_watts INTEGER,
  target_power_high_watts INTEGER,
  source TEXT DEFAULT 'aim', -- aim (AI prescribed), coach, manual, trainingpeaks
  source_id TEXT, -- ID from external source if imported
  completed BOOLEAN DEFAULT FALSE,
  completed_activity_id UUID REFERENCES activities(id),
  nutrition_plan JSONB, -- auto-calculated fueling plan
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, workout_name)
);
CREATE INDEX idx_training_calendar_user_date ON training_calendar(user_id, date);
```

---

## Summary

The dashboard is ONE adaptive interface with THREE content modes:
1. **POST_RIDE**: You rode → here's what happened → here's how to recover
2. **PRE_RIDE_PLANNED**: You have a plan → here's the briefing → here's the fuel
3. **DAILY_COACH**: No plan → here's what to do today across EVERY domain

The mode switches automatically. The design stays the same. The AI prompt changes. The action items change. The user never thinks about "modes" — they just open AIM and see exactly what they need right now.

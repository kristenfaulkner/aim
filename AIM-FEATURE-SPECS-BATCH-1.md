# AIM — Feature Specifications (Batch 1)

_Date: 2026-03-03_
_Status: Ready for implementation_

> **For Claude Code:** This document contains detailed feature specs ready to be built. Each feature includes architecture, data model, UI/UX, AI integration, edge cases, and implementation notes. Read the relevant feature section fully before writing any code. Reference `AIM-ENGINEERING-STANDARDS.md` for coding patterns and `AIM-DESIGN-BIBLE.md` for visual standards.

---

## Table of Contents

1. [Feature 1: HR Source Prioritization Engine](#feature-1-hr-source-prioritization-engine)
2. [Feature 2: Calendar, Race Intelligence & AI Race Strategist](#feature-2-calendar-race-intelligence--ai-race-strategist)
3. [Feature 3: Segment Comparison with Cross-Domain Adjusted Performance](#feature-3-segment-comparison-with-cross-domain-adjusted-performance)

---

# Feature 1: HR Source Prioritization Engine

## Overview

Athletes often wear multiple HR-capable devices simultaneously (e.g., Wahoo chest strap during rides + Whoop band 24/7 + Oura ring for sleep). Different devices have different accuracy profiles depending on context. AIM needs a smart prioritization system that automatically selects the best HR source for each context, while letting power users override defaults.

## Three Priority Contexts

HR data serves fundamentally different purposes in different contexts. Each context has its own priority stack:

### Context 1: Exercise HR
Used for: zone calculation, cardiac drift, EF, decoupling, HR:power/pace ratios during workouts.

**Default priority (highest → lowest):**
1. **Chest strap (Wahoo TICKR, Garmin HRM-Pro, Polar H10)** — Gold standard. ECG-grade accuracy, no motion artifacts
2. **Power meter with HR (Stages, Quarq w/ ANT+ paired HR)** — Usually receiving chest strap data
3. **Head unit recording (Garmin/Wahoo device file)** — Chest strap data recorded by the device
4. **Strava activity stream** — May be from watch optical or chest strap (lower certainty about source)
5. **Wrist-based optical during exercise (Apple Watch, Whoop, Garmin watch)** — Prone to motion artifacts during cycling (bouncing on rough roads), high cadence interference, loose-fit errors
6. **Ring-based (Oura)** — Not designed for exercise HR; highly unreliable during movement

**Detection logic:** Identify source device from the activity's FIT file metadata (`device_manufacturer`, `device_type`, `hr_source` fields) or from the integration that provided the data. If from Strava without FIT file, infer from `device_name` string in the activity metadata.

### Context 2: Sleep HR
Used for: overnight HR trends, HRV calculation, sleep stage detection, recovery scoring.

**Default priority (highest → lowest):**
1. **Oura Ring** — Continuous overnight optical HR from the finger (arterial, not capillary). Best signal-to-noise for stationary measurement
2. **Eight Sleep** — Ballistocardiography (BCG) sensor in the mattress. No wearable needed, but less precise than direct optical
3. **Whoop** — Wrist optical, continuous overnight. Good but occasionally disrupted by wrist position
4. **Apple Watch / Garmin Watch** — Wrist optical during sleep. Accurate when worn snugly, but many athletes remove watches for sleep
5. **Chest strap** — Not applicable (nobody sleeps in a chest strap)

**Detection logic:** Match by timestamp overlap. Sleep periods are defined by the sleep-tracking device (Oura sleep windows, Eight Sleep bed presence, Whoop sleep auto-detection). If multiple devices report sleep HR for the same night, use the highest-priority source.

### Context 3: Resting HR (Daytime Baseline)
Used for: daily RHR trends, readiness scoring, fitness tracking, overtraining detection.

**Default priority (highest → lowest):**
1. **Oura Ring** — Morning RHR measured during the last period of sleep (most standardized)
2. **Whoop** — Morning RHR from overnight recording
3. **Garmin Watch** — First-beat RHR measurement (early morning at rest)
4. **Apple Watch** — Lowest 1-min HR during resting periods
5. **Eight Sleep** — Derived from overnight BCG (less precise for single-point RHR)

**Detection logic:** Prefer the source that measures RHR in the most standardized conditions (end-of-sleep supine measurement). Timestamps should fall within 30 min of wake time.

## Data Architecture

### New Table: `hr_source_config`

```sql
CREATE TABLE hr_source_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('exercise', 'sleep', 'resting')),
  provider_priority TEXT[] NOT NULL, -- ordered array: ['wahoo', 'garmin', 'strava', 'whoop', 'oura']
  is_custom BOOLEAN DEFAULT FALSE,   -- true if user has overridden defaults
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, context)
);
```

### Metadata on Existing Tables

Add `hr_source` column to tables that store HR data:

```sql
-- On activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_source TEXT;
-- Values: 'wahoo_tickr', 'garmin_hrm', 'strava_stream', 'whoop', 'apple_watch', etc.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_source_confidence TEXT DEFAULT 'high';
-- Values: 'high' (chest strap identified), 'medium' (device type known), 'low' (inferred)

-- On daily_metrics table
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS rhr_source TEXT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sleep_hr_source TEXT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hrv_source TEXT;
```

### Source Resolution Function

```javascript
// api/_lib/hr-source-priority.js

// Default priority stacks (can be overridden per user)
const DEFAULTS = {
  exercise: ['chest_strap', 'device_file', 'strava_stream', 'wrist_optical', 'ring'],
  sleep:    ['oura', 'eightsleep', 'whoop', 'garmin_watch', 'apple_watch'],
  resting:  ['oura', 'whoop', 'garmin_watch', 'apple_watch', 'eightsleep'],
};

// Given multiple HR data sources for the same time window, return the best one
export function resolveHRSource(context, availableSources, userConfig = null) {
  const priority = userConfig?.provider_priority || DEFAULTS[context];
  // Find highest-priority source that has data
  for (const source of priority) {
    const match = availableSources.find(s => s.type === source && s.hasData);
    if (match) return { source: match, confidence: match.confidence };
  }
  // Fallback: use whatever is available
  return { source: availableSources[0], confidence: 'low' };
}
```

## UI/UX

### Source Badge (Shown Everywhere HR Data Appears)

A small, subtle badge next to any HR metric indicating which device provided the data:

```
♥ 142 bpm avg  [Wahoo TICKR]     ← exercise context, high confidence
♥ 48 bpm RHR   [Oura]            ← resting context
♥ 52 bpm sleep avg [Eight Sleep]  ← sleep context
```

**Badge design:**
- Small pill shape, `T.surface` background, `T.textDim` text, 11px font
- Device icon (tiny, from Lucide or custom) + device name
- Tooltip on hover: "HR data from Wahoo TICKR chest strap (highest priority for exercise). Tap to change source priority."
- On mobile: badge is tappable, opens a bottom sheet explaining the source

### Settings Page: Source Priority Override

In Settings, under a new "Data Sources" section:

```
HR Source Priority
─────────────────
Customize which device AIM prefers for heart rate data.
Defaults are based on device accuracy research.

Exercise HR    [Wahoo TICKR] > [Garmin Device] > [Strava] > [Whoop]    [Reset]
Sleep HR       [Oura Ring] > [Eight Sleep] > [Whoop]                    [Reset]
Resting HR     [Oura Ring] > [Whoop] > [Garmin Watch]                   [Reset]
```

- Each row shows only the devices the user has actually connected
- Drag-and-drop reordering (desktop) or up/down arrows (mobile)
- "Reset to recommended" button per context
- Only shown to users who have 2+ HR-capable integrations connected

### Activity Detail Page Integration

On the ActivityDetail page, in the metrics section:
- Show the HR source badge next to Avg HR, Max HR, and HR Drift
- If the activity has HR data from multiple sources (e.g., Wahoo chest strap AND Whoop), show a small "Compare sources" link that expands to show both readings side-by-side
- This helps athletes validate that their devices agree (or understand when they don't)

## Edge Cases

- **No HR data at all:** Show "No HR data" with a CTA to connect a device
- **Only one source:** Use it, show the badge, no priority logic needed
- **Conflicting data with >10% divergence:** Flag it in the AI analysis as a data quality note: "Your Whoop and chest strap HR diverged by 12% during high-intensity efforts — chest strap data was used for analysis. Wrist sensors can lose accuracy during intense vibration."
- **New device connected mid-history:** Don't retroactively re-prioritize old activities. Priority only applies to new data going forward.
- **Device removed/disconnected:** Remove from priority list, fall back to next available

## Implementation Notes

- This feature extends the existing `source-priority.js` pattern (which handles activity-level deduplication: device > TrainingPeaks > Strava). HR source priority is a finer-grained version of the same concept.
- FIT file parsing (`fit.js`) should be enhanced to extract `device_type` and `hr_device_info` fields for chest strap detection
- The priority resolution runs at sync time (when data is ingested), not at display time. The chosen source is stored with the data.
- AI analysis prompts should include the HR source and confidence so Claude can factor data quality into its insights

## Testing Priority

- **Must test:** Priority resolution with 2+ overlapping sources returns correct winner
- **Must test:** User override persists and is respected on next sync
- **Must test:** Source badge displays correct device on activity detail
- **Should test:** Edge case where highest-priority device has missing/corrupt HR data falls through to next source

---

# Feature 2: Calendar, Race Intelligence & AI Race Strategist

## Overview

A full-featured calendar page showing all training activities, plus an AI-powered race planning system. Athletes can input races in natural language, and AIM automatically looks up race details, builds race-specific training recommendations, generates race-day protocols, and tracks countdown preparation. This is AIM's killer differentiator — no other platform combines race intelligence, personalized training gaps, nutrition protocols, and weather forecasting into a single race preparation engine.

## Feature Components

This feature has 6 major sub-systems:

1. **Calendar View** — Visual calendar showing all activities, planned workouts, and races
2. **AI Race Parser** — Natural language race input → structured race data
3. **Race Hub** — Dedicated page per race with AI analysis, weather, demands, training plan
4. **Training Plan Generator** — AI-powered periodization from current fitness to race day
5. **Race-Day Protocol Builder** — Pre-race and day-of checklists with booster recommendations
6. **Progressive Profiling Sidebar** — Contextual questions to improve recommendation quality
7. **Dashboard Countdown Widget** — Next race countdown with prep status

## Sub-System 1: Calendar View

### Page: `/calendar`

**Layout:**
```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ ◀ March 2026 ▶                    [Month] [Week] [List]  │
├──────────────────────────────────────────────────────────┤
│ Mon    Tue    Wed    Thu    Fri    Sat    Sun             │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│ │    │ │🚴 │ │    │ │🚴 │ │🏋️ │ │🚴 │ │REST│       │
│ │    │ │62m │ │    │ │90m │ │45m │ │3hr │ │    │       │
│ │    │ │TSS │ │    │ │TSS │ │    │ │TSS │ │    │       │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │
│                                                          │
│ ... (more weeks)                                         │
│                                                          │
│ Apr 20: 🏁 Amstel Gold Race (A Race)  ← race marker     │
│ Apr 27: 🏁 Liège-Bastogne-Liège (A Race)                │
└──────────────────────────────────────────────────────────┘
```

**Day click → Day Detail Panel (slide-out or modal):**
```
─── Tuesday, March 3, 2026 ───

🚴 Morning Ride — Sweet Spot Intervals
   62 min · 72 TSS · NP 245W · IF 0.82
   [View Activity →]

🏋️ PM Gym — Upper Body
   45 min (manual entry)
   [Edit]

🥗 Nutrition
   Pre-ride: Oatmeal + banana (logged)
   On-bike: 2 gels, 1 bottle mix (60g/hr)
   Post-ride: Protein shake (logged)
   [View Nutrition Log →]

😴 Sleep: 7.2 hrs · Score 82 · HRV 58ms
   [View Sleep Detail →]

🌡️ Weather: 62°F, partly cloudy, 8mph wind

[+ Add Activity] [+ Add Note] [+ Add Race]
```

**Calendar markers:**
- Completed activities: colored dot (green = easy, yellow = moderate, red = hard, based on IF or RPE)
- Planned workouts: outlined dot (not yet completed)
- Races: flag emoji + race name, colored by priority (A race = red, B race = amber, C race = gray)
- Rest days: no marker, subtle "Rest" label
- Physiological data (sleep, HRV): small indicators in the corner of each day cell

### Data Architecture

Extends the existing `training_calendar` table:

```sql
-- New table for races (separate from training_calendar for richer metadata)
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  race_name TEXT NOT NULL,
  race_name_official TEXT,           -- full official name from lookup
  race_date DATE NOT NULL,
  race_end_date DATE,                -- for multi-day events (stage races, Ironman, etc.)
  race_type TEXT,                    -- road_race, time_trial, criterium, gran_fondo, marathon, triathlon, gravel, mtb, etc.
  race_series TEXT,                  -- e.g., 'UCI Women's World Tour', 'Ironman Series'
  priority TEXT DEFAULT 'B' CHECK (priority IN ('A', 'B', 'C')),
  -- A = peak goal race, B = important race, C = training race / not a priority

  -- Race profile data (from AI lookup + web search)
  distance_km NUMERIC,
  elevation_gain_m NUMERIC,
  race_profile TEXT,                 -- 'flat', 'rolling', 'hilly', 'mountainous', 'mixed'
  key_demands TEXT[],                -- ['5min_power', 'sprint', 'climbing', 'endurance', 'aero', 'puncheur']
  course_description TEXT,           -- AI-generated summary of the course
  location_city TEXT,
  location_country TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,

  -- Weather (updated as race approaches)
  weather_forecast JSONB,            -- { temp_c, humidity, wind_speed, precipitation, conditions, updated_at }
  weather_historical_avg JSONB,      -- historical averages for that location + time of year

  -- AI analysis
  ai_race_analysis JSONB,            -- { demands, strengths_vs_demands, gaps, training_recs, protocol_recs }
  ai_analysis_generated_at TIMESTAMPTZ,

  -- Training plan
  training_plan_type TEXT,           -- 'detailed' (day-by-day) or 'guidance' (weekly focus areas)
  training_plan JSONB,               -- structured plan data
  training_plan_generated_at TIMESTAMPTZ,

  -- Race-day protocol
  race_day_protocol JSONB,           -- { pre_race: [...], day_of: [...], nutrition: [...], warmup: [...] }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_races_user_date ON races(user_id, race_date);

-- Progressive profiling answers
CREATE TABLE athlete_profile_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,        -- e.g., 'dietary_restrictions', 'caffeine_tolerance', 'gi_sensitivity'
  answer JSONB NOT NULL,             -- flexible: string, array, boolean
  asked_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  source TEXT DEFAULT 'sidebar',     -- 'sidebar', 'onboarding', 'race_setup', 'settings'
  UNIQUE(user_id, question_key)
);
```

## Sub-System 2: AI Race Parser

### Natural Language Input

User types into a text field (on calendar page or via + Add Race button):

```
"I'm racing Amstel Gold, Liège-Bastogne-Liège, and the Vuelta a España"
```

### AI Parsing Pipeline

**Step 1: Claude parses the free text → structured race list**

```javascript
// API: POST /api/races/parse
// Input: { text: "I'm racing Amstel Gold, Liège, and the Vuelta" }
// AI prompt includes: current year, athlete's sex from profile, known race databases

// Output:
{
  "parsed_races": [
    {
      "input_text": "Amstel Gold",
      "resolved_name": "Amstel Gold Race",
      "official_name": "Amstel Gold Race Women's Elite",  // inferred from profile sex=female
      "date": "2026-04-19",
      "location": "Valkenburg, Netherlands",
      "type": "road_race",
      "series": "UCI Women's World Tour",
      "distance_km": 152.8,
      "elevation_gain_m": 2400,
      "profile": "hilly",
      "key_demands": ["puncheur", "5min_power", "tactical", "positioning"],
      "confidence": "high"
    },
    // ... more races
  ],
  "ambiguous": [],      // races that need user clarification
  "not_found": []        // races AI couldn't identify
}
```

**Step 2: Web search enrichment**

For each parsed race, use web search (Claude tool use with `web_search`) to find:
- Official race website for latest course details
- Historical weather data for race location + date (Open-Meteo historical API)
- Course profile and key climbing segments
- Recent edition results for context

**Step 3: User confirmation**

Show the parsed races in a confirmation UI:

```
We found these races:
──────────────────────

🏁 Amstel Gold Race (Women's Elite)
   April 19, 2026 · Valkenburg, Netherlands
   152.8 km · 2,400m elevation · Hilly
   Key demands: Punchy climbs, 5-min power, positioning
   [✓ Correct] [✎ Edit] [✗ Remove]

🏁 Liège-Bastogne-Liège (Women's Elite)
   April 26, 2026 · Liège, Belgium
   ...

🏁 Vuelta a España (Women's Edition)
   May 2-8, 2026 · Spain (multi-stage)
   ...

Which races are your top priority (A races)?
[Tap to set priority: A / B / C for each]

[Add All to Calendar]
```

**Step 4: Gender/edition resolution logic**

```
IF profile.sex === 'female' → default to women's edition
IF profile.sex === 'male' → default to men's edition
IF profile.sex === 'non-binary' → show both editions, ask user to select
IF race is mixed/coed (e.g., many gran fondos, Ironman) → use the single edition
IF race doesn't have a women's edition → note this to user
```

**Custom race input:**
If AI can't find the race, offer a manual form:
```
We couldn't find "Local Tuesday Night Crit"
[Enter details manually]
  Race name: ___________
  Date: ___________
  Distance: ___________  Elevation: ___________
  Type: [Road Race] [Crit] [TT] [Gran Fondo] [MTB] [Gravel] [Triathlon] [Other]
  Location: ___________
```

## Sub-System 3: Race Hub

### Page: `/race/:id`

A dedicated page for each race, serving as the central preparation hub.

**Layout:**
```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ ← Back to Calendar                                       │
│                                                          │
│ 🏁 AMSTEL GOLD RACE                                     │
│ Women's Elite · April 19, 2026 · Valkenburg, NL         │
│ ██████████░░░░░░░░░ 47 days away                        │
│                                                          │
│ Priority: [A Race ▾]                                     │
├────────────────────────────────┬─────────────────────────┤
│                                │                         │
│ [Race Profile] [Your Gaps]     │  Weather Forecast       │
│ [Training Plan] [Race Day]     │  ┌─────────────────┐   │
│                                │  │ 🌤️ 14°C / 57°F  │   │
│ ── Race Profile ──             │  │ 65% humidity     │   │
│                                │  │ 12 km/h wind NW  │   │
│ 152.8 km · 2,400m elev        │  │ 30% rain chance  │   │
│ Key climbs:                    │  │ Updated: 3/3     │   │
│ • Cauberg (1.2km, 5.8%)       │  └─────────────────┘   │
│ • Keutenberg (700m, 9.4%)     │                         │
│ • Kruisberg (1.1km, 6.2%)     │  Race-Day Protocol      │
│                                │  ┌─────────────────┐   │
│ Demands Analysis:              │  │ ☐ Beet juice     │   │
│ This race requires strong      │  │ ☐ Caffeine 3mg/  │   │
│ 3-5 min power for the punchy  │  │ ☐ Carb load...   │   │
│ climbs, ability to recover    │  │ ☐ Warmup proto.. │   │
│ between efforts, and a good   │  │ [+ Add item]     │   │
│ kick for the Cauberg finish.  │  └─────────────────┘   │
│                                │                         │
├────────────────────────────────┴─────────────────────────┤
│ AI Race Strategist                                       │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Based on your current power profile and the demands  │ │
│ │ of Amstel Gold, here's what we see:                 │ │
│ │                                                      │ │
│ │ ✅ Strengths:                                        │ │
│ │ • Your 20-min power (3.8 W/kg) is solid for the    │ │
│ │   longer climbs                                      │ │
│ │ • Your endurance base (CTL 78) supports the 4hr     │ │
│ │   race duration                                      │ │
│ │                                                      │ │
│ │ ⚠️ Gaps:                                             │ │
│ │ • Your 5-min power (4.1 W/kg) needs to be closer   │ │
│ │   to 4.5 W/kg for the Cauberg repeats               │ │
│ │ • Your 1-min power (6.2 W/kg) may not survive the  │ │
│ │   Keutenberg accelerations                           │ │
│ │                                                      │ │
│ │ 💡 Recommendation: Focus the next 6 weeks on VO2max │ │
│ │ repeatability and 1-5 min power development.         │ │
│ │                                                      │ │
│ │ Would you like:                                      │ │
│ │ [Detailed Day-by-Day Plan] [Weekly Focus Guidance]   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Tabs within Race Hub:**

1. **Race Profile** — Course details, key climbs/segments, historical results context, map (if available)
2. **Your Gaps** — AI analysis comparing athlete's current power profile, durability, and fitness to race demands. Specific numbers.
3. **Training Plan** — Either detailed (day-by-day) or guidance (weekly focus areas), based on user preference
4. **Race Day** — Full race-day protocol with pre-race prep and day-of checklist

## Sub-System 4: Training Plan Generator

### Two Modes

**Mode A: Weekly Focus Guidance**
```json
{
  "type": "guidance",
  "weeks": [
    {
      "week_number": 1,
      "dates": "March 10-16",
      "focus": "VO2max introduction",
      "key_sessions": [
        "2x VO2max sessions (5x5min at 108-115% FTP)",
        "1x long endurance ride with race-pace surges",
        "1x sweet spot (maintaining base)"
      ],
      "weekly_tss_target": 550,
      "weekly_hours_target": 12,
      "notes": "Ease into the VO2 work. First week is about stimulus, not max effort."
    }
    // ... more weeks
  ]
}
```

**Mode B: Detailed Day-by-Day Plan**
```json
{
  "type": "detailed",
  "days": [
    {
      "date": "2026-03-10",
      "title": "VO2max — Norwegian 4x4",
      "description": "4 × 4min at 328-343W (110-115% FTP) / 3min recovery at 149W (50% FTP)",
      "duration_minutes": 75,
      "tss_estimate": 85,
      "warmup": "20min progressive build to Zone 3",
      "main_set": "4 × 4min Zone 5 / 3min Zone 1",
      "cooldown": "15min easy spinning",
      "nutrition": "Bottle with 60g carbs, gel at interval 3 if needed",
      "notes": "Focus on smooth, sustainable power. Don't spike the first interval."
    }
    // ... daily entries through race week
  ]
}
```

### AI Prompt Context for Plan Generation

The AI needs:
- Current power profile (all durations: 5s, 1min, 5min, 20min, 60min)
- Current CTL/ATL/TSB (fitness, fatigue, form)
- Race demands (from race profile)
- Time to race (weeks until event)
- Available training hours (ask user: "How many hours per week can you train?")
- Available training days (ask user: "Which days are your key training days?")
- Existing calendar commitments (other races, planned rest weeks)
- Athlete history: how they respond to VO2 work, threshold work, volume
- No Medical Advice Policy applies to all training recommendations

## Sub-System 5: Race-Day Protocol Builder

### Protocol Structure

```json
{
  "pre_race_week": [
    {
      "timing": "7 days before",
      "items": [
        { "type": "training", "text": "Last hard session: race-pace openers (4x30s)", "done": false },
        { "type": "nutrition", "text": "Begin carb loading if race >3hrs (8-10g/kg/day)", "done": false }
      ]
    },
    {
      "timing": "3 days before",
      "items": [
        { "type": "nutrition", "text": "Increase carbs to 10-12g/kg, reduce fiber", "done": false },
        { "type": "protocol", "text": "Test bicarb loading protocol if planned (consult physician first)", "done": false }
      ]
    }
  ],
  "race_day": {
    "morning": [
      { "type": "nutrition", "text": "Breakfast 3-4hrs before start: 2-3g/kg carbs (rice, toast, banana)", "timing": "3-4hrs pre", "done": false },
      { "type": "booster", "text": "Beetroot juice shot (400mg nitrate)", "timing": "2-3hrs pre", "done": false, "booster_id": "beetroot_juice" },
      { "type": "booster", "text": "Caffeine 3mg/kg (e.g., 200mg for 67kg)", "timing": "60min pre", "done": false, "booster_id": "caffeine" }
    ],
    "warmup": [
      { "type": "training", "text": "30min progressive warmup: 10min Z1, 10min Z2, 3x30s race pace, 5min easy", "timing": "45-30min pre", "done": false }
    ],
    "during_race": [
      { "type": "nutrition", "text": "Target 80-90g/hr carbs (gels + drink mix). Start fueling at 20min.", "done": false },
      { "type": "hydration", "text": "500-750ml/hr. Increase to 1L/hr if >25°C.", "done": false }
    ]
  }
}
```

### Booster Recommendation Flow

When the AI recommends a performance booster (e.g., beetroot juice, caffeine, bicarb):

```
💡 Recommended: Beetroot Juice (Nitrate Loading)

Research shows 400mg dietary nitrate 2-3hrs pre-race can improve
time trial performance by 1-3% via improved oxygen efficiency.
Strong evidence (6 studies). [View studies →]

⚠️ Have you used beetroot juice before a hard effort before?
   [Yes, I've tried it]  [No, never tried]

→ If "No": "We recommend testing this in training first. Beetroot
   juice can cause GI discomfort in some athletes. Would you like
   to add a test session to your training plan 3+ weeks before
   race day?"
   [Yes, add test session]  [Skip for this race]

→ If "Yes": [+ Add to Race-Day Protocol]

Important: Beetroot juice may interact with certain medications.
Consider discussing with your physician before use.
```

**Connect to existing Boosters library:** Each protocol recommendation links to the full booster card from the Boosters page (protocols, study links, recipes, cautions).

### Race-Type Specific Recommendations

The AI should tailor recommendations based on race type:

**Time Trial:** Recommend aero position practice ("Spend 2-3hrs/week in aero position for the 6 weeks before your TT. This trains your body to produce power in that position and reduces perceived effort."), BestBikeSplit app, skin suit, aero helmet, shaving legs, caffeine, bicarb, beetroot juice.

**Ironman/Long-course triathlon:** Gut training protocol, heat acclimation if hot climate, aero practice, nutrition plan >60g/hr carbs, electrolyte strategy, pacing strategy.

**Criterium:** Sprint-focused prep, caffeine, no bicarb (short race, GI risk not worth it), cornering practice, race tactics.

**Stage race (Vuelta, etc.):** Recovery between stages, daily nutrition periodization, sleep optimization, managing accumulated fatigue.

**Gran fondo / mass start:** Pacing for duration, nutrition plan, hydration, group riding tactics.

**If race is 6+ months away:** Consider strength/gym block, creatine loading phase (with caveat about 1-2kg weight gain), base-building period before race-specific work.

## Sub-System 6: Progressive Profiling Sidebar

### Concept

A non-intrusive sidebar or card that appears on the dashboard or calendar with contextual questions to improve recommendation quality. Questions are triggered by events (e.g., race added, new integration connected, first time using nutrition logger).

### Questions Database

```javascript
const PROFILE_QUESTIONS = [
  // Dietary
  { key: 'dietary_restrictions', question: 'Do you have any dietary restrictions?',
    options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Lactose intolerant', 'Other'],
    type: 'multi_select', trigger: 'first_race_added' },

  // Supplements
  { key: 'caffeine_tolerance', question: 'How do you respond to caffeine?',
    options: ['High tolerance (drink coffee daily)', 'Moderate', 'Sensitive (jittery easily)', 'I avoid caffeine'],
    type: 'single_select', trigger: 'first_race_protocol' },

  { key: 'gi_sensitivity', question: 'Do you have a sensitive stomach during exercise?',
    options: ['No issues', 'Sometimes', 'Frequently — I need to be careful', 'Severe — very limited tolerance'],
    type: 'single_select', trigger: 'first_nutrition_log' },

  { key: 'tried_beetroot', question: 'Have you ever used beetroot juice before racing?',
    type: 'boolean', trigger: 'race_protocol_beetroot' },

  { key: 'tried_bicarb', question: 'Have you ever used sodium bicarbonate before racing?',
    type: 'boolean', trigger: 'race_protocol_bicarb' },

  { key: 'tried_creatine', question: 'Have you ever used creatine?',
    type: 'boolean', trigger: 'race_6mo_away' },

  // Training context
  { key: 'gym_access', question: 'Do you have access to a gym?',
    type: 'boolean', trigger: 'race_6mo_away' },

  { key: 'sauna_access', question: 'Do you have access to a sauna?',
    type: 'boolean', trigger: 'hot_race_detected' },

  { key: 'trainer_type', question: 'What indoor trainer do you use?',
    options: ['Smart trainer (ERG mode)', 'Basic/wheel-on trainer', 'Rollers', 'None — outdoor only'],
    type: 'single_select', trigger: 'training_plan_generated' },

  { key: 'coach_status', question: 'Do you currently work with a coach?',
    options: ['Yes, full-time coach', 'Yes, occasional guidance', 'No, self-coached'],
    type: 'single_select', trigger: 'first_training_plan' },

  // Health
  { key: 'allergies', question: 'Do you have any allergies we should know about?',
    type: 'free_text', trigger: 'first_race_protocol' },

  { key: 'medications', question: 'Are you taking any medications that affect heart rate or performance?',
    type: 'free_text', trigger: 'onboarding_complete' },
];
```

### UI Presentation

**Dashboard card (non-intrusive):**
```
┌────────────────────────────────────┐
│ 💡 Quick Question                  │
│                                    │
│ Do you have any dietary            │
│ restrictions?                      │
│                                    │
│ [None] [Vegetarian] [Vegan]        │
│ [Gluten-free] [Lactose intolerant] │
│ [Other: _____]                     │
│                                    │
│           [Skip] [Save]            │
│                                    │
│ This helps us personalize your     │
│ nutrition and race-day protocols.  │
└────────────────────────────────────┘
```

- Maximum 1 question per session (don't bombard)
- "Skip" always available
- Skipped questions re-surface after 2 weeks
- Answered questions never re-appear
- All answers editable in Settings

## Sub-System 7: Dashboard Countdown Widget

Small card on the main dashboard:

```
┌──────────────────────────────┐
│ 🏁 Next Race                 │
│                              │
│ Amstel Gold Race             │
│ 47 days · April 19           │
│                              │
│ Prep status: 3/8 items ✓     │
│ Weather: 14°C, 65% humidity  │
│ ████████░░░░░░░ 38%          │
│                              │
│ [Open Race Hub →]            │
└──────────────────────────────┘
```

- Shows only the next upcoming A or B race
- Prep status = race-day protocol checklist progress
- Weather updates automatically (weekly when >30 days out, daily when <14 days out)
- Progress bar = days elapsed / total prep window
- Tapping opens the Race Hub page

## Weather Integration

### Update Schedule

| Days to Race | Weather Source | Update Frequency |
|-------------|---------------|-----------------|
| > 60 days | Historical averages (Open-Meteo climate API) | Once at race creation |
| 30-60 days | Historical averages + seasonal trends | Weekly |
| 14-30 days | Extended forecast (Open-Meteo forecast API) | Every 3 days |
| 7-14 days | 14-day forecast | Daily |
| < 7 days | Detailed forecast (hourly) | Every 6 hours |

### Weather Impact on Recommendations

The AI adjusts recommendations based on forecast:
- **Hot (>25°C):** Add heat acclimation protocol, increase hydration targets, recommend pre-cooling, add sauna sessions if available, adjust pacing expectations
- **Humid (>70%):** Further increase hydration, electrolyte emphasis, adjust perceived exertion expectations
- **Cold (<5°C):** Layering recommendations, warmup duration increase, adjust nutrition (more calories needed)
- **Rain:** Equipment recommendations (tire pressure, clothing), course impact (slippery descents)
- **Altitude (>1500m):** Acclimatization timeline, adjust power targets, increase carb intake, hydration adjustments

## API Endpoints

```
POST   /api/races/parse              ← AI natural language → structured races
POST   /api/races/upsert             ← Create/update a race
GET    /api/races/list                ← All races for user
GET    /api/races/:id                 ← Single race with full data
DELETE /api/races/:id                 ← Remove a race
POST   /api/races/:id/analyze        ← AI race analysis (demands vs athlete profile)
POST   /api/races/:id/training-plan  ← Generate training plan (detailed or guidance)
POST   /api/races/:id/protocol       ← Generate race-day protocol
PUT    /api/races/:id/protocol       ← Update protocol (check/uncheck items, add custom items)
GET    /api/races/:id/weather        ← Current weather data for race
POST   /api/races/:id/weather/refresh ← Force weather update
GET    /api/calendar/range            ← All calendar data for date range (activities + planned + races)
POST   /api/profile/question          ← Save a progressive profiling answer
GET    /api/profile/next-question     ← Get the next unanswered question (context-aware)
```

## Edge Cases

- **Race cancelled or postponed:** Allow editing the date; weather and training plan auto-adjust
- **Multiple A races close together:** AI should note the recovery constraints and adjust the plan (e.g., "Amstel Gold and Liège are 7 days apart — we'll prioritize recovery between them rather than additional training stimulus")
- **Race is tomorrow (just added):** Skip training plan, go straight to race-day protocol
- **No power data (runner):** Gap analysis uses pace/HR at threshold, VO2max estimate, and race-specific demands
- **Unknown race (custom):** AI asks targeted questions to build a demands profile: "Is this race flat, hilly, or mountainous?" "How long is it?" "Will there be significant climbing?"
- **User has a coach:** Note in training plan: "You have a coach — consider sharing these recommendations with them rather than replacing their plan"

## Implementation Phases

**Phase 1:** Calendar view + manual race entry + basic race detail page
**Phase 2:** AI race parser (natural language) + web search enrichment + race demands analysis
**Phase 3:** Training plan generator (both modes) + gap analysis
**Phase 4:** Race-day protocol builder + booster integration + progressive profiling sidebar
**Phase 5:** Dashboard countdown widget + automated weather updates + weathered-adjusted recommendations

## Testing Priority

- **Must test:** AI race parser correctly identifies well-known races and resolves gender
- **Must test:** Calendar displays activities, planned workouts, and races correctly
- **Must test:** Race-day protocol checklist state persists
- **Must test:** Weather API calls are rate-limited and cached
- **Should test:** Training plan respects available hours and existing calendar
- **Should test:** Progressive profiling questions don't repeat and respect skip

---

# Feature 3: Segment Comparison with Cross-Domain Adjusted Performance

## Overview

Import segments from Strava and compare efforts across multiple attempts, with AI-powered analysis that adjusts for temperature, sleep, HRV, fatigue (CTL/ATL/TSB), weather, and other contextual factors. While Strava can tell you "you were 12 seconds slower," AIM tells you *why* — and whether your adjusted performance actually improved or declined.

This feature serves both cyclists (who have power data but still benefit from cross-domain context) and runners (who rely more heavily on pace:HR ratios and need this context even more).

## Data Architecture

### Strava Segment Import

Pull segments from Strava activity data (already synced):

```sql
-- Segments table
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  strava_segment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('cycling', 'running')),
  distance_m NUMERIC,
  average_grade_pct NUMERIC,
  maximum_grade_pct NUMERIC,
  elevation_gain_m NUMERIC,
  start_lat NUMERIC,
  start_lng NUMERIC,
  end_lat NUMERIC,
  end_lng NUMERIC,
  climb_category INTEGER,         -- Strava climb cat (0-5, HC)
  city TEXT,
  state TEXT,
  country TEXT,
  polyline TEXT,                   -- encoded polyline for map display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strava_segment_id)
);
CREATE INDEX idx_segments_user ON segments(user_id);

-- Segment efforts (each time the athlete rides/runs this segment)
CREATE TABLE segment_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  strava_effort_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  elapsed_time_seconds INTEGER NOT NULL,
  moving_time_seconds INTEGER,

  -- Performance metrics
  avg_power_watts NUMERIC,         -- cycling
  normalized_power_watts NUMERIC,  -- cycling
  avg_hr_bpm NUMERIC,
  max_hr_bpm NUMERIC,
  avg_cadence_rpm NUMERIC,
  avg_speed_mps NUMERIC,
  avg_pace_min_km NUMERIC,         -- running (computed from speed)

  -- Derived ratios
  efficiency_factor NUMERIC,       -- NP / avg_hr (cycling) or speed / avg_hr (running)
  pace_hr_ratio NUMERIC,           -- (1/pace) / avg_hr — higher is better for runners
  power_hr_ratio NUMERIC,          -- avg_power / avg_hr — higher is better for cyclists

  -- Context at time of effort (denormalized for fast queries)
  temperature_c NUMERIC,
  humidity_pct NUMERIC,
  wind_speed_mps NUMERIC,
  wind_direction_deg NUMERIC,
  hrv_morning_ms NUMERIC,          -- morning HRV on day of effort
  rhr_morning_bpm NUMERIC,         -- morning RHR on day of effort
  sleep_score INTEGER,             -- previous night's sleep score
  sleep_duration_seconds INTEGER,  -- previous night's sleep
  ctl NUMERIC,                     -- CTL on day of effort
  atl NUMERIC,                     -- ATL on day of effort
  tsb NUMERIC,                     -- TSB on day of effort
  hr_source TEXT,                  -- which device provided HR (from Feature 1)

  -- AI adjusted performance
  adjusted_score NUMERIC,          -- normalized performance score (0-100) accounting for all context
  ai_comparison_notes TEXT,        -- AI-generated comparison to previous best / recent efforts

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strava_effort_id)
);
CREATE INDEX idx_segment_efforts_segment ON segment_efforts(segment_id, started_at DESC);
CREATE INDEX idx_segment_efforts_user ON segment_efforts(user_id, started_at DESC);
```

### Strava Segment Sync

During activity sync (existing pipeline), extract segment efforts:

```javascript
// In the Strava sync pipeline, after activity is saved:
// 1. Fetch detailed activity from Strava (includes segment_efforts)
// 2. For each segment_effort:
//    a. Upsert the segment (if new)
//    b. Create segment_effort record with performance metrics
//    c. Denormalize context data (weather, HRV, sleep, training load from daily_metrics)
//    d. Compute derived ratios (EF, pace:HR, power:HR)
```

**Strava API calls needed:**
- `GET /api/v3/activities/{id}` — already fetched during sync, includes `segment_efforts` array
- `GET /api/v3/segments/{id}` — fetch segment details (distance, grade, polyline) for new segments only

No additional Strava scopes needed — segment effort data is included in the activity detail response with the existing `activity:read_all` scope.

## Adjusted Performance Scoring

### The Core Algorithm

For each segment effort, compute an "adjusted performance score" that normalizes for contextual factors:

```javascript
// api/_lib/segment-analysis.js

export function computeAdjustedScore(effort, historicalEfforts, contextualFactors) {
  // Start with raw performance (time-based)
  const rawScore = computeRawScore(effort, historicalEfforts);

  // Apply adjustment factors from conditional performance models
  // (reuse existing models from performance-models.js)
  const adjustments = {
    temperature: getHeatPenaltyAdjustment(effort.temperature_c, historicalEfforts),
    sleep: getSleepAdjustment(effort.sleep_score, effort.sleep_duration_seconds),
    hrv: getHRVAdjustment(effort.hrv_morning_ms, userBaselines.hrv),
    fatigue: getFatigueAdjustment(effort.tsb, effort.atl, effort.ctl),
    wind: getWindAdjustment(effort.wind_speed_mps, effort.wind_direction_deg, segmentBearing),
    humidity: getHumidityAdjustment(effort.humidity_pct),
  };

  // Each adjustment is a multiplier (e.g., 1.03 means 3% penalty from heat)
  const totalAdjustment = Object.values(adjustments).reduce((a, b) => a * b, 1);

  return {
    rawScore,
    adjustedScore: rawScore * totalAdjustment,
    adjustments,  // individual factors for explanation
    isAdjustedPR: adjustedScore > bestAdjustedScore,
  };
}
```

### Sport-Specific Metrics

**Cycling:**
- Primary metric: time (faster = better)
- Secondary: power (NP if available, avg power as fallback)
- Key ratio: power:HR (efficiency factor) — accounts for fitness vs fatigue
- Adjustment factors: temperature, wind (direction matters relative to segment bearing), altitude, fatigue

**Running:**
- Primary metric: time / pace
- Secondary: pace:HR ratio (higher = more efficient, the runner is covering more ground per heartbeat)
- Key ratio: speed / avg_hr — the closest equivalent to cycling's EF
- Adjustment factors: temperature (larger effect on runners — no wind cooling), humidity (much larger effect on runners), elevation gain/loss, surface (trail vs road if detectable), fatigue

## UI/UX

### Activity Detail Page: Segment Comparison Section

On the ActivityDetail page, add a new section (below the existing AI analysis) for any activity that contains segment efforts:

```
── Segments ──────────────────────────────────────────

🏔️ Hawk Hill Climb
   Today: 4:52 · 312W NP · 167 bpm
   vs Best: 4:38 (14s slower)
   vs Last: 4:47 (5s slower)

   🤖 AI Adjusted Analysis:
   "14 seconds slower than your PR, but today was 18°F warmer
   (82°F vs 64°F on your PR day), your TSB was -22 (vs +5 on PR
   day), and your HRV was 15% below baseline. Adjusting for
   temperature and fatigue, this effort was actually equivalent
   to a 4:41 — only 3 seconds off your best. Your power:HR ratio
   of 1.87 was your 2nd best ever on this segment, suggesting
   strong underlying fitness despite the conditions."

   [View all 12 efforts on this segment →]

🏃 Golden Gate Park Loop (running segment)
   Today: 23:14 · 5:12/km · 152 bpm avg
   vs Best: 22:01 (1:13 slower)
   vs Last: 22:48 (26s slower)

   🤖 AI Adjusted Analysis:
   "Your HR was 8 bpm higher at a similar pace compared to last
   week. However, it was 27°F hotter today and you slept 1.5 hours
   less last night (5.2 hrs vs 6.7 hrs). Adjusting for temperature
   and sleep quality, your pace:HR efficiency actually improved by
   approximately 3%. Your aerobic system is trending in the right
   direction — the conditions were just working against you."

   [View all 8 efforts on this segment →]
```

### Expanded Segment History (click-through)

When user clicks "View all efforts on this segment":

```
── Hawk Hill Climb · All Efforts ─────────────────────

[Chart: time trend with dots, adjusted time shown as second line]

 Date        Time    Power   HR    Temp   TSB   Adj.Score
 ────────────────────────────────────────────────────────
 Mar 3 🔴    4:52    312W    167   82°F   -22   87.3
 Feb 25      4:47    318W    162   64°F   -15   85.1
 Feb 18      4:38 ⭐  325W    158   58°F   +5    91.2  ← PR
 Feb 10      4:55    305W    165   52°F   -28   86.8
 Jan 28      4:44    320W    160   48°F   +2    89.5
 ...

 ⭐ = PR (raw time)
 🔴 = today's effort

 Legend: Adj.Score accounts for temperature, sleep (HRV),
 fatigue (TSB), and weather conditions. Higher = better.

 📊 Trend: Your adjusted performance on this segment has
 improved 4.2% over the last 8 weeks despite higher training load.
```

**For runners (no power column):**

```
 Date        Time     Pace     HR    Pace:HR   Temp   Adj.Score
 ────────────────────────────────────────────────────────────────
 Mar 3 🔴    23:14    5:12/km  152   0.127     82°F   84.1
 Feb 25      22:48    5:06/km  149   0.132     64°F   86.5
 Feb 18      22:01 ⭐  4:56/km  145   0.138     61°F   91.8  ← PR
 ...
```

### AI Insight Category: Segment Performance Analysis

Add as **Category 23** in the insights catalog:

```
Category 23: Segment Comparison & Adjusted Performance

Trigger: Activity contains segment efforts with 2+ historical efforts on the same segment.

Required data:
- Current and historical segment efforts (time, power/pace, HR)
- Contextual data for each effort (temperature, HRV, sleep, TSB, weather)
- Athlete baselines (90-day HRV avg, typical TSB range, heat sensitivity model)

Output format per segment:
{
  "segment_name": "Hawk Hill Climb",
  "raw_comparison": "14s slower than PR, 5s slower than last attempt",
  "adjusted_comparison": "Equivalent to 4:41 when adjusted (3s off PR)",
  "key_factors": [
    { "factor": "temperature", "impact": "+8s", "detail": "82°F vs 64°F on PR day" },
    { "factor": "fatigue", "impact": "+4s", "detail": "TSB -22 vs +5 on PR day" },
    { "factor": "sleep", "impact": "+1s", "detail": "HRV 15% below baseline" }
  ],
  "trend": "Adjusted performance improving 4.2% over 8 weeks",
  "efficiency_insight": "Power:HR ratio 2nd best ever on this segment",
  "takeaway": "Strong underlying fitness despite challenging conditions"
}
```

## API Endpoints

```
GET    /api/segments/list              ← All segments for user (with effort count, last effort date)
GET    /api/segments/:id               ← Segment detail with all efforts + adjusted scores
GET    /api/segments/:id/compare       ← Side-by-side comparison of selected efforts
POST   /api/segments/sync              ← Re-import segments from recent Strava activities
GET    /api/activities/:id/segments    ← All segment efforts for a specific activity
```

## Implementation Phases

**Phase 1:** Segment + effort import during Strava sync, basic segment list page, effort history table
**Phase 2:** Context denormalization (weather, HRV, sleep, training load on each effort), derived ratios
**Phase 3:** Adjusted performance scoring using existing conditional performance models
**Phase 4:** AI comparison analysis (Category 23 insight), activity detail integration
**Phase 5:** Trend visualization (chart showing raw vs adjusted performance over time)

## Edge Cases

- **First effort on a segment:** No comparison possible — show "First time! We'll compare future efforts to this one."
- **Segment with only 1 effort:** Show the metrics but note "Complete this segment again to unlock comparison insights"
- **Missing context data:** If no HRV/sleep/weather for a historical effort, note the adjustment is partial: "Adjusted for temperature and fatigue. Sleep data not available for your Feb 10 effort."
- **Different devices across efforts:** Note HR source differences in comparison: "Note: Today's HR from Wahoo TICKR (chest strap), Feb 18 HR from Strava (likely wrist optical). Chest strap data is more reliable during high-intensity efforts."
- **GPS drift creating false segment matches:** Trust Strava's matching — they handle this. Don't re-match locally.
- **Very short segments (<30 seconds):** Still compare, but note that context factors have less impact on very short efforts
- **Runner on a trail segment (elevation varies by GPS accuracy):** Note that pace comparisons on hilly trail segments are less reliable than flat road segments

## Testing Priority

- **Must test:** Segment import from Strava activity detail response correctly creates segment + effort records
- **Must test:** Adjusted score calculation produces sensible results (hotter day = higher adjustment, better sleep = lower adjustment)
- **Must test:** Activity detail page shows segment comparison section when efforts exist
- **Should test:** Edge case with missing context data doesn't crash the adjustment calculation
- **Should test:** Effort history sorted correctly with PR flagging

---

# Appendix: Cross-Feature Dependencies

```
Feature 1 (HR Source Priority) ──→ Feature 3 (Segment Comparison)
  Segment efforts need accurate HR data. The source badge and
  confidence score from Feature 1 inform Feature 3's analysis
  quality ("Note: different HR sources across efforts").

Feature 2 (Race Intelligence) ──→ Feature 3 (Segment Comparison)
  Race-relevant segments can be flagged: "This segment is similar
  to the Cauberg profile. Your adjusted trend here informs your
  Amstel Gold race readiness."

Feature 2 (Race Protocols) ──→ Existing Boosters Library
  Race-day protocol items link to booster cards. The progressive
  profiling questions inform which boosters to recommend.

Feature 3 (Adjusted Performance) ──→ Existing Performance Models
  Reuses heat penalty, sleep→execution, HRV readiness, and
  fatigue models from Phase 4 of Structured Workouts Engine.
```

## Recommended Build Order

1. **Feature 1: HR Source Prioritization** — foundational, improves data quality for everything else
2. **Feature 3: Segment Comparison (Phases 1-2)** — segment import + basic comparison (no AI yet)
3. **Feature 2: Calendar (Phase 1)** — calendar view + manual race entry
4. **Feature 3: Segment Comparison (Phases 3-5)** — adjusted scoring + AI analysis
5. **Feature 2: Race Intelligence (Phases 2-5)** — AI parser, Race Hub, training plans, protocols

This order ensures each feature builds on solid foundations rather than requiring rework.

---

_This document should be added to the project root and referenced from CLAUDE.md under Reference Docs. Claude Code should read the relevant feature section before beginning implementation._

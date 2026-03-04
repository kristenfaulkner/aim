# BUILD PLAN: Calendar + Race Intelligence + AI Race Strategist

## Feature Summary
**What:** A full training calendar (month/week/list views) showing completed activities, planned workouts, and races. AI-powered natural language race parser ("I'm racing Amstel Gold and Liège-Bastogne-Liège in April"). Dedicated Race Hub page per race with AI demands analysis, gap identification, weather forecasting, training plan generation, and race-day protocol builder with booster integration.

**Why it matters:** The calendar is the missing organizational layer in AIM. Right now athletes can see what happened (past activities) but can't plan what's next. The race intelligence layer transforms AIM from "analytics platform" into "race preparation system." When an athlete enters a target race, AIM builds backward from race day: what fitness they need, what gaps to close, what protocol to follow on race day, what to eat, when to taper. This is what coaches charge $300/month for.

**Who cares:**
- **Athletes:** Racing is why they train. Everything in their training life revolves around key races. A platform that doesn't understand race preparation is missing the point.
- **Coaches:** Plan training in mesocycles around races. Need a calendar view showing plan vs actual.
- **Teams:** Coordinate race preparation across multiple athletes. Shared race protocols.

**Competitive differentiation:** TrainingPeaks has a calendar but no AI. Strava has no planning features. AIM's AI race strategist is unique — it analyzes the race course, compares demands to the athlete's profile, identifies gaps, generates a training plan, builds a race-day protocol with booster recommendations, and updates weather forecasts as race day approaches. No other platform does this end-to-end.

**Stickiness:** Once athletes enter their target races, AIM becomes their race preparation command center. The countdown widget on the dashboard ("42 days to Amstel Gold") is a daily reminder. The training plan gives them daily purpose. The race-day protocol is what they open the morning of the race.

## Status
- **Backend:** Partially built — `training_calendar` table exists, `races` table exists, `athlete_profile_questions` table exists, basic calendar list/upsert endpoints exist
- **Frontend:** ❌ Not built — major new page + components needed
- **AI Integration:** ❌ Race analysis prompts not yet built

## Dependencies
- Benefits from: CP model (✅), Durability tracking (✅), Adaptive Zones (✅), Boosters library (✅)
- No hard blockers

## Reference Files (READ BEFORE BUILDING)
- `docs/AIM-FEATURE-SPECS-BATCH-1.md` → Feature 2 (complete spec — 5 phases, data model, AI prompts)
- `docs/AIM-SITE-MAP.md` → Page 4 (Training Calendar)
- `docs/AIM-ADAPTIVE-DASHBOARD-SPEC.md` → PRE_RIDE_PLANNED mode
- `api/calendar/` → Existing list and upsert endpoints
- `api/races/` → Existing race CRUD endpoints (parse, upsert, list, detail, analyze, training-plan, protocol, weather)

## Implementation Plan — 5 Phases

### Phase 1: Calendar View (Ship standalone — useful on its own)
**Files to create:**
- `src/pages/Calendar.jsx` — New route-level page
- `src/components/calendar/CalendarMonth.jsx` — Month grid view
- `src/components/calendar/CalendarWeek.jsx` — Week detail view
- `src/components/calendar/CalendarDayCell.jsx` — Individual day cell
- `src/components/calendar/WorkoutCard.jsx` — Planned/completed workout card
- `src/hooks/useCalendarData.js` — Data fetching hook

**Files to modify:**
- `src/App.jsx` — Add `/calendar` route
- Navigation — Add Calendar to nav bar

**Calendar has 3 views (tab switch at top):**

**Month View:**
```
┌─── March 2026 ──────────────────────────────────┐
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐             │
│ │  │ │🟢│ │  │ │🟡│ │  │ │🟢│ │🔴│             │
│ │  │ │Z2│ │  │ │SS│ │  │ │4h│ │Ra│             │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘             │
│ ...                                              │
└──────────────────────────────────────────────────┘

Legend: 🟢 = completed & hit targets
        🟡 = completed, partially hit targets
        🔴 = missed / race day
        Empty = rest day or unplanned
```

Each day cell shows:
- Color dot (completed status)
- Abbreviated workout type (Z2, SS, VO2, Race)
- Duration
- If race: race name in red/accent

**Week View:**
- 7 columns, one per day
- Each day shows full workout card(s): name, duration, TSS, intervals structure
- Completed activities show actual vs planned comparison
- Drag to reschedule (desktop only)

**List View:**
- Chronological list of upcoming planned workouts + past completed activities
- Filter: Upcoming | Past | All
- Each row: date, workout name, type, duration, TSS, status

**Data sources:**
- `GET /api/calendar/list?start=YYYY-MM-DD&end=YYYY-MM-DD` — planned workouts
- `GET /api/activities/list?start=YYYY-MM-DD&end=YYYY-MM-DD` — completed activities
- `GET /api/races/list` — races (shown as special events)

**Design specs:**
- Page background: `T.bg`
- Calendar grid: `T.card` background cells, `T.border` borders
- Today: highlighted with accent border or background tint
- Past days: slightly dimmed
- Race days: accent gradient border, race name in accent color
- View switcher: pill buttons (Month | Week | List) at top
- Month navigation: ← → arrows with month/year title
- Mobile: month view shows dots only (tap to expand day), week view is horizontal scroll

### Phase 2: Race Entry + AI Parser
**Files to create:**
- `src/components/calendar/AddRaceModal.jsx`
- `src/components/calendar/RaceCard.jsx` — Race event card in calendar

**"Add Race" flow:**
1. Button on calendar page: "+ Add Race"
2. Modal with single text input: "What races are you targeting?"
3. Athlete types natural language: "Amstel Gold Race on April 20 and Liège-Bastogne-Liège on April 27"
4. Call `POST /api/races/parse` — Claude AI parses:
   - Race name, date, location, distance, elevation, type (road/crit/gran fondo/TT/gravel)
   - Auto-resolves gender edition and year
   - Returns structured race data for confirmation
5. Show parsed races for confirmation: "Did I get these right?"
   - Race name, date, location, distance, elevation
   - Edit button for each field
6. On confirm: `POST /api/races/upsert` saves races
7. Races appear on calendar with countdown badge

**Dashboard countdown widget:**
- If races exist in the future, show a compact countdown on dashboard
- "42 days to Amstel Gold Race" with accent gradient text
- Placement: top of left column, below ReadinessCard (or integrated into ReadinessCard)

### Phase 3: Race Hub Page + AI Demands Analysis
**Files to create:**
- `src/pages/RaceHub.jsx` — Dedicated page per race
- `src/components/race/RaceDemands.jsx` — AI analysis of race demands
- `src/components/race/RaceGapAnalysis.jsx` — Athlete profile vs race demands
- `src/components/race/RaceWeather.jsx` — Weather forecast widget

**Route:** `/race/:id`

**Race Hub layout:**
```
┌─────────────────────────────────────┬──────────────┐
│ Race Header                         │ Countdown    │
│ Name, date, location, distance      │ 42 DAYS      │
├─────────────────────────────────────┤              │
│ Race Demands Analysis               │ Weather      │
│ AI breakdown of what this race      │ Forecast     │
│ requires (power, endurance,         │ (updates as  │
│ climbing, sprinting)                │ race nears)  │
├─────────────────────────────────────┤              │
│ Gap Analysis                        │              │
│ Your profile vs race demands        │              │
│ ✅ Threshold: strong                │              │
│ ⚠️ Climbing: needs work            │              │
│ ❌ Sprint: significant gap          │              │
├─────────────────────────────────────┤              │
│ Training Plan                       │              │
│ (Phase 4)                           │              │
├─────────────────────────────────────┤              │
│ Race-Day Protocol                   │              │
│ (Phase 5)                           │              │
└─────────────────────────────────────┴──────────────┘
```

**AI Demands Analysis (via `POST /api/races/analyze`):**
```json
{
  "demands": {
    "aerobic_threshold": { "importance": 5, "detail": "4.5+ hours at 65-75% FTP" },
    "climbing": { "importance": 4, "detail": "3,500m elevation, repeated 2-5 min climbs" },
    "surges": { "importance": 4, "detail": "40+ accelerations >120% FTP" },
    "sprint": { "importance": 3, "detail": "Final 800m sprint if in group" },
    "durability": { "importance": 5, "detail": "Must maintain power at >40 kJ/kg fatigue" }
  },
  "comparison_to_profile": [
    { "demand": "aerobic_threshold", "status": "strong", "detail": "Your CP of 285W supports this" },
    { "demand": "climbing", "status": "gap", "detail": "Your 5-min power needs +5% for key climbs" },
    { "demand": "sprint", "status": "major_gap", "detail": "Your 15s power is 20% below race demands" }
  ]
}
```

**Weather integration:**
- `GET /api/races/:id/weather` — Open-Meteo forecast
- Shows forecast accuracy indicator: "Forecast confidence: 72% (28 days out)"
- Auto-refreshes as race approaches (more accurate closer to race day)
- Weather impacts fueling recommendations

### Phase 4: Training Plan Generator
**Files to create:**
- `src/components/race/TrainingPlan.jsx`

**Two modes:**
1. **Detailed day-by-day plan** — Full structured plan from now to race day
2. **Weekly focus guidance** — Higher-level "what to focus on each week"

**AI generates plan via `POST /api/races/:id/training-plan`:**
- Input: race demands, athlete profile gaps, current fitness (CTL/ATL/TSB), available hours/week, other races
- Output: week-by-week plan with workout types, key sessions, volume targets
- Plan integrates with calendar — "Apply to Calendar" button adds workouts

**Plan display:**
- Accordion by week: "Week 1: Base Building" → expand to see daily workouts
- Each workout: name, type, duration, key targets
- Color-coded by workout type (Z2=blue, SS=orange, VO2=red, recovery=green)
- Weekly summary: total hours, TSS target, focus areas

### Phase 5: Race-Day Protocol Builder
**Files to create:**
- `src/components/race/RaceProtocol.jsx`

**Protocol sections:**
1. **Timeline checklist** (night before → pre-race → during → post-race)
2. **Nutrition plan** (hourly fueling targets adjusted for weather + duration)
3. **Warm-up protocol** (timing, intensity, duration)
4. **Pacing strategy** (zone targets for each race segment based on power profile)
5. **Booster integration** (links to Boosters library items the athlete uses)

**Booster safety flow (CRITICAL):**
- If protocol suggests a booster the athlete hasn't used: "Have you tried caffeine gels before?"
- If no: "Test this in training first. Never try new products on race day."
- Link to relevant Booster card with research and dosing information
- All booster suggestions use non-prescriptive language per No Medical Advice Policy

**Protocol is editable:**
- Athlete can customize times, swap items, add personal notes
- Checkable items (like a to-do list on race morning)
- Shareable: generate a clean PDF or link

## Progressive Profiling Sidebar (Cross-Cutting)
**Files to create:**
- `src/components/ProgressiveProfile.jsx`

**Contextual questions that appear in the right panel (max 1 per session):**
- "Do you have a power meter?" → informs prescription accuracy
- "What's your typical pre-race breakfast?" → informs nutrition protocol
- "How many hours can you train this week?" → informs plan generation
- Questions are contextual — only ask relevant questions based on what the athlete is looking at

**Data stored in `athlete_profile_questions` table.**

## Edge Cases
- **No races entered:** Calendar shows activities + planned workouts only. No race intelligence features. Prompt: "Add a target race to unlock AI race preparation."
- **Race already passed:** Move to "Past Races" section. Show post-race analysis if activity exists.
- **Multiple races close together:** AI should factor in recovery between races when generating plans.
- **Very long time to race (> 6 months):** Plan is higher-level (monthly focus areas, not daily workouts).
- **Very short time to race (< 2 weeks):** Plan switches to taper protocol.
- **Unknown race:** If AI can't identify the race, ask for manual input (distance, elevation, type).
- **Weather API unavailable:** Show "Weather forecast unavailable" gracefully.

## Testing Requirements
- **Must test:** Calendar renders correctly for month/week/list views
- **Must test:** Race AI parser correctly extracts race name, date, location
- **Must test:** Gap analysis compares race demands to athlete profile accurately
- **Should test:** Calendar drag-and-drop reorders workouts
- **Should test:** Protocol checklist state persists
- **E2E:** Add race → see it on calendar → open Race Hub → see demands analysis

## Success Metrics
- **Adoption:** >60% of athletes add at least one target race
- **Plan adherence:** Athletes with AI training plans show higher CTL gains than those without
- **Race-day protocol:** >80% of athletes with protocols report it was "useful" or "very useful"
- **Retention:** Calendar page becomes top-3 most visited page within 1 month of launch

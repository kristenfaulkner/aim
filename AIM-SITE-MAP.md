# AIM — Site Map & Page Structure

## Navigation

Top nav bar (always visible):
`[AIM logo]  Today  Performance  Health Lab  Connect  Settings  [sync status]  [avatar]`

---

## Page 1: Today (/)

The home screen. What you see every day when you open AIM. AI-first single-column layout.

> **Note:** The old two-column Dashboard is preserved at `/dashboard-legacy` for reference.

### Layout: Single-column AI-first centered layout (700px max-width)

```
┌───────────────────────────────────────────┐
│           TODAY (centered, 700px)          │
│                                           │
│  AI INTELLIGENCE (adaptive, full-width)   │
│  • Post-ride: analysis + insights         │
│  • Pre-ride: briefing + fueling plan      │
│  • No plan: AI coaching + recommendations │
│                                           │
│  READINESS CARD                           │
│  Ring + headline + weather + vitals       │
│                                           │
│  LAST RIDE (compact card)                 │
│  Name, date, 8 key metrics               │
│  "View Full Analysis →" button            │
│                                           │
│  WORKING GOALS                            │
│  Active goals with progress bars          │
│                                           │
│  ASK CLAUDE                               │
│  Freeform chat with full athlete context  │
└───────────────────────────────────────────┘
```

### AI Intelligence section:
- Adapts by dashboard mode (see AIM-ADAPTIVE-DASHBOARD-SPEC.md)
- POST_RIDE: Post-ride analysis, cross-domain insights, recovery actions
- PRE_RIDE_PLANNED: Pre-ride briefing, readiness check, fueling reminders
- DAILY_COACH: Full daily intelligence across all domains

### Working Goals:
- Active goals with progress bars, sparklines, weekly checklists
- Each goal expands to: Action Plan / Why It Matters / This Week
- Suggested goals from AIM with "+ Start This Goal"
- AI observations connecting compliance to results

### Ask Claude:
- Freeform chat with full athlete context
- Suggested questions based on recent data
- Streaming responses

---

## Page 2: Ride Detail (/activity/:id)

Deep dive into a single ride. You get here from:
- Clicking "View Full Analysis →" on the dashboard last ride card
- Clicking any ride in the activity list
- Direct link from a notification

### Layout: Two columns

```
┌─────────────────────────────────────┐ ┌──────────────────────┐
│  RIDE HEADER                        │ │  AI ANALYSIS PANEL   │
│  Name, date, map thumbnail          │ │  (sticky)            │
│  [Browse Activities dropdown]       │ │                      │
├─────────────────────────────────────┤ │  Post-ride summary   │
│  KEY METRICS (6 cards)              │ │  paragraph           │
│  NP | Avg Power | TSS              │ │                      │
│  EF | W/kg     | Avg HR            │ │  Category filters:   │
├─────────────────────────────────────┤ │  [All] [Performance] │
│  CHARTS (2 side by side)            │ │  [Recovery] [Train]  │
│  Power Duration Curve               │ │  [Environment]       │
│  Fitness/Fatigue/Form               │ │  [Health]            │
├─────────────────────────────────────┤ │                      │
│  NUTRITION LOG                      │ │  Expandable insight  │
│  What you ate (or prompt to log)    │ │  cards               │
│  Carbs/hr, total calories           │ │                      │
├─────────────────────────────────────┤ │                      │
│  USER NOTES                         │ │  ──────────────────  │
│  Text area, RPE slider, rating,     │ │  "Ask Claude about   │
│  tags                               │ │  this ride..."       │
├─────────────────────────────────────┤ └──────────────────────┘
│  FULL METRICS (collapsed by default)│
│  "Show All Metrics ▼"              │
│  Power, HR, Body/Weight, Ride      │
│  details — everything              │
├──────────────────┬──────────────────┤
│  POWER ZONES     │  ZONE            │
│  (Coggan)        │  DISTRIBUTION    │
│                  │  (bar chart)     │
└──────────────────┴──────────────────┘
```

### Nutrition Log Section
- If nutrition is already logged: show the parsed summary (items, carbs/hr, AI analysis)
- If not logged: show conversational prompt "How did you fuel this ride?"
  - Quick log: "Same as last ride?" one-tap
  - Text input: free-form, Claude parses + follow-ups
  - After confirming: shows the parsed summary inline

### User Notes Section
- Free-text area for personal notes
- Star rating (1-5)
- RPE slider (1-10)
- Tag input (freeform: 'race', 'group ride', 'knee pain', etc.)
- Auto-saves on change

---

## Page 3: Activity List (/activities)

Accessible from: Dashboard "Browse Activities" dropdown, or nav sub-menu.

- Paginated list of all activities
- Each row: date, name, duration, distance, NP, TSS, AI analysis preview (1 line)
- Filter by: date range, activity type, tags
- Sort by: date, TSS, distance, NP
- Click any row → goes to Ride Detail page

---

## Page 4: Training Calendar (/calendar)

Accessible from: Dashboard "This Week's Plan" card, or nav sub-menu.

- Weekly and monthly calendar views
- Planned workouts appear as cards on each day
- Completed workouts show actual vs planned (green if hit targets, yellow if close, red if missed)
- Drag to reschedule workouts
- Click a day to add a workout manually
- Click a workout to see structure, targets, fueling plan
- "Ask AIM to fill my week" button — AI generates a week of workouts based on goals, readiness trend, and available hours

---

## Page 5: Health Lab (/health-lab)

### Sub-sections (tabs within the page):

**Blood Work**
- Upload PDF → AI parses biomarkers
- Biomarker dashboard with trend charts over time
- Each biomarker: current value, athlete-optimal range, trend, AI interpretation
- Flagged values outside athlete-optimal range
- Cross-references with training data

**DEXA Scans**
- Upload PDF/image → AI parses body composition
- Body comp trends over time
- Regional breakdown (arms, legs, trunk)
- Performance implications (lean mass → W/kg)

**Overview**
- Combined health score / summary
- Key biomarker alerts
- "When to retest" recommendations

---

## Page 6: Connect Apps (/connect)

- Grid of all supported integrations with icons
- Each shows: connected/disconnected state, last sync time, sync status
- "Connect" button starts OAuth flow
- "Disconnect" button with confirmation
- "Request an Integration" form at bottom
- If user signed up via Strava SSO, Strava shows as already connected

Integrations:
Strava, Garmin, Wahoo, Whoop, Oura Ring, EightSleep, Withings,
TrainingPeaks, Zwift, TrainerRoad, Apple Health, MyFitnessPal,
Intervals.icu, Hammerhead, Supersapiens/Levels, Hexis

---

## Page 7: Settings (/settings)

### Sub-sections:

**Profile**
- Name, email, avatar
- DOB, sex, height, weight
- FTP, LTHR, Max HR
- Riding level, weekly hours, years cycling
- Primary terrain, primary discipline
- Goals (checkboxes)
- Menstrual cycle tracking opt-in

**Units & Zones**
- Metric / Imperial toggle
- Custom power zones (or Coggan defaults)
- Custom HR zones

**Notifications**
- Email digest frequency (daily, weekly, off)
- Push notifications (new insights, sync alerts, goal milestones)
- SMS alerts (critical only: race week reminders, red-flag health alerts)

**Subscription**
- Current plan, billing cycle
- Upgrade/downgrade
- Manage via Stripe portal

**Data & Privacy**
- Export my data
- Delete my account
- Connected apps management (links to /connect)

---

## Page 8: Landing Page (/landing or unauthenticated /)

- Hero section with headline + CTA
- "What AIM does" feature overview
- Integration logos
- How it works (3 steps)
- Sample AI insights (show real examples)
- Pricing table (3 tiers)
- Testimonials
- CTA footer

---

## Page 9: Auth (/auth)

- Sign up (email/password)
- Sign in
- SSO buttons: Google, Apple, Strava
- Forgot password
- After signup → Onboarding

---

## Page 10: Onboarding (/onboarding)

Multi-step form (after first signup):
1. Basic info (name, DOB, sex)
2. Body (height, weight)
3. Cycling profile (FTP, level, weekly hours, goals)
4. Female athlete options (cycle tracking opt-in, hormonal contraception)
5. Location (for weather integration — ask for permission)
6. → Redirect to Connect Apps page

---

## Contextual Modals / Slide-ups (not separate pages)

**Nutrition Logger**
- Triggered after a ride syncs ("How did you fuel this ride?")
- Or manually via "Log Nutrition" button on ride detail page
- Quick log, text input, follow-ups, parsed summary, confirm
- Slides up as a modal over the current page

**Workout Detail**
- When clicking a workout in the Training Calendar
- Shows structure, power targets, fueling plan, readiness check
- "Start Workout" and "Swap Workout" buttons

**Goal Detail**
- Expanding a working goal in the right panel already handles this
- No separate page needed

---

## URL Structure

```
/                     → Today (authenticated) or Landing (unauthenticated)
/dashboard-legacy     → Legacy two-column Dashboard (preserved for reference)
/performance          → Performance (analytics, charts, fitness/form)
/auth                 → Sign in / Sign up
/onboarding           → Post-signup profile setup
/connect              → Connect Apps
/activity/:id         → Ride Detail
/activities           → Activity List
/calendar             → Training Calendar
/health-lab           → Health Lab (Blood Work + DEXA)
/health-lab/blood     → Blood Work tab
/health-lab/dexa      → DEXA Scans tab
/settings             → Settings
/settings/profile     → Profile sub-section
/settings/billing     → Subscription sub-section
/pricing              → Pricing page (public)
/privacy              → Privacy policy (public)
/terms                → Terms of service (public)
```

---

## Mobile Layout Notes

On mobile (< 768px):
- Today page is already single-column (700px max-width), so it adapts naturally to mobile
- Content stacks vertically at full width
- Readiness card stays at top
- Charts are full width, single column
- Working Goals accessible via a floating button or tab bar

Consider a bottom tab bar on mobile:
`[Today] [Performance] [Health Lab] [Connect] [Settings]`
With the AI panel accessible via a floating "✦" button in bottom-right corner.

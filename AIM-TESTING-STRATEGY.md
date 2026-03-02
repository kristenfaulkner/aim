# AIM — Testing Strategy

## Overview

This document defines what to test, how to test it, and when. Claude Code should reference this when building any new feature — every feature ships with tests for its critical paths.

## Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests (fast, works with Vite) |
| React Testing Library | Component rendering and interaction tests |
| Playwright | End-to-end browser tests for critical user flows |
| MSW (Mock Service Worker) | Mock Supabase and external API responses in tests |

## Test File Convention

Tests live next to the code they test:

```
src/
  components/
    PowerProfileRadar.jsx
    PowerProfileRadar.test.jsx     ← component test
  lib/
    metrics.js
    metrics.test.js                ← unit test
  pages/
    Dashboard.jsx
    Dashboard.test.jsx             ← page-level test
tests/
  e2e/
    auth-flow.spec.js              ← end-to-end test
    strava-connect.spec.js
    dashboard-load.spec.js
```

## What to Test (By Priority)

### Priority 1: MUST TEST (breaks the product if wrong)

**Authentication:**
- Signup with email/password creates account and redirects to onboarding
- Signin with valid credentials works, invalid credentials show error
- Google/Apple/Strava SSO redirects correctly
- Protected routes redirect to signin when not authenticated
- Session persists across page refresh
- Logout clears session

**Strava Integration:**
- OAuth redirect URL is correctly formatted with all required params
- OAuth callback exchanges code for tokens and stores them
- Token refresh works when access token is expired
- Activity sync fetches and stores activities correctly
- Metric computation is accurate (NP, TSS, IF, VI, EF — these have exact formulas)

**AI Analysis:**
- Context payload builder includes all required data
- Claude API is called with correct system prompt and payload
- Analysis is stored in activities.ai_analysis
- UI shows loading state while analysis generates, then displays it
- Graceful error handling if Claude API fails

**Payments (when implemented):**
- Stripe checkout creates session correctly
- Webhook handler processes subscription events
- Feature gating enforces tier limits (free users can't access pro features)
- Subscription cancellation updates user tier

**Data Integrity:**
- RLS policies work — user A cannot see user B's data
- Duplicate activities aren't created (UNIQUE constraint on source + source_id)
- Metric calculations match expected values (write tests with known inputs/outputs)

**Adaptive Dashboard:**
- Mode detection returns correct mode (POST_RIDE when today's activity exists, PRE_RIDE_PLANNED when training_calendar has today's workout, DAILY_COACH otherwise)
- Readiness score calculation is correct and returns green/yellow/red
- Weather fetches from Open-Meteo API and caches in daily_metrics.weather_data
- Fueling plan calculation is correct (carbs/hr, fluid/hr adjust for temperature and intensity)
- Dashboard renders without crashing in all 3 modes
- Dashboard renders without crashing with zero data (new user, no rides, no integrations)

**Working Goals:**
- Goals CRUD works (create, read, update, archive)
- metric_history updates automatically when new data arrives (e.g., new 5-min power best updates VO2 goal)
- Suggested goals generate correctly when patterns are detected
- Weekly checklist state persists across sessions
- RLS: user can only see their own goals

**Nutrition Logger:**
- Raw text input is sent to Claude and parsed response is stored correctly
- Parsed items match expected macros for known products (Maurten 320 = 80g carbs per serving)
- Carbs per hour calculation is correct (total carbs / ride duration in hours)
- Quick log ("same as last ride") copies previous nutrition_log correctly
- Nutrition log links to correct activity_id

### Priority 2: SHOULD TEST (bad UX if wrong)

**Dashboard:**
- Loads without crashing with zero data (new user)
- Loads without crashing with full data
- Charts render with correct data
- AI insights display and filtering works
- Mobile layout renders correctly at 375px width
- Readiness ring animates and shows correct score
- Action items tabs switch correctly (Today / This Week / Big Picture)
- Right panel tabs switch correctly (Today's Intelligence / Working Goals / Ask Claude)
- Last ride card displays correct metrics and links to ride detail page

**Working Goals UI:**
- Goal cards expand/collapse correctly
- Inner tabs switch (Action Plan / Why It Matters / This Week)
- Weekly checklist items toggle on/off
- Suggested goals appear and "+ Start This Goal" moves them to active
- Progress bar and sparkline render with correct data
- "Add Goal" button opens custom goal creation

**Nutrition Logger UI:**
- Quick log shows previous ride's items correctly
- "Same as last time" button saves and closes modal
- Text input submits and shows follow-up questions
- Follow-up option pills are tappable, custom input works
- "Skip — estimate for me" option works
- Parsed summary shows correct totals and carbs/hr
- "Confirm & Save" stores to database and closes modal

**Ride Detail Page:**
- Loads separately from dashboard (at /activity/:id)
- Displays all metrics correctly
- User notes save and persist
- AI analysis panel loads async
- Star rating and RPE save correctly
- Nutrition log section shows logged data or prompt to log
- "Show All Metrics" toggle expands full metrics table

### Priority 3: NICE TO TEST (polish)

- Boosters page renders all 12 boosters with correct data
- Health Lab upload flow works end-to-end
- Light theme is consistent across all pages (no dark theme remnants)
- Animations don't cause layout shifts
- No console errors on any page
- Training Calendar renders planned vs completed workouts correctly
- Weather pill displays correct data and handles API failures gracefully
- Onboarding location permission step works and stores lat/lng
- Connect Apps shows correct connected/disconnected state
- Onboarding form validates correctly and saves to Supabase

## Metric Calculation Tests (Critical)

These are exact formulas — write tests with known inputs and verify outputs:

```javascript
// Example test: Normalized Power calculation
test('calculates NP correctly from power stream', () => {
  // 30-second rolling average, then raise to 4th power, average, take 4th root
  const powerStream = [200, 210, 205, 195, 200, ...]; // known data
  expect(calculateNP(powerStream)).toBeCloseTo(expectedNP, 1);
});

// Example test: TSS calculation
test('calculates TSS from NP, IF, and duration', () => {
  const NP = 287;
  const FTP = 298;
  const durationSeconds = 3600;
  const IF = NP / FTP;
  const expectedTSS = (durationSeconds * NP * IF) / (FTP * 3600) * 100;
  expect(calculateTSS(NP, FTP, durationSeconds)).toBeCloseTo(expectedTSS, 1);
});

// Example test: Efficiency Factor
test('calculates EF as NP / avgHR', () => {
  expect(calculateEF(287, 155)).toBeCloseTo(1.85, 2);
});

// Example test: Dashboard mode detection
test('returns POST_RIDE when activity exists today', () => {
  const todayActivity = { started_at: new Date().toISOString() };
  expect(getDashboardMode({ todayActivity, plannedWorkout: null })).toBe('POST_RIDE');
});

test('returns PRE_RIDE_PLANNED when workout scheduled but not done', () => {
  const plannedWorkout = { date: today, completed: false };
  expect(getDashboardMode({ todayActivity: null, plannedWorkout })).toBe('PRE_RIDE_PLANNED');
});

test('returns DAILY_COACH when no activity and no plan', () => {
  expect(getDashboardMode({ todayActivity: null, plannedWorkout: null })).toBe('DAILY_COACH');
});

// Example test: Fueling plan calculation
test('calculates carbs/hr correctly for high intensity', () => {
  expect(calculateCarbsPerHour('high')).toBe(90);
});

test('increases fluid recommendation above 25°C', () => {
  const cool = calculateFluidPerHour(18); // 600ml
  const hot = calculateFluidPerHour(30);  // 900ml
  expect(hot).toBeGreaterThan(cool);
});

// Example test: Nutrition parsing
test('calculates carbs per hour from total and duration', () => {
  expect(calculateCarbsPerHourFromLog(388, 7.02)).toBeCloseTo(55.3, 0);
});
```

## End-to-End Test Flows (Playwright)

### Flow 1: New User Signup → Dashboard
1. Navigate to landing page
2. Click "Get Started"
3. Fill signup form, submit
4. Complete onboarding profile
5. Arrive at Connect Apps page
6. Skip connections, go to Dashboard
7. Verify dashboard loads with empty state

### Flow 2: Strava Connect → Activity Sync
1. Sign in as test user
2. Go to Connect Apps
3. Click "Connect Strava" (mock the OAuth redirect)
4. Verify Strava shows as connected
5. Trigger sync (mock Strava API responses)
6. Verify activity appears in dashboard

### Flow 3: Activity → AI Analysis
1. Sign in as test user with existing activities
2. Open an activity detail
3. Verify metrics display correctly
4. Verify AI analysis loads (mock Claude API response)
5. Add a note, verify it saves

### Flow 4: Dashboard Adaptive Modes
1. Sign in as test user with no activities today, no planned workout
2. Verify dashboard shows DAILY_COACH mode (AI recommendations, working goals)
3. Add a planned workout to training_calendar for today
4. Refresh — verify dashboard shows PRE_RIDE_PLANNED mode (workout card, fueling plan)
5. Create an activity with today's date
6. Refresh — verify dashboard shows POST_RIDE mode (ride analysis, recovery actions)

### Flow 5: Nutrition Logger
1. Sign in as test user with a completed ride and no nutrition log
2. Verify nutrition prompt appears ("How did you fuel this ride?")
3. Type plain text: "2 bottles maurten, 1 gel, banana"
4. Verify follow-up questions appear (bottle size options)
5. Select an option
6. Verify parsed summary shows correct carbs/hr
7. Click "Confirm & Save"
8. Verify nutrition log appears on ride detail page

### Flow 6: Working Goals
1. Sign in as test user
2. Navigate to Working Goals tab in right panel
3. Verify suggested goals appear
4. Click "+ Start This Goal" on a suggested goal
5. Verify it moves to active goals with progress bar
6. Expand the goal, check a weekly checklist item
7. Refresh — verify checklist state persists

## Mock Data

Create a `tests/fixtures/` folder with:

```
tests/
  fixtures/
    mock-profile.json          — sample athlete profile
    mock-activities.json       — 5-10 sample activities with all fields
    mock-daily-metrics.json    — 30 days of daily metrics
    mock-power-profile.json    — sample power profile
    mock-strava-activity.json  — raw Strava API response
    mock-strava-streams.json   — raw Strava streams response
    mock-blood-panel.json      — sample blood work results
    mock-claude-analysis.json  — sample AI analysis response
    mock-working-goals.json    — sample active + suggested goals with all fields
    mock-nutrition-log.json    — sample parsed nutrition items with macros
    mock-training-calendar.json — sample week of planned workouts
    mock-weather.json          — sample Open-Meteo API response
```

Use these fixtures consistently across all tests so results are predictable.

## Running Tests

```bash
# Unit and component tests
npm run test              # runs Vitest in watch mode
npm run test:ci           # runs once for CI/CD

# End-to-end tests
npm run test:e2e          # runs Playwright tests

# Coverage report
npm run test:coverage     # shows which code is tested
```

## When to Write Tests

**Every new feature should include tests for its Priority 1 items.** The workflow is:

1. Build the feature
2. Write tests for the critical paths (auth, data flow, calculations)
3. Run tests to verify they pass
4. If a bug is found later, write a test that reproduces it FIRST, then fix it

Claude Code should follow this pattern automatically when building features — after completing a feature, write and run tests for its critical paths before moving on.

## CI/CD Integration (Future)

When we set up GitHub Actions:
- Run `npm run test:ci` on every pull request
- Run `npm run test:e2e` on merges to main
- Block deploys if tests fail

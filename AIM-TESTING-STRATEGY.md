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

### Priority 2: SHOULD TEST (bad UX if wrong)

**Dashboard:**
- Loads without crashing with zero data (new user)
- Loads without crashing with full data
- Charts render with correct data
- AI insights display and filtering works
- Mobile layout renders correctly at 375px width

**Onboarding:**
- All form fields validate correctly (DOB format, weight range, etc.)
- Profile saves to Supabase
- Redirect to Connect Apps after completion
- Partially completed profile can be resumed

**Connect Apps:**
- Shows correct connected/disconnected state for each integration
- Disconnect removes tokens from integrations table
- Strava shows as connected if user signed up via Strava SSO

**Activity Detail:**
- Displays all metrics correctly
- User notes save and persist
- AI analysis panel loads async
- Star rating and RPE save correctly

### Priority 3: NICE TO TEST (polish)

- Boosters page renders all 12 boosters with correct data
- Health Lab upload flow works end-to-end
- Dark theme is consistent across all pages
- Animations don't cause layout shifts
- No console errors on any page

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

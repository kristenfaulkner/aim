# BUILD PLAN: Travel & Altitude Status Card

## Feature Summary
**What:** A conditional dashboard card that appears when AIM auto-detects travel (>200km between consecutive activities). Shows timezone shift, altitude change, jet lag recovery timeline, altitude acclimation progress, and estimated power penalty. Auto-dismisses when recovery is complete.

**Why it matters:** Travel is one of the most overlooked performance disruptors. A 6-hour timezone shift can take 3-5 days to recover from. Altitude above 1,500m causes immediate power loss of 2-5%. Athletes who don't account for this misinterpret their training data — they think they're losing fitness when they're just jet-lagged or altitude-impaired. AIM's ability to automatically detect travel from GPS data and adjust all recommendations accordingly is a major trust-builder: "AIM knows I'm in Colorado and adjusted my zone targets down 3%."

**Who cares:**
- **Athletes:** Travel frequently for races and training camps. Need to know when they're "back to normal" and how to modify training during acclimation.
- **Coaches:** Need to plan training around travel disruption. Can't just follow the same plan when the athlete flew from NYC to Denver yesterday.
- **Teams:** Track team-wide travel patterns before major races. Ensure everyone arrives early enough to acclimate.

**Competitive differentiation:** No competing platform auto-detects travel from activity GPS data. Strava doesn't know you traveled. Whoop tracks jet lag but doesn't connect it to cycling power output. AIM combines travel detection + altitude science + recovery device data + cycling analytics into one intelligent card.

**Stickiness:** The card creates an "AIM noticed something I didn't" moment. Athletes feel monitored in a good way — like having a coach who tracks everything.

## Status
- **Backend:** ✅ Complete — `travel_events` table, auto-detection from GPS, jet lag/altitude calculations
- **Frontend:** ❌ Not built — needs card component + conditional dashboard rendering
- **AI Integration:** ✅ Travel data included in AI context (Category 27)

## Dependencies
- None — backend is ready

## Reference Files (READ BEFORE BUILDING)
- `docs/AIM-DESIGN-BIBLE.md` → Section 7.3 (Travel Status Card design spec)
- `docs/AIM-EXPANSION-SPEC.md` → Travel & Timezone Detection section
- `api/_lib/travel.js` → Travel detection pure functions (haversine, timezone shift, altitude penalty)
- `src/theme/tokens.js` → Design tokens
- `src/hooks/useResponsive.js` → Responsive breakpoints

## Implementation Plan

### Phase 1: TravelStatusCard Component
**Files to create:**
- `src/components/dashboard/TravelStatusCard.jsx`

**Data source:** Query `travel_events` for the most recent event where recovery is still in progress (jet lag days remaining > 0 OR altitude acclimation day < 14).

**Card has two states:**

**Collapsed state (default):**
- Single row: ✈️ icon + destination city + "Day X" + most impactful metric
- Example: "✈️ Denver — Day 3 • -2.1% power"
- Click/tap to expand

**Expanded state:**
- **Header:** Travel icon + "Travel Detected — {origin} → {destination}"
- **Timezone section** (only if shift > 0):
  - Clock icon + "Timezone: {shift}h shift"
  - Recovery progress: "Day X of Y" with mini progress bar
  - Color: starts red, transitions through yellow to green as days pass
- **Altitude section** (only if altitude change > 500m):
  - Mountain icon + "Altitude: {meters}m"
  - Power penalty: "-{X}% estimated power"
  - Acclimation progress bar: "Day X of 14" with 14-segment bar
  - Color: red → yellow → green as acclimation progresses
- **Footer note:** "Your AI coach factors this into all recommendations."

**Design specs:**
- Card: `T.card` background, `borderRadius: 16px`, `border: 1px solid ${T.border}`, `padding: 16px 20px`
- Collapsed: compact single row, 48px total height
- Expanded: smooth height transition (300ms ease)
- Travel icon: ✈️ for flights, 🚗 for drives
- Progress bars: 6px height, `T.surface` background, colored fill
- Power penalty number: `T.mono` font, red/yellow color based on severity
- Acclimation bar: 14 small segments, filled segments are colored, unfilled are `T.surface`
- Card placement: Dashboard left column, between ReadinessCard and LastRideCard (only when active)
- Animation: card slides in from top when first detected, fades out when recovery complete

### Phase 2: Dashboard Integration
**Files to modify:**
- `src/pages/Dashboard.jsx` — Conditionally render TravelStatusCard
- `src/hooks/useDashboardData.js` — Add travel events query

**Logic:**
1. Query most recent `travel_events` where `recovery_complete = false` or acclimation still in progress
2. If active travel event exists, render TravelStatusCard between ReadinessCard and LastRideCard
3. If no active travel, don't render anything (no empty state needed)

### Phase 3: Altitude Power Penalty Visualization
**Enhancement to TravelStatusCard:**
- Show a mini chart of expected power recovery over 14 days
- X-axis: days 1-14, Y-axis: power penalty %
- Current day highlighted with a dot
- Helps athletes visualize: "In 5 more days, I'll be back to -1% instead of -3%"

## Edge Cases
- **No GPS data:** If activities don't have GPS (indoor trainer), travel can't be auto-detected. Show nothing.
- **Short trips:** Trips < 200km are filtered out by the backend. No card for in-city rides.
- **Multiple trips in quick succession:** Show only the most recent. If NYC→Denver→LA, show LA status.
- **Return home:** When the athlete returns to their home timezone/altitude, start a new recovery window or close the card.
- **Manual timezone in profile:** If the athlete's profile timezone doesn't match GPS-detected timezone, flag the discrepancy.

## Testing Requirements
- **Must test:** Card appears when active travel event exists, hidden when no active travel
- **Must test:** Collapsed → expanded toggle works
- **Should test:** Progress bars render correctly for various day counts
- **Should test:** Power penalty displays correctly for various altitudes
- **Mock:** MSW handler for travel events endpoint

## Success Metrics
- **Accuracy:** Athletes report travel card matches their actual travel >90% of the time
- **Trust:** Athletes who see the travel card rate AIM's AI insights as more trustworthy (survey)
- **Engagement:** Card has >60% expand rate when shown (athletes are curious about the details)

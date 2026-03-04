# BUILD PLAN: Cross-Training Logger UI

## Feature Summary
**What:** A quick-entry modal for logging non-cycling sessions (strength, yoga, swimming, hiking, pilates) with enough detail for AI to assess recovery impact on cycling performance. Entry takes < 30 seconds.

**Why it matters:** Serious cyclists don't just cycle. They do gym sessions, yoga, swimming, hiking — all of which affect cycling recovery and performance. Currently AIM has a blind spot: an athlete does heavy squats on Monday, and AIM has no idea why their power is down on Tuesday. With cross-training data, AIM can say "Your 5-min power was 8% below baseline today, likely due to yesterday's lower body strength session. This is expected — neuromuscular recovery takes 36-48 hours after heavy lifting."

**Who cares:**
- **Athletes:** Want their "complete training picture" in one place. Hate that gym sessions are invisible to their cycling analytics.
- **Coaches:** Need to see the full training load, not just bike hours. A coach who doesn't know their athlete did heavy deadlifts yesterday can't explain why today's intervals felt heavy.
- **Teams:** Cross-training compliance tracking — are athletes following their strength program?

**Competitive differentiation:** Strava only tracks GPS activities. TrainingPeaks requires manual TSS entry for gym work. AIM auto-computes estimated TSS AND recovery impact from a simple 30-second entry, and the AI factors it into every subsequent analysis. No other platform connects gym sessions to cycling performance this seamlessly.

**Stickiness:** Once athletes see AIM explain "yesterday's strength session is why your legs felt heavy today," they'll always log their gym work. The feedback loop is immediate and tangible.

## Status
- **Backend:** ✅ Complete — `POST /api/cross-training/log`, `GET /api/cross-training/list`, `cross_training_log` table exists
- **Frontend:** ❌ Not built — needs modal component + dashboard integration
- **AI Integration:** ✅ Cross-training data already included in AI context (Category 28)

## Dependencies
- None — backend is ready, pure frontend work

## Reference Files (READ BEFORE BUILDING)
- `docs/AIM-DESIGN-BIBLE.md` → Section 7.2 (Cross-Training Logger design spec)
- `docs/AIM-EXPANSION-SPEC.md` → Cross-Training Logger section (data model, recovery impact logic)
- `docs/ENGINEERING-STANDARDS.md` → Component rules, modal patterns
- `src/components/dashboard/NutritionLogger.jsx` → Reference for modal flow pattern
- `src/components/dashboard/CheckInModal.jsx` → Reference for quick-entry modal (build after Feature 01)
- `src/theme/tokens.js` → Design tokens
- `src/hooks/useResponsive.js` → Responsive breakpoints

## Implementation Plan

### Phase 1: CrossTrainingLogger Component
**Files to create:**
- `src/components/dashboard/CrossTrainingLogger.jsx`

**Component structure — single-screen modal (not multi-stage):**

1. **Activity Type Selector** — 6 icon cards in a 3x2 grid:
   - 🏋️ Strength → shows body region sub-selector
   - 🧘 Yoga
   - 🏊 Swimming
   - 🥾 Hiking
   - 🤸 Pilates
   - ⚡ Other

   Each is a tappable card (80x80px) with icon + label. Selected card gets accent border + subtle accent background.

2. **Body Region** (conditional — only shows when Strength is selected):
   - 3 pill buttons: Upper Body | Lower Body | Full Body | Core
   - Important for recovery impact: lower body strength has much higher impact on cycling than upper body

3. **Perceived Intensity** — 5 tappable circles (same pattern as Check-In):
   - 1 = Easy, 2 = Light, 3 = Moderate, 4 = Hard, 5 = Max Effort
   - Color: green → yellow → red

4. **Duration** — Simple number input with "min" suffix:
   - Pre-populated with common defaults by type (Strength: 60, Yoga: 45, Swimming: 30)
   - Large, centered number with +/- buttons for easy adjustment

5. **Notes** (optional) — Single-line text input: "Any details? (optional)"

6. **Date** — Defaults to today, small date picker if they need to backfill

7. **Save** button → POST to `/api/cross-training/log`

**After save — confirmation card shows:**
- Activity icon + type + duration
- "Estimated TSS: ~45" (computed by backend)
- Recovery Impact badge: colored pill (None=green, Minor=blue, Moderate=yellow, Major=red)
- Message: "This session will have a **moderate** impact on tomorrow's cycling performance"
- "Done" button to close

**Design specs:**
- Modal overlay: `rgba(0,0,0,0.5)` backdrop
- Modal card: `T.card` background, `borderRadius: 20px`, `padding: 28px`, max-width 480px desktop
- Mobile: full-screen modal
- Activity type grid: 3 columns, 16px gap, cards have `T.surface` background, 12px border-radius
- Selected card: `T.accentDim` background, `T.accent` border
- Duration input: large centered number in `T.mono` 28px, +/- buttons are 44px touch targets
- Save button: gradient background, same as Check-In modal
- Recovery impact badge: pill shape, 12px font, color-coded background at 0.1 opacity + colored text

### Phase 2: Dashboard Integration
**Files to modify:**
- `src/pages/Dashboard.jsx` — Add trigger button for CrossTrainingLogger

**Trigger placement:**
- Add a small "+" button or "Log Cross-Training" action alongside the NutritionLogger trigger
- Could be a row of quick-action buttons below the ReadinessCard: [📋 Check-In] [🍎 Log Nutrition] [🏋️ Log Training]
- Or a floating action button (FAB) that expands to show options

### Phase 3: Recent Cross-Training Display
**Files to create:**
- Small "Recent Cross-Training" section visible on Dashboard when entries exist in the last 7 days

**Display:**
- Compact list below the TrainingWeekChart or in a mini-card
- Each entry: icon + type + duration + recovery impact badge + date
- Weekly summary: "3 sessions this week • ~92 estimated TSS"
- Tappable entries for quick edit/delete

### Phase 4: Integration with Training Load
**Files to modify:**
- `src/components/dashboard/TrainingWeekChart.jsx` — Show cross-training TSS as a different-colored segment in the daily bars

**Visual:**
- Cycling TSS shown in accent green
- Cross-training estimated TSS shown in blue or purple, stacked on top
- Legend shows both categories
- This gives athletes a complete picture of their weekly training load

## Edge Cases
- **Duplicate entry:** Allow multiple entries per day (e.g., morning swim + afternoon gym). Each is a separate row.
- **Edit/delete:** Tapping a recent entry opens it for editing. Swipe-left to delete (mobile) or hover delete icon (desktop).
- **Zero duration:** Don't allow save with 0 minutes. Show validation message.
- **No activity type selected:** Don't allow save without selecting a type. Highlight the grid.
- **Rapid re-entry:** After saving, show a "Log another?" link on the confirmation card.
- **Offline:** Queue the entry and save when connection returns. Show "Saved locally" indicator.

## Testing Requirements
- **Must test:** POST request sends correct payload (activity_type, body_region, intensity, duration, notes, date)
- **Must test:** Body region selector only appears for Strength type
- **Must test:** Confirmation shows computed TSS and recovery impact from API response
- **Should test:** Duration defaults change based on activity type
- **Should test:** Responsive layout — grid collapses gracefully on mobile
- **Mock:** MSW handler for `POST /api/cross-training/log` returning `{ estimated_tss: 45, recovery_impact: 'moderate' }` and `GET /api/cross-training/list` returning recent entries

## Success Metrics
- **Adoption:** >30% of athletes who do cross-training log at least one session per week
- **Correlation:** AI insights referencing cross-training get positive feedback >70% of the time
- **Completeness:** Athletes who log cross-training have more accurate readiness scores (lower prediction error)

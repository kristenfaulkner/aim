# BUILD PLAN: Daily Check-In Modal

## Feature Summary
**What:** A 15-second morning check-in that captures 4 subjective scores (life stress, motivation, muscle soreness, mood) on a 1-5 scale. Appears as an interstitial modal on Dashboard load when today's check-in hasn't been completed. After submission, scores blend into the readiness calculation and feed every AI analysis going forward.

**Why it matters:** This is the single highest-leverage data addition to AIM. Devices capture physiology — but the #1 predictor of whether an athlete has a good training day isn't HRV. It's the combination of life stress, sleep perception, motivation, and muscle readiness. Every world-class coach asks some version of these 4 questions every morning. No competing platform captures this data and correlates it with performance outcomes.

After 60-90 days of data, AIM can build personal models: "When your life stress is >3 AND motivation is <3, your interval execution drops 11%. Consider swapping to endurance or rest." That's an insight no wearable can ever produce. This is the AIM moat — combining subjective human context with objective device data.

**Who cares:**
- **Athletes:** Want to feel heard. Logging how they feel creates a sense of active participation in their training — not just passive data collection. The feedback loop ("you said you were sore and your HRV confirms it") builds enormous trust.
- **Coaches:** The daily check-in is coaching 101. Every structured coaching program starts with "how do you feel today?" AIM digitizes this ritual and makes it queryable.
- **Teams:** Team managers can spot patterns: "3 riders reported high stress this week before the big race — morale intervention needed."

**Competitive differentiation:** Whoop has a journal with similar questions but doesn't correlate answers with cycling-specific performance metrics. TrainingPeaks has no subjective data. Strava has no daily check-in. AIM is the only platform that blends subjective check-in data with cross-domain device data (sleep, HRV, power, weather, nutrition) to produce personalized subjective-objective models.

**Stickiness:** The check-in creates a daily ritual — the first thing athletes do every morning is open AIM and answer 4 questions. This is the most powerful retention mechanism in consumer health apps (see: Whoop's daily strain question, Noom's daily weigh-in). After 30 days of consistent check-ins, AIM starts surfacing trend insights ("Your motivation has averaged 4.2 on weeks you sleep >7h vs 2.8 on weeks below 6h"). These insights reward the habit and reinforce the ritual.

## Status
- **Backend:** ✅ Complete — `POST /api/checkin/submit`, `GET /api/checkin/status`, `daily_metrics` columns exist (life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at)
- **Frontend:** ❌ Not built — needs modal component + dashboard integration + post-submission state
- **AI Integration:** ✅ Subjective data already included in AI context payload (7-day and 30-day rolling averages, Category 23: Subjective-Objective Alignment)

## Dependencies
- None — backend is ready, this is pure frontend work
- **Enhances:** ReadinessCard (blended score), AI Analysis (richer context), Training Prescription (readiness adjustment)

## Reference Files (READ BEFORE BUILDING)
- `docs/AIM-DESIGN-BIBLE.md` → Section 7.1 (Daily Check-In Modal design spec — both Option A and B)
- `docs/AIM-EXPANSION-SPEC.md` → Priority 1: Subjective Daily Check-In System (full data model, readiness blending, AI context)
- `docs/AIM-ADAPTIVE-DASHBOARD-SPEC.md` → Dashboard mode detection (check-in feeds readiness which affects mode)
- `docs/ENGINEERING-STANDARDS.md` → Component rules, modal patterns, slider pattern
- `src/components/dashboard/NutritionLogger.jsx` → Reference for multi-stage modal pattern
- `src/components/SessionNotes.jsx` → Reference for slider/rating UI pattern
- `src/theme/tokens.js` → Design tokens (T object)
- `src/hooks/useResponsive.js` → Responsive breakpoints

## Design Decision: Interstitial Modal (Option A)

**Rationale:** The interstitial modal (Option A from the Design Bible) is the correct choice over the inline card (Option B). Here's why:

1. **Completion rate:** Interstitial modals achieve 60-80% completion vs 20-30% for inline cards (users scroll past inline content)
2. **Ritual creation:** The modal creates a deliberate pause — "before you see your data, tell us how you feel." This mirrors the coaching ritual of checking in before training
3. **Data quality:** When athletes must actively engage (vs passively scroll past), they give more thoughtful responses
4. **Precedent:** Whoop's daily strain survey, TeamBuildr's readiness check, and HRV4Training all use interstitial patterns with >70% daily completion rates
5. **Skip option:** "Skip for now" link ensures it never feels coercive — just encouraged

The modal should feel warm, quick, and rewarding — not like a chore or a barrier.

## Implementation Plan

### Phase 1: CheckInModal Component
**Files to create:**
- `src/components/dashboard/CheckInModal.jsx`

**Component architecture:**

```
CheckInModal
├── Overlay (backdrop)
├── Modal Card
│   ├── Greeting ("Good morning, {firstName}")
│   ├── Subtitle ("Quick check-in — how are you feeling?")
│   ├── 4 Rating Rows:
│   │   ├── Emoji + Label
│   │   ├── 5 Tappable Circles (1-5)
│   │   └── Endpoint Labels ("None" ← → "Overwhelming")
│   ├── Save Button ("Save & Continue")
│   └── Skip Link ("Skip for now")
└── Success State (brief confirmation before dismiss)
```

**The 4 rating rows:**

| Field | Emoji | Label | Scale 1→5 | Invert for Readiness? |
|-------|-------|-------|-----------|----------------------|
| Life Stress | 🧠 | Life Stress | None → Overwhelming | YES (1=good for readiness) |
| Motivation | 🔥 | Motivation | Very Low → Fired Up | NO (5=good for readiness) |
| Muscle Soreness | 💪 | Muscle Soreness | None → Very Sore | YES (1=good for readiness) |
| Mood | 😊 | Mood | Poor → Excellent | NO (5=good for readiness) |

**Each rating row — 5 tappable circles:**
- Unselected: `T.surface` background, `T.border` border, 36px diameter (44px touch target)
- Selected: color fill based on value + slightly larger (40px)
- Color scale: Value 1→5 maps to semantic meaning per field:
  - Life Stress: green(1) → yellow(3) → red(5) — low stress is good
  - Motivation: red(1) → yellow(3) → green(5) — high motivation is good
  - Muscle Soreness: green(1) → yellow(3) → red(5) — no soreness is good
  - Mood: red(1) → yellow(3) → green(5) — good mood is good
- Number labels inside each circle (1, 2, 3, 4, 5)
- Endpoint text labels below the row on left and right sides

**Design specs:**
- Overlay: `rgba(0, 0, 0, 0.5)`, click-outside does NOT dismiss (intentional — encourage completion)
- Modal card: `T.card` background, `borderRadius: 20px`, `padding: 32px`, `maxWidth: 460px`, centered vertically and horizontally
- Greeting: `fontSize: 22px`, `fontWeight: 700`, `fontFamily: T.font`, `color: T.text`
- Subtitle: `fontSize: 14px`, `fontWeight: 400`, `color: T.textSoft`, `marginBottom: 28px`
- Rating rows: 20px vertical gap between each row
- Each row: emoji (24px) + label (14px, 600 weight) on left, 5 circles on right
- Save button: full-width, `background: linear-gradient(135deg, #10b981, #3b82f6)`, `color: white`, `borderRadius: 12px`, `padding: 14px`, `fontSize: 16px`, `fontWeight: 600`, `marginTop: 24px`
- Save button disabled state: `opacity: 0.5`, not clickable, until at least 1 field has a value (but don't require all 4 — partial check-ins are fine)
- Skip link: centered below button, `fontSize: 13px`, `color: T.textDim`, underline on hover, `marginTop: 12px`
- Mobile: full-screen modal (`width: 100%`, `height: 100vh`, `borderRadius: 0`, `padding: 24px`), rating circles are 44px touch targets

**Success state (after save, shown for 1.5 seconds before auto-dismiss):**
- Checkmark animation (CSS-only, green circle expanding with checkmark drawing)
- "You're all set!" text
- Brief readiness preview: "Your readiness: 78 (blended with device data)"
- Auto-dismisses after 1.5 seconds → loads dashboard

**Animations:**
- Modal enters: fade-in overlay (200ms) + slide-up card (300ms, ease-out)
- Circle selection: scale bounce (transform: scale(1.15) → scale(1), 150ms)
- Success state: checkmark draws (400ms SVG animation)
- Modal exit: slide-down + fade-out (250ms)

### Phase 2: Dashboard Integration
**Files to modify:**
- `src/pages/Dashboard.jsx` — Add check-in status query + conditional modal render
- `src/hooks/useDashboardData.js` — Add check-in status to parallel queries

**Logic:**
```javascript
// In useDashboardData.js, add to parallel queries:
const checkinPromise = apiFetch('/api/checkin/status');

// In Dashboard.jsx:
const [showCheckIn, setShowCheckIn] = useState(false);

useEffect(() => {
  if (dashboardData.checkinStatus && !dashboardData.checkinStatus.completed) {
    // Small delay so dashboard layout renders first, then modal appears
    const timer = setTimeout(() => setShowCheckIn(true), 500);
    return () => clearTimeout(timer);
  }
}, [dashboardData.checkinStatus]);

// Render:
{showCheckIn && (
  <CheckInModal
    athleteName={profile.full_name?.split(' ')[0] || 'there'}
    onComplete={(scores) => {
      setShowCheckIn(false);
      // Refresh readiness data to reflect new blended score
      refreshDashboardData();
    }}
    onSkip={() => setShowCheckIn(false)}
  />
)}
```

**Important behaviors:**
- Modal appears 500ms after dashboard loads (allows layout to settle, prevents jarring flash)
- If athlete navigates away and back to dashboard, modal re-appears if still not completed
- Modal does NOT show if:
  - Today's check-in is already completed (`checkin_completed_at` is today)
  - User is in incognito/demo mode
  - User's `user_settings` has `show_daily_checkin: false` (future opt-out, not implemented yet)

### Phase 3: Readiness Score Blending
**Files to modify:**
- `src/components/dashboard/ReadinessCard.jsx` — Show subjective component in readiness display

**After check-in submission:**
- ReadinessCard should show a new "Subjective" pill alongside Sleep, HRV, RHR, Recovery
- Pill shows blended subjective score (1-5 → mapped to 0-100)
- Pill color: green (score ≥ 4), yellow (2.5-3.9), red (< 2.5)
- Tooltip: "Based on your morning check-in: Stress 2, Motivation 4, Soreness 1, Mood 5"

**Blending formula (matches expansion spec):**
```javascript
// Normalize subjective to 0-100 scale:
// Invert stress and soreness (low = good)
const subjectiveScore = (
  (6 - lifeStress) +     // invert: 5→1, 1→5
  motivation +
  (6 - muscleSoreness) +  // invert: 5→1, 1→5
  mood
) / 4; // gives 1-5 scale

const normalized = ((subjectiveScore - 1) / 4) * 100; // maps 1-5 → 0-100

// Blend: 70% device, 30% subjective
const blendedReadiness = subjectiveScore
  ? (deviceReadiness * 0.7) + (normalized * 0.3)
  : deviceReadiness;
```

### Phase 4: Post-Check-In Dashboard State
**Files to modify:**
- `src/pages/Dashboard.jsx` — Show check-in summary card when completed

**After submission, replace the modal trigger with a compact summary card at the top of the left column:**

```
┌─────────────────────────────────────────────┐
│ ✅ Morning Check-In Complete                │
│ 🧠 2  🔥 4  💪 1  😊 5    [Edit]          │
└─────────────────────────────────────────────┘
```

- Compact single row, ~40px height
- Shows 4 emoji + score pairs
- "Edit" link re-opens the modal with pre-filled values
- Clicking any score re-opens modal
- This card sits above ReadinessCard (or can be integrated as a banner at the top)
- On the NEXT day, the card disappears and the modal returns

### Phase 5: Check-In Trends (Enhancement — build after core is working)
**Files to create:**
- `src/components/dashboard/CheckInTrends.jsx` — 7-day sparkline trends

**Enhancement for after the core check-in is working:**
- 4 sparkline mini-charts showing 7-day trend for each metric
- Visible in an expandable section of the check-in summary card
- Color-coded: shows if stress is climbing, motivation dropping, etc.
- AI references trends: "Your life stress has been 4+ for 3 consecutive days. Consider a recovery day."

## API Calls

**Check status (on dashboard load):**
```
GET /api/checkin/status
Response: { completed: false } or { completed: true, data: { life_stress_score: 2, motivation_score: 4, muscle_soreness_score: 1, mood_score: 5, checkin_completed_at: "2026-03-03T08:15:00Z" } }
```

**Submit check-in:**
```
POST /api/checkin/submit
Body: { life_stress_score: 2, motivation_score: 4, muscle_soreness_score: 1, mood_score: 5 }
Response: { success: true, readiness_blended: 78 }
```

## Edge Cases
- **Partial check-in:** Allow saving with 1-3 fields filled. Don't require all 4. Store nulls for unanswered. AI adapts: "Partial check-in today — readiness based on available data."
- **Multiple check-ins per day:** Allow editing (re-opens modal with current values). Backend upserts on `(user_id, date)`. `checkin_completed_at` updates to latest submission time.
- **Timezone edge case:** "Today" is determined by the athlete's profile timezone, not UTC. A midnight workout sync should not reset the check-in for someone in a different timezone.
- **First-time experience:** On very first check-in, add a brief explanation tooltip: "AIM uses your daily check-in to personalize your readiness score and training recommendations. Takes 15 seconds."
- **Stale dashboard data:** After saving check-in, refetch dashboard data (especially readiness) so the ReadinessCard immediately reflects the blended score.
- **Network failure:** If POST fails, show toast error: "Couldn't save check-in. Try again." Keep modal open with values preserved.
- **Skip tracking:** Don't store a "skipped" record, but do track skip behavior for engagement analytics (future). The AI can note "You haven't checked in today" in the Daily Coach mode.
- **Late check-in:** If athlete checks in at 4pm, still accept it. The AI context notes the late timing and weights it accordingly.
- **Demo/preview users:** Don't show check-in modal to unauthenticated or demo users.

## Testing Requirements
- **Must test:** POST request sends correct payload (4 scores) and receives success response
- **Must test:** Modal appears when check-in status is incomplete, hidden when complete
- **Must test:** Each rating row correctly maps taps to 1-5 values
- **Must test:** Save button disabled when no values selected, enabled when ≥1 value selected
- **Must test:** Skip button closes modal without saving
- **Should test:** Pre-filled values when editing an existing check-in
- **Should test:** Success animation displays and auto-dismisses
- **Should test:** Responsive layout — full-screen on mobile, centered on desktop
- **Should test:** ReadinessCard shows "Subjective" pill after check-in
- **Mock:** MSW handler for `GET /api/checkin/status` returning `{ completed: false }` and `POST /api/checkin/submit` returning `{ success: true, readiness_blended: 78 }`

## Success Metrics
- **Completion rate:** >60% of daily active users complete the check-in on days they open AIM
- **Consistency:** >40% of active users check in on 5+ days per week after 30 days
- **Insight quality:** Subjective-Objective Alignment insights (Category 23) get >75% positive feedback
- **Readiness accuracy:** Blended readiness score (70% device / 30% subjective) correlates better with actual workout quality than device-only readiness
- **Retention:** Users who check in daily retain at 2x the rate of those who don't

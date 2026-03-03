# AIM UI Design Queue

_Last updated: 2026-03-03_

A running list of UI components and pages that need design before implementation. Each entry includes enough context (purpose, data available, interaction model, placement) to produce a mockup in Figma, Claude, or any design tool.

**Design system reference:** See `/prototypes/aim-dashboard-v2-light.jsx` for the full token set. Summary:
- **Bg:** `#f8f8fa` (page), `#ffffff` (card), `#f0f0f3` (surface)
- **Accent:** `#10b981` (teal-green), gradient `#10b981 → #3b82f6` for premium
- **Text:** `#1a1a2e` (primary), `#6b6b80` (secondary), `#9d9db0` (tertiary)
- **Status:** Green `#10b981`, Yellow `#f59e0b`, Red `#ef4444`
- **Font:** DM Sans (body/UI), JetBrains Mono (metrics/numbers)
- **Cards:** White bg, `1px solid rgba(0,0,0,0.06)` border, `border-radius: 16px`, `padding: 20px`
- **Touch targets:** 44px min on mobile
- **Breakpoints:** Mobile < 768px, Tablet 768-1024px, Desktop > 1024px

**Existing UI patterns to match:**
- Dashboard is two-column on desktop (`1fr 380px`), single-column on mobile
- Modals: NutritionLogger is a full-screen conversational modal (5-stage flow with chat-like UI)
- Cards: ReadinessCard uses SVG ring + metric pills. LastRideCard uses 8-metric grid.
- Sliders: SessionNotes uses horizontal 0-10 RPE slider and 1-5 sliders for subjective fields
- Right column (sticky): AIPanel + WorkingGoals

---

## Design 1: Daily Check-In Modal

**Priority:** High — this is the first thing athletes should see each morning

**Purpose:** Collect 4 subjective scores (1-5) before the athlete sees their dashboard. Feeds AI analysis with subjective context. Takes < 15 seconds to complete.

**Data collected:**
| Field | Scale | Labels (1→5) |
|-------|-------|---------------|
| Life Stress | 1-5 | None → Overwhelming |
| Motivation | 1-5 | Very Low → Fired Up |
| Muscle Soreness | 1-5 | None → Very Sore |
| Mood | 1-5 | Poor → Excellent |

**Backend:** `POST /api/checkin/submit` saves to `daily_metrics`. `GET /api/checkin/status` returns today's check-in or null.

**Interaction model — two options to consider:**

**Option A — Interstitial modal** (like NutritionLogger pattern)
- On Dashboard load, if `checkin_completed_at` is null for today → show modal overlay
- 4 sliders on one screen, each with emoji or icon + label + 5 tappable circles
- "Save & Continue" button at bottom → dismisses modal, loads dashboard
- "Skip for now" link below the button
- Should feel quick and lightweight, not like a chore

**Option B — Inline dashboard card** (like ReadinessCard pattern)
- A card at the top of the left column: "How are you feeling today?"
- 4 compact slider rows inline
- Once submitted, card transforms to show today's scores (collapsed)
- Can re-open to edit

**Placement:** Dashboard — either as modal on load (Option A) or top of left column (Option B)

**Mobile:** Full-screen modal for Option A. Full-width card for Option B.

**Design notes:**
- Should feel warm and personal ("Good morning, Kristen")
- Emojis or simple icons for each category make it scannable
- Color-code the selected value (green=good, yellow=moderate, red=concerning)
- After submission, the ReadinessCard could incorporate a "Subjective" pill showing the blended score

---

## Design 2: Cross-Training Logger

**Priority:** Medium — athletes do gym/yoga sessions that affect cycling recovery

**Purpose:** Log non-cycling sessions (strength, yoga, swimming, hiking, pilates) with enough detail for AI to assess recovery impact. Quick entry, < 30 seconds.

**Data collected:**
| Field | Type | Options |
|-------|------|---------|
| Activity Type | Select | Strength, Yoga, Swimming, Hiking, Pilates, Other |
| Body Region | Select (conditional, shows for Strength) | Upper Body, Lower Body, Full Body, Core |
| Perceived Intensity | 1-5 slider | Easy → Max Effort |
| Duration | Number input | Minutes |
| Notes | Text (optional) | Free-form |
| Date | Date picker | Defaults to today |

**Backend:** `POST /api/cross-training/log` auto-computes `estimated_tss` and `recovery_impact`. `GET /api/cross-training/list?days=30` returns recent entries.

**Auto-computed (shown after save):**
- Estimated TSS (e.g., "~45 TSS")
- Recovery Impact badge: None (green), Minor (blue), Moderate (yellow), Major (red)

**Interaction model — follows NutritionLogger pattern:**
- Triggered from Dashboard via a button/FAB or action item
- Modal overlay with form fields
- Activity type as icon grid (6 icons in 2x3 or 3x2 grid) — tap to select
- Body region appears only when "Strength" is selected
- Intensity as 5 tappable circles with labels
- Duration as a simple number input with "min" suffix
- Save button → shows confirmation with computed TSS + recovery impact
- Recent entries list below the form (last 7 days)

**Placement:** Dashboard — triggered from an action button. Could live alongside NutritionLogger trigger.

**Mobile:** Full-screen modal.

**Design notes:**
- Activity type icons: Dumbbell (strength), Person in lotus (yoga), Waves (swimming), Mountain (hiking), Person stretching (pilates), Ellipsis (other)
- After logging, the entry should appear in a "Recent Cross-Training" mini-list on the dashboard or in a dedicated section
- Recovery impact badge is the key visual: "This session will have a **moderate** impact on tomorrow's cycling performance"
- Consider showing a weekly cross-training summary somewhere (e.g., "3 sessions this week, 92 estimated TSS")

---

## Design 3: Travel & Altitude Status Card

**Priority:** Low-medium — travel is auto-detected, this is informational

**Purpose:** Show the athlete when travel has been detected and its impact on performance. Jet lag recovery timeline, altitude acclimation progress, and expected power penalty.

**Data available (from `travel_events` table):**
- Distance traveled (km)
- Travel type: Flight / Drive / Unknown
- Timezone shift (hours)
- Altitude change (meters)
- Acclimation day counter (0-14)
- Estimated jet lag recovery (days remaining)
- Estimated power penalty (% at current altitude + acclimation)

**Backend:** Already in AI context. No dedicated list endpoint yet (would need `GET /api/travel/recent`).

**Interaction model — passive dashboard card:**
- Only appears when there's an active travel event (within recovery window)
- Auto-dismisses when jet lag recovery is complete AND altitude acclimation is done
- Not always visible — conditional, like a notification card

**Card content:**
```
✈️ Travel Detected — NYC → Denver
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Timezone: -2h shift → ~2 days recovery (Day 1 of 2)
⛰️ Altitude: 1,609m → ~2.8% power penalty
   Acclimation: Day 3 of 14 ████░░░░░░░░░░

   Estimated penalty will decrease as you acclimate.
   Your AI coach factors this into all recommendations.
```

**Placement:** Dashboard left column, between ReadinessCard and LastRideCard (only when active). Could also be a pill/badge on the ReadinessCard.

**Mobile:** Full-width card, same as desktop but stacked.

**Design notes:**
- Progress bar for acclimation (0-14 days)
- Color shifts from red → yellow → green as acclimation progresses
- Plane icon for flights, car icon for drives
- Very compact — shouldn't dominate the dashboard, just inform
- AI already references travel in its analysis, so this card is supplementary context
- Could be expandable: collapsed shows "✈️ Denver — Day 3, -2.1% power" and expands to show full detail

---

## Design 4: Check-In History / Trends (Future)

**Priority:** Low — nice-to-have visualization

**Purpose:** Show 7-day and 30-day trends for subjective check-in scores. Helps athletes see patterns (e.g., stress climbs before races, soreness tracks with training load).

**Data:** 4 time series from `daily_metrics` (life_stress, motivation, soreness, mood), already fetched for AI context.

**Possible placements:**
- Expandable section within ReadinessCard
- Dedicated tab on the Sleep page (which already shows recovery trends)
- Small sparkline charts on the check-in card after submission

**Design notes:**
- 4 small sparkline charts (7 dots each) or a combined line chart
- Color-coded by metric
- Show correlation with training load (CTL overlay) if space allows

---

## Design 5: Cross-Training History View (Future)

**Priority:** Low — listing view for logged cross-training

**Purpose:** Browse past cross-training sessions, see weekly summary, filter by type.

**Data:** `GET /api/cross-training/list?days=30`

**Possible placements:**
- Section on a dedicated "Training Log" page
- Expandable section on Dashboard
- Tab within the Activities page

---

## Design 6: Oura/Whoop/Withings Connect Cards (Future)

**Priority:** Medium — OAuth connect flows exist but no sync status UI

**Purpose:** Show sync status, last sync time, and data preview for each connected recovery device.

**Placement:** ConnectApps page (already exists with Strava/Eight Sleep cards)

---

## Implementation Order

1. **Daily Check-In** — highest impact, feeds AI every day
2. **Cross-Training Logger** — medium impact, athletes actively request this
3. **Travel Status Card** — low effort (passive, auto-detected), nice polish
4. **Check-In Trends** — future, after check-in has data
5. **Cross-Training History** — future, after logger has data
6. **Recovery Device Cards** — future, ConnectApps update

---

## How to Use This Document

1. Pick a design from above
2. Copy the section into your design tool (Figma, Claude, etc.)
3. Reference the design tokens and existing component patterns listed at the top
4. Create a mockup
5. Bring the approved design back here for implementation
6. Mark as "Designed ✅" and add the design file reference

| # | Design | Status | Design File |
|---|--------|--------|-------------|
| 1 | Daily Check-In Modal | Needs Design | — |
| 2 | Cross-Training Logger | Needs Design | — |
| 3 | Travel Status Card | Needs Design | — |
| 4 | Check-In Trends | Future | — |
| 5 | Cross-Training History | Future | — |
| 6 | Recovery Device Cards | Future | — |

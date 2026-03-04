# BUILD PLAN: Similar Session Finder & Comparison

## Feature Summary
**What:** Automatically find past rides that are comparable to any given activity (similar duration, intensity, terrain, workout type), then show a side-by-side comparison with AI explaining what changed using cross-domain data (sleep, recovery, nutrition, weather, life stress).

**Why it matters:** The most powerful coaching question is "Why was today different from last time?" Athletes do the same routes and workouts repeatedly, but their performance varies. Was it the heat? Poor sleep? Life stress? Better fueling? AIM can answer this question automatically because it has all the cross-domain data. This transforms raw data into causal understanding — the athlete doesn't just see numbers, they understand *why* the numbers changed.

**Who cares:**
- **Athletes:** Obsess over comparing rides. Currently do this manually in Strava or spreadsheets. AIM automates it AND adds the "why."
- **Coaches:** Comparison is how coaches assess adaptation. "You did this same interval set 6 weeks ago at 290W. Now you're doing it at 305W with lower HR — that's real fitness gain."
- **Teams:** Can compare athletes doing the same workout to identify who's responding well and who might need recovery.

**Competitive differentiation:** Strava shows basic "matched runs" with pace comparison. Intervals.icu has activity comparison. Neither connects to sleep, HRV, nutrition, life stress, weather, or recovery data to explain *why* performance differed. AIM's cross-domain AI analysis of the comparison is unique.

**Stickiness:** Once athletes see "you did this same ride 3 weeks ago and here's why today was better," they'll check every ride's similar sessions. It turns every workout into a data point in a longitudinal story.

## Status
- **Backend:** Partially built — `findSimilarEfforts` exists in `ai.js` context assembly, but no dedicated comparison endpoint
- **Frontend:** ❌ Not built
- **AI Integration:** Similar efforts already part of analysis context. Need dedicated comparison analysis.

## Dependencies
- Benefits from all existing data: activities, daily_metrics, nutrition_logs, cross_training_log, travel_events
- No hard blockers

## Reference Files (READ BEFORE BUILDING)
- `CLAUDE.md` → P1 Similar Session Finder description (Task 47)
- `api/_lib/ai.js` → `findSimilarEfforts()` function (reuse matching logic)
- `docs/AIM-FEATURE-SPECS-BATCH-1.md` → Segment Comparison (shares comparison UI patterns)
- `docs/insights-catalog.md` → Category 20 (Workout Progression)
- `src/theme/tokens.js`, `src/hooks/useResponsive.js`

## Implementation Plan

### Phase 1: Similar Session API Endpoint
**Files to create:**
- `api/activities/similar.js` — GET endpoint

**Matching algorithm:**
```
GET /api/activities/:id/similar?limit=5

Matching criteria (weighted):
1. Same sport type (required)
2. Duration within ±25% (weight: 0.3)
3. TSS within ±30% (weight: 0.25)
4. Intensity Factor within ±15% (weight: 0.2)
5. Normalized Power within ±20% (weight: 0.15)
6. Same activity tags overlap (weight: 0.1)

For each matched activity, return:
- Activity summary (id, name, date, duration, distance, NP, TSS, IF, avg_hr, max_hr)
- Cross-domain context from that day:
  - Sleep score, sleep duration, HRV, RHR (from daily_metrics)
  - Recovery score
  - Weather (temp, humidity, wind from activity_weather)
  - Life stress, motivation, soreness, mood (from daily_metrics check-in)
  - Nutrition (carbs/hr, total calories from nutrition_logs)
  - Cross-training prior day (from cross_training_log)
  - Travel status (from travel_events)
  - Training load context (CTL, ATL, TSB on that day)
```

**Return format:**
```json
{
  "current": { ...activity with full context },
  "similar": [
    { ...activity with full context, "similarity_score": 0.87 },
    { ...activity with full context, "similarity_score": 0.82 }
  ]
}
```

### Phase 2: Comparison UI on Activity Detail
**Files to create:**
- `src/components/SimilarSessionsPanel.jsx`

**Files to modify:**
- `src/pages/ActivityDetail.jsx` — Add SimilarSessionsPanel section

**UI design — "Similar Sessions" section on ActivityDetail page:**

**Section header:** "Similar Sessions" with a count badge "(5 found)"

**Comparison card for each similar session:**
```
┌──────────────────────────────────────────────────┐
│ 📅 Feb 18, 2026 — Sunday Tempo Ride    87% match │
│                                                   │
│  Metric        Today       Feb 18      Delta      │
│  ─────────     ─────       ──────      ─────      │
│  NP            285W        298W        -4.4%  🔴  │
│  Avg HR        158 bpm     152 bpm     +3.9%  🟡  │
│  EF            1.80        1.96        -8.2%  🔴  │
│  Duration      2:15:00     2:22:00     -4.9%      │
│  TSS           187         204         -8.3%      │
│                                                   │
│  Context Differences:                             │
│  😴 Sleep:      5.8h (today) vs 7.2h (Feb 18)    │
│  💓 HRV:       38ms vs 62ms                       │
│  🌡️ Temp:      82°F vs 64°F                       │
│  🧠 Stress:    4/5 vs 2/5                         │
│  🍎 Fueling:   65g/hr vs 80g/hr                   │
│                                                   │
│  🤖 AI Analysis:                                  │
│  "Your NP was 4.4% lower despite similar effort.  │
│   Three factors explain the gap: you slept 1.4h   │
│   less (HRV was 39% below baseline), it was 18°F  │
│   hotter (expected ~3% penalty), and your life     │
│   stress was elevated at 4/5. Adjusting for these  │
│   conditions, your underlying fitness is actually  │
│   slightly improved — your power:HR at matched     │
│   intensity is trending up 2.1% over 6 weeks."    │
│                                                   │
│  [View Full Activity →]                           │
└──────────────────────────────────────────────────┘
```

**Design specs:**
- Section lives below the main metrics grid on ActivityDetail, above the full metrics collapse
- Each comparison card: `T.card` background, `T.border`, `borderRadius: 16px`, `padding: 20px`
- Metric comparison table: `T.mono` for numbers, delta column color-coded (green=better, red=worse, gray=neutral)
- Context differences: icon + label + "today vs then" format, highlight significant differences (>15% change)
- AI Analysis: slightly indented, preceded by robot emoji, `T.text` color, `fontSize: 14px`, `lineHeight: 1.6`
- Match percentage badge: pill shape, top-right of card, `T.accentDim` background
- Mobile: comparison table becomes vertical (metric label above, today | then | delta in a row)

### Phase 3: AI Comparison Analysis Endpoint
**Files to create:**
- `api/activities/compare-analysis.js` — POST endpoint

**Accepts:**
```json
{
  "current_activity_id": "uuid",
  "comparison_activity_id": "uuid"
}
```

**System prompt for comparison:**
```
You are comparing two similar cycling/running sessions for the same athlete.
Your job: explain WHY performance differed using cross-domain data.

Analyze these factors:
1. Sleep quality and duration difference
2. HRV and recovery state difference
3. Weather/temperature difference
4. Training load context (CTL/ATL/TSB) difference
5. Life stress and motivation difference
6. Nutrition/fueling difference
7. Cross-training impact (gym sessions in prior 48h)
8. Travel/altitude factors

For each significant factor, quantify the expected impact.
Then provide a net assessment: after adjusting for all factors,
is the athlete's underlying fitness better, worse, or the same?

Return JSON:
{
  "headline": "Short 1-line comparison (e.g., '4.4% lower power, but conditions explain it')",
  "factors": [
    { "factor": "sleep", "impact": "negative", "magnitude": "moderate",
      "detail": "1.4h less sleep, HRV 39% below baseline" },
    ...
  ],
  "adjusted_assessment": "After adjusting for sleep, heat, and stress, underlying fitness is slightly improved (+2.1% power:HR trend)",
  "takeaway": "One actionable recommendation"
}
```

### Phase 4: Quick Compare from Dashboard
**Files to modify:**
- `src/components/dashboard/LastRideCard.jsx` — Add "Compare to similar" link

**Enhancement:**
- Below the 8-metric grid on LastRideCard, add a subtle link: "vs 5 similar sessions →"
- Clicking navigates to ActivityDetail page scrolled to the Similar Sessions section
- If no similar sessions found, don't show the link

### Phase 5: Comparison Trends
**Enhancement to SimilarSessionsPanel:**
- When 3+ similar sessions exist, show a mini trend chart
- X-axis: dates of similar sessions, Y-axis: key metric (NP or EF)
- Two lines: raw performance + adjusted performance (accounting for conditions)
- Shows the athlete their true trajectory independent of daily conditions

## Edge Cases
- **New athlete (< 5 activities):** "Keep training — after 5+ similar sessions, we'll show you comparison trends."
- **No similar sessions found:** "This was a unique effort! No closely matching sessions in your history yet."
- **Only 1 similar session:** Show comparison but note "More comparisons available as your history grows."
- **Missing context data:** "Sleep data not available for the Feb 18 session. Comparison adjusts for available factors only."
- **Very old comparisons (> 6 months):** Flag that the athlete's baseline may have shifted significantly. Weight the comparison lower.

## Testing Requirements
- **Must test:** Similar session matching returns reasonable results (same sport, similar duration/intensity)
- **Must test:** Comparison table renders with correct deltas and color coding
- **Must test:** AI comparison endpoint returns valid JSON
- **Should test:** Mobile responsive layout for comparison cards
- **Should test:** Empty state when no similar sessions exist

## Success Metrics
- **Engagement:** >40% of athletes who view ActivityDetail click into Similar Sessions
- **Insight quality:** Comparison AI insights get >75% positive feedback (thumbs up)
- **Retention:** Athletes who use Similar Sessions come back more frequently than those who don't

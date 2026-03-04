# BUILD PLAN: Training Prescription Engine

## Feature Summary
**What:** AI-powered next-workout recommendations based on the athlete's power profile gaps, CP/W' weaknesses, current training load, recovery status, weather, and goals. Generates specific workout structures with target power, duration, and intervals — not generic advice.

**Why it matters:** This is the bridge between "analytics platform" and "AI coach." Every other feature in AIM tells athletes what happened. This feature tells them what to DO next. It's the most requested feature in endurance sports software: "Just tell me what workout to do today." By basing recommendations on power profile gaps (e.g., "your 1-min power is weak relative to your 5-min power") and current readiness, AIM prescribes the *right* workout at the *right* time.

**Who cares:**
- **Self-coached athletes:** 70% of serious amateurs don't have a coach. They want structured guidance without paying $200-500/month.
- **Athletes between coaches:** Need intelligent gap-filling during transition periods.
- **Coaches (future):** Will use AIM's suggestions as starting points, then customize. Saves them hours of planning.

**Competitive differentiation:** TrainerRoad has adaptive training plans but they're rigid templates. Intervals.icu has basic recommendations. Neither uses cross-domain data (sleep, HRV, stress, nutrition, travel) to adjust prescriptions in real-time. AIM's prescriptions account for recovery state, weather forecast, altitude, recent cross-training, and life stress — a truly personalized daily recommendation.

**Stickiness:** Athletes who follow AIM's workout suggestions and see results will trust the platform as their coach. It becomes the daily answer to "What should I do today?" — the most habit-forming question in fitness.

## Status
- **Backend:** Not built — needs new endpoint + AI prompt engineering
- **Frontend:** Not built — needs prescription card + workout detail modal
- **AI Integration:** Existing AI context assembly provides all necessary data

## Dependencies
- **Strongly benefits from:** CP/W' model (✅ done), Adaptive Zones (✅ done), Durability tracking (✅ done)
- **Enhanced by:** Daily Check-In (Feature 01), Cross-Training Logger (Feature 02), Travel Detection (Feature 03)
- **Integrates with:** Training Calendar (Feature 09)

## Reference Files (READ BEFORE BUILDING)
- `CLAUDE.md` → P1 Training Prescription Engine
- `docs/AIM-PRODUCT-ROADMAP.md` → Training Prescription section
- `api/_lib/cp-model.js` → CP/W'/Pmax model (prescription targets)
- `api/_lib/adaptive-zones.js` → Readiness-adjusted zones
- `api/_lib/durability.js` → Fatigue resistance data
- `api/_lib/performance-models.js` → Conditional models (heat, sleep, etc.)
- `docs/AIM-ADAPTIVE-DASHBOARD-SPEC.md` → DAILY_COACH mode (prescription lives here)

## Implementation Plan

### Phase 1: Power Profile Gap Analysis Engine
**Files to create:**
- `api/_lib/prescription.js` — Pure functions for gap analysis + workout generation

**Gap analysis logic:**
```javascript
function analyzeProfileGaps(powerProfile, cpModel) {
  // Compare athlete's power curve to their own "balanced" curve
  // A balanced curve: each duration should be proportional to CP model prediction
  // Gaps = durations where actual is significantly below model prediction

  const durations = ['5s', '30s', '1m', '5m', '20m', '60m'];
  const gaps = [];

  for (const d of durations) {
    const actual = powerProfile[d]; // watts
    const expected = cpModel.predict(durationToSeconds(d)); // from CP model
    const ratio = actual / expected;

    if (ratio < 0.90) gaps.push({
      duration: d,
      deficit: Math.round((1 - ratio) * 100),
      category: categorize(d), // 'sprint', 'anaerobic', 'vo2max', 'threshold', 'endurance'
      priority: getPriority(d, athleteGoals),
    });
  }

  return gaps.sort((a, b) => b.priority - a.priority);
}

// Workout type mapping based on gaps:
// Sprint deficit (5s) → neuromuscular sprints, overgeared starts
// Anaerobic deficit (30s-1m) → 30/30 intervals, Tabata-style
// VO2max deficit (3-5m) → 4-6x 4-5min at 105-120% CP
// Threshold deficit (20m) → 2-3x 15-20min at 95-105% CP
// Endurance deficit (60m) → long Z2 rides, progressive overload volume
```

**Readiness-adjusted prescription:**
```javascript
function adjustForReadiness(workout, readiness, zones) {
  if (readiness < 45) {
    return { type: 'recovery', reason: 'Your body needs rest today. Recovery ride or day off.' };
  }
  if (readiness < 65) {
    // Reduce intensity, maintain duration
    workout.targetPower *= 0.95;
    workout.note = 'Targets reduced 5% based on your readiness score.';
  }
  // Apply adaptive zone adjustments
  workout.zones = zones; // already readiness-adjusted from adaptive-zones.js
  return workout;
}
```

### Phase 2: Prescription API Endpoint
**Files to create:**
- `api/prescription/next-workout.js` — GET endpoint

**Logic flow:**
1. Fetch athlete's power profile, CP model, recent activities (last 14 days)
2. Compute current training load (CTL/ATL/TSB)
3. Analyze power profile gaps
4. Check today's readiness score
5. Check weather forecast (from daily_metrics.weather_data)
6. Check for recent cross-training and travel
7. Call Claude with structured prompt to generate workout

**AI System Prompt:**
```
You are AIM's workout prescription engine. Given the athlete's current state,
generate the single best workout for today.

Context you have:
- Power profile gaps (which durations are weak)
- CP/W'/Pmax model
- Current adaptive training zones (already readiness-adjusted)
- Current training load (CTL, ATL, TSB, ramp rate)
- Today's readiness score and check-in data
- Weather forecast
- Recent activity history (last 14 days)
- Cross-training in last 48 hours
- Active travel/altitude status

Rules:
1. NEVER prescribe intensity work on red readiness days (< 45). Always recommend recovery or rest.
2. Limit high-intensity days to 2-3 per week. Check recent history.
3. If TSB < -30, lean toward recovery regardless of readiness.
4. Adjust for weather: reduce intensity targets in extreme heat (>30°C) or cold (<0°C).
5. After lower-body strength session (< 48h), avoid VO2max or sprint work.
6. If athlete has a race within 7 days, switch to taper protocol.
7. Target the highest-priority power profile gap that's appropriate for today's readiness.

Return JSON:
{
  "workout_name": "VO2max Builder: 5x4min",
  "workout_type": "intervals",
  "rationale": "Your 5-minute power is 8% below model prediction. This session targets VO2max to close the gap.",
  "readiness_check": "green", // green, yellow, red
  "readiness_note": "Readiness 78 — you're good to go. Full intensity.",
  "duration_minutes": 75,
  "tss_estimate": 85,
  "structure": [
    { "name": "Warm-up", "duration_min": 15, "target": "Z1-Z2", "power_watts": null },
    { "name": "Main Set", "sets": 5, "work_min": 4, "rest_min": 4,
      "target": "108-115% CP", "power_watts": [310, 330], "hr_ceiling": 175 },
    { "name": "Cool-down", "duration_min": 10, "target": "Z1", "power_watts": null }
  ],
  "fueling": {
    "pre": "Light meal 2h before. 30-50g carbs.",
    "during": "1 bottle with 40g carbs. Sip every 15 min.",
    "post": "30g protein + 60g carbs within 30 min."
  },
  "weather_note": "74°F and sunny. Normal hydration.",
  "alternative": {
    "name": "Z2 Endurance",
    "reason": "If you're not feeling it, do 90 min Z2 instead. Still productive."
  }
}
```

### Phase 3: Prescription Card on Dashboard
**Files to create:**
- `src/components/dashboard/PrescriptionCard.jsx`

**UI — this card appears in DAILY_COACH mode when no workout is planned:**

```
┌─────────────────────────────────────────────┐
│ 🎯 Today's Recommendation                  │
│                                             │
│ VO2max Builder: 5×4min                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│ 75 min • ~85 TSS • Intervals                │
│                                             │
│ 🟢 Readiness: Good to go (78)              │
│                                             │
│ "Your 5-min power is 8% below model        │
│  prediction. This session targets your      │
│  biggest gap."                              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Warm-up     15 min   Z1-Z2             │ │
│ │ 5×4min ON   4 min    310-330W (Z4)     │ │
│ │ 5×4min OFF  4 min    Z1 recovery       │ │
│ │ Cool-down   10 min   Z1                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 🍎 Fueling: 40g carbs/hr • 1 bottle        │
│                                             │
│ [Add to Calendar]  [Show Alternative]       │
└─────────────────────────────────────────────┘
```

**Design specs:**
- Card in Dashboard left column, below ReadinessCard (in DAILY_COACH mode)
- Header: "🎯 Today's Recommendation" with target emoji
- Workout name: 18px, 700 weight, `T.text`
- Meta row: duration + TSS + type in `T.textSoft`
- Readiness badge: green/yellow/red pill
- Rationale: italic, `T.textSoft`, 14px
- Workout structure: monospace table with alternating row backgrounds
- Power targets: `T.mono`, 600 weight, accent color for work intervals
- Fueling row: compact, with food emoji
- Two buttons: "Add to Calendar" (accent) and "Show Alternative" (outline)
- Mobile: full-width card, structure table scrollable horizontally if needed

### Phase 4: "Add to Calendar" Integration
**Files to modify:**
- `api/calendar/upsert.js` — Accept prescription format
- Integration with existing `training_calendar` table

**When athlete clicks "Add to Calendar":**
1. Save the workout structure to `training_calendar` for today's date
2. Dashboard mode switches from DAILY_COACH to PRE_RIDE_PLANNED
3. The workout now appears in the calendar view and as a pre-ride briefing

### Phase 5: Prescription History & Compliance
**Future enhancement:**
- Track which prescriptions were followed vs skipped
- Show compliance rate: "You've followed 8 of 12 recommended workouts this month"
- Adjust future prescriptions based on what the athlete actually does
- If they consistently skip VO2max work, note it and ask why

## Edge Cases
- **No power data:** Can't compute gaps without power profile. Show generic recommendation based on HR zones and training load.
- **New athlete (< 10 activities):** "We're still learning your profile. For now, here's a balanced workout based on your FTP." Use FTP-based zones, not CP.
- **Race in < 7 days:** Override gap-filling with taper protocol.
- **Athlete is sick/injured:** If check-in shows extreme values (soreness 5, motivation 1), recommend complete rest.
- **Weather extremes:** Heavy rain, extreme heat, dangerous cold → recommend indoor alternatives.
- **Already trained today:** Don't show prescription if POST_RIDE mode. Show recovery instead.
- **Multiple workouts per day (brick sessions for triathletes):** Support but keep simple — recommend the primary session.

## Testing Requirements
- **Must test:** Gap analysis correctly identifies weak durations
- **Must test:** Readiness < 45 always returns recovery recommendation
- **Must test:** Prescription includes correct zone wattages
- **Should test:** Weather adjustment modifies targets appropriately
- **Should test:** "Add to Calendar" saves to training_calendar correctly

## Success Metrics
- **Adoption:** >50% of daily active users view their daily prescription
- **Follow-through:** >30% of prescriptions result in a matching activity within 24 hours
- **Fitness improvement:** Athletes who follow prescriptions 3+ times/week show CTL gains >5% monthly
- **Retention:** Prescription users retain at 2x the rate of non-prescription users

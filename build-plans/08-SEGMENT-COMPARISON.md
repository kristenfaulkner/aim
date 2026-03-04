# BUILD PLAN: Segment Comparison with Cross-Domain Adjusted Performance

## Feature Summary
**What:** Import Strava segments during activity sync, compare efforts across multiple attempts with AI-powered adjusted performance scoring. Accounts for heat, sleep, HRV, fatigue, and weather to show the athlete their "true" performance independent of daily conditions.

**Why it matters:** Athletes ride the same routes repeatedly and obsess over segment times. But raw times are misleading — a "slower" time might actually represent better fitness if conditions were harder. AIM's adjusted scoring tells athletes: "You were 14 seconds slower today, but after adjusting for heat (+8s), fatigue (+4s), and poor sleep (+1s), your underlying fitness is actually slightly improved." This is the kind of insight that builds deep trust and keeps athletes coming back.

**Who cares:**
- **Athletes:** Segment PRs are emotionally important. Understanding why they were faster/slower drives training decisions.
- **Coaches:** Segment trends over time show real adaptation, but only if conditions are controlled for.
- **Competitive athletes:** Need to know if they're race-ready based on key segments (e.g., a local climb that mimics race demands).

**Competitive differentiation:** Strava shows raw times only. No platform adjusts segment performance for sleep quality, HRV, temperature, training load, or life stress. AIM's adjusted score is a unique metric that shows true fitness trajectory independent of daily variability.

**Stickiness:** Athletes will check their adjusted score on every ride that hits a tracked segment. It becomes a personal fitness barometer — "My adjusted score on Hawk Hill is trending up 4% over 8 weeks, even though my raw times are flat because it's been hotter."

## Status
- **Backend:** Partially built — `segments` and `segment_efforts` tables exist, basic CRUD endpoints exist
- **Frontend:** ❌ Not built
- **AI Integration:** Category 23 (Segment Performance Analysis) defined but not implemented

## Dependencies
- **Benefits from:** HR Source Prioritization (Feature 6) — source badge on effort HR data
- **Uses:** Existing conditional performance models (heat penalty, sleep→execution, HRV readiness, fatigue)
- **Future integration:** Race Intelligence (Feature 7) — link segments to race-relevant profiles

## Reference Files (READ BEFORE BUILDING)
- `docs/AIM-FEATURE-SPECS-BATCH-1.md` → Feature 3 (complete spec — 5 phases, data model, scoring, AI)
- `api/_lib/performance-models.js` → Existing conditional models (heat, sleep, HRV, fueling, durability)
- `api/segments/` → Existing endpoints (list, detail, compare, sync)
- `docs/insights-catalog.md` → Category 23 spec

## Implementation Plan — 5 Phases

### Phase 1: Segment Import During Sync
**Files to modify:**
- `api/integrations/sync/strava.js` — Extract segment efforts from activity detail response
- `api/webhooks/strava.js` — Same for webhook-triggered syncs

**On each activity sync:**
1. Strava activity detail includes `segment_efforts` array
2. For each effort:
   - Upsert segment (if new): name, distance, avg_grade, city, from Strava
   - Insert effort: elapsed_time, moving_time, start_date, avg_power, avg_hr, max_hr, avg_cadence
3. Store effort with denormalized activity context (for fast comparison later):
   - weather, hrv_that_day, sleep_score, recovery_score, tsb, life_stress

**Data model (already in schema, confirm columns):**
```sql
segments: id, user_id, strava_segment_id, name, distance_m, avg_grade, elevation_gain,
          city, state, country, effort_count, pr_elapsed_time, pr_date

segment_efforts: id, user_id, segment_id, activity_id, strava_effort_id,
                 elapsed_time, moving_time, start_date,
                 avg_watts, avg_hr, max_hr, avg_cadence,
                 -- Denormalized context:
                 temperature_f, humidity_pct, wind_speed,
                 hrv_ms, sleep_score, sleep_hours, recovery_score,
                 tsb, ctl, rhr_bpm, life_stress, motivation,
                 -- Computed:
                 adjusted_score, adjustment_factors JSONB,
                 power_hr_ratio, is_pr
```

### Phase 2: Effort Context Denormalization
**Files to create:**
- `api/_lib/segment-scoring.js` — Context denormalization + adjusted scoring functions

**For each effort, denormalize from existing tables:**
```javascript
async function enrichEffortContext(effort, userId) {
  const dailyMetrics = await getDailyMetrics(userId, effort.start_date);
  const activityWeather = await getActivityWeather(effort.activity_id);
  const trainingLoad = await getTrainingLoadOnDate(userId, effort.start_date);

  return {
    ...effort,
    temperature_f: activityWeather?.temperature,
    humidity_pct: activityWeather?.humidity,
    wind_speed: activityWeather?.wind_speed,
    hrv_ms: dailyMetrics?.hrv,
    sleep_score: dailyMetrics?.sleep_score,
    sleep_hours: dailyMetrics?.sleep_duration,
    recovery_score: dailyMetrics?.recovery_score,
    tsb: trainingLoad?.tsb,
    ctl: trainingLoad?.ctl,
    rhr_bpm: dailyMetrics?.resting_hr,
    life_stress: dailyMetrics?.life_stress_score,
    motivation: dailyMetrics?.motivation_score,
  };
}
```

### Phase 3: Adjusted Performance Scoring
**Files to modify:**
- `api/_lib/segment-scoring.js` — Add scoring logic

**Reuse existing conditional performance models from `performance-models.js`:**
```javascript
function computeAdjustedScore(effort, athleteBaselines) {
  let adjustments = [];
  let totalAdjustment = 0;

  // Heat penalty (from performance-models.js)
  if (effort.temperature_f > 75) {
    const penalty = computeHeatPenalty(effort.temperature_f);
    adjustments.push({ factor: 'temperature', impact_seconds: penalty, detail: `${effort.temperature_f}°F` });
    totalAdjustment += penalty;
  }

  // Sleep impact
  if (effort.hrv_ms && athleteBaselines.hrv_avg) {
    const hrvRatio = effort.hrv_ms / athleteBaselines.hrv_avg;
    if (hrvRatio < 0.85) {
      const penalty = estimateSleepImpact(hrvRatio, effort.elapsed_time);
      adjustments.push({ factor: 'sleep/HRV', impact_seconds: penalty,
        detail: `HRV ${effort.hrv_ms}ms vs ${athleteBaselines.hrv_avg}ms avg` });
      totalAdjustment += penalty;
    }
  }

  // Fatigue (TSB)
  if (effort.tsb < -15) {
    const penalty = estimateFatigueImpact(effort.tsb, effort.elapsed_time);
    adjustments.push({ factor: 'fatigue', impact_seconds: penalty,
      detail: `TSB ${effort.tsb}` });
    totalAdjustment += penalty;
  }

  // Wind impact (if available)
  // Life stress impact (if check-in data available)

  const adjustedTime = effort.elapsed_time - totalAdjustment;
  const rawScore = (effort.pr_time / effort.elapsed_time) * 100;
  const adjustedScore = (effort.pr_time / adjustedTime) * 100;

  return { adjustedTime, adjustedScore, adjustments, totalAdjustment };
}
```

### Phase 4: Segment UI on Activity Detail
**Files to create:**
- `src/components/SegmentEffortCard.jsx` — Single segment effort with comparison
- `src/components/SegmentHistory.jsx` — Full effort history for a segment

**Files to modify:**
- `src/pages/ActivityDetail.jsx` — Add Segments section

**Activity Detail — Segments section (below intervals, above full metrics):**

For each segment in the current activity:
```
┌──────────────────────────────────────────────────┐
│ ⛰️ Hawk Hill Climb · 1.2 km · 7.2% avg grade   │
│                                                   │
│ Today: 4:52 · 312W · 167 bpm                     │
│ vs PR:  4:38 (14s slower)    vs Last: 4:47 (5s ↓)│
│                                                   │
│ 🤖 Adjusted Analysis:                            │
│ "After accounting for heat (+8s), fatigue (+4s),  │
│  and sleep (+1s), this effort is equivalent to    │
│  4:41 — only 3s off your PR. Your power:HR ratio  │
│  of 1.87 is your 2nd best on this segment."      │
│                                                   │
│ [View all 12 efforts →]                           │
└──────────────────────────────────────────────────┘
```

**Expanded segment history (click-through):**
- Table with all efforts: Date, Time, Power, HR, Temp, TSB, Adjusted Score
- PR flagged with ⭐, today flagged with 🔴
- Mini chart: raw time vs adjusted time trend
- Trend insight: "Your adjusted performance has improved 4.2% over 8 weeks"

### Phase 5: AI Segment Analysis (Category 23)
**Files to modify:**
- `api/_lib/ai.js` — Add segment data to analysis context
- `docs/insights-catalog.md` — Activate Category 23

**When an activity has segment efforts with 2+ historical comparisons:**
Add to AI context:
```javascript
segments: [
  {
    name: "Hawk Hill Climb",
    current_effort: { time: "4:52", power: 312, hr: 167 },
    pr: { time: "4:38", date: "Feb 18" },
    adjusted_comparison: "Equivalent to 4:41 after adjustments",
    key_factors: [
      { factor: "temperature", impact: "+8s" },
      { factor: "fatigue", impact: "+4s" }
    ],
    trend: "Adjusted performance +4.2% over 8 weeks"
  }
]
```

AI generates Category 23 insight with specific segment analysis.

## Edge Cases
- **First effort on segment:** "First time on this segment! We'll compare future efforts to this baseline."
- **Only 1 effort:** Show metrics but no comparison. "Ride this segment again to unlock comparison insights."
- **Missing context data for historical effort:** Note: "Adjustment is partial — sleep data not available for your Feb 10 effort."
- **Different HR sources across efforts:** Note this using HR Source Badge from Feature 6.
- **Running segments:** Use pace:HR ratio instead of power:HR ratio. Same adjustment logic.
- **Very short segments (< 30s):** Still compare, but note adjustments have less impact on short efforts.
- **GPS drift:** Trust Strava's matching. Don't re-match locally.

## Testing Requirements
- **Must test:** Segment import from Strava activity creates segment + effort records
- **Must test:** Adjusted score calculation produces reasonable results
- **Must test:** Activity detail shows segment section when efforts exist
- **Should test:** Missing context data doesn't crash adjustment
- **Should test:** PR flagging works correctly

## Success Metrics
- **Engagement:** >50% of athletes with segments check adjusted scores regularly
- **Trust:** Athletes report segment analysis is "accurate" or "very accurate" >80%
- **Insight quality:** Category 23 insights get >75% positive feedback

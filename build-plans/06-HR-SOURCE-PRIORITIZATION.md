# BUILD PLAN: HR Source Prioritization Engine

## Feature Summary
**What:** A 3-context priority system (exercise/sleep/resting HR) that automatically selects the most accurate heart rate source when an athlete has multiple HR-capable devices. Smart defaults based on device accuracy research, with power user overrides in Settings. Source badges appear next to all HR metrics across the platform.

**Why it matters:** Athletes wear multiple devices — a Wahoo chest strap during rides, an Oura ring for sleep, a Whoop band 24/7. Each device has different accuracy depending on context. A wrist-based optical sensor is terrible during high-intensity cycling (motion artifacts) but fine for sleep. A chest strap is gold-standard for exercise but nobody sleeps in one. Without source prioritization, AIM might use Whoop's wrist HR during a ride when a chest strap reading is available — and the numbers could be off by 10+ bpm.

**Who cares:**
- **Athletes:** Want to trust their HR data. Seeing "142 bpm avg [Wahoo TICKR]" vs an unexplained "142 bpm" builds confidence.
- **Data-quality enthusiasts:** Power users who know that chest strap > wrist optical during exercise will appreciate the transparency.
- **Coaches:** Need to know the HR source to assess data quality. "This athlete's HR drift looks weird — oh, it's from a wrist sensor, that explains it."

**Competitive differentiation:** No competing platform has visible source attribution on HR metrics. Strava uses whatever device recorded the activity. Whoop only shows its own data. AIM shows WHERE the data came from and picks the best source automatically — like a smart data curator.

**Stickiness:** The source badge is a constant visual reminder that AIM is doing smart data management behind the scenes. Athletes come to rely on AIM as the "single source of truth" for their health data.

## Status
- **Backend:** Partially built — `hr_source_config` table exists in schema, `source-priority.js` handles activity-level dedup
- **Frontend:** ❌ Not built
- **AI Integration:** ❌ Not yet — needs source confidence in AI context

## Dependencies
- Foundation for Feature 8 (Segment Comparison) — segment efforts need accurate HR attribution

## Reference Files (READ BEFORE BUILDING)
- `docs/AIM-FEATURE-SPECS-BATCH-1.md` → Feature 1 (complete spec with data model, UI/UX, resolution logic)
- `api/_lib/source-priority.js` → Existing cross-source dedup pattern (extend, don't replace)
- `docs/ENGINEERING-STANDARDS.md`
- `src/theme/tokens.js`

## Implementation Plan

### Phase 1: HR Source Resolution Library
**Files to create:**
- `api/_lib/hr-source-priority.js`

**Implement exactly as specified in AIM-FEATURE-SPECS-BATCH-1.md:**
- `DEFAULTS` object with 3 context priority stacks (exercise, sleep, resting)
- `resolveHRSource(context, availableSources, userConfig)` function
- `detectDeviceType(activity)` function — infers source from FIT metadata, integration provider, device_name
- `getConfidence(source)` — returns high/medium/low based on source type

### Phase 2: Database Migrations + Sync Pipeline Updates
**Files to create:**
- `supabase/migrations/015_hr_source_priority.sql`

**Schema changes:**
```sql
-- Already exists: hr_source_config table

-- Add source tracking to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_source TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_source_confidence TEXT DEFAULT 'medium';

-- Add source tracking to daily_metrics
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS rhr_source TEXT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sleep_hr_source TEXT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hrv_source TEXT;
```

**Files to modify:**
- `api/integrations/sync/strava.js` — Populate `hr_source` on activity upsert
- `api/webhooks/wahoo.js` — Populate `hr_source` from FIT file metadata
- `api/integrations/sync/oura.js` — Tag daily_metrics HR fields with 'oura' source
- `api/integrations/sync/whoop.js` — Tag daily_metrics HR fields with 'whoop' source
- `api/integrations/sync/eightsleep.js` — Tag daily_metrics HR fields with 'eightsleep' source

### Phase 3: Source Badge Component
**Files to create:**
- `src/components/SourceBadge.jsx`

**Design (from spec):**
- Small pill: `T.surface` background, `T.textDim` text, 11px font, 4px padding, 6px border-radius
- Content: device icon + source name (e.g., "Wahoo TICKR" or "Oura Ring")
- Tooltip on hover: "HR data from [source] ([confidence]). [reason for selection]"
- Mobile: tappable, opens bottom sheet with explanation

**Integration points — add SourceBadge next to HR metrics on:**
- `src/components/dashboard/LastRideCard.jsx` — next to Avg HR metric
- `src/pages/ActivityDetail.jsx` — next to all HR metrics (Avg HR, Max HR, HR Drift)
- `src/pages/Sleep.jsx` — next to overnight HR and HRV values
- `src/components/dashboard/ReadinessCard.jsx` — next to RHR and HRV pills

### Phase 4: Settings Page — Source Priority Override
**Files to modify:**
- `src/pages/Settings.jsx` — Add "Data Sources" section

**UI:**
- New section: "HR Source Priority" (only visible when 2+ HR-capable integrations connected)
- 3 rows: Exercise HR, Sleep HR, Resting HR
- Each row shows connected devices in priority order
- Drag-and-drop reordering (desktop) or up/down arrow buttons (mobile)
- "Reset to recommended" button per row
- Save triggers `PUT /api/settings` with updated priority arrays

**Files to create:**
- `api/settings/hr-priority.js` — GET/PUT endpoint for hr_source_config

### Phase 5: AI Context Enhancement
**Files to modify:**
- `api/_lib/ai.js` — Add hr_source and confidence to activity context and daily metrics context

**Add to AI system prompt context:**
```javascript
// In activity payload:
hr_data: {
  source: 'wahoo_tickr',
  confidence: 'high',
  note: 'Chest strap — gold standard for exercise HR'
}

// In daily metrics:
recovery_hr: {
  rhr: { value: 48, source: 'oura', confidence: 'high' },
  hrv: { value: 62, source: 'oura', confidence: 'high' },
  sleep_hr: { value: 52, source: 'eightsleep', confidence: 'medium' }
}
```

This allows the AI to factor in data quality: "Your HR drift today was 8.1%, measured by your Wahoo chest strap (high confidence). On Feb 18, drift was 3.2% — note that Feb 18 HR was from Strava stream (medium confidence, likely wrist optical), so the comparison should be interpreted with some caution."

## Edge Cases
- **Single HR source:** No disambiguation needed. Don't show the Settings section. Still show the source badge (it builds trust).
- **No HR data at all:** Don't show badge. Show "No HR data" placeholder.
- **Conflicting data:** If Wahoo shows 142 avg and Whoop shows 155 avg for the same ride, use the priority system and note the discrepancy in AI context.
- **Device changes mid-ride:** Some athletes start with a chest strap and it disconnects. FIT file may show mixed sources. Flag as "mixed" confidence.
- **Historical activities:** Backfill `hr_source` for existing activities where possible (infer from integration provider). Mark older activities as 'legacy' confidence.

## Testing Requirements
- **Must test:** `resolveHRSource` returns correct priority for each context
- **Must test:** `detectDeviceType` correctly identifies chest strap vs wrist optical
- **Must test:** SourceBadge renders with correct text for all source types
- **Should test:** Settings drag-and-drop saves correctly
- **Should test:** Badge gracefully handles missing/null source data

## Success Metrics
- **Data quality:** HR-based metrics (drift, EF, decoupling) become more consistent and trustworthy
- **User trust:** Athletes report higher confidence in AIM's HR data (survey)
- **Power user engagement:** >20% of athletes with 2+ devices customize their priority settings

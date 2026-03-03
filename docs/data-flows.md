# AIM Data Flows

Detailed data flow documentation for all major pipelines.

## Integration Sync Pipeline (e.g. Strava)

1. OAuth connect → token stored in `integrations` table → fire-and-forget 365-day backfill auto-triggered on first connect (both Strava and Eight Sleep)
2. Sync fetches activity + streams from provider API
3. Backend computes metrics (NP, TSS, IF, VI, EF, HR drift, zones, power curve) via `/api/_lib/metrics.js`
4. Cross-source deduplication via `source-priority.js` (device > TrainingPeaks > Strava)
5. Upserts to `activities` table, updates `daily_metrics` (CTL/ATL/TSB), updates `power_profiles`
6. Fire-and-forget AI analysis → stored in `activities.ai_analysis` JSONB
7. Fire-and-forget email notification → sends AI analysis email via Resend (first analysis only, if opted in)
8. Fire-and-forget SMS notification → sends workout summary text via Twilio (if opted in)

## TrainingPeaks File Import (`/api/integrations/import/trainingpeaks.js`)

1. User uploads ZIP (workout files) + optional workouts CSV + optional metrics CSV via `TrainingPeaksImport` component (or `UniversalUpload` drag-and-drop). ZIP is optional — CSV-only import enriches existing activities by matching on date.
2. ZIP extracted client-side using JSZip in the browser, workout files (.fit/.tcx/.gpx) grouped into ~3MB batches
3. Each batch sent as base64 JSON to the API; backend parses with `fit.js`/xml2js, computes full metrics
4. After all batches, a finalize request handles CSV enrichment + integration record + backfill
5. Source priority merge: UPGRADE (TP replaces lower-priority source), ENRICH (add metadata), or SKIP (duplicate)
6. Workouts CSV enriches activities with titles, RPE, coach comments, body weight
7. Metrics CSV imports daily health data (RHR, HRV, sleep, SpO2, body fat, Whoop recovery) — only fills null fields, never overwrites device data

## Eight Sleep Hourly Cron (`/api/cron/sync-eightsleep.js`)

1. Vercel Cron fires every hour (`0 * * * *`)
2. Queries active Eight Sleep integrations where `last_sync_at` is null or >6 hours ago
3. Syncs last 2 days of sleep data per user via `fullEightSleepSync`
4. Skips recently-synced users — first run after wake-up does the work, subsequent runs are no-ops
5. Auth: requires `CRON_SECRET` env var, verified via Bearer token

## AI Analysis (`/api/_lib/ai.js`)

- Smart context assembly: 3-layer structure reduces token usage ~60% while improving insight quality
  - `recentWindow` — last 7 days raw activities + daily metrics (trimmed fields)
  - `historicalContext` — pre-computed 90-day summaries: baselines (avg/stdDev/percentiles for HRV/RHR/sleep/weight), training load trends (CTL/ATL/TSB/ACWR), similar efforts (top 5 past activities enriched with that day's recovery), notable outliers (z-score >1.5), performance range, seasonal comparison (recent 14d vs prior 14d)
  - `activityVsBests` — current activity power curve as % of personal bests
- 7 pure helper functions compute summaries server-side: `computeBaselines`, `computeTrainingLoadSummary`, `findSimilarEfforts`, `findNotableOutliers`, `computePerformanceRange`, `computeSeasonalComparison`, `computeActivityVsBests`
- System prompt defines 22 insight categories + DATA STRUCTURE guide for cross-source pattern detection
- Output is structured JSON: summary, insights (with type/category/confidence), and dataGaps ("Unlock More Insights")
- Triggered post-sync, non-blocking

## Blood Panel Upload (`/api/health/upload.js`)

1. User uploads one or more PDF/image files via `BloodPanelUpload` multi-file drag-drop component (sequential processing with progress tracking)
2. File sent to Claude AI for OCR extraction of 25 biomarkers (ferritin, iron, vitamins, thyroid, hormones, lipids, liver/kidney, minerals)
3. Claude handles unit conversions (nmol/L → ng/mL, etc.) and flags normal/high/low/critical
4. PDF stored in Supabase `health-files` bucket, results in `blood_panels` table
5. Fire-and-forget: `generatePanelAnalysis()` cross-references panel with training data and prior panels

## SMS AI Coach (`/api/sms/`)

1. Post-activity: Claude generates 1500-char workout summary with key insights → sent via Twilio
2. Inbound replies: Twilio webhook receives texts, loads conversation history + athlete context, generates AI coaching response
3. TCPA compliance: STOP/UNSUBSCRIBE/CANCEL → opt-out, START/SUBSCRIBE → opt-in, HELP → info text
4. Messages stored in `ai_conversations`/`ai_messages` tables for continuity

## Morning Sleep Summary (`/api/sleep/summary.js`)

- Fetches last night's sleep data + 30-day history + recent activities
- Eight Sleep extended metrics: toss/turns, room temp, HR/HRV min/max, sleep quality/routine/fitness scores
- Claude generates: greeting, metrics line, narrative summary, recommendation, recovery rating (green/yellow/red)

## Metrics Computation (`/api/_lib/metrics.js`)

- Coggan methodology: normalizedPower, intensityFactor, trainingStressScore, variabilityIndex, efficiencyFactor, hrDrift, zoneDistribution, powerCurve
- Training load (`/api/_lib/training-load.js`): CTL (42-day), ATL (7-day), TSB = CTL - ATL, power profile bests at 1/5/10/20/30/60 min

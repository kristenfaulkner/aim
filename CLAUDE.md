# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build → /dist
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test framework is configured.

## Architecture

**AIM** is a performance intelligence platform for endurance athletes. It's a React SPA with Vercel serverless API functions, backed by Supabase (PostgreSQL) and Claude AI for cross-source data analysis.

### Stack
- **Frontend**: React 19 + Vite 7 + React Router DOM 7 (client-side routing)
- **Backend**: Vercel serverless functions in `/api/`
- **Database**: Supabase with Row-Level Security (RLS handles user isolation)
- **AI**: Anthropic Claude for multi-source activity analysis (`/api/_lib/ai.js`)
- **SMS**: Twilio for post-workout texts and conversational AI coaching (`/api/sms/`)
- **Charting**: Recharts
- **Styling**: Inline styles with design tokens (`/src/theme/tokens.js`), no CSS framework

### Frontend (`/src/`)
- `App.jsx` — route definitions; protected routes wrap with `ProtectedRoute`
- `context/AuthContext.jsx` — user auth state, profile management, Supabase auth listeners
- `pages/` — 16 route-level pages (Dashboard, ActivityDetail, HealthLab, Boosters, ConnectApps, Settings, Onboarding, Auth, ResetPassword, Landing, Contact, 5 legal pages)
- `components/` — reusable: `TrainingPeaksImport`, `BloodPanelUpload`, `ProtectedRoute`, `NeuralBackground`
- `hooks/useDashboardData.js` — parallel Supabase queries (7 concurrent) using `Promise.allSettled`
- `hooks/useActivities.js` — paginated activity list
- `lib/api.js` — `apiFetch()` utility adds Bearer token to all `/api` calls
- `lib/supabase.js` — Supabase client init
- `data/` — static data: integrations metadata, biomarker clinical ranges, booster protocols, power classification tables
- `theme/tokens.js` — design tokens exported as `T` (colors, fonts); `catColors` for booster categories

### Backend (`/api/`)
- `_lib/` — shared utilities:
  - `ai.js` — AI analysis engine with smart context assembly
  - `metrics.js` — Coggan power/HR metrics computation
  - `training-load.js` — CTL/ATL/TSB calculation and power profile updates
  - `source-priority.js` — cross-source deduplication (device > TrainingPeaks > Strava)
  - `fit.js` — FIT binary file parser for Garmin/Wahoo workout files
  - `strava.js` — Strava API client with token refresh
  - `eightsleep.js` — Eight Sleep API client (credential auth, trends API, extended metrics extraction)
  - `twilio.js` — Twilio SMS client (send, webhook verification, TwiML response)
  - `auth.js` — session verification, CORS
  - `supabase.js` — admin + public Supabase clients
  - `redis.js` — Redis client for OAuth state
- `auth/connect/` — OAuth flow initiators (strava, wahoo, oura, whoop, withings, eightsleep)
- `auth/callback/` — OAuth return handlers (strava, wahoo, oura, whoop, withings)
- `integrations/sync/` — sync logic (strava full+backfill, eightsleep)
- `integrations/import/` — file-based imports (TrainingPeaks ZIP/CSV)
- `webhooks/` — inbound webhooks (strava activity events, wahoo workout summaries)
- `activities/` — list, detail, annotate, analyze endpoints
- `health/` — blood panel upload (Claude AI extraction from PDF/image) and panel management
- `sleep/summary.js` — Claude-powered morning readiness assessment
- `chat/ask.js` — AI coach conversation endpoint with full athlete context
- `sms/` — Twilio SMS: send workout summaries, test/preview, inbound webhook (STOP/START/HELP + conversational AI replies)
- `user/` — profile, integrations list, disconnect
- `settings.js` — notification preferences and user settings

**API pattern**: Every endpoint calls `cors(res)`, checks `req.method`, calls `verifySession(req)` for auth, returns `{ error: "message" }` on failure.

### Key Data Flows

**Integration sync pipeline** (e.g. Strava):
1. OAuth connect → token stored in `integrations` table
2. Sync fetches activity + streams from provider API
3. Backend computes metrics (NP, TSS, IF, VI, EF, HR drift, zones, power curve) via `/api/_lib/metrics.js`
4. Cross-source deduplication via `source-priority.js` (device > TrainingPeaks > Strava)
5. Upserts to `activities` table, updates `daily_metrics` (CTL/ATL/TSB), updates `power_profiles`
6. Fire-and-forget AI analysis → stored in `activities.ai_analysis` JSONB
7. Fire-and-forget SMS notification → sends workout summary text via Twilio (if opted in)

**TrainingPeaks file import** (`/api/integrations/import/trainingpeaks.js`):
1. User uploads ZIP (workout files) + optional workouts CSV + optional metrics CSV via `TrainingPeaksImport` component
2. ZIP uploaded to Supabase `import-files` bucket, CSVs sent as base64
3. Backend extracts .fit/.tcx/.gpx files, parses with `fit.js`/xml2js, computes full metrics
4. Source priority merge: UPGRADE (TP replaces lower-priority source), ENRICH (add metadata), or SKIP (duplicate)
5. Workouts CSV enriches activities with titles, RPE, coach comments, body weight
6. Metrics CSV imports daily health data (RHR, HRV, sleep, SpO2, body fat, Whoop recovery) — only fills null fields, never overwrites device data

**AI analysis** (`/api/_lib/ai.js`):
- Smart context assembly: 3-layer structure reduces token usage ~60% while improving insight quality
  - `recentWindow` — last 7 days raw activities + daily metrics (trimmed fields)
  - `historicalContext` — pre-computed 90-day summaries: baselines (avg/stdDev/percentiles for HRV/RHR/sleep/weight), training load trends (CTL/ATL/TSB/ACWR), similar efforts (top 5 past activities enriched with that day's recovery), notable outliers (z-score >1.5), performance range, seasonal comparison (recent 14d vs prior 14d)
  - `activityVsBests` — current activity power curve as % of personal bests
- 7 pure helper functions compute summaries server-side: `computeBaselines`, `computeTrainingLoadSummary`, `findSimilarEfforts`, `findNotableOutliers`, `computePerformanceRange`, `computeSeasonalComparison`, `computeActivityVsBests`
- System prompt defines 13+ insight categories + DATA STRUCTURE guide for cross-source pattern detection
- Output is structured JSON: summary, insights (with type/category/confidence), and dataGaps ("Unlock More Insights")
- Triggered post-sync, non-blocking

**Blood panel upload** (`/api/health/upload.js`):
1. User uploads PDF/image via `BloodPanelUpload` drag-drop component
2. File sent to Claude AI for OCR extraction of 25 biomarkers (ferritin, iron, vitamins, thyroid, hormones, lipids, liver/kidney, minerals)
3. Claude handles unit conversions (nmol/L → ng/mL, etc.) and flags normal/high/low/critical
4. PDF stored in Supabase `health-files` bucket, results in `blood_panels` table
5. Fire-and-forget: `generatePanelAnalysis()` cross-references panel with training data and prior panels

**SMS AI Coach** (`/api/sms/`):
1. Post-activity: Claude generates 1500-char workout summary with key insights → sent via Twilio
2. Inbound replies: Twilio webhook receives texts, loads conversation history + athlete context, generates AI coaching response
3. TCPA compliance: STOP/UNSUBSCRIBE/CANCEL → opt-out, START/SUBSCRIBE → opt-in, HELP → info text
4. Messages stored in `ai_conversations`/`ai_messages` tables for continuity

**Morning sleep summary** (`/api/sleep/summary.js`):
- Fetches last night's sleep data + 30-day history + recent activities
- Eight Sleep extended metrics: toss/turns, room temp, HR/HRV min/max, sleep quality/routine/fitness scores
- Claude generates: greeting, metrics line, narrative summary, recommendation, recovery rating (green/yellow/red)

**Metrics computation** (`/api/_lib/metrics.js`):
- Coggan methodology: normalizedPower, intensityFactor, trainingStressScore, variabilityIndex, efficiencyFactor, hrDrift, zoneDistribution, powerCurve
- Training load (`/api/_lib/training-load.js`): CTL (42-day), ATL (7-day), TSB = CTL - ATL, power profile bests at 1/5/10/20/30/60 min

### Database (Supabase)

Core tables (10): `profiles`, `integrations`, `activities`, `daily_metrics`, `power_profiles`, `blood_panels`, `dexa_scans`, `user_settings`, `ai_conversations`, `ai_messages`

- All tables reference `profiles.id` (UUID from Supabase Auth) with CASCADE delete
- RLS policies scope all client-side queries to the authenticated user
- Backend uses `supabaseAdmin` (service role key) to bypass RLS when needed
- Key unique constraints: `activities(user_id, source, source_id)`, `daily_metrics(user_id, date)`, `integrations(user_id, provider)`
- Trigger `handle_new_user()` auto-creates profile on auth signup
- Trigger `update_updated_at()` auto-maintains timestamps on profiles, integrations, daily_metrics, user_settings, ai_conversations
- Storage buckets: `health-files` (blood panels, DEXA PDFs), `import-files` (TrainingPeaks uploads)
- Full schema: `/supabase/migrations/001_initial_schema.sql`; storage bucket: `/supabase/migrations/004_add_import_files_bucket.sql`

### Deployment

Vercel auto-deploys from GitHub. Frontend SPA rewrite in `vercel.json` routes non-API paths to `index.html`. Environment variables configured in Vercel dashboard.

## Product Context

### Vision
AIM is the performance intelligence layer that sits on top of all athlete health and fitness data. It replaces fragmented tools (Strava for social, Oura for recovery, Whoop for strain, Withings for body comp) with a single platform that uses Claude AI to find cross-domain patterns no individual app can detect. Founded by Kristen Faulkner, 2x Olympic Gold Medalist in Cycling (Paris 2024, Road Race & Team Pursuit).

### Target Users
1. Competitive cyclists (Cat 1-5, masters racers, triathletes)
2. Serious amateurs who train 8-15+ hrs/week and care about data
3. Coaches who want AI-augmented analysis
4. Eventually: runners, triathletes, swimmers, multisport

### Brand
- **Name:** AIM — the "AI" is visually highlighted in gradient in the logo
- **Tagline:** AI-powered performance intelligence
- **Aesthetic:** Dark theme, luxury-minimal
- **Colors:** `#05060a` (bg), `#0c0d14` (surface), `#111219` (card), `#00e5a0` (accent green), `#3b82f6` (blue), green-to-blue gradient for premium elements
- **Fonts:** Outfit (body/UI), JetBrains Mono (metrics/numbers)
- **Icons:** Lucide React

### Pricing
| Plan | Monthly | Annual |
|------|---------|--------|
| Starter | $19/mo | $15/mo ($180/yr) |
| Pro | $49/mo | $39/mo ($468/yr) |
| Elite | $99/mo | $79/mo ($948/yr) |

All plans include 14-day free trial, no credit card required.

## Integrations

### Tier 1 — Cycling Core (launch priority)
- **Strava** ✅ — OAuth + full sync + backfill + metrics + streams + webhook (activity create/update/delete)
- **Wahoo** ✅ — OAuth + webhook receiver for workout summaries (maps workout data to activities)
- **Garmin Connect** — activities, body battery, stress, daily HR (not yet started)
- **TrainingPeaks** ✅ — file import: ZIP (.fit/.tcx/.gpx workout files with full metrics computation) + workouts CSV (titles/RPE/comments/body weight) + metrics CSV (daily RHR/HRV/sleep/SpO2/body fat/Whoop recovery)

### Tier 2 — Recovery & Body
- **Oura Ring** — OAuth connect/callback exist, sync logic TODO
- **Whoop** — OAuth connect/callback exist, sync logic TODO
- **EightSleep** ✅ — credential auth (email/password), trends API sync, sleep metrics (score, duration, stages, HRV, RHR, bed temp), extended metrics (toss/turns, room temp, HR/HRV min/max, sleep quality/routine/fitness scores)
- **Withings** — OAuth connect/callback exist, sync logic TODO

### Tier 3 — Advanced
Apple Health, Supersapiens/Lingo (CGM), MyFitnessPal, Cronometer, TrainerRoad, Intervals.icu, Zwift, Hammerhead, Hexis, Noom

### Communication
- **Twilio** ✅ — SMS workout summaries (auto-sent post-sync), conversational AI coaching (inbound replies), TCPA-compliant opt-in/out (STOP/START/HELP keywords), test/preview endpoint

### Integration Pattern
OAuth2 flow: connect/callback file pairs in `/api/auth/`. Credential-based for EightSleep (email/password in `integrations.metadata`). File-based for TrainingPeaks (ZIP + CSV upload via `import-files` Supabase storage bucket). Tokens stored with refresh logic in `integrations` table. Data normalized to `activities` and `daily_metrics`.

## AI Analysis Engine

### Core Principle
Cross-domain insights are the product. Every AI insight must connect 2+ data sources and tell the athlete something they cannot learn from any single app. "Your HRV was low" is Whoop-level. "Your HRV was 38ms, which explains why cardiac drift was 8.1% today vs 3.2% on Feb 18 when HRV was 72ms" is AIM-level.

### AI-Powered Features (6 total)
1. **Post-ride analysis** — 13-category structured insights triggered after every activity sync
2. **SMS workout summaries** — 1500-char Claude-generated texts sent via Twilio post-sync
3. **SMS conversational coaching** — inbound reply handling with full athlete context
4. **Morning sleep summary** — readiness assessment from Eight Sleep + training context
5. **Blood panel analysis** — PDF/image OCR extraction + cross-reference with training data
6. **Chat coach** — real-time Q&A via `/api/chat/ask` with conversation history

### 13 Insight Categories
1. **Body Composition → Performance** — W/kg from Withings + power output, weight loss rate monitoring, hydration impact on cardiac drift, race weight projection
2. **Sleep Architecture → Next-Day Performance** — deep sleep vs NP/EF, REM vs tactical performance, sleep timing correlations, EightSleep temperature optimization
3. **HRV Patterns → Training Prescription** — personal HRV thresholds, dose-response curves, readiness traffic light (Green 70+/Yellow 45-69/Red <45)
4. **Environmental Performance Modeling** — heat adaptation (power:HR at temperature), altitude impact, wind-adjusted performance
5. **Fatigue Signature Analysis** — L/R balance shift under fatigue, cadence decay, power fade patterns, pacing intelligence
6. **Long-Term Training Adaptations** — dose-response modeling (zone minutes → FTP change), periodization, year-over-year progress, strain/recovery balance
7. **Nutrition & Fueling Intelligence** — carb/hr vs power fade, CGM glucose monitoring, caloric balance, pre-ride timing
8. **Predictive Analytics** — race-day FTP prediction, event time estimation (VAM + weight + gradient), taper protocol, power profile vs race demands
9. **Benchmarking & Classification** — Coggan power classification at each duration, weakest-link identification, age-adjusted percentile ranking
10. **Menstrual Cycle Intelligence** — cycle phase detection from Oura basal temperature, luteal HR/temp adjustments, personal patterns after 3+ cycles (opt-in via `uses_cycle_tracking`)
11. **Performance Booster Cross-References** — supplement impact detection (pre/post metrics), protocol compliance, recovery recommendations
12. **Blood Work → Training Impact** — ferritin vs VO2max (athlete-optimal >50, not clinical >12), vitamin D, thyroid, CRP inflammation, hormonal health
13. **DEXA Scan → Power & Body Composition** — lean mass W/kg accuracy, regional L/R imbalances, visceral fat tracking

### Insight Quality Rules
- Connect 2+ data sources in most insights
- Use specific numbers from the athlete's own data
- Compare to athlete's own history before population benchmarks
- Include one actionable takeaway per insight
- Assign confidence level (high/medium/low)
- Never assume causation without evidence — use "may be related to"

### AI Output Format
```json
{
  "summary": "2-3 sentence workout summary",
  "insights": [{ "type": "insight|positive|warning|action", "icon": "emoji", "category": "performance|body|recovery|training|nutrition|environment|health", "title": "Short title with key number", "body": "Explanation connecting 2+ sources with actionable takeaway", "confidence": "high|medium|low" }],
  "dataGaps": ["Suggestions for additional integrations"]
}
```

## Auto-Calculated Metrics

### TrainingPeaks Parity (in `/api/_lib/metrics.js`)
- **Power:** Average, Normalized (30s rolling avg → 4th power → avg → 4th root), Max, Intensity Factor (NP/FTP), TSS, Variability Index (NP/Avg), Work (kJ)
- **Heart Rate:** Avg/Max HR, HR Drift % (2nd half vs 1st half), Efficiency Factor (NP/Avg HR), Decoupling %
- **Training Load (PMC):** CTL (42-day EWA of TSS), ATL (7-day EWA), TSB = CTL - ATL, Ramp Rate (flag >7 TSS/week)
- **Zones:** Coggan Power Zones (Z1-Z7) time-in-zone

### Dashboard-Computed Metrics
- **Fuel breakdown:** Estimated macronutrient oxidation (carb/fat/protein %) from calories + intensity factor
- **Power classification:** Coggan categories (untrained → world-class) from power profile
- **Workout prescriptions:** Next workout recommendations based on gaps in power profile

### Novel Body Comp Metrics (require Withings/DEXA)
- W/kg = FTP / Withings weight (updates with each weigh-in)
- W/kg lean = FTP / lean body mass from DEXA
- Race weight projection (loss rate extrapolated to event date)
- Climbing physics: system weight (rider + bike + gear), gravity power at gradient, watts/lb saved, time saved per kg

### Recovery Score (0-100)
HRV vs personal baseline (30%) + sleep quality (25%) + RHR deviation (15%) + Whoop/Oura readiness (15%) + body temp deviation (10%) + recent training load (5%). Green 70+ / Yellow 45-69 / Red <45.

## Build Status

### Completed
- Project setup (Vite + React + React Router + Supabase)
- Design system (theme tokens, dark theme, NeuralBackground animation)
- Auth (email/password, Google SSO, magic link, password reset, protected routes)
- Onboarding (profile, FTP/HR zone setup with power zones Z1-Z7 and HR zones Z1-Z5)
- **Strava** integration (full: OAuth, sync, backfill, metrics, streams, webhook, cross-source dedup)
- **EightSleep** integration (credential auth with password visibility toggle, trends API, sleep metrics + extended metrics sync)
- **Wahoo** integration (OAuth + webhook receiver for workout summaries)
- **TrainingPeaks** file import (ZIP workouts + workouts CSV + metrics CSV with daily health data)
- **Twilio SMS** AI coach (post-workout summaries, conversational inbound replies, TCPA consent flow with STOP/START/HELP)
- Oura, Whoop, Withings OAuth connect/callback (sync logic TODO)
- AI post-ride analysis engine with smart context assembly (3-layer pre-computed summaries, ~60% token reduction)
- AI chat coach endpoint (`/api/chat/ask` with conversation history + full athlete context)
- Morning sleep summary (Claude-powered readiness assessment from Eight Sleep data)
- Dashboard (activities feed with View Details navigation, quick stats, recovery metrics, training load PMC chart, sleep summary, fuel breakdown, power classification, workout prescriptions, AI insights panel with "Unlock More Insights")
- Activity detail page with tabbed AI panel (Summary / AI Analysis / Ask Claude tabs, category filters, confidence badges, data gaps, regenerate analysis)
- Health Lab: blood panel upload with Claude AI OCR extraction (25 biomarkers), AI analysis cross-referencing training data, biomarker trend charts with athlete-optimal ranges, panel management
- DEXA scan tracking
- Boosters page (searchable/filterable protocol library)
- Connect Apps page with integration management, sync buttons, feature request form
- Settings page (profile, SMS opt-in, notification preferences)
- Landing page with pricing, founder section, neural background
- Legal pages (privacy, terms, GDPR, cookie policy, data processing)
- Source priority system (`_lib/source-priority.js`: device > TrainingPeaks > Strava)
- Supabase storage: `health-files` bucket (blood/DEXA), `import-files` bucket (TrainingPeaks uploads)
- Vercel deployment with GitHub auto-deploy

### Remaining
- Garmin Connect sync logic
- Oura / Whoop / Withings sync logic
- Cross-domain AI insights (multi-source pattern detection beyond single-activity analysis)
- Training prescription engine (workout recommendations from power profile gaps)
- Menstrual cycle intelligence (Oura temperature-based phase detection)
- Stripe payments (3-tier subscription + feature gating)
- Remaining Tier 3 integrations
- Activity annotation columns migration (user_notes, user_rating, user_rpe, user_tags — SQL exists at `/sql/add_activity_annotations.sql`, not yet applied to production)
- Coach sharing, community benchmarks, weekly digest emails, mobile app

## Conventions

- **No TypeScript** — plain JavaScript throughout
- **Inline styles** using design token object `T` from `src/theme/tokens.js`; no Tailwind or CSS-in-JS
- **Fonts**: Outfit (UI), JetBrains Mono (numbers/code)
- **Dark theme only** — backgrounds `#05060a`/`#0c0d14`, accent `#00e5a0`
- **Icons**: Lucide React
- **Auth tokens**: Bearer token via `Authorization` header; `apiFetch()` handles this automatically on frontend
- OAuth integrations use connect/callback file pairs in `/api/auth/`; credential-based auth (EightSleep) stores email/password in `integrations.metadata`; file import (TrainingPeaks) uses Supabase storage bucket

## Reference Docs

Detailed specifications archived in `docs/`:
- `docs/product-blueprint.md` — full product spec, booster library (20+ protocols with dosing/timing/evidence), menstrual cycle science (10 peer-reviewed papers), onboarding fields, community benchmarking engine, pricing tiers and feature gating, user stories
- `docs/technical-architecture.md` — complete database schema SQL, 25-task build plan, Strava API appendix, EightSleep workarounds, environment variable reference
- `docs/insights-catalog.md` — all 13 insight categories with detailed examples and specific numbers, insight quality checklist, system prompt integration guide, template for adding new categories

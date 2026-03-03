# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build → /dist
npm run lint       # ESLint
npm run preview    # Preview production build
npm run test       # Vitest in watch mode
npm run test:ci    # Vitest single run (CI/CD)
npm run test:e2e   # Playwright end-to-end tests
```

Testing uses Vitest + React Testing Library + MSW + Playwright. See `AIM-TESTING-STRATEGY.md` for conventions.

## Architecture

**AIM** is a performance intelligence platform for endurance athletes. It's a React SPA with Vercel serverless API functions, backed by Supabase (PostgreSQL) and Claude AI for cross-source data analysis.

### Stack
- **Frontend**: React 19 + Vite 7 + React Router DOM 7 (client-side routing)
- **Backend**: Vercel serverless functions in `/api/`
- **Database**: Supabase with Row-Level Security (RLS handles user isolation)
- **AI**: Anthropic Claude for multi-source activity analysis (`/api/_lib/ai.js`)
- **SMS**: Twilio for post-workout texts and conversational AI coaching (`/api/sms/`)
- **Charting**: Recharts
- **Testing**: Vitest + React Testing Library + MSW (mocks) + Playwright (e2e); see `AIM-TESTING-STRATEGY.md`
- **Styling**: Inline styles with design tokens (`/src/theme/tokens.js`), no CSS framework

### Frontend (`/src/`)
- `App.jsx` — route definitions; protected routes wrap with `ProtectedRoute`
- `context/AuthContext.jsx` — user auth state, profile management, Supabase auth listeners
- `pages/` — 19 route-level pages (Dashboard, Sleep, ActivityDetail, HealthLab, Boosters, ConnectApps, Settings, WorkoutDatabase, Onboarding, AcceptTerms, Auth, ResetPassword, Landing, Contact, 5 legal pages)
- `components/` — reusable: `TrainingPeaksImport`, `BloodPanelUpload` (multi-file drag-and-drop), `DexaScanUpload` (single-file drag-and-drop with body composition extraction), `ActivityBrowser` (popover with time filters/search/pagination), `ProtectedRoute` (auth + consent gate), `NeuralBackground`, `SEO` (React 19 native metadata: title, description, OG, Twitter cards, canonical URL), `SessionNotes` (activity annotation: freeform notes, star rating, RPE slider 0-10, tag input with alias normalization — shared across Activities and ActivityDetail pages)
- `components/dashboard/` — modular dashboard components: `ReadinessCard` (SVG ring + 4 metric pills), `AIPanel` (3-tab AI analysis/summary/chat), `LastRideCard` (8-metric grid), `TrainingWeekChart` (7-day TSS bars), `FitnessChart` (CTL/ATL/TSB SVG), `WorkingGoals` (expandable goal cards with 3 tabs), `NutritionLogger` (5-stage conversational modal with Claude parsing)
- `hooks/useDashboardData.js` — parallel Supabase queries (7 concurrent) using `Promise.allSettled`
- `hooks/useActivities.js` — paginated activity list (legacy, replaced by useActivityBrowser on Dashboard)
- `hooks/useSleepData.js` — sleep data from `daily_metrics` with configurable time period, computes averages
- `hooks/useActivityBrowser.js` — cursor-based paginated activity browser with time period filtering (Week/Month/Year/All) and client-side search
- `hooks/useResponsive.js` — responsive breakpoint hook (`isMobile`/`isTablet`/`isDesktop`) via `matchMedia`
- `lib/api.js` — `apiFetch()` utility adds Bearer token to all `/api` calls
- `lib/supabase.js` — Supabase client init
- `lib/zones.js` — `computePowerZones(ftp)` and `computeHRZones(maxHR)` used by Onboarding + Settings
- `lib/formatText.jsx` — `cleanText()` strips markdown artifacts from AI JSON text fields; `FormattedText` component renders paragraphs, `**bold**` as `<strong>`, `*italic*` as `<em>`
- `lib/formatTime.js` — `formatActivityDate()`, `formatActivityTime()`, `getActivityTimezoneAbbrev()` helpers
- `data/` — static data: integrations metadata, biomarker clinical ranges, booster protocols, power classification tables
- `theme/tokens.js` — design tokens exported as `T` (colors, fonts); `catColors` for booster categories; `breakpoints` and `touchMin` for responsive design; `breakpoints` (mobile/tablet) and `touchMin` (44px)

### Backend (`/api/`)
- `_lib/` — shared utilities:
  - `ai.js` — AI analysis engine with smart context assembly
  - `metrics.js` — Coggan power/HR metrics computation
  - `training-load.js` — CTL/ATL/TSB calculation and power profile updates
  - `source-priority.js` — cross-source deduplication (device > TrainingPeaks > Strava)
  - `fit.js` — FIT binary file parser for Garmin/Wahoo workout files (returns fitLaps for interval extraction)
  - `intervals.js` — Interval extraction from FIT laps + power stream detection, per-interval metrics + execution quality scoring
  - `tags.js` — Canonical tag dictionary (22 workout + 14 interval tags) + detection engine, cross-activity search
  - `weather-enrich.js` — Per-activity weather enrichment via Open-Meteo historical API
  - `interval-insights.js` — deterministic interval execution insight generation (fade, cadence decay, HR creep, pacing)
  - `planned-vs-actual.js` — training plan to activity matching, interval comparison, execution scoring
  - `performance-models.js` — conditional performance models: heat penalty, sleep→execution, HRV readiness, fueling→durability, kJ/kg durability threshold
  - `strava.js` — Strava API client with token refresh
  - `eightsleep.js` — Eight Sleep API client (credential auth, trends API, extended metrics extraction, encrypted credential decryption)
  - `twilio.js` — Twilio SMS client (send, webhook verification, TwiML response)
  - `email.js` — Resend email client (send)
  - `crypto.js` — AES-256-GCM encryption/decryption for stored credentials (uses `CREDENTIAL_ENCRYPTION_KEY` env var)
  - `auth.js` — session verification, CORS
  - `supabase.js` — admin + public Supabase clients
  - `redis.js` — Redis client for OAuth state
- `auth/connect/` — OAuth flow initiators (strava, wahoo, oura, whoop, withings, eightsleep)
- `auth/callback/` — OAuth return handlers (strava, wahoo, oura, whoop, withings)
- `integrations/sync/` — sync logic (strava full+backfill, eightsleep)
- `integrations/import/` — file-based imports (TrainingPeaks ZIP/CSV, ZIP optional for CSV-only enrichment)
- `cron/sync-eightsleep.js` — hourly Vercel Cron syncs last 2 days of Eight Sleep data; skips users synced in last 6 hours
- `webhooks/` — inbound webhooks (strava activity events, wahoo workout summaries)
- `activities/` — list, detail (includes activity_tags + planned_vs_actual data), annotate (saves user_notes/rating/RPE/tags + name; auto-extracts tags from notes via keyword matching; normalizes all tags to canonical form via `TAG_ALIASES` — e.g. "S&E"→"low cadence", "TT"→"time trial"), analyze, search (tag-based), query (advanced tag/filter/grouping search), smart-chips (AI-suggested query chips), backfill-intervals, backfill-metrics endpoints
- `tags/` — tag dictionary endpoint
- `health/` — blood panel upload (Claude AI extraction from PDF/image), DEXA scan upload (Claude AI extraction of body composition/regional data), and panel management
- `sleep/summary.js` — Claude-powered morning readiness assessment
- `chat/ask.js` — AI coach conversation endpoint with full athlete context
- `sms/` — Twilio SMS: send workout summaries, test/preview, inbound webhook (STOP/START/HELP + conversational AI replies)
- `email/send.js` — Resend email: post-workout AI analysis emails (Claude-formatted HTML, first-analysis-only dedup, branded dark-theme template)
- `user/` — profile, integrations list, disconnect, accept-terms (consent recording), delete (account deletion with cascade), export (full data export as JSON)
- `settings.js` — notification preferences and user settings
- `weather/current.js` — Open-Meteo API weather fetch, caches in `daily_metrics.weather_data`
- `goals/` — working goals CRUD: list, upsert, update-status (status/checklist toggle)
- `nutrition/` — nutrition logging: parse (Claude-powered free-text → structured items), log (save to `nutrition_logs`), previous (last log for quick reuse)
- `calendar/` — training calendar: list (date range query), upsert (create/update planned workouts)
- `models/` — performance model summary endpoint
- `dashboard/intelligence.js` — adaptive AI dashboard: 3 modes (POST_RIDE/PRE_RIDE_PLANNED/DAILY_COACH), returns structured action items + insights

**API pattern**: Every endpoint calls `cors(res)`, checks `req.method`, calls `verifySession(req)` for auth, returns `{ error: "message" }` on failure.

### Key Data Flows

See `docs/data-flows.md` for detailed pipeline documentation (Strava sync, TrainingPeaks import, Eight Sleep cron, AI analysis, blood panel upload, SMS coach, sleep summary, metrics computation).

**Summary**: OAuth connect → sync → compute metrics → dedup → upsert → fire-and-forget AI analysis + email + SMS. TrainingPeaks is file-based (ZIP + CSV). Eight Sleep syncs hourly via Vercel Cron. AI uses 3-layer smart context assembly (~60% token reduction).

### Database (Supabase)

Core tables (13): `profiles`, `integrations`, `activities`, `daily_metrics`, `power_profiles`, `blood_panels`, `dexa_scans`, `user_settings`, `ai_conversations`, `ai_messages`, `training_calendar`, `working_goals`, `nutrition_logs`

- All tables reference `profiles.id` (UUID from Supabase Auth) with CASCADE delete
- RLS policies scope all client-side queries to the authenticated user
- Backend uses `supabaseAdmin` (service role key) to bypass RLS when needed
- Key unique constraints: `activities(user_id, source, source_id)`, `daily_metrics(user_id, date)`, `integrations(user_id, provider)`
- Trigger `handle_new_user()` auto-creates profile on auth signup
- Trigger `update_updated_at()` auto-maintains timestamps on profiles, integrations, daily_metrics, user_settings, ai_conversations
- `profiles` consent columns: `terms_accepted_at`, `privacy_accepted_at`, `health_data_consent_at`, `health_data_consent_withdrawn_at`, `account_deletion_requested_at`, `account_deletion_scheduled_for`, `is_deleted`
- `training_calendar` — planned workouts with `structure` (JSONB intervals) and `nutrition_plan` (JSONB), linked to `activities` via `activity_id` FK
- `working_goals` — athlete goals with trend JSONB, action_plan JSONB, this_week checklist JSONB, auto-updated `updated_at`
- `nutrition_logs` — per-activity fueling with items/totals/per_hour JSONB, linked to `activities` via `activity_id` FK
- `profiles` location columns: `location_lat`, `location_lng` (for weather)
- `daily_metrics.weather_data` JSONB column (cached Open-Meteo data)
- `activity_tags` — canonical tags for cross-activity search (tag_id, scope, confidence, evidence JSONB, interval_index), RLS enabled
- `activities.activity_weather` JSONB column — per-activity weather from Open-Meteo historical API
- `activities.laps` JSONB column — structured interval data with per-interval metrics + execution quality
- `activities.user_notes`, `user_rating`, `user_rpe`, `user_tags` — activity annotation columns
- Storage buckets: `health-files` (blood panels, DEXA PDFs), `import-files` (TrainingPeaks uploads)
- Full schema: `/supabase/migrations/001_initial_schema.sql`; storage bucket: `/supabase/migrations/004_add_import_files_bucket.sql`; consent columns: `/supabase/migrations/005_add_consent_columns.sql`; dashboard v2 tables: `/supabase/migrations/006_dashboard_v2_tables.sql`; structured workouts: `/supabase/migrations/008_structured_workouts.sql`

### Deployment

**Production URL**: https://aimfitness.ai (Vercel domain: `aim-ashen.vercel.app`)

Vercel auto-deploys from GitHub. Frontend SPA rewrite in `vercel.json` routes non-API paths to `index.html`. Environment variables configured in Vercel dashboard. Custom domain `aimfitness.ai` with `www` redirect. SSL handled by Vercel.

**Vercel Cron**: Eight Sleep hourly sync configured in `vercel.json` `crons` array. Requires `CRON_SECRET` env var in Vercel dashboard for auth.

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
- **Aesthetic:** Light theme, luxury-minimal
- **Colors:** `#f8f8fa` (bg), `#f0f0f3` (surface), `#ffffff` (card), `#10b981` (accent teal-green), `#3b82f6` (blue), green-to-blue gradient for premium elements
- **Fonts:** DM Sans (body/UI), JetBrains Mono (metrics/numbers)
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
- **Strava** ✅ — OAuth + full sync + backfill + metrics + streams + webhook (activity create/update/delete) + auto 365-day backfill on first connect
- **Wahoo** ✅ — OAuth + webhook receiver for workout summaries (maps workout data to activities)
- **Garmin Connect** — activities, body battery, stress, daily HR (not yet started)
- **TrainingPeaks** ✅ — file import: ZIP (.fit/.tcx/.gpx workout files with full metrics computation, ZIP optional for CSV-only enrichment) + workouts CSV (titles/RPE/comments/body weight) + metrics CSV (daily RHR/HRV/sleep/SpO2/body fat/Whoop recovery)

### Tier 2 — Recovery & Body
- **Oura Ring** — OAuth connect/callback exist, sync logic TODO
- **Whoop** — OAuth connect/callback exist, sync logic TODO
- **EightSleep** ✅ — credential auth (email/password), trends API sync, sleep metrics (score, duration, stages, HRV, RHR, bed temp), extended metrics (toss/turns, room temp, HR/HRV min/max, sleep quality/routine/fitness scores), auto 365-day sync on first connect, hourly Vercel Cron auto-sync (skips if synced in last 6 hours)
- **Withings** — OAuth connect/callback exist, sync logic TODO

### Tier 3 — Advanced
Apple Health, Supersapiens/Lingo (CGM), MyFitnessPal, Cronometer, TrainerRoad, Intervals.icu, Zwift, Hammerhead, Hexis, Noom

### Communication
- **Resend** ✅ — Email workout analysis (Claude-formatted HTML, sent after first AI analysis, branded dark-theme template, first-analysis-only dedup)
- **Twilio** ✅ — SMS workout summaries (auto-sent post-sync), conversational AI coaching (inbound replies), TCPA-compliant opt-in/out (STOP/START/HELP keywords), test/preview endpoint

### Integration Pattern
OAuth2 flow: connect/callback file pairs in `/api/auth/`. Credential-based for EightSleep (email/password AES-256-GCM encrypted in `integrations.metadata` via `crypto.js`, backward compatible with unencrypted legacy records). File-based for TrainingPeaks (ZIP + CSV upload via `import-files` Supabase storage bucket). Tokens stored with refresh logic in `integrations` table. Data normalized to `activities` and `daily_metrics`.

## AI Analysis Engine

### Core Principle
Cross-domain insights are the product. Every AI insight must connect 2+ data sources and tell the athlete something they cannot learn from any single app. "Your HRV was low" is Whoop-level. "Your HRV was 38ms, which explains why cardiac drift was 8.1% today vs 3.2% on Feb 18 when HRV was 72ms" is AIM-level.

### AI-Powered Features (9 total)
1. **Post-ride analysis** — 22-category structured insights triggered after every activity sync
2. **Email workout analysis** — Claude-formatted HTML emails via Resend with full AI analysis, sent on first analysis only (no duplicates on re-analysis or bulk import)
3. **SMS workout summaries** — 1500-char Claude-generated texts sent via Twilio post-sync
4. **SMS conversational coaching** — inbound reply handling with full athlete context
5. **Morning sleep summary** — readiness assessment from Eight Sleep + training context
6. **Blood panel analysis** — PDF/image OCR extraction + cross-reference with training data
7. **Chat coach** — real-time Q&A via `/api/chat/ask` with conversation history
8. **Nutrition parsing** — Claude-powered free-text → structured nutrition items with per-hour calculations via `/api/nutrition/parse`
9. **Adaptive dashboard intelligence** — 3-mode AI (POST_RIDE/PRE_RIDE_PLANNED/DAILY_COACH) via `/api/dashboard/intelligence`

### 22 Insight Categories

See `docs/insights-catalog.md` for the full list with detailed examples. Categories span: Body Comp→Performance, Sleep→Performance, HRV→Training, Environmental, Fatigue Signatures, Long-Term Adaptations, Nutrition, Predictive Analytics, Benchmarking, Menstrual Cycle, Boosters, Blood Work, DEXA, Workout Tagging, Weather Context, Interval Execution, Durability, Fueling Causality, Readiness-to-Response, Workout Progression, Anomaly Detection, Race-Specific Analysis.

### Insight Quality Rules
- Connect 2+ data sources in most insights
- Use specific numbers from the athlete's own data
- Compare to athlete's own history before population benchmarks
- Include one actionable takeaway per insight
- Assign confidence level (high/medium/low)
- Never assume causation without evidence — use "may be related to"
- **Never give direct medical advice** — see "No Medical Advice Policy" section below for details

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

See `docs/build-status.md` for the full detailed log. Summary of what's built:

**Core**: Auth (email/password/Google SSO/magic link), onboarding, Vercel deployment, mobile-responsive, testing (141 tests), SEO, legal compliance, account management
**Integrations**: Strava (full), EightSleep (full + hourly cron), Wahoo (webhook), TrainingPeaks (file import), Twilio SMS, Resend email, Oura/Whoop/Withings (OAuth only)
**AI (9 features)**: Post-ride analysis, email summaries, SMS coach, chat coach, sleep summary, blood panel OCR, nutrition parsing, dashboard intelligence, adaptive 3-mode AI
**Pages**: Dashboard V2, Sleep Intelligence, ActivityDetail, HealthLab, Boosters, ConnectApps, Settings, WorkoutDatabase, Landing, Legal pages
**Structured Workouts (5 phases)**: Interval extraction, canonical tagging (22+14 tags), weather enrichment, interval execution coaching, performance models (heat/sleep/HRV/fueling/durability), searchable workout database
**Other**: SessionNotes + tag normalization, markdown rendering, AI voice fix, theme migration (dark→light), activity browser, working goals, nutrition logger

### Remaining — Prioritized Feature Backlog

**This is the single source of truth for what to build next.** Detailed implementation specs (checkboxes, sub-tasks, SQL) for Vekta-inspired features (Tasks 40-50) live in `docs/technical-architecture.md` under "VEKTA-INSPIRED FEATURES" — reference that file when building any of those tasks.

#### P0 — Core Analytics (ship first, biggest competitive differentiation)
1. **Critical Power (CP) & W' Modeling** — replace FTP with 3D power model (CP/W'/Pmax), auto-updated from best efforts, cross-referenced with recovery/sleep/body comp. *[Task 40 in technical-architecture.md]*
2. **Adaptive Training Zones** — dynamic zones from CP model that auto-adjust as fitness evolves + readiness-adjusted zone targets on red recovery days. *[Task 41]*
3. **Durability & Fatigue Resistance Tracking** — peak power at progressive fatigue levels (kJ/kg buckets), durability score, trends over time, race-specific predictions. *[Task 42]*

#### P1 — Enhanced Analysis (high-value features that build on P0)
4. **W' Balance Tracking** — real-time anaerobic reserve depletion/recovery throughout rides, "empty tank" flagging, race analysis. Requires CP model (P0). *[Task 49]*
5. **Similar Session Finder & Comparison** — auto-find comparable past rides, side-by-side metrics, AI explains what changed using cross-domain data. *[Task 47]*
6. **Training prescription engine** — workout recommendations from power profile gaps and CP/W' weaknesses

#### P2 — Integrations & Data Sources
7. **Garmin Connect** — sync logic (activities, body battery, stress, daily HR)
8. **Oura / Whoop / Withings** — sync logic (OAuth connect/callback already exist)
9. **Remaining Tier 3 integrations** — Apple Health, Supersapiens/Lingo, MyFitnessPal, Cronometer, TrainerRoad, Intervals.icu, Zwift, Hammerhead, Hexis, Noom

#### P3 — Platform & Business
10. **Stripe payments** — 3-tier subscription + feature gating
11. **Coach Platform & Multi-Athlete Management** — coach dashboard, athlete invitations, granular permissions. *[Task 48]*
12. **Historical Performance Timeline (5-Year)** — long-range metrics, season summaries, year-over-year overlays. *[Task 50]*
13. **Torque Analysis** — calculate from power+cadence streams, fatigue-induced torque shifts. *[Task 45]*
14. **Menstrual cycle intelligence** — Oura temperature-based phase detection, cycle-aware training recommendations

#### P4 — Polish & Infrastructure
15. **Onboarding improvements** — reduce friction, improve data connection guidance
16. **Mascot design & integration** — brand mascot for UI (loading states, empty states, AI chat)
17. **Twilio toll-free verification** — update opt-in proof URL to `https://aimfitness.ai`
18. **Apple OAuth** — configure in Apple Developer + Supabase
19. **Weekly digest emails** — automated weekly training summary via Resend
20. **Community benchmarks** — anonymous percentile rankings against similar athletes
21. **Mobile app** — React Native or PWA

## Documentation Rules

**Do not let documentation drift from the codebase. If you build it, document it.**

### Pre-Push Checklist (MANDATORY)

**Before every `git push`, you MUST complete ALL of the following steps. Do not push until every item is done:**

1. **`npm run build`** — Verify the production build succeeds with zero errors
2. **Update `CLAUDE.md`** (this file) — Review and update ALL relevant sections:
   - **Architecture / Backend** — add new endpoints, libs, or data flows
   - **Integrations** — update status (TODO → ✅) when an integration ships
   - **AI Analysis Engine** — add new AI-powered features or insight categories
   - **Build Status / Completed** — move items from Remaining → Completed, add new items
   - **Build Status / Remaining** — remove completed items, add newly discovered work
3. **Update `docs/technical-architecture.md`** — If there are schema changes, new tables, new environment variables, or new API patterns
4. **Update `docs/product-blueprint.md`** — If there are new user-facing features, onboarding changes, or pricing/plan changes
5. **Update `docs/insights-catalog.md`** — If there are new insight categories or AI prompt changes
6. **Update memory file** (`~/.claude/projects/.../memory/MEMORY.md`) — Architecture decisions, key file locations, and known pending items
7. **Update `AIM-TESTING-STRATEGY.md`** — If testing patterns or conventions changed. Every new feature must include tests for its critical paths.
8. **Include doc updates in the same commit** — Documentation changes must ship with the code they describe, not in a follow-up

**This is non-negotiable. If you are about to run `git push`, stop and verify you have completed steps 1-8 above. If any documentation is stale or missing, update it before pushing.**

## No Medical Advice Policy

**AIM is NOT a medical product. We are NOT doctors. This is non-negotiable.**

All AI-generated content, hardcoded text, and UI copy must follow these rules:

- **NEVER** use directive language: "Take X", "Start X protocol", "Increase your dose", "Supplement with X daily", "Do this", "You should"
- **ALWAYS** use suggestive language: "Consider discussing with your doctor...", "Research suggests...", "Studies show X may help with Y...", "Some athletes find that...", "It may be worth exploring...", "Ask your physician about..."
- **ALWAYS** recommend consulting a physician or sports medicine doctor for any health intervention (supplements, medications, dosing, diet changes for medical conditions)
- Training advice (watts, zones, workout structure) is acceptable — health/medical advice is not
- The `biomarkers.js` `actionLow`/`actionHigh` fields use non-prescriptive language throughout
- All AI system prompts (`ai.js`, `upload.js`, `summary.js`, `ask.js`, `webhook.js`, `email/send.js`) include explicit no-medical-advice instructions
- Legal disclaimers exist in HealthLab, Boosters, and Terms pages — but the real protection is never generating prescriptive medical content in the first place

## Conventions

- **No TypeScript** — plain JavaScript throughout
- **Inline styles** using design token object `T` from `src/theme/tokens.js`; no Tailwind or CSS-in-JS
- **Fonts**: DM Sans (UI), JetBrains Mono (numbers/code)
- **Light theme** — backgrounds `#f8f8fa`/`#f0f0f3`, card `#ffffff`, accent `#10b981`
- **Icons**: Lucide React
- **Auth tokens**: Bearer token via `Authorization` header; `apiFetch()` handles this automatically on frontend
- OAuth integrations use connect/callback file pairs in `/api/auth/`; credential-based auth (EightSleep) stores AES-256-GCM encrypted email/password in `integrations.metadata`; file import (TrainingPeaks) uses Supabase storage bucket
- **Consent flow**: signup requires Terms checkbox → AcceptTerms interstitial for SSO → health data consent in Onboarding Step 1 → ProtectedRoute enforces `terms_accepted_at` before access

### Responsive Breakpoints
- **Mobile**: < 768px — single column layouts, hamburger nav, full-screen modals, horizontal-scroll filter pills
- **Tablet**: 768px – 1024px — 2-column grids, slightly reduced padding/font sizes
- **Desktop**: > 1024px — original layouts (3-4 column grids, side-by-side panels)
- **Hook**: `useResponsive()` from `src/hooks/useResponsive.js` returns `{ isMobile, isTablet, isDesktop }` using `window.matchMedia` (fires only at breakpoint boundaries)
- **Pattern**: conditional inline styles — `gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)"`. No CSS media queries.
- **Touch targets**: 44px minimum on mobile (buttons, checkboxes, close icons)
- **Navigation**: hamburger menu (Menu/X from lucide-react) + slide-out drawer on mobile; inline nav tabs on desktop
- **Modals**: full-screen on mobile (`maxWidth: "100%"`, `height: "100vh"`, `borderRadius: 0`), centered on desktop
- **Breakpoint constants**: `breakpoints` and `touchMin` exported from `src/theme/tokens.js`

## Reference Docs

Detailed specifications archived in `docs/`:
- `docs/build-status.md` — full log of all completed features (extracted from this file for size)
- `docs/data-flows.md` — detailed data flow pipelines (sync, import, AI, SMS, sleep, metrics)
- `docs/product-blueprint.md` — full product spec, booster library, menstrual cycle science, onboarding fields, pricing tiers, user stories
- `docs/technical-architecture.md` — complete database schema SQL, build plan, Strava API appendix, EightSleep workarounds, env vars
- `docs/insights-catalog.md` — all 22 insight categories with detailed examples, quality checklist, system prompt guide

Dashboard design specifications:
- `AIM-ADAPTIVE-DASHBOARD-SPEC.md` — 3 dashboard modes (POST_RIDE/PRE_RIDE_PLANNED/DAILY_COACH), AI prompt templates, weather integration, fueling intelligence
- `AIM-SITE-MAP.md` — navigation structure, URL routes, mobile layout patterns
- `AIM-TESTING-STRATEGY.md` — testing priorities, metric tests, e2e flows
- `/prototypes/` — design source of truth: 4 prototype JSX files for dashboard components

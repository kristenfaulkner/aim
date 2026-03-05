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

20 route-level pages, 12+ reusable components, 10 custom hooks, shared libs. Key entry points: `App.jsx` (routes), `context/AuthContext.jsx` (auth), `hooks/useDashboardData.js` (parallel queries), `lib/api.js` (`apiFetch()` with Bearer token), `theme/tokens.js` (design tokens as `T`).

**Full file-by-file reference:** See `docs/codebase-map.md` → Frontend section.

### Backend (`/api/`)

35+ shared libraries in `_lib/` (AI engine, metrics, integrations, power analytics). Route handlers for: auth, sync, webhooks, activities, health, AI chat, SMS, email, goals, nutrition, calendar, zones, durability, feedback, check-in, cross-training, travel, prescription, races, segments.

**API pattern**: Every endpoint calls `cors(res)`, checks `req.method`, calls `verifySession(req)` for auth, returns `{ error: "message" }` on failure.

**Full file-by-file reference:** See `docs/codebase-map.md` → Backend section.

### Key Data Flows

See `docs/data-flows.md` for detailed pipeline documentation (Strava sync, TrainingPeaks import, Eight Sleep cron, AI analysis, blood panel upload, SMS coach, sleep summary, metrics computation).

**Summary**: OAuth connect → sync → compute metrics → dedup → upsert → fire-and-forget AI analysis + email + SMS. TrainingPeaks is file-based (ZIP + CSV). Eight Sleep syncs hourly via Vercel Cron. AI uses 3-layer smart context assembly (~60% token reduction).

### Database (Supabase)

21 core tables. All reference `profiles.id` (UUID from Supabase Auth) with CASCADE delete. RLS policies scope client-side queries to authenticated user. Backend uses `supabaseAdmin` to bypass RLS. Key unique constraints: `activities(user_id, source, source_id)`, `daily_metrics(user_id, date)`, `integrations(user_id, provider)`.

**Full table/column reference:** See `docs/codebase-map.md` → Database section.
**Full schema SQL:** See `docs/technical-architecture.md` and `/supabase/migrations/`.

### Deployment

**Production URL**: https://aimfitness.ai (Vercel domain: `aim-ashen.vercel.app`)

Vercel auto-deploys from GitHub. Frontend SPA rewrite in `vercel.json` routes non-API paths to `index.html`. Environment variables configured in Vercel dashboard. Custom domain `aimfitness.ai` with `www` redirect. SSL handled by Vercel.

**Vercel Cron**: Eight Sleep hourly sync + Oura/Whoop/Withings recovery sync configured in `vercel.json` `crons` array. Requires `CRON_SECRET` env var in Vercel dashboard for auth.

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
| Plan | Price |
|------|-------|
| Starter | $19/mo |
| Pro | $49/mo |
| Elite | $99/mo |

All plans include 14-day free trial, no credit card required. Monthly billing only (annual billing planned for future release).

**Tier Features (defined in `src/lib/entitlements.js`):**
- **Free:** Dashboard, activities, basic analysis (3 AI/day, 2 integrations, 30-day history)
- **Starter:** + Sleep, Health Lab, Workout DB, Nutrition Logger, Check-in, Boosters (10 AI/day, 4 integrations, full history)
- **Pro:** + CP Model, Durability, Adaptive Zones, Segments, Similar Sessions, Race Intelligence, Prescriptions, SMS Coach (unlimited AI, unlimited integrations)
- **Elite:** + Data Export, API Access, Priority Support, Custom Models, Coach Dashboard

## Integrations

### Tier 1 — Cycling Core (launch priority)
- **Strava** ✅ — OAuth + full sync + backfill + metrics + streams + webhook (activity create/update/delete) + auto 365-day backfill on first connect
- **Wahoo** ✅ — OAuth + full sync + backfill + webhook (FIT file download + full stream processing: computed metrics, intervals, durability, W'bal, power profile updates), auto 365-day backfill on first connect, token refresh
- **Garmin Connect** — activities, body battery, stress, daily HR (scaffolding complete — OAuth 1.0a flow, webhook handler, sync pipeline, data mappers — waiting for API keys from Garmin approval)
- **TrainingPeaks** ✅ — file import: ZIP extracted client-side with JSZip → batched base64 upload (.fit/.tcx/.gpx with full metrics computation, no file size limit). ZIP optional for CSV-only enrichment. + workouts CSV (titles/RPE/comments/body weight) + metrics CSV (daily RHR/HRV/sleep/SpO2/body fat/Whoop recovery)

### Tier 2 — Recovery & Body
- **Oura Ring** ✅ — OAuth + full sync (sleep, readiness, activity, SpO2), auto 365-day backfill on first connect, hourly Vercel Cron auto-sync
- **Whoop** ✅ — OAuth + full sync (recovery, sleep, body measurements), webhook (recovery/sleep/workout events with HMAC signature verification), auto 365-day backfill on first connect, hourly Vercel Cron auto-sync
- **EightSleep** ✅ — credential auth (email/password), trends API sync, sleep metrics (score, duration, stages, HRV, RHR, bed temp), extended metrics (toss/turns, room temp, HR/HRV min/max, sleep quality/routine/fitness scores), auto 365-day sync on first connect, hourly Vercel Cron auto-sync (skips if synced in last 6 hours)
- **Withings** ✅ — OAuth + full sync (body comp/weight/fat/muscle, activity, sleep), webhook notifications (weight/activity/sleep auto-subscribed on connect), auto 365-day backfill on first connect, hourly Vercel Cron auto-sync

### Tier 3 — Advanced
Apple Health, Supersapiens/Lingo (CGM), MyFitnessPal, Cronometer, TrainerRoad, Intervals.icu, Zwift, Hammerhead, Hexis, Noom

### Communication
- **Resend** ✅ — Email workout analysis (Claude-formatted HTML, sent after first AI analysis, branded dark-theme template, first-analysis-only dedup)
- **Twilio** ✅ — SMS workout summaries (auto-sent post-sync), conversational AI coaching (inbound replies), TCPA-compliant opt-in/out (STOP/START/HELP keywords), test/preview endpoint

### Integration Pattern
OAuth2 flow: connect/callback file pairs in `/api/auth/`. Credential-based for EightSleep (email/password AES-256-GCM encrypted in `integrations.metadata` via `crypto.js`, backward compatible with unencrypted legacy records). File-based for TrainingPeaks (client-side JSZip extraction → batched base64 upload to API, 3 modes: batch/finalize/legacy). Tokens stored with refresh logic in `integrations` table. Data normalized to `activities` and `daily_metrics`.

## AI Analysis Engine

### Core Principle
Cross-domain insights are the product. Every AI insight must connect 2+ data sources and tell the athlete something they cannot learn from any single app. "Your HRV was low" is Whoop-level. "Your HRV was 38ms, which explains why cardiac drift was 8.1% today vs 3.2% on Feb 18 when HRV was 72ms" is AIM-level.

### AI-Powered Features (12 total)
1. **Post-ride analysis** — 28-category structured insights triggered after every activity sync
2. **Email workout analysis** — Claude-formatted HTML emails via Resend with full AI analysis, sent on first analysis only (no duplicates on re-analysis or bulk import)
3. **SMS workout summaries** — 1500-char Claude-generated texts sent via Twilio post-sync
4. **SMS conversational coaching** — inbound reply handling with full athlete context
5. **Morning sleep summary** — readiness assessment from Eight Sleep + training context
6. **Blood panel analysis** — PDF/image OCR extraction + cross-reference with training data
7. **Chat coach** — real-time Q&A via `/api/chat/ask` with conversation history
8. **Nutrition parsing** — Claude-powered free-text → structured nutrition items with per-hour calculations via `/api/nutrition/parse`
9. **Adaptive dashboard intelligence** — 3-mode AI (POST_RIDE/PRE_RIDE_PLANNED/DAILY_COACH) via `/api/dashboard/intelligence`
10. **Athlete bio generation** — AI-generated 2-3 sentence profile description from activity history via `/api/profile/generate-bio`
11. **Insight feedback loop** — thumbs up/down per insight, personalized category preferences injected into AI system prompt, global quality tracking via `/api/feedback/`
12. **Training prescription engine** — power profile gap analysis (CP model comparison), readiness/TSB/race/weather/cross-training guards, Claude-generated structured workout with power targets, fueling, alternative. PrescriptionCard on Dashboard with Add to Calendar integration via `/api/prescription/next-workout`

### 30 Insight Categories (Active) + 5 Planned

See `docs/insights-catalog.md` for the full list with detailed examples. Active categories span: Body Comp→Performance, Sleep→Performance, HRV→Training, Environmental, Fatigue Signatures, Long-Term Adaptations, Nutrition, Predictive Analytics, Benchmarking, Menstrual Cycle, Boosters, Blood Work, DEXA, Workout Tagging, Weather Context, Interval Execution, Durability, Fueling Causality, Readiness-to-Response, Workout Progression, Anomaly Detection, Race-Specific Analysis, Subjective-Objective Alignment, Respiratory & Illness Warning, GI Tolerance, Perceived vs Actual Recovery, Travel & Environmental Disruption, Cross-Training Impact, W' Balance & Anaerobic Reserve, Segment Performance Analysis. Planned (P2/P3): Periodization, Personal Models, Plateau Detection, Team Health, Team Training Load, Shared Race Prep.

### Insight Quality Rules
- Connect 2+ data sources in most insights
- Use specific numbers from the athlete's own data
- Compare to athlete's own history before population benchmarks
- Reference past rides by name and date in every insight (comparative analysis)
- Include one actionable takeaway per insight citing historical precedent
- Assign confidence level (high/medium/low)
- Target 4-6 most meaningful insights per ride (not 6-12)
- Never assume causation without evidence — use "may be related to"
- **Never give direct medical advice** — see "No Medical Advice Policy" section below for details

### AI Output Format
```json
{
  "summary": "2-3 sentence workout summary comparing to most similar recent session",
  "insights": [{ "type": "insight|positive|warning|action", "icon": "emoji", "category": "performance|body|recovery|training|nutrition|environment|health", "cat_label": "Human-readable cross-domain label e.g. Sleep → Performance", "sig": "Significance tag e.g. Season best, High load", "title": "Short title with key number", "body": "Explanation connecting 2+ sources with actionable takeaway", "confidence": "high|medium|low" }],
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

**Core**: Auth (email/password/Google SSO/magic link), onboarding, Vercel deployment, mobile-responsive, testing (574 tests), SEO, legal compliance, account management
**Integrations**: Strava (full), EightSleep (full + hourly cron), Wahoo (full sync + backfill + webhook + FIT stream processing), Garmin (scaffolded — OAuth 1.0a, webhook, sync, data mappers, awaiting API keys), TrainingPeaks (file import), Twilio SMS, Resend email, Oura (full + hourly cron), Whoop (full + hourly cron), Withings (full + hourly cron)
**AI (12 features)**: Post-ride analysis, email summaries, SMS coach, chat coach, sleep summary, blood panel OCR, nutrition parsing, dashboard intelligence, adaptive 3-mode AI, athlete bio generation, insight feedback loop (thumbs up/down + personalized AI prompt injection), training prescription engine (power profile gap analysis → AI-generated structured workouts with readiness/weather/cross-training guards)
**Pages**: Dashboard V2, Sleep Intelligence, ActivityDetail V3 (two-column AI+Data layout), HealthLab, Boosters, ConnectApps, Settings, WorkoutDatabase, Landing, Legal pages
**Structured Workouts (5 phases)**: Interval extraction, canonical tagging (32+14 tags), weather enrichment, interval execution coaching, performance models (heat/sleep/HRV/fueling/durability), searchable workout database
**Power Analytics**: Critical Power (CP) & W' model — hyperbolic fitting from power profile bests, auto-computed on sync, CPModelCard on dashboard, AI context enrichment, backfill endpoint. Adaptive training zones (readiness-adjusted -3% to -8%, zone evolution history, preference auto/CP/Coggan). Durability & fatigue resistance (per-activity fatigue-bucket power curves, retention scoring, aggregate durability score, race predictions, backfill endpoint). W' Balance tracking (Skiba differential reconstitution, real-time anaerobic reserve depletion/recovery, empty tank detection, WbalChart on ActivityDetail, backfill endpoint, AI Category 29). Similar Session Finder (weighted 5-dimension matching, cross-domain context enrichment, expandable comparison cards with AI analysis on ActivityDetail). Segment Comparison (auto-import from Strava sync, cross-domain adjusted performance scoring with heat/HRV/fatigue/sleep/wind penalties, PR detection, SegmentComparisonPanel on ActivityDetail with expandable effort history, AI Category 30, backfill endpoint, 27 tests)
**Expansion (P1)**: Daily subjective check-in (4 sliders: stress/motivation/soreness/mood), activity subjective fields (GI comfort, mental focus, pre-ride recovery), travel & timezone auto-detection (GPS-based + browser geolocation, jet lag + altitude tracking, TravelStatusCard on dashboard with collapse/expand, timezone recovery bar, 14-segment altitude acclimation bar, power penalty mini chart, auto-dismiss), cross-training logger (replaced by unified LogActivityModal on Activities page: 8 activity types, file upload with FIT/GPX/TCX/CSV parsing, body region for strength, intensity 1-5, duration spinner, performance data accordion, saves to both activities + cross_training_log tables, TrainingWeekChart stacked bars), 6 new AI insight categories (23-28), 10 new workout tags
**HR Source Prioritization (P2)**: 3-context priority engine (exercise/sleep/resting HR), smart defaults from device accuracy research, SourceBadge component on all HR metrics, Settings "Data Sources" tab with arrow reordering, source tracking on activities + daily_metrics sync pipelines, AI data quality awareness (Rule 11), 45 tests
**Other**: SessionNotes + tag normalization, markdown rendering, AI voice fix, theme migration (dark→light), activity browser, working goals, nutrition logger

### Remaining — Prioritized Feature Backlog

**This is the single source of truth for what to build next.** Detailed implementation specs (checkboxes, sub-tasks, SQL) for Vekta-inspired features (Tasks 40-50) live in `docs/technical-architecture.md` under "VEKTA-INSPIRED FEATURES" — reference that file when building any of those tasks.

#### P0 — Core Analytics (ship first, biggest competitive differentiation)
1. ~~**Critical Power (CP) & W' Modeling**~~ — ✅ DONE (hyperbolic fitting CP/W'/Pmax, auto-computed on sync, CPModelCard dashboard, AI context, backfill endpoint). FTP retained as primary; CP supplements it.
2. ~~**Adaptive Training Zones**~~ — ✅ DONE (readiness-adjusted zones shift -3% to -8% based on recovery/TSB, zone evolution history tracking, zone preference auto/CP/Coggan, AI context integration, MyStats UI)
3. ~~**Durability & Fatigue Resistance Tracking**~~ — ✅ DONE (per-activity fatigue-bucket power curves at 0-10/10-20/20-30/30+ kJ/kg, retention scoring, aggregate durability in power_profiles, race predictions, AI context, MyStats UI, backfill endpoint)

#### P1 — Enhanced Analysis (high-value features that build on P0)
4. ~~**W' Balance Tracking**~~ — ✅ DONE (Skiba differential reconstitution model, real-time anaerobic reserve depletion/recovery, empty tank detection, WbalChart with gradient area chart on ActivityDetail, lazy-loaded via `/api/activities/wbal`, backfill endpoint, AI Category 29, computed in Strava sync pipeline)
5. ~~**Similar Session Finder & Comparison**~~ — ✅ DONE (weighted 5-dimension matching: duration/TSS/IF/NP/tags, cross-domain context enrichment: sleep/HRV/weather/nutrition/stress/training load/travel/cross-training, expandable comparison cards on ActivityDetail with metric delta table + context diffs + on-demand AI comparison analysis via Claude, "vs similar sessions" link on LastRideCard, 21 tests)
6. ~~**Training prescription engine**~~ — ✅ DONE (power profile gap analysis via CP model, readiness/TSB/race/cross-training guards, Claude-generated structured workout with absolute power targets + fueling + alternative, PrescriptionCard on Dashboard with Add to Calendar, 36 tests)

#### P2 — New Features (detailed specs in `AIM-FEATURE-SPECS-BATCH-1.md`)
27. ~~**HR Source Prioritization Engine**~~ — ✅ DONE (3-context priority: exercise/sleep/resting, `hr-source-priority.js` lib with device detection + confidence scoring, `hr_source_config` table, source tracking on activities + daily_metrics, SourceBadge component on LastRideCard/ReadinessCard/ActivityDetail/Sleep, Settings "Data Sources" tab with arrow-based reordering, AI system prompt Rule 11 for data quality awareness, 45 tests)
28. **Calendar + Race Intelligence + AI Race Strategist** — Full calendar view (month/week/list) showing activities + planned workouts + races. AI natural language race parser ("I'm racing Amstel Gold and Liège" → structured race data with auto gender/edition resolution). Dedicated Race Hub page per race with AI demands analysis, gap identification vs athlete's power profile, weather forecasting (Open-Meteo, updating on schedule as race approaches), training plan generator (two modes: detailed day-by-day OR weekly focus guidance), race-day protocol builder with booster integration (links to existing Boosters library, safety disclaimers, "have you tried this before?" flow, test-in-training recommendations). Progressive profiling sidebar (contextual questions, max 1/session). Dashboard countdown widget. `races` and `athlete_profile_questions` tables. 5 implementation phases. *[AIM-FEATURE-SPECS-BATCH-1.md → Feature 2]*
29. ~~**Segment Comparison with Cross-Domain Adjusted Performance**~~ — ✅ DONE (auto-import from Strava sync, cross-domain context denormalization at sync time, adjusted performance scoring with heat/HRV/fatigue/sleep/wind penalties, PR detection, SegmentComparisonPanel on ActivityDetail with expandable effort history table, AI Category 30 with segment-specific insights, 4 API endpoints: list/detail/compare/sync, backfill from existing activities, 27 tests)

#### P3 — Integrations & Data Sources
7. ~~**Garmin Connect** — sync logic~~ — scaffolding complete (OAuth 1.0a, webhook, sync, data mappers, 24 tests). Waiting for API keys from Garmin approval.
8. ~~**Oura / Whoop / Withings** — sync logic~~ — ✅ DONE (full sync + 365-day backfill + hourly cron for all 3)
9. **Remaining Tier 3 integrations** — Apple Health, Supersapiens/Lingo, MyFitnessPal, Cronometer, TrainerRoad, Intervals.icu, Zwift, Hammerhead, Hexis, Noom

#### P4 — Platform & Business
10. **Stripe payments** — 3-tier subscription + feature gating
11. **Coach Platform & Multi-Athlete Management** — coach dashboard, athlete invitations, granular permissions. *[Task 48]*
12. **Historical Performance Timeline (5-Year)** — long-range metrics, season summaries, year-over-year overlays. *[Task 50]*
13. **Torque Analysis** — calculate from power+cadence streams, fatigue-induced torque shifts. *[Task 45]*
14. **Menstrual cycle intelligence** — Oura temperature-based phase detection, cycle-aware training recommendations

#### P5 — Polish & Infrastructure
15. **Onboarding improvements** — reduce friction, improve data connection guidance
22. **Demo video** — create a product demo video for the landing page (re-add "Watch Demo" button once video is ready)
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

- **Engineering standards** — before building any feature, reference `docs/ENGINEERING-STANDARDS.md` for API patterns, component rules, styling rules, state management, performance guidelines, and anti-patterns. Follow existing patterns.
- **Design Bible first** — before building any new UI feature, page, or component, reference `docs/AIM-DESIGN-BIBLE.md` for design tokens, layout patterns, component library, and page-by-page specs. Match existing patterns.
- **No TypeScript** — plain JavaScript throughout
- **Inline styles** using design token object `T` from `src/theme/tokens.js`; no Tailwind or CSS-in-JS
- **Fonts**: DM Sans (UI), JetBrains Mono (numbers/code)
- **Light theme** — backgrounds `#f8f8fa`/`#f0f0f3`, card `#ffffff`, accent `#10b981`
- **Icons**: Lucide React
- **Auth tokens**: Bearer token via `Authorization` header; `apiFetch()` handles this automatically on frontend
- OAuth integrations use connect/callback file pairs in `/api/auth/`; credential-based auth (EightSleep) stores AES-256-GCM encrypted email/password in `integrations.metadata`; file import (TrainingPeaks) uses client-side JSZip extraction → batched base64 upload (no Supabase Storage needed)
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
- `docs/codebase-map.md` — **file-by-file reference**: every frontend component/hook/lib, every backend endpoint/lib, every database table/column with migrations. **Reference when looking up specific files.**
- `docs/ENGINEERING-STANDARDS.md` — **coding standards**: API patterns, component rules, styling rules, state management, hook patterns, performance guidelines, security, anti-patterns. **MUST be referenced before building any feature.**
- `docs/build-status.md` — full log of all completed features (extracted from this file for size)
- `docs/data-flows.md` — detailed data flow pipelines (sync, import, AI, SMS, sleep, metrics)
- `docs/product-blueprint.md` — full product spec, booster library, menstrual cycle science, onboarding fields, pricing tiers, user stories
- `docs/technical-architecture.md` — complete database schema SQL, build plan, Strava API appendix, EightSleep workarounds, env vars
- `docs/insights-catalog.md` — all 34 insight categories (29 active + 6 planned) with detailed examples, quality checklist, system prompt guide
- `docs/AIM-PRODUCT-ROADMAP.md` — comprehensive feature roadmap (P1-P5) with data requirements, dependencies, and implementation notes
- `docs/AIM-EXPANSION-SPEC.md` — expansion spec: check-in, travel, cross-training, periodization, coach dashboard

Design bible & specifications:
- `docs/AIM-DESIGN-BIBLE.md` — **comprehensive design reference**: brand identity, design tokens, layout patterns, component library, page-by-page specs, unbuilt feature designs, accessibility guidelines. **MUST be referenced before building any new UI feature or page.**

Feature specifications:
- `AIM-FEATURE-SPECS-BATCH-1.md` — Detailed specs for: HR Source Prioritization Engine, Calendar + Race Intelligence + AI Race Strategist, Segment Comparison with Cross-Domain Adjusted Performance. Read the relevant feature section fully before building any of these.

Dashboard design specifications:
- `AIM-ADAPTIVE-DASHBOARD-SPEC.md` — 3 dashboard modes (POST_RIDE/PRE_RIDE_PLANNED/DAILY_COACH), AI prompt templates, weather integration, fueling intelligence
- `AIM-SITE-MAP.md` — navigation structure, URL routes, mobile layout patterns
- `AIM-TESTING-STRATEGY.md` — testing priorities, metric tests, e2e flows
- `/prototypes/` — design source of truth: 4 prototype JSX files for dashboard components

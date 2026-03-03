# AIM Build Status — Completed Features

Full log of all completed features and implementations.

## Core Infrastructure
- Project setup (Vite + React + React Router + Supabase)
- Design system (theme tokens, light theme with DM Sans font, NeuralBackground animation)
- Auth (email/password, Google SSO, magic link, password reset, protected routes)
- Onboarding (3-step: health data consent → profile → FTP/HR zone setup with power zones Z1-Z7 and HR zones Z1-Z5)
- Vercel deployment with GitHub auto-deploy
- EightSleep credential encryption (AES-256-GCM via `api/_lib/crypto.js`)
- Source priority system (`_lib/source-priority.js`: device > TrainingPeaks > Strava)
- Supabase storage: `health-files` bucket (blood/DEXA), `import-files` bucket (TrainingPeaks uploads)

## Integrations
- **Strava** integration (full: OAuth, sync, backfill, metrics, streams, webhook, cross-source dedup)
- **EightSleep** integration (credential auth with password visibility toggle, trends API, sleep metrics + extended metrics sync)
- **Wahoo** integration (OAuth + webhook receiver for workout summaries)
- **TrainingPeaks** file import (ZIP workouts + workouts CSV + metrics CSV with daily health data)
- **Twilio SMS** AI coach (post-workout summaries, conversational inbound replies, TCPA consent flow with STOP/START/HELP)
- Oura, Whoop, Withings OAuth connect/callback (sync logic TODO)
- **Auto-sync on first connect** — Strava and Eight Sleep both auto-trigger 365-day backfill on first OAuth connect (fire-and-forget)
- **Eight Sleep hourly Cron** — Vercel Cron job syncs every hour, skips users synced in last 6 hours

## AI Features
- AI post-ride analysis engine with smart context assembly (3-layer pre-computed summaries, ~60% token reduction)
- AI chat coach endpoint (`/api/chat/ask` with conversation history + full athlete context)
- Morning sleep summary (Claude-powered readiness assessment from Eight Sleep data)
- **Email workout analysis** — Resend-powered post-workout emails: Claude formats AI analysis into branded dark-theme HTML email, first-analysis-only dedup
- **Adaptive Dashboard Intelligence** — 3-mode AI endpoint: POST_RIDE, PRE_RIDE_PLANNED, DAILY_COACH
- **AI voice fix** — Rule 10: always second person, never third person for user's data
- **Markdown rendering fix** — `formatText.jsx` strips markdown artifacts, renders bold/italic, applied across all AI surfaces

## Pages & UI
- **Dashboard V2** — two-column layout: ReadinessCard, ActionItems, LastRideCard, TrainingWeekChart, FitnessChart, Power Zones, Training Load; right column: AIPanel, WorkingGoals; NutritionLogger modal
- **Sleep Intelligence page** — time-period filters, summary cards with sparklines, sleep architecture chart, trend charts, AI morning report, expandable nightly detail
- Activity detail page with tabbed AI panel (Summary / AI Analysis / Ask Claude tabs)
- Health Lab: blood panel upload (25 biomarkers), DEXA scan upload, AI analysis, biomarker trend charts
- Boosters page (searchable/filterable protocol library)
- Connect Apps page with integration management
- Settings page (profile editor, zone recomputation, notifications, account management)
- Landing page with pricing, founder section, neural background
- Legal pages (privacy, terms, GDPR, cookie policy, data processing)
- **Activity Browser** — popover-based picker with time filters, date-grouped sections, search, pagination
- **WorkoutDatabase** page at `/workout-db` with smart query chips, tag filters, aggregation, grouped comparison

## Data Features
- **Multi-file blood panel upload** — drag-and-drop multiple files with sequential processing
- **TrainingPeaks ZIP optional** — CSV-only import enriches existing activities
- **Weather integration** — Open-Meteo API via `/api/weather/current`, profile-based lat/lng
- **Working Goals** — CRUD API, expandable GoalCard with 3 tabs, sparklines, progress bars
- **Nutrition Logger** — 5-stage conversational modal, Claude-powered parsing, per-hour carbs badge
- **Training Calendar API** — planned workout CRUD

## Structured Workouts Engine (All 5 Phases)
- **Phase 1+2**: Interval extraction from FIT laps + power stream detection, per-interval metrics, execution quality scoring, canonical tagging engine (22 workout + 14 interval tags), per-activity weather enrichment, tag-based search, migration 008
- **Phase 3**: Interval execution coaching: deterministic insights (fade/cadence/HR/pacing), planned vs actual comparison with execution scoring (0-100), AI Category 16
- **Phase 4**: Conditional performance models: heat penalty, sleep→execution, HRV readiness, fueling→durability, kJ/kg durability; AI Categories 17-22; dashboard intelligence integration
- **Phase 5**: Searchable workout database: advanced query endpoint, smart chips API, WorkoutDatabase page

## Session Notes & Tagging
- **SessionNotes shared component** — freeform notes, star rating, RPE slider, tag input; shared across Activities and ActivityDetail
- **Tag normalization & alias system** — 50+ entry TAG_ALIASES map, normalizes cycling shorthands
- **Note-to-tag keyword extraction** — auto-extracts structured tags from user_notes via regex patterns

## Cross-Cutting
- Mobile-responsive overhaul: all pages responsive 320px–1024px+ via `useResponsive()` hook
- Testing infrastructure: Vitest + React Testing Library + MSW + Playwright (141 tests across 8 files)
- SEO foundations: `SEO` component, static fallbacks, JSON-LD, robots.txt, sitemap.xml
- Legal compliance: Terms acceptance, GDPR Article 9 consent, consent gate in ProtectedRoute
- Account management: full data export (JSON), account deletion, consent withdrawal
- **Theme migration** — dark → light theme across 37+ files

## Power Analytics
- **Critical Power (CP) & W' Model** — hyperbolic fitting (P = W'/t + CP) from power profile bests (6 durations), auto-computed on every sync via `updatePowerProfile`, CPModelCard on dashboard (3-panel: CP/W'/Pmax with R² badge), AI context enrichment (system prompt Categories 8/9 + CP interpretation guide), backfill endpoint (`/api/activities/backfill-cp`), migration 011 (cp_watts, w_prime_kj, pmax_watts, cp_model_r_squared, cp_model_data on power_profiles). FTP retained as primary model — CP supplements it.
- **My Stats page** — read-only athlete stats dashboard at `/my-stats` consolidating all computed metrics: Power Model (FTP + CP/W'/Pmax with R² badge, W/kg), Power Profile Bests (6 durations), Training Zones (tabbed Power/HR/CP views), Body Composition (weight, height, DEXA, lean W/kg), Training Load (CTL/ATL/TSB with form indicator), Recovery Baselines (HRV/RHR/Sleep with 30-day averages). Data hook `useMyStats.js` fetches in parallel. "My Stats" nav link added across all pages.

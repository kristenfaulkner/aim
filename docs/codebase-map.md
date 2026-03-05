# Codebase Map

Detailed file-by-file reference for the AIM codebase. Referenced from `CLAUDE.md` Architecture section.

## Frontend (`/src/`)

- `App.jsx` — route definitions; protected routes wrap with `ProtectedRoute`
- `context/AuthContext.jsx` — user auth state, profile management, Supabase auth listeners
- `pages/` — 20 route-level pages (Dashboard, MyStats, Sleep, ActivityDetail, HealthLab, Boosters, ConnectApps, Settings, WorkoutDatabase, Onboarding, AcceptTerms, Auth, ResetPassword, Landing, Contact, 5 legal pages)
- `components/` — reusable: `TrainingPeaksImport`, `BloodPanelUpload` (multi-file drag-and-drop), `DexaScanUpload` (single-file drag-and-drop with body composition extraction), `ActivityBrowser` (popover with time filters/search/pagination), `ProtectedRoute` (auth + consent gate), `NeuralBackground`, `SEO` (React 19 native metadata: title, description, OG, Twitter cards, canonical URL), `SessionNotes` (activity annotation: freeform notes, star rating, RPE slider 0-10, GI comfort/mental focus/pre-ride recovery sliders 1-5, tag input with alias normalization — shared across Activities and ActivityDetail pages), `InsightFeedback` (thumbs up/down on AI insights — shared across AIPanel, ActivityDetail, SleepAIPanel), `WbalChart` (W'bal area chart with gradient fill, summary metrics, empty tank badge — lazy-loaded on ActivityDetail), `SimilarSessionsPanel` (expandable comparison cards with metric delta table, cross-domain context diffs, on-demand AI comparison analysis — lazy-loaded on ActivityDetail), `SourceBadge` (HR source attribution pill — device icon + name + confidence tooltip, shown next to HR metrics across Dashboard, ActivityDetail, Sleep), `SegmentComparisonPanel` (segment effort cards with adjusted performance scoring, PR badges, adjustment factor pills, expandable effort history table — lazy-loaded on ActivityDetail)
- `components/dashboard/` — modular dashboard components: `AthleteBio` (AI-generated profile description with generate/confirm/edit flow), `ReadinessCard` (SVG ring + 4 metric pills), `AIPanel` (3-tab AI analysis/summary/chat), `LastRideCard` (8-metric grid), `TrainingWeekChart` (7-day TSS bars with stacked cross-training TSS), `FitnessChart` (CTL/ATL/TSB SVG), `WorkingGoals` (expandable goal cards with 3 tabs), `NutritionLogger` (5-stage conversational modal with Claude parsing), `CPModelCard` (Critical Power 3-panel: CP/W'/Pmax), `CrossTrainingLogger` (single-screen modal: 6 activity types, body region conditional, intensity 1-5, duration +/-, confirmation with TSS + recovery impact badge), `PrescriptionCard` (AI workout prescription: readiness badge, workout structure table, fueling row, add-to-calendar, alternative workout toggle, profile gap pills), `TravelStatusCard` (conditional card: collapsed/expanded travel alert with timezone recovery bar, 14-segment altitude acclimation bar, power penalty mini chart — auto-dismisses when recovery complete)
- `hooks/useDashboardData.js` — parallel Supabase queries (8 concurrent) using `Promise.allSettled`, browser geolocation travel detection (once/day)
- `hooks/useActivities.js` — paginated activity list (legacy, replaced by useActivityBrowser on Dashboard)
- `hooks/useSleepData.js` — sleep data from `daily_metrics` with configurable time period, computes averages
- `hooks/useActivityBrowser.js` — cursor-based paginated activity browser with time period filtering (Week/Month/Year/All) and client-side search
- `hooks/useMyStats.js` — parallel Supabase queries for My Stats page (power profile, daily metrics, DEXA, 30-day averages)
- `hooks/useAdaptiveZones.js` — adaptive training zones with readiness adjustment from `/api/zones/adaptive`
- `hooks/useDurability.js` — durability summary (score, buckets, trend, predictions) from `/api/durability/summary`
- `hooks/useWbalData.js` — W'bal stream + summary for a single activity from `/api/activities/wbal` (lazy-loaded)
- `hooks/useSimilarSessions.js` — similar sessions with cross-domain context from `/api/activities/similar` (lazy-loaded), plus `fetchCompareAnalysis()` for on-demand AI comparison
- `hooks/useSegmentEfforts.js` — segment efforts with adjusted scoring from `/api/segments/list?activity_id=X` (lazy-loaded on ActivityDetail)
- `hooks/usePrescription.js` — AI workout prescription from `/api/prescription/next-workout` with `addToCalendar()` helper
- `hooks/useResponsive.js` — responsive breakpoint hook (`isMobile`/`isTablet`/`isDesktop`) via `matchMedia`
- `lib/api.js` — `apiFetch()` utility adds Bearer token to all `/api` calls
- `lib/supabase.js` — Supabase client init
- `lib/zones.js` — `computePowerZones(ftp)`, `computeHRZones(maxHR)`, `computeCPZones(cp)` used by Onboarding + Settings + MyStats
- `lib/formatText.jsx` — `cleanText()` strips markdown artifacts from AI JSON text fields; `FormattedText` component renders paragraphs, `**bold**` as `<strong>`, `*italic*` as `<em>`
- `lib/formatTime.js` — `formatActivityDate()`, `formatActivityTime()`, `getActivityTimezoneAbbrev()` helpers
- `data/` — static data: integrations metadata, biomarker clinical ranges, booster protocols, power classification tables
- `theme/tokens.js` — design tokens exported as `T` (colors, fonts); `catColors` for booster categories; `breakpoints` and `touchMin` for responsive design; `breakpoints` (mobile/tablet) and `touchMin` (44px)

## Backend (`/api/`)

### Shared Libraries (`_lib/`)
- `ai.js` — AI analysis engine with smart context assembly
- `metrics.js` — Coggan power/HR metrics computation
- `training-load.js` — CTL/ATL/TSB calculation and power profile updates
- `source-priority.js` — cross-source deduplication (device > TrainingPeaks > Strava)
- `hr-source-priority.js` — HR source prioritization engine (3-context priority: exercise/sleep/resting, device detection, confidence scoring, user overrides)
- `fit.js` — FIT binary file parser for Garmin/Wahoo workout files (returns fitLaps for interval extraction)
- `intervals.js` — Interval extraction from FIT laps + power stream detection, per-interval metrics + execution quality scoring
- `tags.js` — Canonical tag dictionary (32 workout + 14 interval tags) + detection engine, cross-activity search
- `weather-enrich.js` — Per-activity weather enrichment via Open-Meteo historical API
- `interval-insights.js` — deterministic interval execution insight generation (fade, cadence decay, HR creep, pacing)
- `planned-vs-actual.js` — training plan to activity matching, interval comparison, execution scoring
- `performance-models.js` — conditional performance models: heat penalty, sleep→execution, HRV readiness, fueling→durability, kJ/kg durability threshold
- `cp-model.js` — Critical Power model: hyperbolic fitting (CP/W'/Pmax), CP-based zones, AI formatting
- `adaptive-zones.js` — Adaptive training zones: readiness-adjusted zone shifts (recovery/TSB signals), zone history delta computation, AI formatting
- `durability.js` — Durability tracking: per-activity fatigue-bucket power curves (kJ/kg buckets), retention scoring, aggregation, race prediction interpolation
- `wbal.js` — W' Balance (Skiba differential reconstitution): real-time anaerobic reserve tracking, depletion/recovery events, empty tank detection, AI formatting
- `similar-sessions.js` — Similar session matching: weighted multi-dimensional similarity scoring (duration/TSS/IF/NP/tags), cross-domain context enrichment (sleep/HRV/weather/nutrition/training load/travel/cross-training)
- `segment-scoring.js` — Segment adjusted performance: context enrichment (weather/HRV/sleep/fatigue denormalization), adjusted score computation (heat/HRV/fatigue/sleep/wind penalties), PR detection, AI formatting
- `travel.js` — Travel detection pure functions: haversine distance, timezone/altitude shift detection, jet lag recovery estimation, altitude power penalty
- `prescription.js` — Training prescription engine: power profile gap analysis (CP model comparison), workout template selection (readiness/TSB/race/cross-training guards), conditions adjustment (heat/cold/readiness power factor), AI context builder
- `cross-training.js` — Cross-training utilities: recovery impact estimation (none/minor/moderate/major), TSS approximation from intensity + duration
- `wahoo.js` — Wahoo API client (OAuth token refresh, workout type mapping, activity field mapping, FIT file download) + shared mapWahooToActivity used by webhook + sync
- `garmin.js` — Garmin Health API client (OAuth 1.0a HMAC-SHA1 signing, 3-legged token flow, signed API requests, FIT file download, 8 data mappers: activity/daily/sleep/bodyBattery/bodyComp/pulseOx/extended/date)
- `strava.js` — Strava API client with token refresh
- `oura.js` — Oura Ring API v2 client (OAuth token refresh with single-use refresh tokens, sleep/readiness/activity/SpO2 data fetching and mapping)
- `whoop.js` — Whoop API v2 client (OAuth token refresh, recovery/sleep/body measurement data fetching and mapping)
- `withings.js` — Withings API client (OAuth token refresh with non-standard wrapper, body comp/activity/sleep data fetching, value*10^unit decoding)
- `eightsleep.js` — Eight Sleep API client (credential auth, trends API, extended metrics extraction, encrypted credential decryption)
- `twilio.js` — Twilio SMS client (send, webhook verification, TwiML response)
- `email.js` — Resend email client (send)
- `crypto.js` — AES-256-GCM encryption/decryption for stored credentials (uses `CREDENTIAL_ENCRYPTION_KEY` env var)
- `auth.js` — session verification, CORS
- `supabase.js` — admin + public Supabase clients
- `redis.js` — Redis client for OAuth state

### Route Handlers
- `auth/connect/` — OAuth flow initiators (strava, wahoo, oura, whoop, withings, eightsleep)
- `auth/callback/` — OAuth return handlers (strava, wahoo, oura, whoop, withings)
- `integrations/sync/` — sync logic (strava full+backfill, wahoo full+backfill, eightsleep, oura, whoop, withings)
- `integrations/import/` — file-based imports (TrainingPeaks: client-side JSZip extraction → batched base64 upload, 3 API modes: batch/finalize/legacy; CSV-only enrichment also supported)
- `cron/sync-eightsleep.js` — hourly Vercel Cron syncs last 2 days of Eight Sleep data; skips users synced in last 6 hours
- `cron/sync-recovery.js` — hourly Vercel Cron syncs last 2 days of Oura/Whoop/Withings data; skips users synced in last 6 hours
- `webhooks/` — inbound webhooks (strava activity events, wahoo workout summaries, garmin activities/dailies/sleep/stress/body, whoop recovery/sleep, withings body comp/sleep)
- `activities/` — list, detail (includes activity_tags + planned_vs_actual data), annotate (saves user_notes/rating/RPE/tags + name; auto-extracts tags from notes via keyword matching; normalizes all tags to canonical form via `TAG_ALIASES` — e.g. "S&E"→"low cadence", "TT"→"time trial"), analyze, search (tag-based), query (advanced tag/filter/grouping search), smart-chips (AI-suggested query chips), wbal (GET, lazy-load W'bal stream + summary), similar (GET, weighted multi-dimensional matching + cross-domain context enrichment), compare-analysis (POST, Claude AI comparison of two activities explaining WHY performance differed), backfill-intervals, backfill-metrics, backfill-cp, backfill-wbal endpoints
- `tags/` — tag dictionary endpoint
- `health/` — blood panel upload (Claude AI extraction from PDF/image), DEXA scan upload (Claude AI extraction of body composition/regional data), and panel management
- `sleep/summary.js` — Claude-powered morning readiness assessment
- `chat/ask.js` — AI coach conversation endpoint with full athlete context
- `sms/` — Twilio SMS: send workout summaries, test/preview, inbound webhook (STOP/START/HELP + conversational AI replies)
- `email/send.js` — Resend email: post-workout AI analysis emails (Claude-formatted HTML, first-analysis-only dedup, branded dark-theme template)
- `profile/generate-bio.js` — AI-generated athlete bio from activity history (Claude sonnet, 2-3 sentences, does NOT auto-save)
- `user/` — profile, integrations list, disconnect, accept-terms (consent recording), delete (account deletion with cascade), export (full data export as JSON)
- `settings.js` — notification preferences and user settings
- `settings/hr-priority.js` — GET/PUT/DELETE endpoint for HR source priority configuration per context
- `weather/current.js` — Open-Meteo API weather fetch, caches in `daily_metrics.weather_data`
- `goals/` — working goals CRUD: list, upsert, update-status (status/checklist toggle)
- `nutrition/` — nutrition logging: parse (Claude-powered free-text → structured items), log (save to `nutrition_logs`), previous (last log for quick reuse)
- `calendar/` — training calendar: list (date range query), upsert (create/update planned workouts)
- `models/` — performance model summary endpoint
- `zones/` — adaptive training zones endpoint (readiness-adjusted zones, preference, zone delta, history)
- `durability/` — durability summary endpoint (aggregate score, fatigue buckets, trend, race predictions)
- `feedback/` — AI insight feedback: submit (POST, upsert thumbs up/down per insight), preferences (GET, aggregated category preference map for AI prompt personalization)
- `checkin/` — daily subjective check-in: submit (POST, upserts life_stress/motivation/soreness/mood to daily_metrics), status (GET, today's check-in or null)
- `cross-training/` — non-cycling activity logger: log (POST, computes recovery_impact + estimated_tss), list (GET, recent entries with ?days=N filter)
- `location/detect-travel.js` — browser geolocation travel detection: POST accepts `{ lat, lng, timezone }`, compares to stored `profiles.location_lat/lng`, creates `travel_event` if >200km, updates profile location. Called once per day from dashboard via browser Geolocation API
- `dashboard/intelligence.js` — adaptive AI dashboard: 3 modes (POST_RIDE/PRE_RIDE_PLANNED/DAILY_COACH), returns structured action items + insights
- `prescription/` — AI workout prescription: next-workout (GET, power profile gap analysis → Claude-generated structured workout with readiness check, structure, fueling, alternative; auto-skips if already rode or workout planned)
- `races/` — race management: parse (AI natural language → structured races), upsert, list, detail, analyze (AI demands vs athlete profile), training-plan (generate), protocol (generate/update race-day checklist), weather (fetch/refresh)
- `segments/` — Strava segment comparison: list (GET, all segments or filter by activity_id with effort history), detail (GET, segment metadata + all efforts + adjusted scores + trend), compare (GET, side-by-side two efforts with deltas), sync (POST, backfill segments from existing Strava activities)
- `profile/` — progressive profiling: question (save answer), next-question (context-aware next unanswered)

**API pattern**: Every endpoint calls `cors(res)`, checks `req.method`, calls `verifySession(req)` for auth, returns `{ error: "message" }` on failure.

## Database (Supabase)

Core tables (21): `profiles`, `integrations`, `activities`, `daily_metrics`, `power_profiles`, `blood_panels`, `dexa_scans`, `user_settings`, `ai_conversations`, `ai_messages`, `training_calendar`, `working_goals`, `nutrition_logs`, `travel_events`, `cross_training_log`, `ai_feedback`, `hr_source_config`, `races`, `athlete_profile_questions`, `segments`, `segment_efforts`

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
- `profiles.athlete_bio` — AI-generated athlete description (TEXT, editable by user)
- `daily_metrics.weather_data` JSONB column (cached Open-Meteo data)
- `activity_tags` — canonical tags for cross-activity search (tag_id, scope, confidence, evidence JSONB, interval_index), RLS enabled
- `activities.activity_weather` JSONB column — per-activity weather from Open-Meteo historical API
- `activities.laps` JSONB column — structured interval data with per-interval metrics + execution quality
- `activities.wbal_data` JSONB column — W'bal stream + summary (depletion/recovery events, min %, empty tank count)
- `activities.wbal_min_pct` NUMERIC — minimum W'bal % (scalar for efficient queries)
- `activities.wbal_empty_events` INTEGER — count of empty tank events (<5% W')
- `activities.hr_source` TEXT — HR device/source type (chest_strap, device_file, strava_stream, wrist_optical, etc.)
- `activities.hr_source_confidence` TEXT — confidence level (high/medium/low) based on device type
- `daily_metrics.rhr_source`, `sleep_hr_source`, `hrv_source` — source attribution for daily HR metrics (oura, whoop, eightsleep, etc.)
- `hr_source_config` — per-user HR source priority overrides (user_id, context, provider_priority TEXT[], is_custom), RLS enabled
- `activities.user_notes`, `user_rating`, `user_rpe`, `user_tags` — activity annotation columns
- `activities.gi_comfort`, `mental_focus`, `perceived_recovery_pre` — subjective perception columns (1-5 scale, migration 010)
- `daily_metrics.life_stress_score`, `motivation_score`, `muscle_soreness_score`, `mood_score` — subjective check-in columns (1-5 scale, migration 010)
- `daily_metrics.checkin_completed_at` — timestamp when morning check-in was submitted (migration 010)
- `daily_metrics.resting_spo2` — resting SpO2 measurement (migration 010)
- `travel_events` — timezone/altitude travel detection (origin/dest lat/lng/timezone/altitude, distance, acclimation tracking), RLS enabled
- `cross_training_log` — non-cycling activities (yoga, strength, etc.) with body region, perceived intensity, estimated TSS, recovery impact, RLS enabled
- `ai_feedback` — thumbs up/down on AI insights (user_id, activity_id, source, insight_index, insight_category, insight_type, insight_title, feedback ±1), unique on user+activity+source+index, RLS enabled
- Storage buckets: `health-files` (blood panels, DEXA PDFs), `import-files` (legacy TrainingPeaks uploads — new flow uses client-side JSZip extraction, bypassing storage)
- Full schema: `/supabase/migrations/001_initial_schema.sql`; storage bucket: `/supabase/migrations/004_add_import_files_bucket.sql`; consent columns: `/supabase/migrations/005_add_consent_columns.sql`; dashboard v2 tables: `/supabase/migrations/006_dashboard_v2_tables.sql`; structured workouts: `/supabase/migrations/008_structured_workouts.sql`; expansion (check-in, travel, cross-training): `/supabase/migrations/010_expansion_checkin_travel_crosstraining.sql`; CP model: `/supabase/migrations/011_cp_model.sql`; athlete bio: `/supabase/migrations/012_athlete_bio.sql`; AI feedback: `/supabase/migrations/013_ai_feedback.sql`; W'bal: `/supabase/migrations/014_wbal.sql`; HR source priority: `/supabase/migrations/015_hr_source_priority.sql`; segments: `/supabase/migrations/016_segments.sql`

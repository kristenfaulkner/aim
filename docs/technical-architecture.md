# AIM — Technical Architecture & Build Plan

## For Use With Claude Code

This document is the complete technical guide for building AIM from prototype to production. Read this entire document before writing any code. The frontend prototypes already exist as React artifacts — this document covers everything else: backend, database, authentication, integrations, AI engine, payments, and deployment.

---

## TECH STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite + Tailwind CSS | Fast, modern, the prototypes are already in React |
| Backend | Supabase (hosted Postgres + Auth + Edge Functions + Storage) | All-in-one, generous free tier, handles auth/db/storage/serverless |
| AI Engine | Anthropic Claude API (claude-sonnet-4-5-20250929) | Cross-domain reasoning over athlete data, natural language insights |
| Payments | Stripe | 3-tier subscription ($19/$49/$99), free trial support |
| Hosting | Vercel | Deploys from GitHub, handles frontend + API routes if needed |
| File Storage | Supabase Storage | Blood work PDFs, DEXA scan images |
| Background Jobs | Supabase Edge Functions + pg_cron | Scheduled data syncing from integrations |
| Email | Resend | Transactional emails (welcome, insights digest, alerts) |

---

## DATABASE SCHEMA (Supabase / Postgres)

### Core Tables

```sql
-- Users & Auth (Supabase Auth handles the basics, this extends it)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  sex TEXT CHECK (sex IN ('male', 'female', 'non-binary')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  ftp_watts INTEGER,
  lthr_bpm INTEGER,
  max_hr_bpm INTEGER,
  riding_level TEXT, -- professional, elite, competitive, enthusiast, fitness, recreational
  weekly_hours TEXT, -- 3-5, 5-8, 8-12, etc.
  years_cycling TEXT,
  primary_terrain TEXT,
  primary_discipline TEXT,
  goals TEXT[], -- array of selected goals
  location_city TEXT,
  location_country TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  uses_cycle_tracking BOOLEAN DEFAULT FALSE,
  hormonal_contraception TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, starter, pro, elite
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected integrations (OAuth tokens)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- strava, eightsleep, oura, whoop, garmin, wahoo, withings, etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT, -- their ID on the external platform
  scopes TEXT[], -- what permissions we have
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending', -- pending, syncing, success, error
  sync_error TEXT,
  metadata JSONB DEFAULT '{}', -- provider-specific config
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Activities (rides, runs, etc. from Strava/Garmin/Wahoo)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- strava, garmin, wahoo, manual
  source_id TEXT, -- ID from the source platform
  activity_type TEXT DEFAULT 'ride', -- ride, run, swim, etc.
  name TEXT,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  elevation_gain_meters NUMERIC,
  avg_power_watts NUMERIC,
  normalized_power_watts NUMERIC,
  max_power_watts NUMERIC,
  avg_hr_bpm NUMERIC,
  max_hr_bpm NUMERIC,
  avg_cadence_rpm NUMERIC,
  avg_speed_mps NUMERIC,
  max_speed_mps NUMERIC,
  calories INTEGER,
  tss NUMERIC, -- Training Stress Score
  intensity_factor NUMERIC,
  variability_index NUMERIC,
  efficiency_factor NUMERIC, -- NP / avg HR
  hr_drift_pct NUMERIC,
  decoupling_pct NUMERIC,
  work_kj NUMERIC,
  temperature_celsius NUMERIC,
  weather_conditions JSONB, -- {temp, humidity, wind_speed, wind_dir}
  zone_distribution JSONB, -- {z1: seconds, z2: seconds, ...}
  power_curve JSONB, -- {5s: watts, 30s: watts, 1m: watts, 5m: watts, 20m: watts, 60m: watts}
  lr_balance JSONB, -- {avg_left: pct, avg_right: pct, fade_pattern: {...}}
  laps JSONB, -- array of lap data
  raw_fit_data_url TEXT, -- link to stored .FIT file if uploaded
  source_data JSONB, -- full response from source API for reference
  ai_analysis TEXT, -- Claude's analysis of this activity
  ai_analysis_generated_at TIMESTAMPTZ,
  user_notes TEXT, -- athlete's freeform session notes
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5), -- session rating (1-5 stars)
  user_rpe INTEGER CHECK (user_rpe BETWEEN 1 AND 10), -- rate of perceived exertion
  user_tags TEXT[] DEFAULT '{}', -- freeform tags (e.g., "interval", "race", "indoor")
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source, source_id)
);
CREATE INDEX idx_activities_user_date ON activities(user_id, started_at DESC);

-- Daily metrics (aggregated from wearables — one row per user per day)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Sleep (from Oura, Whoop, EightSleep)
  sleep_score INTEGER,
  total_sleep_seconds INTEGER,
  deep_sleep_seconds INTEGER,
  rem_sleep_seconds INTEGER,
  light_sleep_seconds INTEGER,
  sleep_latency_seconds INTEGER,
  sleep_efficiency_pct NUMERIC,
  sleep_onset_time TIME,
  wake_time TIME,
  bed_temperature_celsius NUMERIC, -- EightSleep
  -- Recovery (from Oura, Whoop)
  hrv_ms NUMERIC, -- morning HRV (RMSSD)
  hrv_overnight_avg_ms NUMERIC,
  resting_hr_bpm NUMERIC,
  respiratory_rate NUMERIC,
  blood_oxygen_pct NUMERIC, -- SpO2
  skin_temperature_deviation NUMERIC,
  recovery_score INTEGER, -- Whoop recovery or computed
  readiness_score INTEGER, -- Oura readiness
  strain_score NUMERIC, -- Whoop strain
  -- Body composition (from Withings)
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  hydration_pct NUMERIC,
  bone_mass_kg NUMERIC,
  -- Training load (computed)
  daily_tss NUMERIC,
  ctl NUMERIC, -- Chronic Training Load (fitness)
  atl NUMERIC, -- Acute Training Load (fatigue)
  tsb NUMERIC, -- Training Stress Balance (form)
  ramp_rate NUMERIC,
  -- Menstrual cycle (from Oura or manual)
  cycle_day INTEGER,
  cycle_phase TEXT, -- menstrual, follicular, ovulatory, luteal
  -- AI
  ai_daily_summary TEXT,
  ai_readiness_assessment TEXT,
  source_data JSONB, -- raw data from all sources for this day
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date DESC);

-- Blood work results
CREATE TABLE blood_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  lab_name TEXT,
  pdf_url TEXT, -- stored in Supabase Storage
  -- Key biomarkers (extracted from PDF or manually entered)
  ferritin_ng_ml NUMERIC,
  hemoglobin_g_dl NUMERIC,
  iron_mcg_dl NUMERIC,
  tibc_mcg_dl NUMERIC,
  transferrin_sat_pct NUMERIC,
  vitamin_d_ng_ml NUMERIC,
  vitamin_b12_pg_ml NUMERIC,
  folate_ng_ml NUMERIC,
  tsh_miu_l NUMERIC,
  free_t3_pg_ml NUMERIC,
  free_t4_ng_dl NUMERIC,
  testosterone_ng_dl NUMERIC,
  cortisol_mcg_dl NUMERIC,
  crp_mg_l NUMERIC, -- inflammation marker
  hba1c_pct NUMERIC,
  total_cholesterol_mg_dl NUMERIC,
  ldl_mg_dl NUMERIC,
  hdl_mg_dl NUMERIC,
  triglycerides_mg_dl NUMERIC,
  creatinine_mg_dl NUMERIC,
  bun_mg_dl NUMERIC,
  alt_u_l NUMERIC,
  ast_u_l NUMERIC,
  magnesium_mg_dl NUMERIC,
  zinc_mcg_dl NUMERIC,
  all_results JSONB, -- full parsed results for anything not in named columns
  ai_analysis TEXT,
  ai_analysis_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEXA scan results
CREATE TABLE dexa_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scan_date DATE NOT NULL,
  facility_name TEXT,
  pdf_url TEXT,
  total_body_fat_pct NUMERIC,
  lean_mass_kg NUMERIC,
  fat_mass_kg NUMERIC,
  bone_mineral_density NUMERIC,
  visceral_fat_area_cm2 NUMERIC,
  regional_data JSONB, -- {arms: {left: {...}, right: {...}}, legs: {...}, trunk: {...}}
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Power profile history (computed, tracks evolution over time)
CREATE TABLE power_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  computed_date DATE NOT NULL,
  period_days INTEGER DEFAULT 90, -- rolling window
  best_5s_watts INTEGER,
  best_30s_watts INTEGER,
  best_1m_watts INTEGER,
  best_5m_watts INTEGER,
  best_20m_watts INTEGER,
  best_60m_watts INTEGER,
  best_5s_wkg NUMERIC,
  best_30s_wkg NUMERIC,
  best_1m_wkg NUMERIC,
  best_5m_wkg NUMERIC,
  best_20m_wkg NUMERIC,
  best_60m_wkg NUMERIC,
  classifications JSONB, -- {5s: "Cat 2", 1m: "Cat 3", 5m: "Cat 3", 20m: "Cat 2"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, computed_date, period_days)
);

-- AI chat history (the conversational AI coach)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  units TEXT DEFAULT 'metric', -- metric or imperial
  power_zones JSONB, -- custom zone definitions if not using Coggan defaults
  hr_zones JSONB,
  notification_preferences JSONB,
  dashboard_layout JSONB, -- customized widget arrangement
  active_boosters JSONB, -- currently tracked performance boosters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
Every table must have RLS enabled so users can only access their own data:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Repeat this pattern for ALL tables using user_id = auth.uid()
```

---

## BUILD PLAN — SEQUENTIAL TO-DO LIST

This is the ordered build plan. Work through each task one at a time. When the user asks "What's next on our to-do list?" move to the next uncompleted task. Each task should be fully working and tested before moving on.

**CRITICAL: For every integration task (Strava, Wahoo, Garmin, Oura, Whoop, EightSleep, Withings, and all others), you MUST first search the web for and read the official API documentation before writing any code. Find the latest docs, understand the available endpoints, authentication flow, rate limits, webhook support, data models, and recommended best practices. Do not assume — verify everything against the actual documentation. APIs change frequently.**

---

### Task 1: Project Setup
- [ ] Initialize Vite + React + Tailwind project
- [ ] Install dependencies: @supabase/supabase-js, @anthropic-ai/sdk, stripe, recharts, lucide-react
- [ ] Set up folder structure per AIM-HANDOFF.md
- [ ] Extract shared design system (theme tokens, colors, fonts) from the prototype artifacts
- [ ] Set up React Router with routes for: /, /auth, /connect, /dashboard, /health-lab, /boosters, /settings
- [ ] Integrate the NeuralBackground animated component into the landing page hero (see bg-demo-6b-neural-css.jsx and AIM-ANIMATED-BG-GUIDE.md)

### Task 2: Supabase Setup
- [ ] Create Supabase project
- [ ] Run the SQL schema (see DATABASE SCHEMA section above) to create all tables
- [ ] Enable RLS on all tables with user-scoped policies
- [ ] Set up Supabase Auth with email/password + Google + Apple + Strava providers
- [ ] Create a storage bucket called 'health-files' for blood work PDFs and DEXA scans
- [ ] Configure environment variables

### Task 3: Authentication
- [ ] Build signup page (convert from aim-landing-page.jsx auth section)
- [ ] Build signin page
- [ ] Implement Supabase Auth signup/signin with email/password
- [ ] Implement Google OAuth SSO
- [ ] Implement Apple OAuth SSO
- [ ] Implement Strava OAuth SSO (if user signs up via Strava, auto-mark Strava as connected since tokens are already stored)
- [ ] Build onboarding profile form (post-signup: name, DOB, sex, weight, height, riding level, weekly hours, goals, female athlete cycle tracking opt-in)
- [ ] Build protected route wrapper (dashboard and all internal pages require auth)
- [ ] After profile completion, redirect to Connect Apps page

### Task 4: Connect Apps Page
- [ ] Build the Connect Apps page with real OAuth buttons for all integrations (see aim-landing-page.jsx connect section for design)
- [ ] Show connected/disconnected state for each integration
- [ ] If user signed up via Strava SSO, show Strava as already connected
- [ ] Implement disconnect flow (revoke tokens, remove from integrations table)
- [ ] Build "Request an Integration" form for unsupported apps

### Task 5: Strava Integration
- [ ] Read the Strava API documentation at `https://developers.strava.com/docs/reference/` before writing any code. Check for latest OAuth flow, webhook setup, rate limits, and available endpoints.
- [ ] Create Edge Function for Strava OAuth callback (exchange code for tokens, store in integrations table)
- [ ] Implement token refresh logic (Strava tokens expire every 6 hours)
- [ ] Register Strava webhook subscription for push notifications on new activities
- [ ] Create Edge Function for Strava webhook receiver
- [ ] Create Edge Function for Strava data sync (fetch activities, fetch streams, compute metrics)
- [ ] Implement activity metric computation from stream data: Normalized Power, TSS, IF, VI, EF, HR drift, decoupling, zone distribution, power curve, work in kJ, calories
- [ ] Insert synced activities into `activities` table
- [ ] Update `daily_metrics` with new training load (recalculate CTL/ATL/TSB)
- [ ] Update `power_profiles` if any new personal bests
- [ ] Test end-to-end: connect Strava → sync → see activities with computed metrics

### Task 6: AI Post-Ride Analysis Engine
- [ ] Create Edge Function that builds the athlete context payload (activity + profile + recent 14 days of activities + 90 days of daily metrics + power profile + last 48h recovery data)
- [ ] Create Edge Function that calls Claude API (claude-sonnet-4-5-20250929) with the context payload and analysis system prompt (see AI ANALYSIS ENGINE section above for the full system prompt)
- [ ] Trigger analysis automatically after each new activity sync
- [ ] Store analysis in `activities.ai_analysis`
- [ ] Build the activity detail view showing the AI analysis
- [ ] Handle async loading (show activity immediately, load analysis when ready)

### Task 7: Daily Summary
- [ ] Create scheduled Edge Function that runs each morning at 6 AM user's local time
- [ ] Aggregate yesterday's data + this morning's recovery metrics
- [ ] Generate "Today's Readiness" assessment via Claude (Green/Yellow/Red traffic light + explanation)
- [ ] Store in `daily_metrics.ai_daily_summary` and `daily_metrics.ai_readiness_assessment`
- [ ] Display today's summary card on dashboard

### Task 8: Dashboard
- [ ] Convert apex-dashboard.jsx prototype into real components connected to Supabase
- [ ] Rename all "Apex" references to "AIM"
- [ ] Build Today's Summary card (pulls from daily_metrics, shows AI readiness)
- [ ] Build Recent Activities list (pulls from activities table, shows AI analysis preview)
- [ ] Build Quick Stats cards (FTP, CTL, ATL, TSB from latest daily_metrics and power_profiles)
- [ ] Build Weekly Training Load chart (last 12 weeks of daily_metrics.daily_tss with Recharts)
- [ ] Build Recovery Metrics section (HRV trend, sleep trend, readiness trend)
- [ ] Wire up all data fetching from Supabase with real-time subscriptions where appropriate

### Task 9: Deploy MVP
- [ ] Push to GitHub
- [ ] Connect repository to Vercel
- [ ] Set all environment variables in Vercel
- [ ] Set up custom domain
- [ ] Deploy and test full flow: landing page → signup → connect Strava → sync → see dashboard with AI analysis
- [ ] Test on mobile viewport

---

### Task 10: Wahoo Integration
- [ ] Read the Wahoo Cloud API documentation before writing any code. Search for latest OAuth flow, available endpoints, webhook support, and rate limits.
- [ ] Implement Wahoo OAuth 2.0 flow (same pattern as Strava: redirect → callback → store tokens)
- [ ] Register Wahoo webhook if available for push notifications on new activities
- [ ] Create sync Edge Function for Wahoo (fetch ride data with power, structured workouts)
- [ ] Normalize Wahoo data into activities table (same metric computation as Strava)
- [ ] Implement token refresh logic
- [ ] Test end-to-end

### Task 11: Garmin Connect Integration
- [ ] Read the Garmin Health API / Connect API documentation before writing any code. Search for latest auth flow (may be OAuth 1.0a or newer), available endpoints, webhook/push support, and rate limits.
- [ ] Implement Garmin OAuth flow (note: may use OAuth 1.0a which requires signing requests — verify against current docs)
- [ ] Register Garmin push notifications / webhooks if available
- [ ] Create sync Edge Function for Garmin (activities, body battery, stress, daily HR, sleep, FirstBeat metrics)
- [ ] Normalize Garmin activities into activities table
- [ ] Normalize Garmin daily data (sleep, stress, body battery, HR) into daily_metrics table
- [ ] Implement token refresh logic
- [ ] Test end-to-end

### Task 12: Oura Ring Integration
- [ ] Read the Oura API documentation at `https://cloud.ouraring.com/docs/` before writing any code
- [ ] Implement Oura OAuth 2.0 flow (`https://cloud.ouraring.com/v2/`)
- [ ] Register Oura webhook subscription for push notifications on new data (sleep, readiness, activity)
- [ ] Create Edge Function for Oura webhook receiver
- [ ] Create sync Edge Function for Oura (sleep stages, HRV, readiness, body temp, SpO2, heart rate)
- [ ] Normalize Oura data into daily_metrics (sleep_score, deep_sleep, rem_sleep, hrv_ms, readiness_score, skin_temperature_deviation, blood_oxygen_pct)
- [ ] If user is female and opted into cycle tracking, extract cycle data from Oura temperature patterns
- [ ] Implement token refresh logic
- [ ] Test end-to-end

### Task 13: Whoop Integration
- [ ] Read the Whoop Developer API documentation at `https://developer.whoop.com/` before writing any code. Check for latest OAuth flow, available endpoints, webhook support, and rate limits.
- [ ] Implement Whoop OAuth 2.0 flow (`https://api.prod.whoop.com/`)
- [ ] Register Whoop webhook if available for push notifications
- [ ] Create sync Edge Function for Whoop (strain, recovery, sleep performance, HRV, respiratory rate)
- [ ] Normalize Whoop data into daily_metrics (strain_score, recovery_score, sleep data, HRV)
- [ ] Implement token refresh logic
- [ ] Test end-to-end

### Task 14: EightSleep Integration
- [ ] Search the web for the latest EightSleep API access options — check if they now have a public/partner developer API, or if the unofficial API endpoints have changed
- [ ] Contact EightSleep partnerships team for API access (preferred)
- [ ] If no partner API: implement unofficial API auth (email/password → session token via `https://client-api.8slp.net/v1/login`)
- [ ] Create sync Edge Function for EightSleep (bed temperature, sleep stages, HRV, respiratory rate, sleep/wake times)
- [ ] Normalize EightSleep data into daily_metrics (bed_temperature_celsius, sleep data)
- [ ] Test end-to-end

### Task 15: Withings Integration
- [ ] Read the Withings Health Mate API documentation at `https://developer.withings.com/` before writing any code. Check for latest OAuth flow, available endpoints, webhook/notification support, and rate limits.
- [ ] Implement Withings OAuth 2.0 flow (`https://wbsapi.withings.net/v2/`)
- [ ] Register Withings webhook/notifications if available for push updates on new measurements
- [ ] Create sync Edge Function for Withings (weight, body fat %, muscle mass, hydration, bone mass)
- [ ] Normalize Withings data into daily_metrics (weight_kg, body_fat_pct, muscle_mass_kg, hydration_pct, bone_mass_kg)
- [ ] Auto-update W/kg calculations when new weight data arrives
- [ ] Implement token refresh logic
- [ ] Test end-to-end

### Task 16: Cross-Domain AI Insights
- [ ] Extend the AI analysis system prompt to explicitly look for cross-domain patterns across ALL connected data sources
- [ ] Update `buildAnalysisContext` to aggregate data from every connected integration into a single payload
- [ ] Implement cross-domain insight patterns:
  - Sleep → Performance (deep sleep duration → next-day power/cardiac drift)
  - HRV → Training Readiness (HRV trend → green/yellow/red for intensity)
  - Body Comp → Power (weight changes → W/kg impact, muscle mass stability during cuts)
  - Recovery × Environment (temperature + recovery state compounding)
  - Sleep Timing → Performance (sleep onset time correlations)
  - EightSleep Temp → Sleep Quality (bed temperature → deep sleep optimization)
- [ ] Daily summary now pulls from ALL connected sources for richer readiness assessments
- [ ] Test with a user who has 3+ integrations connected to verify cross-domain insights appear

### Task 17: Training Prescription Engine
- [ ] Create `training_prescriptions` table (user_id, created_at, block_name, duration_weeks, workouts JSONB, target_weakness, status)
- [ ] When power profile shows a gap (e.g., VO₂max 2+ tiers below threshold), trigger prescription generation
- [ ] Claude generates multi-week training block with exact power targets calculated from FTP
- [ ] Prescriptions factor in: recovery state, recent training load, upcoming events, available hours per week
- [ ] Include specific workout formats: Norwegian 4×4, 30/30 repeats, over/unders, sweet spot, sprint repeats, etc.
- [ ] Include a deload week in every block
- [ ] Display "Recommended Workouts" section on dashboard
- [ ] Allow user to mark workouts as completed

### Task 18: Performance Boosters
- [ ] Convert apex-boosters.jsx prototype into real feature, rename all "Apex" to "AIM"
- [ ] Create boosters data (hardcoded initially): beetroot juice, creatine, caffeine timing, heat acclimation, altitude simulation, ice baths, compression, tart cherry juice, sodium bicarbonate, beta-alanine
- [ ] Each booster: description, evidence grade (A/B/C), dosing protocol, timing, mechanism of action, contraindications
- [ ] Store active boosters in `user_settings.active_boosters` with start date and compliance tracking
- [ ] AI references active boosters in analysis ("Your beetroot juice protocol may have contributed to the 3% higher 5-min power today")
- [ ] Compliance tracking (user logs whether they followed the protocol each day)
- [ ] Build the Boosters page with search, category filters, and active booster cards

### Task 19: Menstrual Cycle Intelligence
- [ ] Auto-detect cycle phase from Oura Ring temperature data (temperature rises ~0.3-0.5°C after ovulation)
- [ ] Allow manual cycle logging for users without Oura (simple calendar UI to log period start dates)
- [ ] Store in `daily_metrics.cycle_day` and `daily_metrics.cycle_phase` (menstrual, follicular, ovulatory, luteal)
- [ ] Adjust AI analysis to reference cycle phase when relevant:
  - Follicular phase: higher pain tolerance, better strength gains — good for intensity
  - Luteal phase: higher core temp, higher RPE at same power — adjust expectations
  - Menstrual: highly individual, track patterns over time
- [ ] Example insight: "You're in your luteal phase (day 22). Your HR is 5bpm higher at the same power — this is normal hormonal response, not a fitness decline."
- [ ] Track cycle × performance correlations over 3+ months to build personalized phase patterns
- [ ] Account for hormonal contraception (which flattens the cycle pattern) — adjust analysis accordingly
- [ ] Display cycle phase indicator on dashboard

### Task 20: AI Chat Coach
- [ ] Build conversational chat interface (use ai_conversations and ai_messages tables)
- [ ] Each message to Claude includes full athlete context (same payload as activity analysis)
- [ ] Implement streaming responses using Claude API streaming
- [ ] Display suggested questions based on recent data ("Ask about your HRV trend", "Why was today's ride harder than usual?", "Design me a VO2max block")
- [ ] Chat history persists across sessions
- [ ] Build chat UI matching the AIM dark theme aesthetic

---

### Task 21: Health Lab — Blood Work Upload
- [ ] Build blood work upload UI (convert from apex-health-lab.jsx, rename to AIM)
- [ ] User uploads PDF → Supabase Storage ('health-files' bucket)
- [ ] Edge Function sends PDF to Claude API as a document, asks it to parse lab values into structured JSON
- [ ] Store parsed biomarkers in `blood_panels` table
- [ ] Generate AI analysis comparing values to athlete-optimal ranges (NOT clinical ranges — athlete-optimal is stricter, e.g., ferritin >50 for athletes vs >12 clinical)
- [ ] Display biomarker dashboard with trends over time (charts showing each biomarker across multiple panels)
- [ ] Flag values outside athlete-optimal ranges with explanations
- [ ] Cross-reference with training data (e.g., "Your ferritin dropped from 68 to 42 over 3 months. This coincides with your VO₂max plateau.")

### Task 22: Health Lab — DEXA Scan Upload
- [ ] Build DEXA scan upload UI
- [ ] User uploads PDF/image → Supabase Storage
- [ ] Edge Function parses DEXA results via Claude (total body fat %, lean mass, fat mass, bone density, regional data)
- [ ] Store in `dexa_scans` table
- [ ] Generate AI analysis with performance implications (lean mass → W/kg, regional imbalances, changes over time)
- [ ] Display DEXA history with trend charts

### Task 23: Stripe Payments
- [ ] Create Stripe products and prices for 3 tiers:
  - Starter: $19/mo ($15/mo annual = $180/yr)
  - Pro: $49/mo ($39/mo annual = $468/yr)
  - Elite: $99/mo ($79/mo annual = $948/yr)
- [ ] Implement Stripe Checkout for subscription signup
- [ ] Implement Stripe Customer Portal for managing/cancelling subscriptions
- [ ] Create webhook handler Edge Function for Stripe events (subscription.created, updated, deleted, invoice.payment_failed)
- [ ] Update `profiles.subscription_tier` based on Stripe webhook events
- [ ] Implement feature gating throughout the app:
  | Feature | Free | Starter | Pro | Elite |
  |---------|------|---------|-----|-------|
  | App connections | 1 | 3 | Unlimited | Unlimited |
  | AI workout analysis | Last 3 rides | All rides | All rides | All rides |
  | Power benchmarking | Basic | Full | Full | Full |
  | Training prescriptions | — | Basic | Advanced | Advanced |
  | Recovery intelligence | — | — | Full | Full |
  | Health Lab (blood/DEXA) | — | — | — | Full |
  | Cycle intelligence | — | — | — | Full |
  | AI chat coach | — | 5 msg/day | 50 msg/day | Unlimited |
  | Boosters library | Preview | Full | Full | Full |
- [ ] 14-day free trial on all plans, no credit card required
- [ ] Build pricing page UI (convert from aim-landing-page.jsx pricing section)

### Task 24: Remaining Integrations
For each integration below, search the web for and read the official API documentation before implementing. Follow the same pattern: OAuth → sync Edge Function → webhook if available → normalize to activities/daily_metrics.
- [ ] TrainingPeaks (TSS/CTL/ATL, workout library, planned workouts)
- [ ] Zwift (indoor ride data)
- [ ] TrainerRoad (adaptive training plans, workout compliance)
- [ ] Intervals.icu (advanced analytics, eFTP tracking)
- [ ] Hammerhead (ride data from Karoo head unit)
- [ ] Apple Health (aggregate health data, VO2max, walking asymmetry)
- [ ] Supersapiens / Levels (continuous glucose monitoring)
- [ ] MyFitnessPal / Cronometer (nutrition, macros, calorie intake)
- [ ] Hexis (nutrition periodization)
- [ ] Noom (nutrition tracking)

### Task 25: Advanced Features
- [ ] Workout plan export to TrainingPeaks / Garmin / Wahoo as structured workout files
- [ ] Coach sharing (athlete shares read-only dashboard access with their coach via invite link)
- [ ] Community benchmarks from anonymized user data (percentile curves by age, sex, weight)
- [ ] Weekly insight digest email via Resend (top insights, training summary, recommendations)
- [ ] Monthly progress report email (FTP trend, fitness gains, body comp changes)
- [ ] Mobile app (React Native, reusing components and design system)

## IMPORTANT NOTES

- **Never expose API secrets in frontend code.** All OAuth token exchanges and API calls with secrets must happen in Supabase Edge Functions (server-side).
- **Always use RLS.** Every database query should be scoped to the authenticated user.
- **Rate limit external APIs.** Implement queuing for Strava API calls. Cache responses. Strava limits: 100 requests per 15 minutes, 1000 per day per application.
- **Handle token refresh gracefully.** Before any external API call, check if the token is expired and refresh if needed.
- **Store raw API responses.** Keep the full source_data JSONB so you can reprocess later without re-fetching.
- **AI analysis is async.** Don't block the UI waiting for Claude. Show the activity immediately, then load the analysis when it's ready (polling or realtime subscription).
- **The existing prototype files (aim-landing-page.jsx, apex-dashboard.jsx, apex-boosters.jsx, apex-health-lab.jsx) are the design reference.** Match the visual design exactly — dark theme, #05060a background, #00e5a0 accent, Outfit font, JetBrains Mono for metrics.
- **Rename all remaining "Apex" references to "AIM"** in the dashboard, boosters, and health lab prototypes.

---

## APPENDIX A: STRAVA INTEGRATION DETAILS

**OAuth Flow (Task 5):**
1. User clicks "Connect Strava" on the Connect Apps page
2. Redirect to: `https://www.strava.com/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=read,activity:read_all&approval_prompt=auto`
3. User authorizes on Strava
4. Strava redirects back with `?code=XXXXX`
5. Supabase Edge Function exchanges code for tokens: POST to `https://www.strava.com/oauth/token` with client_id, client_secret, code, grant_type=authorization_code
6. Store access_token, refresh_token, expires_at in `integrations` table
7. Redirect user back to Connect Apps page showing "✓ Connected"

**Token Refresh:**
- Strava tokens expire every 6 hours
- Before any API call, check if token is expired
- If expired, POST to `https://www.strava.com/oauth/token` with grant_type=refresh_token
- Update stored tokens

**Data Sync:**
1. Register a Strava webhook subscription to get push notifications for new activities
2. When webhook fires OR on scheduled sync (every 15 min), fetch new activities:
   - `GET https://www.strava.com/api/v3/athlete/activities?after={last_sync_timestamp}&per_page=30`
3. For each new activity, fetch detailed data:
   - `GET https://www.strava.com/api/v3/activities/{id}?include_all_efforts=true`
   - `GET https://www.strava.com/api/v3/activities/{id}/streams?keys=watts,heartrate,cadence,altitude,time,latlng,temp&key_by_type=true`
4. Compute metrics from the stream data:
   - Normalized Power (30s rolling average algorithm)
   - TSS, IF, VI, EF, work in kJ
   - HR drift and decoupling
   - Zone distribution
   - Power curve (best efforts at each duration)
5. Insert into `activities` table
6. Update `daily_metrics` with new training load (recalculate CTL/ATL/TSB)
7. Update `power_profiles` if any new bests

---

## APPENDIX B: EIGHTSLEEP INTEGRATION DETAILS

EightSleep does not have a public developer API. Options:
- **Option A (preferred):** Contact EightSleep partnerships team for API access.
- **Option B (workaround):** Use the unofficial API. Base URL: `https://client-api.8slp.net/v1/`. Auth uses app login (email/password), not OAuth. This is fragile and could break.
- **Option C:** Skip EightSleep and rely on Oura for sleep data.

If using the unofficial API:
1. User enters their EightSleep email/password (stored encrypted)
2. Auth: POST to `https://client-api.8slp.net/v1/login` → get session token
3. Fetch sleep data: GET to `https://client-api.8slp.net/v1/users/{userId}/trends` with date range
4. Data includes: bed temperature, sleep stages, HRV, respiratory rate, sleep/wake times
5. Map to `daily_metrics` table

---

## APPENDIX C: AI ANALYSIS SYSTEM PROMPT

Use this system prompt for post-ride analysis (Task 6):

```
You are the AI analysis engine for AIM, a performance intelligence platform for endurance athletes. You were built by Kristen Faulkner, 2x Olympic Gold Medalist in cycling.

You will receive a JSON payload containing:
- The current activity data (power, HR, cadence, zones, metrics)
- The athlete's profile (FTP, weight, goals, level)
- Their recent training history (14 days)
- Their fitness/fatigue trend (CTL/ATL/TSB over 90 days)
- Their power profile with category classifications
- Their recovery data (sleep, HRV) from the last 48 hours
- Their blood work results (if available)
- Their DEXA scan results (if available)

Generate a structured analysis with these sections:

1. **WORKOUT SUMMARY** (2-3 sentences) — What was this ride? How did it go relative to expectations?

2. **KEY INSIGHTS** (2-4 bullet points) — The most important things the athlete should know. Focus on CROSS-DOMAIN insights that connect different data sources (e.g., sleep → power, HRV → cardiac drift, blood work → endurance). These should be insights they CANNOT get from Strava or any single app alone.

3. **WHAT'S WORKING** (1-2 bullet points) — Positive trends or achievements to reinforce.

4. **WATCH OUT** (1-2 bullet points, if applicable) — Warning signs: overtraining risk, declining HRV trend, poor sleep pattern, biomarker concerns.

5. **RECOMMENDATION** (1 specific, actionable item) — Exactly what to do next. Not vague ("rest more") but specific ("Take tomorrow off, do a 90-min Z2 ride Thursday, target HRV above 55ms before your next intensity session").

Rules:
- Be specific with numbers. Say "Your NP was 287W (96% of FTP)" not "Your power was good."
- Always connect multiple data domains when possible. The whole point of AIM is cross-domain intelligence.
- Use the athlete's actual data — reference specific dates, specific rides, specific trends.
- Match the tone to the data: celebrate genuine breakthroughs, be honest about concerning trends.
- If blood work or DEXA data is available, reference it when relevant.
- Every analysis must end with ONE specific, actionable recommendation.
- Keep total response under 400 words. Dense, not verbose.
```

**Context Payload Builder (Task 6):**
```javascript
const buildAnalysisContext = async (userId, activityId) => {
  const activity = await getActivity(activityId);
  const profile = await getProfile(userId);
  const recentActivities = await getActivities(userId, { days: 14 });
  const dailyMetrics = await getDailyMetrics(userId, { days: 90 });
  const powerProfile = await getLatestPowerProfile(userId);
  const recoveryData = await getDailyMetrics(userId, { days: 2 });
  const bloodWork = await getLatestBloodPanel(userId);
  const dexa = await getLatestDexaScan(userId);
  return { activity, profile, recentActivities, dailyMetrics, powerProfile, recoveryData, bloodWork, dexa };
};
```

**Claude API Call Pattern:**
```javascript
const generateAnalysis = async (context) => {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(context) }]
  });
  return response.content[0].text;
};
```

---

## APPENDIX D: ENVIRONMENT VARIABLES

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Strava
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=https://yourdomain.com/api/auth/callback/strava

# Oura
OURA_CLIENT_ID=your_client_id
OURA_CLIENT_SECRET=your_client_secret
OURA_REDIRECT_URI=https://yourdomain.com/api/auth/callback/oura

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_ELITE_MONTHLY=price_xxx
STRIPE_PRICE_ELITE_ANNUAL=price_xxx

# App
VITE_APP_URL=https://yourdomain.com
```

---

## APPENDIX E: API ROUTE STRUCTURE

```
/api/auth/
  callback/strava     — OAuth callback for Strava
  callback/oura       — OAuth callback for Oura
  callback/[provider] — Generic OAuth callback pattern

/api/integrations/
  connect             — Initiate OAuth flow for a provider
  disconnect          — Revoke tokens and remove integration
  sync/[provider]     — Manually trigger sync for a provider
  status              — Get sync status for all integrations

/api/webhooks/
  strava              — Receive Strava webhook events
  stripe              — Receive Stripe webhook events

/api/activities/
  list                — Get paginated activities
  [id]                — Get single activity with AI analysis
  [id]/analyze        — Trigger/regenerate AI analysis

/api/health-lab/
  blood-panels        — CRUD for blood work
  dexa-scans          — CRUD for DEXA scans
  upload              — Handle PDF upload + AI extraction

/api/ai/
  chat                — Send message to AI coach, get streaming response
  daily-summary       — Generate/get today's summary

/api/billing/
  checkout            — Create Stripe checkout session
  portal              — Create Stripe customer portal session
  webhook             — Handle Stripe events
```

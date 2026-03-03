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
  -- Subjective perception (migration 010)
  gi_comfort SMALLINT CHECK (gi_comfort BETWEEN 1 AND 5),
  mental_focus SMALLINT CHECK (mental_focus BETWEEN 1 AND 5),
  perceived_recovery_pre SMALLINT CHECK (perceived_recovery_pre BETWEEN 1 AND 5),
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
  -- Subjective check-in (migration 010)
  life_stress_score SMALLINT CHECK (life_stress_score BETWEEN 1 AND 5),
  motivation_score SMALLINT CHECK (motivation_score BETWEEN 1 AND 5),
  muscle_soreness_score SMALLINT CHECK (muscle_soreness_score BETWEEN 1 AND 5),
  mood_score SMALLINT CHECK (mood_score BETWEEN 1 AND 5),
  checkin_completed_at TIMESTAMPTZ,
  resting_spo2 NUMERIC, -- (migration 010)
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

-- Travel events for timezone/altitude acclimation tracking (migration 010)
CREATE TABLE travel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  origin_timezone TEXT,
  origin_altitude NUMERIC,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  dest_timezone TEXT,
  dest_altitude NUMERIC,
  distance_km NUMERIC,
  timezone_shift_hours NUMERIC,
  altitude_change_m NUMERIC,
  travel_type TEXT, -- flight, drive, train, unknown
  altitude_acclimation_day INTEGER, -- days since arrival at altitude
  altitude_acclimation_complete BOOLEAN DEFAULT FALSE,
  last_activity_before UUID REFERENCES activities(id),
  first_activity_after UUID REFERENCES activities(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE travel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own travel events" ON travel_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own travel events" ON travel_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own travel events" ON travel_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own travel events" ON travel_events FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_travel_events_user_date ON travel_events(user_id, detected_at DESC);

-- Cross-training log for non-cycling activities (migration 010)
CREATE TABLE cross_training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activity_type TEXT, -- yoga, strength, pilates, swimming, running, hiking, etc.
  body_region TEXT, -- upper, lower, core, full_body, cardio
  perceived_intensity SMALLINT CHECK (perceived_intensity BETWEEN 1 AND 10),
  duration_minutes INTEGER,
  notes TEXT,
  estimated_tss NUMERIC,
  recovery_impact TEXT, -- positive, neutral, negative
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cross_training_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cross training" ON cross_training_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cross training" ON cross_training_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cross training" ON cross_training_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cross training" ON cross_training_log FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_cross_training_user_date ON cross_training_log(user_id, date DESC);
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
- [ ] Mobile app (React Native, reusing components and design system)

---

### Task 26: Race Calendar & Periodization Planner
The race calendar is foundational — it unlocks proactive AI (taper recommendations, peak predictions, race-day projections) instead of purely reactive analysis.
- [ ] Create `races` table (user_id, name, date, location, distance, elevation, priority A/B/C, course_url, target_time, target_power, notes)
- [ ] Build Race Calendar page with timeline view showing upcoming events
- [ ] Allow adding/editing/deleting races with priority classification (A = peak race, B = important, C = tune-up)
- [ ] AI auto-generates taper protocol based on race priority, current CTL/ATL/TSB, and days until event
- [ ] Race-day predictions: projected FTP, W/kg, finish time (using VAM + weight + gradient for climbing events)
- [ ] Countdown cards on dashboard for upcoming A-priority races showing readiness trajectory
- [ ] Historical race results tracking — store actual results to improve future predictions
- [ ] Feed race calendar into all AI analysis contexts so insights reference upcoming events ("Your race is in 18 days — begin taper in ~4 days")

### Task 27: Season Planner / Annual Training Plan
Visual periodization planning that replaces what coaches charge $300+/month for.
- [ ] Create `training_blocks` table (user_id, name, type [base/build/peak/recovery/transition], start_date, end_date, target_hours, target_tss, notes)
- [ ] Build Season Planner page with visual timeline (horizontal bar chart of blocks mapped to race calendar)
- [ ] AI suggests block structure based on: goal races, available weekly hours, historical training response patterns
- [ ] Each block has target metrics: weekly hours, weekly TSS, intensity distribution (% Z1-Z7)
- [ ] Drag-and-drop block editing on the timeline
- [ ] Show actual vs planned overlay (did you hit the prescribed volume/intensity?)
- [ ] Auto-insert recovery weeks (every 3rd or 4th week based on athlete's historical recovery patterns)
- [ ] Link to race calendar — blocks auto-align to peak for A-priority events

### Task 28: Morning Check-in
Subjective data + objective wearable data together are far more predictive than either alone.
- [ ] Build morning check-in modal/page — appears on dashboard if not yet completed today
- [ ] Quick 30-second survey: fatigue (1-5), motivation (1-5), muscle soreness (1-5), mood (1-5), sleep quality subjective (1-5), any injury/pain (body map or text), menstrual phase (if opted in)
- [ ] Store in `daily_checkins` table (user_id, date, fatigue, motivation, soreness, mood, sleep_quality, injury_notes, cycle_day_manual, notes)
- [ ] Blend subjective scores into the readiness score algorithm (subjective fatigue + objective HRV is the gold standard)
- [ ] AI references check-in data in daily summary ("You reported high soreness despite good HRV — likely delayed onset from Sunday's long ride")
- [ ] Track subjective vs objective trends over time (does the athlete's perceived fatigue match their HRV? Mismatches are informative)
- [ ] Optional: quick free-text note field for anything else ("Traveled yesterday", "Stressful work week", "New saddle")

### Task 29: Smart Alerts & Notifications
Without alerts, users must remember to check the dashboard. Alerts make AIM proactive.
- [ ] Create `alerts` table (user_id, type, severity [info/warning/critical], title, body, data JSONB, read BOOLEAN, created_at)
- [ ] Build notification center in the app header (bell icon with unread count)
- [ ] Notification feed page showing all alerts with filters
- [ ] Implement alert triggers (server-side, checked during sync and daily summary):
  - HRV declining 3+ consecutive days
  - Ramp rate exceeds 7 TSS/week overtraining threshold
  - Race countdown milestones (30 days, 14 days, 7 days — with taper reminders)
  - Biomarker trending below athlete-optimal (ferritin <50, vitamin D <40, etc.)
  - Sleep debt accumulating (3-night avg below personal baseline)
  - New personal best at any power duration
  - Booster protocol compliance falling below 70%
  - Recovery score in red zone for 3+ consecutive days
- [ ] Push notifications via web push API (opt-in)
- [ ] Email notification digests via Resend (configurable: immediate for critical, daily digest for info)
- [ ] Notification preferences in Settings (per-alert-type toggle for in-app, push, email)

### Task 30: Power Duration Curve Explorer
The single most-requested feature in every cycling analytics tool. AIM's version adds cross-domain context.
- [ ] Build Power Curve page with interactive chart (x-axis: duration log scale 5s→60m, y-axis: watts and W/kg)
- [ ] Time period overlays: compare current 90-day vs previous 90-day, this year vs last year, or any custom date range
- [ ] Filter by conditions: indoor/outdoor, temperature range, altitude, activity type
- [ ] Coggan classification overlay showing Cat 5 → World Tour bands at each duration
- [ ] Highlight the "weakest link" duration where classification drops relative to others
- [ ] Show when each best effort occurred (date, activity name) — clickable to navigate to that activity
- [ ] AI-generated power profile summary: strengths, limiters, recommended training focus
- [ ] Track power curve progression over time (animated or slider showing how the curve has shifted month by month)

### Task 31: Goal Setting & Progress Tracking
Specific, measurable targets with AI-projected timelines give users a reason to check AIM daily.
- [ ] Create `goals` table (user_id, type [ftp/weight/ctl/race_time/custom], target_value, target_date, current_value, status [active/achieved/abandoned], created_at)
- [ ] Build Goals section on dashboard with progress bars and projected completion dates
- [ ] Goal types: FTP target (e.g., 320W by June), race weight (85kg by race day), CTL target (90 by season peak), race time (sub-40 min hillclimb)
- [ ] AI projects timeline based on current trajectory: "At your current rate, you'll hit 320W FTP by May 12"
- [ ] Auto-update current values from synced data (FTP from power profile, weight from Withings, CTL from daily_metrics)
- [ ] Alert when a goal is achieved or when trajectory shows goal is at risk
- [ ] Historical goal tracking — see past goals and whether they were hit

### Task 32: Weekly & Monthly Reports
Auto-generated reports keep users engaged even when they don't open the app daily.
- [ ] Create weekly report generation (scheduled Edge Function, runs Monday morning):
  - Training summary: hours, TSS, distance, elevation, number of activities
  - Key metrics trend: CTL/ATL/TSB change, FTP estimate, weight change
  - Top 3 AI insights of the week (cross-domain patterns detected)
  - Recovery trend: avg HRV, avg sleep score, readiness distribution
  - Booster compliance summary
  - Goal progress update
  - One-line AI recommendation for the coming week
- [ ] Create monthly report generation (runs 1st of each month):
  - Month-over-month comparisons for all key metrics
  - Power curve changes (gains/losses at each duration)
  - Body composition trend (if Withings/DEXA connected)
  - Blood work changes (if panels uploaded)
  - FTP/CTL progression chart
  - Year-over-year comparison for the same month
- [ ] Build in-app report viewer (paginated, shareable)
- [ ] Email reports via Resend (weekly digest, monthly summary — configurable in Settings)
- [ ] PDF export option for sharing with coaches

### Task 33: Equipment Tracker
Track gear mileage and correlate equipment changes with performance.
- [ ] Create `equipment` table (user_id, name, type [bike/wheelset/shoes/helmet/other], brand, model, purchase_date, retired_date, notes, components JSONB)
- [ ] Create `equipment_usage` table (equipment_id, activity_id) — link equipment to activities
- [ ] Build Equipment page: list of bikes/gear with total distance, hours, and activity count
- [ ] Component tracking with replacement alerts: chain (every 3,000-5,000km), tires (every 5,000-8,000km), brake pads, cassette, bar tape
- [ ] Allow tagging activities with which bike/equipment was used (default bike auto-assigned)
- [ ] AI correlates equipment changes with performance: "Your EF improved 4% since the bike fit on March 2" or "NP is 3% higher on the Tarmac vs the Roubaix on comparable routes"
- [ ] Maintenance reminders in the alerts system
- [ ] Cost tracking (optional) — total cost of ownership per bike

### Task 34: Route & Segment Intelligence
Predict power requirements for routes and segments based on the athlete's current fitness and conditions.
- [ ] Build Route Intelligence widget (input: Strava segment or route URL, or manual gradient/distance)
- [ ] Predict power requirements: given gradient + projected weight + rolling resistance + CdA estimate → watts needed for target speed/time
- [ ] "What-if" calculator: "At your current FTP and weight, your estimated time for Hawk Hill is 8:42. At race weight (85kg), it drops to 8:21"
- [ ] Weather-aware predictions: pull forecast for upcoming rides and adjust estimates for temperature, wind, altitude
- [ ] Historical segment tracking: show PR progression on frequently ridden segments
- [ ] Pre-ride briefing: for a planned route, generate an AI summary with pacing strategy, fueling plan, and key effort points based on elevation profile
- [ ] Compare predicted vs actual after completing the route

### Task 35: Activity Comparison Tool
Side-by-side comparison reveals what changed and why between similar efforts.
- [ ] Build comparison view: select two activities to compare side-by-side
- [ ] Show delta for all key metrics: NP, avg HR, EF, TSS, cadence, time, speed, elevation
- [ ] Overlay power curves from both activities
- [ ] Overlay HR and power streams on a shared timeline (if same route) or by elapsed time
- [ ] AI-generated comparison summary: "Your NP was 12W higher on the same route with 3bpm lower HR. Key differences: 2 extra hours of deep sleep, HRV 15ms higher, and 0.8kg lighter. Your aerobic efficiency is clearly improving."
- [ ] Quick-select common comparisons: same route different dates, same week last year, best vs worst effort at similar TSS
- [ ] Filterable activity picker with search by name, date range, route

### Task 36: Training Camp Mode
Specialized tracking for multi-day training blocks and camp weeks.
- [ ] Build Training Camp mode toggle (manually activated, sets start/end dates)
- [ ] Camp dashboard view: cumulative TSS, hours, distance, elevation across all camp days
- [ ] Daily recovery tracking with adjusted thresholds (expect lower HRV/recovery during camp — alert only on extreme drops)
- [ ] Fueling recommendations: increased carb targets based on cumulative load, hydration targets based on temperature
- [ ] AI generates camp summary at the end: total load absorbed, key adaptations expected, recommended recovery timeline
- [ ] Sleep priority alerts: "You've accumulated 1,200 TSS in 4 days — tonight's sleep is critical. Set EightSleep to -5°C, lights out by 9:30 PM"
- [ ] Post-camp recovery monitor: track how long until HRV/CTL/performance metrics return to baseline

### Task 37: Export & Share
Let athletes share their data and insights with coaches and on social media.
- [ ] Export activity analysis as shareable image (branded AIM card with key metrics + AI summary)
- [ ] Share single activity via public link (read-only, no auth required, expiring link option)
- [ ] PDF report generation for coach sharing (activity detail, weekly summary, or monthly report)
- [ ] Export raw data as CSV (activities, daily metrics, power profile history)
- [ ] Social media optimized cards (Instagram story size, Twitter card) with key metrics and branding
- [ ] Coach export: selected date range of activities + metrics + AI insights as a structured PDF

### Task 38: Travel & Jet Lag Mode
Help athletes manage performance around travel and timezone changes.
- [ ] Build Travel Mode toggle with origin/destination timezone input and travel dates
- [ ] Calculate circadian disruption: hours of timezone shift, direction (east harder than west), expected adjustment time (~1 day per hour of shift)
- [ ] AI-generated adaptation protocol:
  - Pre-travel: shift sleep schedule 30-60 min/day toward destination timezone
  - Light exposure timing recommendations (morning light to advance, evening light to delay)
  - Meal timing adjustments to reset peripheral clocks
  - Training intensity recommendations during adjustment (reduce intensity for 1 day per hour of shift)
- [ ] Adjust readiness score expectations during travel recovery period (suppress false "red" alerts)
- [ ] Track actual adaptation via sleep onset time and HRV recovery
- [ ] Race-travel planner: "Arrive 3 days early for a 3-hour eastward shift" with day-by-day protocol

### Task 39: Workout Library & Push-to-Device
A structured workout library paired with the training prescription engine, with device sync.
- [ ] Create `workouts` table (id, name, description, type [intervals/tempo/endurance/sprint/recovery], duration_minutes, tss_estimate, zone_targets JSONB, steps JSONB, tags, source [ai_generated/library/custom])
- [ ] Build Workout Library page: searchable/filterable catalog of structured workouts
- [ ] Include standard workouts: Norwegian 4×4, 30/30 VO2, over/unders, sweet spot 2×20, sprint repeats, endurance Z2, recovery spin
- [ ] Each workout shows: description, target zones, estimated TSS, duration, and which power profile weakness it addresses
- [ ] AI-generated custom workouts from the training prescription engine feed into this library
- [ ] Export as .FIT or .ZWO workout file for Wahoo/Garmin/Zwift head units
- [ ] Push-to-device via Wahoo/Garmin APIs (if device integration supports it)
- [ ] User can create custom workouts with interval builder (drag-and-drop steps: warmup, work, rest, cooldown)
- [ ] Track workout compliance: planned workout vs actual ride metrics comparison

---

## VEKTA-INSPIRED FEATURES

> **Note:** The prioritized build order for all features (including these) lives in `CLAUDE.md` under "Remaining — Prioritized Feature Backlog". This section contains the detailed implementation specs — refer to `CLAUDE.md` for what to build next.

*Features identified from competitive analysis of [Vekta](https://joinvekta.com/), the AI-powered coaching platform used by WorldTour teams (Lidl-Trek, Jayco AlUla, FDJ-SUEZ, etc.). Ranked by importance to AIM's differentiation and implementation difficulty.*

### Task 40: Critical Power (CP) & W' Modeling — ★★★★★ Importance / ★★★ Difficulty
Replace single-point FTP with a 3-dimensional power model used by WorldTour teams. This is Vekta's core differentiator and the direction elite cycling analytics is moving. AIM should match and exceed this by cross-referencing CP/W' with recovery, sleep, and body comp data.
- [ ] Implement Critical Power (CP) calculation from power-duration curve fitting (hyperbolic model: P = W'/t + CP)
- [ ] Calculate W' (Available Work Capacity) — the finite anaerobic energy reserve above CP, measured in joules (kJ)
- [ ] Calculate Pmax (peak 1-second power) — neuromuscular/sprint capacity
- [ ] Build power-duration curve fitting from all historical best efforts (5s, 15s, 30s, 1m, 2m, 3m, 5m, 8m, 12m, 20m, 30m, 60m)
- [ ] Auto-update CP/W'/Pmax continuously as new best efforts are recorded (no formal test required)
- [ ] Optional structured CP test protocol: 15-second sprint + 3-minute effort + 12-minute effort for baseline
- [ ] Store in `power_profiles` table alongside existing FTP-based metrics (add cp_watts, w_prime_kj, pmax_watts columns)
- [ ] Display CP model on dashboard: 3-panel view showing CP (aerobic ceiling), W' (anaerobic reserve), Pmax (sprint)
- [ ] AI uses CP/W' in analysis: "Two riders with identical FTP can have dramatically different W' — yours is 18kJ, which limits your ability to respond to attacks. Target 30/30 intervals to build W'."
- [ ] Cross-domain: correlate CP changes with sleep quality, HRV trends, body composition ("Your CP rose 8W over 6 weeks while weight dropped 1.2kg — your aerobic ceiling is expanding")

### Task 41: Adaptive Training Zones — ★★★★★ Importance / ★★ Difficulty
Replace static FTP-based zones with dynamic zones that auto-adjust as fitness evolves. Vekta recalculates zones daily from CP; AIM should do this and also factor in daily readiness.
- [ ] Calculate training zones from CP model instead of (or in addition to) FTP:
  | Zone | Name | Range |
  |------|------|-------|
  | Z1 | Aerobic / Recovery | <70% CP |
  | Z2 | Tempo | 70-90% CP |
  | Z3 | Threshold | 90-105% CP |
  | Z4 | VO2max | 105-130% CP |
  | Z5 | Anaerobic | 130-180% CP |
  | Z6 | Neuromuscular | >180% CP |
- [ ] Auto-update zones as CP evolves (no manual FTP entry needed after initial setup)
- [ ] Show zone changes over time: "Your Z3 floor moved from 265W to 273W over the last 8 weeks"
- [ ] Readiness-adjusted zones (AIM differentiator): on red recovery days, temporarily shift zone targets down 3-5% so prescribed workouts remain achievable
- [ ] Display both CP-based and traditional Coggan zones — let user choose preference in Settings
- [ ] Recalculate all historical zone distributions when CP model updates (background job)

### Task 42: Durability & Fatigue Resistance Tracking — ★★★★★ Importance / ★★★★ Difficulty
Durability is the hottest metric in pro cycling. It measures how power declines as fatigue accumulates — critical for stage racing, long gran fondos, and any event over 3 hours. Vekta's implementation tracks peaks at progressive kJ/kg thresholds. AIM should match this and add cross-domain context (sleep, fueling, HRV).
- [ ] Calculate durability metric: track peak power at standard durations (1s, 5s, 1m, 5m, 20m) after progressive fatigue levels (0, 10, 20, 30, 40, 50 kJ/kg of accumulated work)
- [ ] For each activity with power data, compute peak efforts in each fatigue bucket: what was the best 5-min power when fresh (0-10 kJ/kg) vs fatigued (30-40 kJ/kg)?
- [ ] Build Durability page/tab showing power curves sliced by fatigue level — visual comparison of fresh vs fatigued performance
- [ ] Durability score: percentage of peak power retained at 30 kJ/kg fatigue (e.g., "Your 5-min power retains 92% at 30 kJ/kg — excellent durability")
- [ ] Track durability over time: is the athlete becoming more fatigue-resistant?
- [ ] Store durability metrics in `activities` table (add `durability_data` JSONB column) and aggregate in `power_profiles`
- [ ] AI cross-domain insights: "Your durability drops 15% more on nights with <6h sleep" or "Your 5-min power retention after 30 kJ/kg improved from 85% to 92% since starting the beetroot juice protocol"
- [ ] Race-specific durability predictions: "This race expects ~45 kJ/kg of work before the final climb. At that fatigue level, your projected 20-min power is 278W vs 298W fresh"

### Task 43: Automatic Interval Detection & Classification — ★★★★ Importance / ★★★ Difficulty
Vekta auto-detects every interval in a ride and classifies it by intensity type, eliminating the need for athletes to hit the lap button. This turns raw ride files into structured training data automatically.
- [ ] Build interval detection algorithm analyzing power stream data:
  - Detect sustained efforts above a threshold relative to CP (e.g., >70% CP for >30 seconds)
  - Detect recovery periods between efforts
  - Group repeated efforts into interval sets (e.g., 5×5min with 3min rest)
- [ ] Classify each detected interval by intensity type using CP-relative zones:
  | Type | Power Range | Duration |
  |------|------------|----------|
  | Neuromuscular | >180% CP | <20s |
  | Anaerobic | 130-180% CP | 20s-3min |
  | VO2max | 105-130% CP | 30s-8min |
  | Threshold | 90-105% CP | <60min |
  | Tempo | 70-90% CP | 10+min |
  | Aerobic | <70% CP | 10+min |
- [ ] Tag additional characteristics: High Torque (low cadence + high power), High Cadence (>100rpm), Progressive (ascending power), Dynamic (variable)
- [ ] Display detected intervals on activity detail page with per-interval metrics (avg power, avg HR, duration, NP, peak HR)
- [ ] Interval-level AI analysis: "Your 3rd VO2max interval was 12W below the first two — this matches your fatigue pattern from last week. Consider shorter rest intervals to build repeatability."
- [ ] Store detected intervals in `activities.intervals` JSONB column
- [ ] Use interval data to improve training prescription: "You've done 45 minutes of VO2max work this month — below the 60-minute target for your build block"

### Task 44: Automatic Session Classification — ★★★★ Importance / ★★ Difficulty
Use ML/heuristics to automatically classify every ride as a training type or race, without manual tagging. Vekta uses power stochasticity and intensity patterns.
- [ ] Build session classifier analyzing power data characteristics:
  - **Race detection**: high variability index (VI > 1.10), high percentage of time above threshold, stochastic power pattern (frequent surges/attacks)
  - **Race sub-types**: ITT (low VI, sustained high power), Flat Race (high VI, sprint finishes), Hilly Race (repeated climbs), Mountain Race (extended climbing)
  - **Training types**: Recovery (NP < 55% FTP, low HR), Endurance/Z2 (55-75% FTP, steady), Tempo (75-88% FTP), Sweet Spot (88-95% FTP), Threshold (95-105% FTP), VO2max Intervals (detected intervals >105%), Sprint (short neuromuscular efforts)
- [ ] Auto-classify on sync — displayed as a tag/badge on each activity (e.g., "VO2max Intervals", "Endurance", "Road Race — Hilly")
- [ ] Allow user to override classification (manual correction feeds back to improve future detection)
- [ ] Session type distribution chart on dashboard: pie/bar chart showing training type mix over time (e.g., "60% endurance, 20% threshold, 10% VO2, 10% recovery this month")
- [ ] AI uses session classification for periodization insights: "You've done 0 VO2max sessions in 3 weeks — this is your limiter zone. Your training mix is too polarized toward endurance."
- [ ] Training stimulus summary per activity: "Primary stimulus: Threshold. Secondary: VO2max (from the final 2 intervals)"

### Task 45: Torque Analysis — ★★★ Importance / ★★ Difficulty
Torque reveals the force behind the power. Two riders at identical watts can have completely different pedaling strategies. Useful for bike fit analysis, climbing technique, and sprint form.
- [ ] Calculate torque from power and cadence streams: Torque (Nm) = (60 × Power) / (Cadence × 2π)
- [ ] Add torque to activity streams visualization (toggleable alongside power, HR, cadence, elevation)
- [ ] Compute per-activity torque metrics: avg torque, max torque, torque at threshold, torque-cadence relationship
- [ ] Analyze torque under fatigue: does the athlete shift to higher torque / lower cadence as they tire? (common compensatory pattern)
- [ ] AI insights: "Your torque increased 12% in the final hour while cadence dropped 8rpm — you're grinding more as you fatigue. High-cadence drills can help maintain efficiency."
- [ ] Torque vs gradient analysis: how force production changes on climbs vs flats
- [ ] Sprint torque tracking: peak torque in sprints as a measure of neuromuscular capacity

### Task 46: AI Session Summaries with Interval Breakdown — ★★★★ Importance / ★★ Difficulty
Enhance the existing AI analysis with structured interval-level intelligence. Vekta auto-summarizes each session with detected intervals and effort classification. AIM should do this AND cross-reference with recovery/sleep/body comp.
- [ ] Enhance post-ride AI analysis to include structured interval breakdown:
  - Detect all intervals (from Task 43) and include per-interval metrics in the AI context
  - AI summarizes each interval set: "4×8min threshold intervals: avg 292W (98% FTP), HR 168-174bpm, good consistency across all 4 efforts"
  - Highlight the best and worst intervals with explanations
- [ ] Add "Session Classification" to AI output: training stimulus type, race type if applicable
- [ ] Compare interval quality to historical sessions: "Your threshold intervals today averaged 292W vs 285W three weeks ago — a 2.5% improvement at the same HR"
- [ ] Cross-domain interval analysis (AIM differentiator): "Your 4th interval dropped 15W. Your deep sleep was only 42min last night (vs 1h30m avg) — fatigue resistance is compromised on poor sleep"
- [ ] Generate natural-language interval tables in the AI output for easy coach sharing

### Task 47: Similar Session Finder & Comparison — ★★★★ Importance / ★★★ Difficulty
Vekta automatically finds the most comparable past sessions for any activity. AIM should match this and add the "why" — explaining what changed between similar efforts using cross-domain data.
- [ ] Build similarity algorithm matching activities by: duration (±15%), distance (±10%), elevation (±20%), TSS (±15%), session type, route (GPS matching)
- [ ] On each activity detail page, show "Similar Sessions" section with top 3-5 matches
- [ ] Side-by-side comparison of matched sessions: power, HR, EF, cadence, pace, zones
- [ ] AI explains the differences: "Compared to your most similar ride (March 15): NP was 8W higher at 2bpm lower HR. Your EF improved 5%. Key factors: 1.2kg lighter, HRV was 15ms higher, and deep sleep was 38min longer."
- [ ] Automatic race comparison: when a race is detected, find and compare to the most similar past races
- [ ] Progress detection: if the athlete rides the same route regularly, auto-track progression over time with trend line
- [ ] Enhance existing Task 35 (Activity Comparison Tool) — this task adds the *automatic* discovery, Task 35 handles the manual comparison UI

### Task 48: Coach Platform & Multi-Athlete Management — ★★★★ Importance / ★★★★ Difficulty
Vekta's coach platform is free with unlimited athletes — a major growth driver. AIM should build a coach view that leverages its cross-domain advantage (coaches see sleep, blood work, recovery alongside training).
- [ ] Create `coach_athletes` table (coach_user_id, athlete_user_id, status [pending/active/revoked], permissions JSONB, invited_at, accepted_at)
- [ ] Build Coach Dashboard: grid/list view of all connected athletes with at-a-glance status (today's readiness, last activity, CTL trend, alerts)
- [ ] Per-athlete drill-down: coach sees full dashboard, activities, health lab, and AI insights for that athlete
- [ ] Coach can assign workouts, set goals, and leave notes on activities
- [ ] Athlete invitation flow: coach sends invite link → athlete accepts → data sharing begins
- [ ] Granular permissions: athlete controls what the coach can see (training data, recovery data, health lab, body comp)
- [ ] Coach-specific AI summaries: "3 of your 8 athletes are in red zone today. Maria's HRV has declined for 5 consecutive days. Tom hit a 20-min PR yesterday."
- [ ] Weekly athlete management report for coaches: all athletes' training summaries, flagged concerns, upcoming races
- [ ] Free tier for coaches (up to 5 athletes), paid coach tier for unlimited athletes
- [ ] Coach can view and compare multiple athletes' data (useful for team management)

### Task 49: W' Balance Tracking (Real-Time Anaerobic Reserve) — ★★★★ Importance / ★★★ Difficulty
Once CP and W' are modeled (Task 40), track W' depletion and recovery in real-time throughout a ride. This is the gold standard for race analysis — showing exactly when an athlete "went into the red" and how quickly they recovered.
- [ ] Implement W' balance algorithm: W'bal = W' - Σ(work above CP) + Σ(recovery below CP) using the Skiba differential equation model
- [ ] For each activity with power data, compute second-by-second W'bal throughout the ride
- [ ] Visualize W'bal as a stream on activity detail page (shows depletion during hard efforts, recovery during easy periods)
- [ ] Flag "empty tank" moments: when W'bal approaches 0, the athlete was at their absolute limit
- [ ] Race analysis: "You depleted W' to 2% at the 45km mark and never fully recovered. The winning attack came at 52km when your W'bal was only at 38% — you didn't have the reserves to respond."
- [ ] AI cross-domain: "Your W' recovery rate was 15% slower than your 90-day average. Combined with last night's low HRV (38ms), your anaerobic system was impaired."
- [ ] Track W' recovery rate over time as a fitness metric — faster recovery = better anaerobic fitness

### Task 50: Historical Performance Timeline (5-Year Deep Analysis) — ★★★ Importance / ★★ Difficulty
Vekta analyzes up to 5 years of training data for personalized feedback. AIM should build a long-range performance timeline showing the athlete's entire training history with key milestones.
- [ ] Build Performance Timeline page: long-range view of key metrics (FTP, CP, CTL, weight, W/kg) over months/years
- [ ] Import historical data from Strava (up to 5 years of activities on backfill sync)
- [ ] Annotate timeline with key events: races, injuries, equipment changes, training block transitions, blood work dates
- [ ] AI-generated season summaries: "Your 2025 season: FTP rose from 285W to 302W (+6%), CTL peaked at 88. Best performance: Hawk Hill PR on June 15."
- [ ] Year-over-year overlay: compare any metric across seasons (same month, same time of year)
- [ ] Identify long-term patterns: "Your FTP plateaus every August — historically this coincides with heat + accumulated fatigue. Consider a mid-summer recovery block."
- [ ] Training volume and intensity trends over years — are you training smarter or just more?

## IMPORTANT NOTES

- **Never expose API secrets in frontend code.** All OAuth token exchanges and API calls with secrets must happen in Supabase Edge Functions (server-side).
- **Always use RLS.** Every database query should be scoped to the authenticated user.
- **Rate limit external APIs.** Implement queuing for Strava API calls. Cache responses. Strava limits: 100 requests per 15 minutes, 1000 per day per application.
- **Handle token refresh gracefully.** Before any external API call, check if the token is expired and refresh if needed.
- **Store raw API responses.** Keep the full source_data JSONB so you can reprocess later without re-fetching.
- **AI analysis is async.** Don't block the UI waiting for Claude. Show the activity immediately, then load the analysis when it's ready (polling or realtime subscription).
- **The existing prototype files (aim-landing-page.jsx, apex-dashboard.jsx, apex-boosters.jsx, apex-health-lab.jsx) are the design reference.** Match the visual design exactly — dark theme, #05060a background, #00e5a0 accent, Outfit font, JetBrains Mono for metrics.
- **Rename all remaining "Apex" references to "AIM"** in the dashboard, boosters, and health lab prototypes.
- **All components must be mobile-responsive.** Use the `useResponsive()` hook from `src/hooks/useResponsive.js` with conditional inline styles. Breakpoints: mobile < 768px, tablet 768–1024px, desktop > 1024px. Touch targets must be 44px minimum on mobile. Grids collapse from multi-column to single-column. Navigation uses hamburger + drawer on mobile. Modals go full-screen on mobile.

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
STRAVA_REDIRECT_URI=https://aimfitness.ai/api/auth/callback/strava

# Oura
OURA_CLIENT_ID=your_client_id
OURA_CLIENT_SECRET=your_client_secret
OURA_REDIRECT_URI=https://aimfitness.ai/api/auth/callback/oura

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
VITE_APP_URL=https://aimfitness.ai
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

/api/sms/
  send                — Internal: trigger outbound SMS (workout, readiness, weekly, blood panel)
  webhook             — Twilio inbound: receive athlete replies, generate AI response via TwiML

/api/settings          — GET/PUT user settings (notification_preferences, etc.)
```

---

## SMS AI COACH

### Overview

AIM's SMS Coach is a proactive AI coaching system that lives in the athlete's text messages. After every workout sync, AIM texts the athlete an AI-powered summary with analysis, recovery tips, and macro recommendations. Athletes can reply directly to ask follow-up questions — Claude responds with full context from their training data, blood work, sleep, and more.

### Architecture

```
Strava webhook / manual sync
    → syncStravaActivity()
    → analyzeActivity() [fire-and-forget]
    → sendWorkoutSMS() [chained after analysis]
        → Claude generates SMS-optimized summary
        → Twilio sends text to athlete
        → Message stored in ai_conversations/ai_messages

Athlete replies via SMS
    → Twilio POSTs to /api/sms/webhook
    → Verify webhook signature
    → Look up user by phone_number
    → Load context (activities, metrics, blood panels, conversation history)
    → Claude generates contextual response
    → Store message pair in ai_messages
    → Return TwiML response → Twilio delivers reply
```

### Provider: Twilio

| Component | Detail |
|-----------|--------|
| Phone number | $1.15/month |
| Outbound SMS | $0.0079/segment |
| Inbound SMS | $0.0075/segment |
| Estimated cost (100 DAU) | ~$40-60/month |

Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WEBHOOK_URL`

### SMS Trigger Types

| Trigger | When | Content |
|---------|------|---------|
| Post-workout summary | After every Strava sync + AI analysis | Workout stats, key insights, recovery tips, macro recommendation |
| Morning readiness | 7 AM daily (if sleep data exists) | Sleep summary, today's training recommendation |
| Weekly digest | Sunday evening | Week's TSS/CTL trend, highlights, next week focus |
| Blood panel alert | After blood panel upload + AI analysis | Key findings, action items |

### Database Changes

```sql
-- Added to profiles table (migration 003)
ALTER TABLE profiles ADD COLUMN phone_number TEXT;
ALTER TABLE profiles ADD COLUMN sms_opt_in BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN sms_opt_in_at TIMESTAMPTZ;
```

Notification preferences stored in `user_settings.notification_preferences` JSONB:
```json
{
  "sms_workout_summary": true,
  "sms_morning_readiness": true,
  "sms_weekly_digest": true,
  "sms_blood_panel_alerts": true
}
```

Conversation history reuses existing `ai_conversations` + `ai_messages` tables.

### Files

| File | Purpose |
|------|---------|
| `api/_lib/twilio.js` | Twilio client wrapper: `sendSMS()`, `verifyWebhookSignature()`, `twimlResponse()` |
| `api/sms/send.js` | Outbound SMS: generates workout text via Claude, sends via Twilio, stores in conversation |
| `api/sms/webhook.js` | Inbound SMS: verifies signature, loads athlete context, generates Claude response, returns TwiML |
| `api/settings.js` | GET/PUT user settings including SMS notification preferences |
| `src/pages/Settings.jsx` | Phone number input, SMS opt-in toggle, per-notification-type toggles, TCPA compliance |

### TCPA Compliance

- Users must explicitly opt-in via Settings page toggle
- Opt-in timestamp stored in `profiles.sms_opt_in_at`
- Compliance text displayed: "By enabling SMS, you agree to receive automated text messages..."
- STOP/HELP handled automatically by Twilio
- All outbound messages sent only to opted-in users with verified phone numbers

---

## STRUCTURED WORKOUTS & AI INSIGHTS ENGINE

_Full spec: `docs/AIM-STRUCTURED-WORKOUTS-AND-INSIGHTS-SPEC.md`_

### Database Changes

```sql
-- Activity tags table for cross-activity search (migration 008)
CREATE TABLE activity_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL,          -- canonical tag from TAG_DICTIONARY (e.g. 'vo2_session')
  scope TEXT NOT NULL DEFAULT 'workout',  -- 'workout' | 'interval'
  confidence NUMERIC DEFAULT 1.0,         -- 0.0 to 1.0
  evidence JSONB,                         -- signals + thresholds that triggered this tag
  interval_index INTEGER,                 -- NULL for workout-level, 0-based for interval-level
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_activity_tags_user ON activity_tags(user_id, tag_id);
CREATE INDEX idx_activity_tags_activity ON activity_tags(activity_id);
CREATE UNIQUE INDEX idx_activity_tags_unique ON activity_tags(activity_id, tag_id, COALESCE(interval_index, -1));

-- Per-activity weather enrichment
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_weather JSONB;
-- Structure: { temp_c, humidity_pct, dew_point_c, wind_speed_mps, wind_direction_deg,
--              precip_mm, apparent_temp_c, source: 'device'|'open_meteo' }

-- Activity annotations (user input)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_notes TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_rpe INTEGER CHECK (user_rpe BETWEEN 1 AND 10);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}';
```

```sql
-- Expansion: check-in, travel, cross-training (migration 010)
-- See /supabase/migrations/010_expansion_checkin_travel_crosstraining.sql

-- Subjective check-in columns on daily_metrics
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS life_stress_score SMALLINT CHECK (life_stress_score BETWEEN 1 AND 5);
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS motivation_score SMALLINT CHECK (motivation_score BETWEEN 1 AND 5);
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS muscle_soreness_score SMALLINT CHECK (muscle_soreness_score BETWEEN 1 AND 5);
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS mood_score SMALLINT CHECK (mood_score BETWEEN 1 AND 5);
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS checkin_completed_at TIMESTAMPTZ;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS respiratory_rate NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS resting_spo2 NUMERIC;

-- Subjective perception columns on activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS gi_comfort SMALLINT CHECK (gi_comfort BETWEEN 1 AND 5);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS mental_focus SMALLINT CHECK (mental_focus BETWEEN 1 AND 5);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS perceived_recovery_pre SMALLINT CHECK (perceived_recovery_pre BETWEEN 1 AND 5);

-- Travel events table (see Core Tables section for full CREATE TABLE)
-- Cross-training log table (see Core Tables section for full CREATE TABLE)
```

### `activities.laps` JSONB Structure

The `laps` column already exists (migration 001) but is currently unpopulated. Structure:

```json
{
  "source": "fit_laps | detected | manual",
  "intervals": [
    {
      "index": 0,
      "type": "warmup | work | rest | cooldown | unknown",
      "start_time": "2026-03-02T10:05:00Z",
      "end_time": "2026-03-02T10:08:00Z",
      "duration_s": 180,
      "distance_m": 1200,
      "avg_power_w": 320,
      "normalized_power_w": 325,
      "max_power_w": 345,
      "avg_hr_bpm": 168,
      "max_hr_bpm": 175,
      "avg_cadence_rpm": 92,
      "avg_speed_mps": 10.5,
      "work_kj": 58,
      "intensity_factor": 1.08,
      "grade_avg_pct": 2.1,
      "zone_distribution": { "z1": 0, "z2": 0, "z3": 5, "z4": 30, "z5": 120, "z6": 25, "z7": 0 },
      "execution": {
        "target_power_w": 315,
        "smoothness_cv": 0.06,
        "time_in_band_pct": { "2pct": 0.45, "5pct": 0.72, "10pct": 0.91 },
        "fade_score": -0.03,
        "end_strength": 0.97,
        "cadence_drift": -2.1,
        "hr_rise_slope": 1.8,
        "execution_label": "met"
      },
      "recovery_after_s": 120
    }
  ],
  "set_metrics": {
    "num_work_intervals": 5,
    "avg_work_power_w": 318,
    "power_consistency_cv": 0.04,
    "total_work_kj": 290,
    "avg_recovery_s": 120,
    "durability_index": 0.96,
    "overall_execution_label": "strong_finish"
  }
}
```

### Canonical Tag Dictionary (Cycling — Starter Set)

#### Workout-Level Tags (32)

| tag_id | Detection Rules | Signals |
|--------|----------------|---------|
| `race_day` | User tag OR calendar event OR race power archetype | high VI, surge pattern |
| `group_ride` | User tag OR variable power with social stops | high VI, many stops |
| `indoor_trainer` | No GPS OR trainer flag in source | gps_quality: missing |
| `endurance_steady` | VI < 1.05, IF 0.55-0.75 | steady power, low variability |
| `tempo_ride` | Majority time in Z3 (76-90% FTP) | zone_distribution |
| `sweet_spot_session` | >20 min in 88-94% FTP | zone_distribution, power stream |
| `threshold_session` | >15 min in 95-105% FTP | zone_distribution, laps |
| `vo2_session` | >5 min cumulative in Z5+ (106-120% FTP) | zone_distribution, laps |
| `anaerobic_session` | >2 min cumulative in Z6 (121-150% FTP) | zone_distribution |
| `neuromuscular_session` | Sprint efforts >150% FTP, <30s each | power spikes |
| `low_cadence_session` | Avg cadence < 75 rpm in work intervals | cadence stream |
| `high_cadence_session` | Avg cadence > 100 rpm in work intervals | cadence stream |
| `climbing_focus` | >1000m elevation OR >50% time on grade >3% | elevation, grade |
| `rolling_surge_ride` | High VI (>1.15) + many power spikes >120% FTP | power variability |
| `hot_conditions` | Temp > 30°C OR apparent temp > 33°C | activity_weather |
| `cold_conditions` | Temp < 5°C | activity_weather |
| `high_wind_conditions` | Wind > 25 km/h | activity_weather |
| `high_drift` | HR drift > 5% or decoupling > 5% | hr_drift_pct, decoupling_pct |
| `low_hrv_day` | Morning HRV in bottom 25% of 30-day baseline | daily_metrics.hrv |
| `poor_sleep_day` | Sleep < 6 hrs OR sleep score < 60 | daily_metrics |
| `underfueled` | Nutrition < 40 g/hr carbs on ride > 90 min | nutrition_logs |
| `data_quality_issue` | >10% power dropout OR GPS spikes | quality flags |
| `high_life_stress` | Check-in life_stress_score >= 4 | daily_metrics.life_stress_score |
| `low_motivation` | Check-in motivation_score <= 2 | daily_metrics.motivation_score |
| `high_soreness` | Check-in muscle_soreness_score >= 4 | daily_metrics.muscle_soreness_score |
| `low_mood` | Check-in mood_score <= 2 | daily_metrics.mood_score |
| `gi_distress` | Post-ride gi_comfort <= 2 | activities.gi_comfort |
| `gi_distress_severe` | Post-ride gi_comfort = 1 | activities.gi_comfort |
| `high_mental_focus` | Post-ride mental_focus >= 4 | activities.mental_focus |
| `low_mental_focus` | Post-ride mental_focus <= 2 | activities.mental_focus |
| `altitude_high` | Activity altitude 1500-2500m OR travel dest_altitude 1500-2500m | travel_events, GPS |
| `altitude_very_high` | Activity altitude > 2500m OR travel dest_altitude > 2500m | travel_events, GPS |

#### Interval-Level Tags (16)

| tag_id | Detection Rules |
|--------|----------------|
| `vo2_interval` | Avg power 106-120% FTP, duration 2-8 min |
| `threshold_interval` | Avg power 95-105% FTP, duration 5-30 min |
| `sweet_spot_interval` | Avg power 88-94% FTP, duration 8-30 min |
| `anaerobic_interval` | Avg power 121-150% FTP, duration 30s-3 min |
| `sprint_interval` | Avg power >150% FTP, duration <30s |
| `low_cadence_interval` | Avg cadence < 70 rpm |
| `high_cadence_interval` | Avg cadence > 105 rpm |
| `climb_interval` | Avg grade > 4% |
| `overcooked_start` | First 20% of interval > target + 8% |
| `power_fade` | Fade score < -0.08 (last third significantly below first) |
| `strong_finish` | Last 20% > first 20% by > 3% |
| `inconsistent_power` | CV > 0.10 within interval |
| `cadence_decay` | Cadence drops > 8 rpm across interval |
| `cadence_collapse` | Cadence drops > 15 rpm with associated power drop |
| `hr_lag_slow` | HR takes > 60s to reach 90% of peak |
| `hr_recovery_fast` | HR drops > 30 bpm in first 60s of recovery |

### Interval Metrics Computation Pipeline

```
FIT file / Strava streams
  → parseFitFile() returns fitData.laps (Phase 1: modify fit.js)
  → extractLapsFromFit(fitData) OR detectIntervalsFromStreams(streams, ftp)
  → computeIntervalMetrics(streams, startIdx, endIdx, ftp)  // NP, IF, HR, zones per interval
  → inferTargetPower(workIntervals)                          // cluster to find target
  → computeExecutionMetrics(streams, startIdx, endIdx, target) // smoothness, fade, cadence
  → classifyLapType(lapMetrics, activityMetrics, ftp)        // warmup/work/rest/cooldown
  → buildLapsPayload()                                        // assemble JSONB
  → UPDATE activities SET laps = payload WHERE id = activityId
```

### Per-Activity Weather Enrichment

```
Activity with start_time + GPS location
  → extractLocationFromActivity(source_data)  // lat/lng from Strava/FIT
  → fetchActivityWeather(startedAt, lat, lng)  // Open-Meteo Historical API
  → { temp_c, humidity_pct, dew_point_c, wind_speed_mps, wind_direction_deg,
      precip_mm, apparent_temp_c, source: 'open_meteo' }
  → UPDATE activities SET activity_weather = payload WHERE id = activityId
```

Open-Meteo Historical Weather API (free, no key): `https://archive-api.open-meteo.com/v1/archive`

### Performance Model State Design (Phase 4)

Following `sleep-correlations.js` pattern (Pearson r, quartile analysis, confounder stratification):

```
api/_lib/performance-models.js

Models computed on-demand from paired data:

1. Heat Model: activity pairs (temp, EF, hr_drift, decoupling)
   → breakpoint_temp, penalty_per_degree, confidence, n_activities

2. Sleep Model: extends sleep-correlations with interval execution quality
   → sleep_hours → EF deviation, execution_score, fade_risk

3. HRV Readiness Model: (hrv, EF, execution_score, rpe_power_ratio)
   → hrv_threshold_low, performance_decline_below_threshold

4. Fueling Model: (carb_g_per_hr, durability_index, late_ride_fade)
   → optimal_carb_rate, fueling_impact_on_durability

5. Durability Model: (kj_per_kg, power_quality_decay_rate)
   → durability_curve, comparison_fresh_vs_fatigued
```

### New Files (by Phase)

| Phase | File | Purpose |
|-------|------|---------|
| 1 | `api/_lib/intervals.js` | Interval extraction + per-interval metrics computation |
| 1 | `api/activities/backfill-intervals.js` | POST endpoint to reprocess existing activities |
| 2 | `api/_lib/tags.js` | Canonical tag dictionary + detection engine |
| 2 | `api/_lib/weather-enrich.js` | Per-activity weather via Open-Meteo historical API |
| 2 | `api/activities/search.js` | Tag-based search endpoint |
| 2 | `api/tags/dictionary.js` | Returns tag dictionary for frontend |
| 3 | `api/_lib/planned-vs-actual.js` | Match training_calendar to completed activities |
| 3 | `api/_lib/interval-insights.js` | Deterministic insight generation for intervals |
| 4 | `api/_lib/performance-models.js` | Conditional performance models (heat, sleep, HRV, fuel) |
| 4 | `api/models/summary.js` | GET endpoint returning all model summaries |
| 5 | `api/activities/query.js` | Advanced tag-based search with grouping |
| 5 | `api/activities/smart-chips.js` | AI-suggested query chips from tag co-occurrences |
| 5 | `src/pages/WorkoutDatabase.jsx` | Searchable workout database page |

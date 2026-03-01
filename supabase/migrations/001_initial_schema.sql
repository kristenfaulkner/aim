-- AIM Initial Schema
-- Run this in the Supabase SQL Editor or via migration

-- ═══════════════════════════════════════
-- PROFILES (extends Supabase Auth users)
-- ═══════════════════════════════════════
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
  riding_level TEXT,
  weekly_hours TEXT,
  years_cycling TEXT,
  primary_terrain TEXT,
  primary_discipline TEXT,
  goals TEXT[],
  location_city TEXT,
  location_country TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  uses_cycle_tracking BOOLEAN DEFAULT FALSE,
  hormonal_contraception TEXT,
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- INTEGRATIONS (OAuth tokens)
-- ═══════════════════════════════════════
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ═══════════════════════════════════════
-- ACTIVITIES
-- ═══════════════════════════════════════
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_id TEXT,
  activity_type TEXT DEFAULT 'ride',
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
  tss NUMERIC,
  intensity_factor NUMERIC,
  variability_index NUMERIC,
  efficiency_factor NUMERIC,
  hr_drift_pct NUMERIC,
  decoupling_pct NUMERIC,
  work_kj NUMERIC,
  temperature_celsius NUMERIC,
  weather_conditions JSONB,
  zone_distribution JSONB,
  power_curve JSONB,
  lr_balance JSONB,
  laps JSONB,
  raw_fit_data_url TEXT,
  source_data JSONB,
  ai_analysis TEXT,
  ai_analysis_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source, source_id)
);
CREATE INDEX idx_activities_user_date ON activities(user_id, started_at DESC);

-- ═══════════════════════════════════════
-- DAILY METRICS
-- ═══════════════════════════════════════
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_score INTEGER,
  total_sleep_seconds INTEGER,
  deep_sleep_seconds INTEGER,
  rem_sleep_seconds INTEGER,
  light_sleep_seconds INTEGER,
  sleep_latency_seconds INTEGER,
  sleep_efficiency_pct NUMERIC,
  sleep_onset_time TIME,
  wake_time TIME,
  bed_temperature_celsius NUMERIC,
  hrv_ms NUMERIC,
  hrv_overnight_avg_ms NUMERIC,
  resting_hr_bpm NUMERIC,
  respiratory_rate NUMERIC,
  blood_oxygen_pct NUMERIC,
  skin_temperature_deviation NUMERIC,
  recovery_score INTEGER,
  readiness_score INTEGER,
  strain_score NUMERIC,
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  hydration_pct NUMERIC,
  bone_mass_kg NUMERIC,
  daily_tss NUMERIC,
  ctl NUMERIC,
  atl NUMERIC,
  tsb NUMERIC,
  ramp_rate NUMERIC,
  cycle_day INTEGER,
  cycle_phase TEXT,
  ai_daily_summary TEXT,
  ai_readiness_assessment TEXT,
  source_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date DESC);

-- ═══════════════════════════════════════
-- BLOOD PANELS
-- ═══════════════════════════════════════
CREATE TABLE blood_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  lab_name TEXT,
  pdf_url TEXT,
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
  crp_mg_l NUMERIC,
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
  all_results JSONB,
  ai_analysis TEXT,
  ai_analysis_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- DEXA SCANS
-- ═══════════════════════════════════════
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
  regional_data JSONB,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- POWER PROFILES
-- ═══════════════════════════════════════
CREATE TABLE power_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  computed_date DATE NOT NULL,
  period_days INTEGER DEFAULT 90,
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
  classifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, computed_date, period_days)
);

-- ═══════════════════════════════════════
-- AI CONVERSATIONS
-- ═══════════════════════════════════════
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

-- ═══════════════════════════════════════
-- USER SETTINGS
-- ═══════════════════════════════════════
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  units TEXT DEFAULT 'metric',
  power_zones JSONB,
  hr_zones JSONB,
  notification_preferences JSONB,
  dashboard_layout JSONB,
  active_boosters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own integrations" ON integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own integrations" ON integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations" ON integrations FOR DELETE USING (auth.uid() = user_id);

-- Activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activities" ON activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON activities FOR DELETE USING (auth.uid() = user_id);

-- Daily metrics
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily metrics" ON daily_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily metrics" ON daily_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily metrics" ON daily_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily metrics" ON daily_metrics FOR DELETE USING (auth.uid() = user_id);

-- Blood panels
ALTER TABLE blood_panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blood panels" ON blood_panels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own blood panels" ON blood_panels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own blood panels" ON blood_panels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own blood panels" ON blood_panels FOR DELETE USING (auth.uid() = user_id);

-- DEXA scans
ALTER TABLE dexa_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dexa scans" ON dexa_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dexa scans" ON dexa_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dexa scans" ON dexa_scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dexa scans" ON dexa_scans FOR DELETE USING (auth.uid() = user_id);

-- Power profiles
ALTER TABLE power_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own power profiles" ON power_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own power profiles" ON power_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own power profiles" ON power_profiles FOR UPDATE USING (auth.uid() = user_id);

-- AI conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- AI messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON ai_messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own messages" ON ai_messages FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
);

-- User settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_metrics_updated_at BEFORE UPDATE ON daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('health-files', 'health-files', false);

CREATE POLICY "Users can upload own health files"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'health-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own health files"
ON storage.objects FOR SELECT USING (
  bucket_id = 'health-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own health files"
ON storage.objects FOR DELETE USING (
  bucket_id = 'health-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Migration 010: Expansion — Daily Check-In, Activity Subjective Fields, Travel Events, Cross-Training Log
-- Date: 2026-03-03

-- ============================================================
-- 1. Daily Check-In: Add subjective + biometric columns to daily_metrics
-- ============================================================

ALTER TABLE daily_metrics
  ADD COLUMN IF NOT EXISTS life_stress_score SMALLINT CHECK (life_stress_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS motivation_score SMALLINT CHECK (motivation_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS muscle_soreness_score SMALLINT CHECK (muscle_soreness_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS mood_score SMALLINT CHECK (mood_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS checkin_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS respiratory_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS resting_spo2 NUMERIC;

-- ============================================================
-- 2. Activity Subjective Fields: Add GI, mental focus, pre-ride recovery to activities
-- ============================================================

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS gi_comfort SMALLINT CHECK (gi_comfort BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS mental_focus SMALLINT CHECK (mental_focus BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS perceived_recovery_pre SMALLINT CHECK (perceived_recovery_pre BETWEEN 1 AND 5);

-- ============================================================
-- 3. Travel Events Table
-- ============================================================

CREATE TABLE IF NOT EXISTS travel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Origin
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  origin_timezone TEXT,
  origin_altitude_m NUMERIC,

  -- Destination
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  dest_timezone TEXT,
  dest_altitude_m NUMERIC,

  -- Computed
  distance_km NUMERIC,
  timezone_shift_hours NUMERIC,
  altitude_change_m NUMERIC,
  travel_type TEXT, -- 'flight_likely' | 'drive_likely' | 'unknown'

  -- Altitude acclimation tracking
  altitude_acclimation_day INTEGER DEFAULT 0,
  altitude_acclimation_complete BOOLEAN DEFAULT FALSE,

  -- Activity references
  last_activity_before UUID REFERENCES activities(id),
  first_activity_after UUID REFERENCES activities(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_events_user_date ON travel_events(user_id, detected_at);

-- RLS for travel_events
ALTER TABLE travel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own travel events"
  ON travel_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own travel events"
  ON travel_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel events"
  ON travel_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own travel events"
  ON travel_events FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. Cross-Training Log Table
-- ============================================================

CREATE TABLE IF NOT EXISTS cross_training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  activity_type TEXT NOT NULL, -- 'strength' | 'yoga' | 'swimming' | 'hiking' | 'pilates' | 'other'
  body_region TEXT, -- 'upper_body' | 'lower_body' | 'full_body' | 'core' | NULL
  perceived_intensity SMALLINT CHECK (perceived_intensity BETWEEN 1 AND 5),
  duration_minutes INTEGER,
  notes TEXT,

  -- Computed fields
  estimated_tss NUMERIC,
  recovery_impact TEXT, -- 'none' | 'minor' | 'moderate' | 'major'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_training_user_date ON cross_training_log(user_id, date);

-- RLS for cross_training_log
ALTER TABLE cross_training_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cross training"
  ON cross_training_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cross training"
  ON cross_training_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cross training"
  ON cross_training_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cross training"
  ON cross_training_log FOR DELETE
  USING (auth.uid() = user_id);

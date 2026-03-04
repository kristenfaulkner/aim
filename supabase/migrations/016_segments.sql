-- Migration 016: Strava Segments & Segment Efforts
-- Segment comparison with cross-domain adjusted performance scoring

-- Strava Segments — metadata about segments the athlete has ridden
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strava_segment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('cycling', 'running')),
  distance_m NUMERIC,
  average_grade_pct NUMERIC,
  maximum_grade_pct NUMERIC,
  elevation_gain_m NUMERIC,
  start_lat NUMERIC,
  start_lng NUMERIC,
  end_lat NUMERIC,
  end_lng NUMERIC,
  climb_category INTEGER,
  city TEXT,
  state TEXT,
  country TEXT,
  polyline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strava_segment_id)
);

CREATE INDEX idx_segments_user ON segments(user_id);

-- RLS for segments
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own segments"
  ON segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own segments"
  ON segments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segments"
  ON segments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own segments"
  ON segments FOR DELETE
  USING (auth.uid() = user_id);

-- Segment Efforts — each time the athlete rides/runs a segment
CREATE TABLE segment_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  strava_effort_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,

  -- Raw performance metrics
  elapsed_time_seconds INTEGER NOT NULL,
  moving_time_seconds INTEGER,
  avg_power_watts NUMERIC,
  normalized_power_watts NUMERIC,
  avg_hr_bpm NUMERIC,
  max_hr_bpm NUMERIC,
  avg_cadence_rpm NUMERIC,
  avg_speed_mps NUMERIC,
  avg_pace_min_km NUMERIC,

  -- Derived ratios
  efficiency_factor NUMERIC,
  pace_hr_ratio NUMERIC,
  power_hr_ratio NUMERIC,

  -- Denormalized context (snapshot at time of effort)
  temperature_c NUMERIC,
  humidity_pct NUMERIC,
  wind_speed_mps NUMERIC,
  wind_direction_deg NUMERIC,
  hrv_morning_ms NUMERIC,
  rhr_morning_bpm NUMERIC,
  sleep_score INTEGER,
  sleep_duration_seconds INTEGER,
  ctl NUMERIC,
  atl NUMERIC,
  tsb NUMERIC,
  hr_source TEXT,

  -- Adjusted performance
  adjusted_score NUMERIC,
  adjustment_factors JSONB,
  is_pr BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strava_effort_id)
);

CREATE INDEX idx_segment_efforts_segment ON segment_efforts(segment_id, started_at DESC);
CREATE INDEX idx_segment_efforts_user ON segment_efforts(user_id, started_at DESC);
CREATE INDEX idx_segment_efforts_activity ON segment_efforts(activity_id);

-- RLS for segment_efforts
ALTER TABLE segment_efforts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own segment efforts"
  ON segment_efforts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own segment efforts"
  ON segment_efforts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segment efforts"
  ON segment_efforts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own segment efforts"
  ON segment_efforts FOR DELETE
  USING (auth.uid() = user_id);

-- Migration 006: Dashboard V2 tables
-- Adds training_calendar, working_goals, nutrition_logs tables
-- Alters profiles and daily_metrics for weather/location

-- ── Training Calendar ──
CREATE TABLE IF NOT EXISTS training_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  workout_type TEXT, -- ride, run, swim, strength, rest, other
  description TEXT,
  planned_duration_min INTEGER,
  planned_tss NUMERIC,
  planned_intensity_factor NUMERIC,
  structure JSONB, -- intervals array: [{ name, duration_min, target_power_pct, notes }]
  nutrition_plan JSONB, -- { calories, carbs_g, fluid_ml, sodium_mg, items: [] }
  source TEXT DEFAULT 'manual', -- coach, aim, manual
  completed BOOLEAN DEFAULT false,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_training_calendar_user_date ON training_calendar(user_id, date);

ALTER TABLE training_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own calendar" ON training_calendar
  FOR ALL USING (auth.uid() = user_id);

-- ── Working Goals ──
CREATE TABLE IF NOT EXISTS working_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT, -- emoji
  color TEXT, -- hex color
  status TEXT DEFAULT 'on_track', -- on_track, ahead, behind, stalled, paused, archived
  metric_label TEXT,
  metric_current NUMERIC,
  metric_start NUMERIC,
  metric_target NUMERIC,
  metric_unit TEXT,
  trend JSONB, -- array of { date, value } data points
  why_it_matters TEXT,
  action_plan JSONB, -- array of { type, text, frequency }
  this_week JSONB, -- array of { text, done }
  ai_note TEXT,
  source TEXT DEFAULT 'user_created', -- aim_suggested, user_created
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_working_goals_user ON working_goals(user_id);

ALTER TABLE working_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goals" ON working_goals
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_working_goals_updated_at
  BEFORE UPDATE ON working_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Nutrition Logs ──
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB, -- array of { name, qty, carbs, protein, fat, calories, icon, confidence }
  totals JSONB, -- { carbs, protein, fat, calories }
  per_hour JSONB, -- { carbs, calories }
  ride_duration_hours NUMERIC,
  ai_insight TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs(user_id, date);
CREATE INDEX idx_nutrition_logs_activity ON nutrition_logs(activity_id);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own nutrition logs" ON nutrition_logs
  FOR ALL USING (auth.uid() = user_id);

-- ── ALTER profiles: add location columns ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- ── ALTER daily_metrics: add weather data ──
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS weather_data JSONB;

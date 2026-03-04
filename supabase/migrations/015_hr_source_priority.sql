-- Migration 015: HR Source Prioritization Engine
-- Adds source tracking columns to activities and daily_metrics
-- Creates hr_source_config table for user-customizable priority overrides

-- ── HR source tracking on activities ──
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_source TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS hr_source_confidence TEXT DEFAULT 'medium';

-- ── HR source tracking on daily_metrics ──
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS rhr_source TEXT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sleep_hr_source TEXT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hrv_source TEXT;

-- ── User HR source priority configuration ──
CREATE TABLE IF NOT EXISTS hr_source_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('exercise', 'sleep', 'resting')),
  provider_priority TEXT[] NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, context)
);

-- Enable RLS
ALTER TABLE hr_source_config ENABLE ROW LEVEL SECURITY;

-- RLS policies — users can only see/modify their own config
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hr_source_config_select_own' AND tablename = 'hr_source_config') THEN
    CREATE POLICY hr_source_config_select_own ON hr_source_config FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hr_source_config_insert_own' AND tablename = 'hr_source_config') THEN
    CREATE POLICY hr_source_config_insert_own ON hr_source_config FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hr_source_config_update_own' AND tablename = 'hr_source_config') THEN
    CREATE POLICY hr_source_config_update_own ON hr_source_config FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hr_source_config_delete_own' AND tablename = 'hr_source_config') THEN
    CREATE POLICY hr_source_config_delete_own ON hr_source_config FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update updated_at on hr_source_config
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_hr_source_config_updated_at') THEN
    CREATE TRIGGER update_hr_source_config_updated_at
      BEFORE UPDATE ON hr_source_config
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

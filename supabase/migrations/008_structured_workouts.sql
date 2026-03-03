-- Migration 008: Structured Workouts Engine
-- Adds activity tags table for cross-activity search,
-- per-activity weather enrichment, and activity annotation columns.

-- ============================================================
-- 1. Activity Tags Table (canonical tagging for search)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'workout',
  confidence NUMERIC DEFAULT 1.0,
  evidence JSONB,
  interval_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_tags_user ON activity_tags(user_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity ON activity_tags(activity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_tags_unique
  ON activity_tags(activity_id, tag_id, COALESCE(interval_index, -1));

-- RLS: users can only see their own tags
ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity tags"
  ON activity_tags FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity tags"
  ON activity_tags FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own activity tags"
  ON activity_tags FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 2. Per-Activity Weather (JSONB on activities)
-- ============================================================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_weather JSONB;

-- ============================================================
-- 3. Activity Annotations (user input)
-- ============================================================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_notes TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_rpe INTEGER CHECK (user_rpe BETWEEN 1 AND 10);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}';

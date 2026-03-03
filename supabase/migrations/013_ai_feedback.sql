-- Migration 013: AI Feedback
-- Thumbs up/down on AI insights for personalized + global quality tracking

-- ── AI Feedback table ──
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  source TEXT NOT NULL,              -- 'activity_analysis', 'dashboard', 'sleep_summary', 'chat'
  insight_index INTEGER NOT NULL,    -- position in the insights array
  insight_category TEXT,             -- 'performance', 'recovery', 'body', 'training', 'nutrition', 'environment', 'health'
  insight_type TEXT,                 -- 'insight', 'positive', 'warning', 'action'
  insight_title TEXT,                -- snapshot of insight title for analysis
  feedback INTEGER NOT NULL,         -- 1 = thumbs up, -1 = thumbs down
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personalized queries: fast per-user category lookups
CREATE INDEX idx_ai_feedback_user_category ON ai_feedback(user_id, insight_category);

-- Global queries: aggregate across all users by category
CREATE INDEX idx_ai_feedback_category ON ai_feedback(insight_category, feedback);

-- Upsert support: one feedback per user per activity per insight
CREATE UNIQUE INDEX idx_ai_feedback_unique ON ai_feedback(user_id, activity_id, source, insight_index);

-- ── Row Level Security ──
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON ai_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON ai_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON ai_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
  ON ai_feedback FOR DELETE
  USING (auth.uid() = user_id);

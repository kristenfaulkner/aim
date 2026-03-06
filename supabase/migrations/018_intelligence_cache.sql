-- Cache for AI-generated daily intelligence (Today page)
-- Avoids redundant Claude API calls when inputs haven't changed
CREATE TABLE IF NOT EXISTS intelligence_cache (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  mode TEXT NOT NULL,
  intelligence JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE intelligence_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own cache" ON intelligence_cache FOR SELECT USING (auth.uid() = user_id);

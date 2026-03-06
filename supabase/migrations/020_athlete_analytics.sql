-- Cached athlete analytics: pre-computed from 90 days of data, shared across all pages.
-- Invalidated automatically via fingerprint (latest activity + latest metrics + FTP).
CREATE TABLE IF NOT EXISTS athlete_analytics (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  analytics JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can read their own cached analytics
ALTER TABLE athlete_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own analytics" ON athlete_analytics
  FOR SELECT USING (auth.uid() = user_id);

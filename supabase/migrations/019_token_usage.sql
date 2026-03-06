-- Token usage tracking for Claude API calls
CREATE TABLE token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_usage_user ON token_usage(user_id);
CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, created_at);
CREATE INDEX idx_token_usage_feature ON token_usage(feature);

-- RLS: users can read their own usage
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

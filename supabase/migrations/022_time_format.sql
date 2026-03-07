-- Add time_format column to user_settings (12h or 24h)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h';

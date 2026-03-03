-- Add athlete bio/description to profiles
-- Auto-generated from activity history via Claude AI, editable by user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS athlete_bio TEXT;

-- Add user annotation columns to activities table
-- Enables athletes to capture subjective session data (notes, rating, RPE, tags)

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS user_notes TEXT,
  ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS user_rpe INTEGER CHECK (user_rpe BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

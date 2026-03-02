-- Add pre-computed zone definitions to profiles
-- Zones are recalculated whenever FTP or max HR changes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS power_zones JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hr_zones JSONB;

-- Migration 009: Activity timezone support
-- Adds GPS start coordinates, IANA timezone, and local start time to activities.
-- All columns nullable — existing data continues working unchanged.

ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_lat NUMERIC;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_lng NUMERIC;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS timezone_iana TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_time_local TEXT;

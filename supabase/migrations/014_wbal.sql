-- W' Balance (W'bal) tracking columns on activities table
-- Stores full W'bal stream + summary in JSONB, plus scalar columns for efficient queries

ALTER TABLE activities ADD COLUMN IF NOT EXISTS wbal_data JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS wbal_min_pct NUMERIC;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS wbal_empty_events INTEGER DEFAULT 0;

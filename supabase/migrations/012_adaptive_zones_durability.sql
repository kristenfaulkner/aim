-- Migration 012: Adaptive Training Zones + Durability Tracking
-- Adds zone preference, zone history, and per-activity durability data.

-- ── Adaptive Zones ──

-- User preference: "auto" (CP when available, else FTP), "cp", or "coggan"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zone_preference TEXT DEFAULT 'auto';

-- CP-based zones computed at the time of this power profile snapshot
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS cp_zones JSONB;

-- Zone history: array of { date, cp_watts, zones } for tracking evolution
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS zones_history JSONB DEFAULT '[]';

-- ── Durability ──

-- Per-activity fatigue-bucket power curves
-- Format: { buckets: [...], total_kj_per_kg, score_5m, score_20m }
ALTER TABLE activities ADD COLUMN IF NOT EXISTS durability_data JSONB;

-- Aggregate durability score (90-day rolling avg of 5m power retention at 30 kJ/kg)
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS durability_score NUMERIC;

-- Best-of durability buckets across recent activities
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS durability_buckets JSONB;

-- Durability trend: array of { date, score } for charting
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS durability_trend JSONB DEFAULT '[]';

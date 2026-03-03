-- Migration 011: Critical Power (CP) & W' Model
-- Adds CP, W', and Pmax columns to power_profiles table
-- as supplementary analytics alongside existing FTP-based metrics.
-- FTP remains the primary model for TSS/IF/zones.

ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS cp_watts INTEGER;
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS w_prime_kj NUMERIC;
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS pmax_watts INTEGER;

-- Model fit quality indicator (R-squared of the hyperbolic fit)
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS cp_model_r_squared NUMERIC;

-- Raw data points used for the fit, stored for audit/debugging
-- Format: [{ duration_s: 300, watts: 320 }, ...]
ALTER TABLE power_profiles ADD COLUMN IF NOT EXISTS cp_model_data JSONB;

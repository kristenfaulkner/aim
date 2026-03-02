-- Add consent tracking and account deletion columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_data_consent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_data_consent_withdrawn_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_deletion_requested_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_deletion_scheduled_for DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

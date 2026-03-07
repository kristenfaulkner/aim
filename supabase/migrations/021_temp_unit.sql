-- Add temp_unit column to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS temp_unit TEXT DEFAULT 'fahrenheit';

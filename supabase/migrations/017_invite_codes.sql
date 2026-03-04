-- Migration 017: Invite codes for closed beta access
-- Allows granting tier access without Stripe (friends, beta testers, influencers, partners)

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'elite')),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code) WHERE is_active = TRUE;

-- Track redemptions
CREATE TABLE IF NOT EXISTS invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID REFERENCES invite_codes(id),
  user_id UUID REFERENCES profiles(id),
  tier_granted TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invite_code_id, user_id)
);

-- Add access_source and invite expiration to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_source TEXT DEFAULT 'stripe'
  CHECK (access_source IN ('stripe', 'invite', 'admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_access_expires_at TIMESTAMPTZ;

-- RLS for invite_codes (admin-only via supabaseAdmin, no client access)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can see their own redemptions
CREATE POLICY "Users can read own redemptions"
  ON invite_redemptions FOR SELECT
  USING (auth.uid() = user_id);

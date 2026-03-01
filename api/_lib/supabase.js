import { createClient } from "@supabase/supabase-js";

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

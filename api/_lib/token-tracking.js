import { supabaseAdmin } from "./supabase.js";

/**
 * Log Claude API token usage. Fire-and-forget — errors are logged but never thrown.
 */
export function trackTokenUsage(userId, feature, model, usage) {
  if (!userId || !usage) return;
  supabaseAdmin
    .from("token_usage")
    .insert({
      user_id: userId,
      feature,
      model,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
    })
    .then(() => {})
    .catch((err) => console.error("[token-tracking] insert error:", err.message));
}

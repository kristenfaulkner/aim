import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { DEFAULTS } from "../_lib/hr-source-priority.js";

const VALID_CONTEXTS = ['exercise', 'sleep', 'resting'];

/**
 * GET  /api/settings/hr-priority — Get user's HR source priority config
 * PUT  /api/settings/hr-priority — Save custom HR source priority
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  const userId = session.userId;

  if (req.method === "GET") {
    try {
      const { data: configs } = await supabaseAdmin
        .from("hr_source_config")
        .select("context, provider_priority, is_custom")
        .eq("user_id", userId);

      // Build response with defaults filled in
      const result = {};
      for (const ctx of VALID_CONTEXTS) {
        const userConfig = configs?.find(c => c.context === ctx);
        result[ctx] = {
          priority: userConfig?.provider_priority || DEFAULTS[ctx],
          is_custom: userConfig?.is_custom || false,
        };
      }

      // Fetch connected integrations to know what's available
      const { data: integrations } = await supabaseAdmin
        .from("integrations")
        .select("provider")
        .eq("user_id", userId)
        .not("access_token", "is", null);

      const connectedProviders = (integrations || []).map(i => i.provider);

      return res.status(200).json({ configs: result, connectedProviders });
    } catch (err) {
      console.error("[settings/hr-priority] GET error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { context, priority } = req.body;

      if (!VALID_CONTEXTS.includes(context)) {
        return res.status(400).json({ error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}` });
      }
      if (!Array.isArray(priority) || priority.length === 0) {
        return res.status(400).json({ error: "priority must be a non-empty array" });
      }

      await supabaseAdmin
        .from("hr_source_config")
        .upsert({
          user_id: userId,
          context,
          provider_priority: priority,
          is_custom: true,
        }, { onConflict: "user_id,context" });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("[settings/hr-priority] PUT error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { context } = req.body;
      if (!VALID_CONTEXTS.includes(context)) {
        return res.status(400).json({ error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}` });
      }

      // Delete custom config to revert to defaults
      await supabaseAdmin
        .from("hr_source_config")
        .delete()
        .eq("user_id", userId)
        .eq("context", context);

      return res.status(200).json({ success: true, reverted: context });
    } catch (err) {
      console.error("[settings/hr-priority] DELETE error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

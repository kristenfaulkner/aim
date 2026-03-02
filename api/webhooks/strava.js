import { supabaseAdmin } from "../_lib/supabase.js";
import { syncStravaActivity } from "../integrations/sync/strava.js";

/**
 * Strava Webhook Receiver
 * GET  — Webhook validation (subscription verification)
 * POST — Event notification (new/updated/deleted activity)
 */
export default async function handler(req, res) {
  // GET: Strava webhook subscription validation
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).json({ "hub.challenge": challenge });
    }
    return res.status(403).json({ error: "Forbidden" });
  }

  // POST: Activity event
  if (req.method === "POST") {
    const { object_type, aspect_type, object_id, owner_id } = req.body;

    // Only handle activity events
    if (object_type !== "activity") {
      return res.status(200).json({ ok: true });
    }

    // Find user by Strava athlete ID
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("user_id")
      .eq("provider", "strava")
      .eq("provider_user_id", String(owner_id))
      .eq("is_active", true)
      .single();

    if (!integration) {
      return res.status(200).json({ ok: true }); // Ignore unknown athletes
    }

    if (aspect_type === "create" || aspect_type === "update") {
      // Sync this specific activity (run async, respond immediately)
      syncStravaActivity(integration.user_id, String(object_id)).catch(console.error);
    }

    if (aspect_type === "delete") {
      await supabaseAdmin
        .from("activities")
        .delete()
        .eq("user_id", integration.user_id)
        .eq("source", "strava")
        .eq("source_id", String(object_id));
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

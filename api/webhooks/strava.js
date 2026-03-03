import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../_lib/supabase.js";
import { syncStravaActivity } from "../integrations/sync/strava.js";

/**
 * Strava Webhook Receiver
 * GET  — Webhook validation (subscription verification)
 * POST — Event notification (new/updated/deleted activity)
 *
 * Uses waitUntil() to keep the function alive after responding,
 * so the sync completes instead of being killed by Vercel.
 */
export default async function handler(req, res) {
  // GET: Strava webhook subscription validation
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      console.log("[Strava Webhook] Subscription validated");
      return res.status(200).json({ "hub.challenge": challenge });
    }
    console.warn("[Strava Webhook] Subscription validation failed — bad verify token");
    return res.status(403).json({ error: "Forbidden" });
  }

  // POST: Activity event
  if (req.method === "POST") {
    const { object_type, aspect_type, object_id, owner_id, subscription_id } = req.body;

    console.log(`[Strava Webhook] Received: type=${object_type} aspect=${aspect_type} object=${object_id} owner=${owner_id} sub=${subscription_id}`);

    // Only handle activity events
    if (object_type !== "activity") {
      console.log(`[Strava Webhook] Ignoring non-activity event: ${object_type}`);
      return res.status(200).json({ ok: true });
    }

    // Find user by Strava athlete ID
    const { data: integration, error: lookupError } = await supabaseAdmin
      .from("integrations")
      .select("user_id")
      .eq("provider", "strava")
      .eq("provider_user_id", String(owner_id))
      .eq("is_active", true)
      .single();

    if (!integration) {
      console.warn(`[Strava Webhook] No active integration found for Strava athlete ${owner_id}${lookupError ? ` (error: ${lookupError.message})` : ""}`);
      return res.status(200).json({ ok: true });
    }

    console.log(`[Strava Webhook] Matched user ${integration.user_id} for athlete ${owner_id}`);

    if (aspect_type === "create" || aspect_type === "update") {
      // Respond immediately (Strava requires fast response), then sync in background
      res.status(200).json({ ok: true });

      // waitUntil keeps the function alive after response is sent
      waitUntil(
        syncStravaActivity(integration.user_id, String(object_id))
          .then((result) => {
            console.log(`[Strava Webhook] Sync complete: activity=${object_id} name="${result?.name}" tss=${result?.tss ?? "n/a"} enriched=${result?.enriched ?? false}`);
          })
          .catch((err) => {
            console.error(`[Strava Webhook] Sync FAILED for activity ${object_id}:`, err.message);
          })
      );
      return;
    }

    if (aspect_type === "delete") {
      console.log(`[Strava Webhook] Deleting activity ${object_id} for user ${integration.user_id}`);
      const { error: deleteError } = await supabaseAdmin
        .from("activities")
        .delete()
        .eq("user_id", integration.user_id)
        .eq("source", "strava")
        .eq("source_id", String(object_id));

      if (deleteError) {
        console.error(`[Strava Webhook] Delete failed for activity ${object_id}:`, deleteError.message);
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../_lib/supabase.js";
import { backfillUserMetrics } from "../_lib/backfill.js";
import { syncWahooWorkout } from "../integrations/sync/wahoo.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify webhook token
  const { webhook_token, event_type, user, workout_summary, workout } = req.body;
  if (webhook_token !== process.env.WAHOO_WEBHOOK_TOKEN) {
    console.warn("[Wahoo Webhook] Invalid webhook token");
    return res.status(401).json({ error: "Invalid webhook token" });
  }

  console.log(`[Wahoo Webhook] Received: event=${event_type} user=${user?.id} workout=${workout?.id}`);

  if (event_type !== "workout_summary" || !workout_summary) {
    console.log(`[Wahoo Webhook] Ignoring non-workout_summary event: ${event_type}`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  // Find user by Wahoo provider_user_id
  const wahooUserId = String(user?.id || "");
  const { data: integration, error: lookupError } = await supabaseAdmin
    .from("integrations")
    .select("user_id")
    .eq("provider", "wahoo")
    .eq("provider_user_id", wahooUserId)
    .eq("is_active", true)
    .single();

  if (!integration) {
    console.warn(`[Wahoo Webhook] No active integration for wahoo user ${wahooUserId}${lookupError ? ` (error: ${lookupError.message})` : ""}`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  const userId = integration.user_id;
  console.log(`[Wahoo Webhook] Matched user ${userId} for wahoo user ${wahooUserId}`);

  // Construct workout object matching syncWahooWorkout's expected shape
  const wahooWorkout = {
    id: workout?.id,
    starts: workout?.starts || workout_summary.created_at,
    workout_type_id: workout?.workout_type_id,
    latitude: workout?.latitude || workout_summary.latitude || null,
    longitude: workout?.longitude || workout_summary.longitude || null,
    name: workout?.name || workout_summary.name,
    workout_summary: workout_summary,
  };

  // Respond immediately, then process in background
  res.status(200).json({ ok: true });

  // waitUntil keeps the function alive after response is sent
  waitUntil(
    (async () => {
      try {
        const result = await syncWahooWorkout(userId, wahooWorkout, { notify: true });
        console.log(`[Wahoo Webhook] Sync complete for workout ${workout?.id}, activity ${result?.id}`);
      } catch (err) {
        console.error(`[Wahoo Webhook] Sync failed for workout ${workout?.id}:`, err.message);
      }
      try {
        await backfillUserMetrics(userId);
      } catch (err) {
        console.error(`[Wahoo Webhook] Backfill failed:`, err.message);
      }
    })()
  );
}

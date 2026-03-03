import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../_lib/supabase.js";
import { analyzeActivity } from "../_lib/ai.js";
import { sendWorkoutEmail } from "../email/send.js";
import { sendWorkoutSMS } from "../sms/send.js";
import { backfillUserMetrics } from "../_lib/backfill.js";
import { resolveActivityTimezone } from "../_lib/timezone.js";
import { mapWahooToActivity } from "../_lib/wahoo.js";

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

  // Resolve timezone — Wahoo may provide lat/lng, fallback to user profile
  const wahooLat = workout?.latitude || workout_summary.latitude || null;
  const wahooLng = workout?.longitude || workout_summary.longitude || null;
  let profileTz = "America/Los_Angeles";
  if (wahooLat == null || wahooLng == null) {
    const { data: prof } = await supabaseAdmin.from("profiles").select("timezone").eq("id", userId).single();
    profileTz = prof?.timezone || "America/Los_Angeles";
  }
  const startedAtRaw = workout?.starts || workout_summary.created_at;
  const tz = resolveActivityTimezone(startedAtRaw, wahooLat, wahooLng, profileTz);

  // Map to activity record using shared mapping (correct DB column names)
  const activity = mapWahooToActivity(userId, workout, workout_summary, tz);

  const { data: upserted, error: upsertError } = await supabaseAdmin.from("activities").upsert(activity, {
    onConflict: "user_id,source,source_id",
  }).select("id").single();

  if (upsertError) {
    console.error(`[Wahoo Webhook] Upsert failed:`, upsertError.message);
  }

  // Respond immediately, then run AI analysis + notifications in background
  res.status(200).json({ ok: true });

  // waitUntil keeps the function alive after response is sent
  waitUntil(
    (async () => {
      if (upserted?.id) {
        try {
          await analyzeActivity(userId, upserted.id);
          console.log(`[Wahoo Webhook] AI analysis complete for activity ${upserted.id}`);
          // Email and SMS fire in parallel after analysis
          await Promise.allSettled([
            sendWorkoutEmail(userId, upserted.id),
            sendWorkoutSMS(userId, upserted.id),
          ]);
          console.log(`[Wahoo Webhook] Notifications sent for activity ${upserted.id}`);
        } catch (err) {
          console.error(`[Wahoo Webhook] Post-processing failed for activity ${upserted.id}:`, err.message);
        }
      }
      try {
        await backfillUserMetrics(userId);
      } catch (err) {
        console.error(`[Wahoo Webhook] Backfill failed:`, err.message);
      }
    })()
  );
}

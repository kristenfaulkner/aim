import { supabaseAdmin } from "../_lib/supabase.js";
import { analyzeActivity } from "../_lib/ai.js";
import { sendWorkoutEmail } from "../email/send.js";
import { sendWorkoutSMS } from "../sms/send.js";
import { backfillUserMetrics } from "../_lib/backfill.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify webhook token
  const { webhook_token, event_type, user, workout_summary, workout } = req.body;
  if (webhook_token !== process.env.WAHOO_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Invalid webhook token" });
  }

  if (event_type !== "workout_summary" || !workout_summary) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  // Find user by Wahoo provider_user_id
  const wahooUserId = String(user?.id || "");
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("user_id")
    .eq("provider", "wahoo")
    .eq("provider_user_id", wahooUserId)
    .eq("is_active", true)
    .single();

  if (!integration) {
    // Try matching by any active wahoo integration if provider_user_id wasn't set
    // This handles the case where we didn't capture the user ID during OAuth
    console.warn(`No wahoo integration found for wahoo user ${wahooUserId}`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  const userId = integration.user_id;
  const ws = workout_summary;

  // Map Wahoo workout data to our activities schema
  const durationSec = parseFloat(ws.duration_active_accum || 0);
  const distanceM = parseFloat(ws.distance_accum || 0);

  const activity = {
    user_id: userId,
    source: "wahoo",
    source_id: String(ws.id || workout?.id || ""),
    activity_type: "ride",
    name: ws.name || workout?.name || "Wahoo Workout",
    started_at: workout?.starts || ws.created_at,
    duration_seconds: Math.round(durationSec),
    distance_meters: Math.round(distanceM),
    elevation_gain: parseFloat(ws.ascent_accum || 0) || null,
    avg_speed: parseFloat(ws.speed_avg || 0) || null,
    avg_heart_rate: parseFloat(ws.heart_rate_avg || 0) || null,
    avg_cadence: parseFloat(ws.cadence_avg || 0) || null,
    avg_power: parseFloat(ws.power_avg || 0) || null,
    normalized_power: parseFloat(ws.power_bike_np_last || 0) || null,
    total_calories: parseFloat(ws.calories_accum || 0) || null,
    tss: parseFloat(ws.power_bike_tss_last || 0) || null,
    source_data: {
      wahoo_workout_id: workout?.id,
      wahoo_summary_id: ws.id,
      workout_type_id: workout?.workout_type_id,
      duration_paused: parseFloat(ws.duration_paused_accum || 0),
      duration_total: parseFloat(ws.duration_total_accum || 0),
      work_accum: parseFloat(ws.work_accum || 0),
      manual: ws.manual,
      fit_file_url: ws.file?.url || null,
    },
  };

  const { data: upserted } = await supabaseAdmin.from("activities").upsert(activity, {
    onConflict: "user_id,source,source_id",
  }).select("id").single();

  // Trigger AI analysis, then email + SMS notifications (fire-and-forget)
  if (upserted?.id) {
    analyzeActivity(userId, upserted.id)
      .then(() => {
        sendWorkoutEmail(userId, upserted.id).catch(err =>
          console.error(`Email failed for wahoo activity ${upserted.id}:`, err.message)
        );
        sendWorkoutSMS(userId, upserted.id).catch(err =>
          console.error(`SMS failed for wahoo activity ${upserted.id}:`, err.message)
        );
      })
      .catch(err =>
        console.error(`AI analysis failed for wahoo activity ${upserted.id}:`, err.message)
      );
  }

  // Backfill derived metrics for any activities missing TSS/IF (fire-and-forget)
  backfillUserMetrics(userId).catch(err =>
    console.error(`Backfill after Wahoo webhook failed:`, err.message)
  );

  res.status(200).json({ ok: true });
}

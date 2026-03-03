import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../_lib/supabase.js";
import { analyzeActivity } from "../_lib/ai.js";
import { sendWorkoutEmail } from "../email/send.js";
import { sendWorkoutSMS } from "../sms/send.js";
import { backfillUserMetrics } from "../_lib/backfill.js";
import { resolveActivityTimezone } from "../_lib/timezone.js";

// Map Wahoo workout_type_id integers to our activity_type strings.
// Wahoo API workout types: https://developers.wahooligan.com/cloud
const WAHOO_WORKOUT_TYPE_MAP = {
  0: "ride",            // Cycling (outdoor)
  1: "run",             // Running
  2: "ride",            // Mountain Biking
  3: "nordic_ski",      // Cross Country Skiing
  4: "ice_skate",       // Nordic Skating
  5: "ice_skate",       // Skating
  6: "swim",            // Swimming (pool)
  7: "workout",         // Wheelchair
  8: "weight_training", // Strength Training
  9: "yoga",            // Yoga
  10: "workout",        // Pilates
  11: "workout",        // HIIT
  12: "workout",        // Barre
  13: "workout",        // Dance
  14: "rowing",         // Rowing
  15: "elliptical",     // Elliptical
  16: "workout",        // Stair Climber
  17: "run",            // Treadmill Running
  18: "ride",           // Indoor Cycling / Trainer
  19: "swim",           // Open Water Swimming
  20: "workout",        // Triathlon
  21: "hike",           // Hiking
  22: "walk",           // Walking
};

function wahooActivityType(workoutTypeId) {
  if (workoutTypeId == null) return "workout";
  return WAHOO_WORKOUT_TYPE_MAP[workoutTypeId] ?? "workout";
}

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
  const ws = workout_summary;

  console.log(`[Wahoo Webhook] Matched user ${userId} for wahoo user ${wahooUserId}`);

  // Map Wahoo workout data to our activities schema
  const durationSec = parseFloat(ws.duration_active_accum || 0);
  const distanceM = parseFloat(ws.distance_accum || 0);

  // Resolve timezone — Wahoo may provide lat/lng, fallback to user profile
  const wahooLat = workout?.latitude || ws.latitude || null;
  const wahooLng = workout?.longitude || ws.longitude || null;
  let profileTz = "America/Los_Angeles";
  if (wahooLat == null || wahooLng == null) {
    const { data: prof } = await supabaseAdmin.from("profiles").select("timezone").eq("id", userId).single();
    profileTz = prof?.timezone || "America/Los_Angeles";
  }
  const startedAtRaw = workout?.starts || ws.created_at;
  const tz = resolveActivityTimezone(startedAtRaw, wahooLat, wahooLng, profileTz);

  const activity = {
    user_id: userId,
    source: "wahoo",
    source_id: String(ws.id || workout?.id || ""),
    activity_type: wahooActivityType(workout?.workout_type_id),
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
    start_lat: wahooLat ? parseFloat(wahooLat) : null,
    start_lng: wahooLng ? parseFloat(wahooLng) : null,
    timezone_iana: tz.timezone_iana,
    start_time_local: tz.start_time_local,
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

import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { estimateRecoveryImpact, estimateCrossTrainingTSS } from "../_lib/cross-training.js";
import { updateDailyMetrics } from "../_lib/training-load.js";

/**
 * POST /api/activities/manual
 * Save a manually-logged activity.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const {
    activity_type,
    title,
    date,
    duration_seconds,
    perceived_intensity,
    body_region,
    notes,
    fields = {},
  } = req.body || {};

  if (!activity_type || !duration_seconds) {
    return res.status(400).json({ error: "activity_type and duration_seconds are required" });
  }

  const userId = session.userId;
  const activityDate = date || new Date().toISOString().split("T")[0];

  // Map sport type to activity_type value used in the DB
  const SPORT_MAP = {
    cycling: "ride", running: "run", swimming: "swim",
    hiking: "hike", strength: "strength", yoga: "yoga",
    pilates: "pilates", other: "workout",
  };

  // Parse numeric fields (all come as strings from the modal)
  const parseNum = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

  // Build activity record
  const record = {
    user_id: userId,
    source: "manual",
    source_id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    activity_type: SPORT_MAP[activity_type] || activity_type,
    name: title || (activity_type.charAt(0).toUpperCase() + activity_type.slice(1)),
    started_at: `${activityDate}T12:00:00Z`,
    duration_seconds,
    distance_meters: parseNum(fields.distance) ? parseNum(fields.distance) * 1609.34 : null,
    avg_speed_mps: parseNum(fields.avg_speed) ? parseNum(fields.avg_speed) * 0.447 : null,
    avg_power_watts: parseNum(fields.avg_power),
    normalized_power_watts: parseNum(fields.norm_power),
    avg_hr_bpm: parseNum(fields.avg_hr),
    max_hr_bpm: parseNum(fields.max_hr),
    elevation_gain_meters: parseNum(fields.elev_gain) ? parseNum(fields.elev_gain) * 0.3048 : null,
    work_kj: parseNum(fields.work),
    calories: parseNum(fields.calories) ? Math.round(parseNum(fields.calories)) : null,
    tss: parseNum(fields.tss),
    intensity_factor: parseNum(fields.if_score),
    user_notes: notes || null,
  };

  try {
    // Step 1: Insert activity
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("activities")
      .insert(record)
      .select("id, name, activity_type, source, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, tss, intensity_factor, avg_hr_bpm, max_hr_bpm, avg_speed_mps, elevation_gain_meters, calories, work_kj, user_notes")
      .single();

    if (insertErr) {
      console.error("Manual activity insert error:", insertErr);
      return res.status(500).json({ error: "Failed to save activity" });
    }

    // Step 2: For cross-training types, also write to cross_training_log
    const crossTrainingTypes = ["strength", "yoga", "pilates", "hiking", "other", "swimming", "running"];
    if (crossTrainingTypes.includes(activity_type)) {
      const durationMinutes = Math.round(duration_seconds / 60);
      const entry = {
        activity_type,
        body_region: body_region || null,
        perceived_intensity: perceived_intensity || 3,
        duration_minutes: durationMinutes,
      };
      const estimated_tss = estimateCrossTrainingTSS(entry);
      const recovery_impact = estimateRecoveryImpact(entry);

      await supabaseAdmin.from("cross_training_log").insert({
        user_id: userId,
        date: activityDate,
        activity_type,
        body_region: body_region ? body_region.toLowerCase().replace(/ /g, "_") : null,
        perceived_intensity: perceived_intensity || 3,
        duration_minutes: durationMinutes,
        notes: notes || null,
        estimated_tss,
        recovery_impact,
      }).then(() => {}).catch(err => console.error("Cross-training log insert error:", err));

      // If no TSS from fields, use estimated TSS for training load
      if (!record.tss && estimated_tss) {
        record.tss = estimated_tss;
        // Update the activity with estimated TSS
        await supabaseAdmin.from("activities").update({ tss: estimated_tss }).eq("id", inserted.id);
        inserted.tss = estimated_tss;
      }
    }

    // Step 3: Update training load if TSS available
    if (inserted.tss) {
      try {
        await updateDailyMetrics(userId, inserted);
      } catch (err) {
        console.error("Training load update error:", err);
      }
    }

    return res.status(201).json(inserted);
  } catch (err) {
    console.error("Manual activity error:", err);
    return res.status(500).json({ error: "Failed to save activity" });
  }
}

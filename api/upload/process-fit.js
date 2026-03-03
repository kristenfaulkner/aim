import { parseFitFile } from "../_lib/fit.js";
import { computeActivityMetrics } from "../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../_lib/training-load.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { analyzeActivity } from "../_lib/ai.js";
import { isHigherPriority } from "../_lib/source-priority.js";
import { sendWorkoutEmail } from "../email/send.js";
import { sendWorkoutSMS } from "../sms/send.js";
import { resolveActivityTimezone } from "../_lib/timezone.js";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 60,
};

/**
 * POST /api/upload/process-fit
 * Process a single .fit or .fit.gz file: parse, compute metrics, dedup, upsert.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { fileBase64, fileName } = req.body;
  if (!fileBase64 || !fileName) {
    return res.status(400).json({ error: "Missing fileBase64 or fileName" });
  }

  try {
    // 1. Decode and decompress
    let fitBuffer = Buffer.from(fileBase64, "base64");
    if (fileName.toLowerCase().endsWith(".gz")) {
      const { gunzipSync } = await import("zlib");
      fitBuffer = gunzipSync(fitBuffer);
    }

    // 2. Parse FIT file
    const { metadata, streams, lrBalance } = parseFitFile(fitBuffer, fileName);

    // 3. Get user profile for FTP and timezone fallback
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts, weight_kg, timezone")
      .eq("id", session.userId)
      .single();

    const ftp = profile?.ftp_watts || null;
    const weightKg = profile?.weight_kg || null;

    // 3b. Resolve timezone from GPS coordinates
    const tz = resolveActivityTimezone(
      metadata.started_at, metadata.start_lat, metadata.start_lng,
      profile?.timezone || "America/Los_Angeles"
    );

    // 4. Compute metrics
    const hasWatts = streams.watts?.data?.length > 0 && streams.watts.data.some(w => w > 0);
    const metrics = hasWatts
      ? computeActivityMetrics(streams, metadata.duration_seconds, ftp)
      : {};

    // 5. Duplicate check
    const { data: existingActivities } = await supabaseAdmin
      .from("activities")
      .select("id, source, source_id, started_at, duration_seconds, name, source_data, lr_balance, tss, intensity_factor, variability_index, efficiency_factor, work_kj, zone_distribution, power_curve, hr_drift_pct, decoupling_pct, avg_power_watts, normalized_power_watts, max_power_watts, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm")
      .eq("user_id", session.userId);

    const existing = existingActivities || [];
    const duplicate = findDuplicate(existing, metadata.started_at, metadata.duration_seconds, metadata.source_id);

    // 6a. Re-import from same source: enrich missing fields
    if (duplicate && duplicate.source === "device") {
      const enrichUpdates = {};
      if (lrBalance && !duplicate.lr_balance) enrichUpdates.lr_balance = lrBalance;
      if (metrics.tss != null && duplicate.tss == null) enrichUpdates.tss = metrics.tss;
      if (metrics.intensity_factor != null && duplicate.intensity_factor == null) enrichUpdates.intensity_factor = metrics.intensity_factor;
      if (metrics.variability_index != null && duplicate.variability_index == null) enrichUpdates.variability_index = metrics.variability_index;
      if (metrics.efficiency_factor != null && duplicate.efficiency_factor == null) enrichUpdates.efficiency_factor = metrics.efficiency_factor;
      if (metrics.hr_drift_pct != null && duplicate.hr_drift_pct == null) enrichUpdates.hr_drift_pct = metrics.hr_drift_pct;
      if (metrics.decoupling_pct != null && duplicate.decoupling_pct == null) enrichUpdates.decoupling_pct = metrics.decoupling_pct;
      if (metrics.work_kj != null && duplicate.work_kj == null) enrichUpdates.work_kj = metrics.work_kj;
      if (metrics.zone_distribution && !duplicate.zone_distribution) enrichUpdates.zone_distribution = metrics.zone_distribution;
      if (metrics.power_curve && !duplicate.power_curve) enrichUpdates.power_curve = metrics.power_curve;
      if (metrics.avg_power_watts != null && duplicate.avg_power_watts == null) enrichUpdates.avg_power_watts = metrics.avg_power_watts;
      if (metrics.normalized_power_watts != null && duplicate.normalized_power_watts == null) enrichUpdates.normalized_power_watts = metrics.normalized_power_watts;
      if (metrics.max_power_watts != null && duplicate.max_power_watts == null) enrichUpdates.max_power_watts = metrics.max_power_watts;

      if (Object.keys(enrichUpdates).length > 0) {
        await supabaseAdmin.from("activities").update(enrichUpdates).eq("id", duplicate.id);
        if (enrichUpdates.tss) {
          await updateDailyMetrics(session.userId, { started_at: metadata.started_at, tss: enrichUpdates.tss });
        }
        if (enrichUpdates.power_curve) {
          await updatePowerProfile(session.userId, enrichUpdates.power_curve, weightKg);
        }
        return res.status(200).json({ imported: 0, merged: 1, skipped: 0, activity: { id: duplicate.id, name: duplicate.name, started_at: metadata.started_at } });
      }
      return res.status(200).json({ imported: 0, merged: 0, skipped: 1, activity: { id: duplicate.id, name: duplicate.name, started_at: metadata.started_at } });
    }

    // 6b. Upgrade: device file is higher priority than existing source
    if (duplicate && isHigherPriority("device", duplicate.source)) {
      const upgradeData = {
        source: "device",
        source_id: metadata.source_id,
        source_data: { ...(duplicate.source_data || {}), fit_file: fileName },
      };
      if (metadata.duration_seconds) upgradeData.duration_seconds = metadata.duration_seconds;
      if (metadata.distance_meters) upgradeData.distance_meters = metadata.distance_meters;
      if (metadata.elevation_gain_meters != null) upgradeData.elevation_gain_meters = metadata.elevation_gain_meters;
      if (metadata.avg_speed_mps != null) upgradeData.avg_speed_mps = metadata.avg_speed_mps;
      if (metadata.max_speed_mps != null) upgradeData.max_speed_mps = metadata.max_speed_mps;
      if (metadata.calories != null) upgradeData.calories = metadata.calories;
      if (metadata.avg_temperature != null) upgradeData.temperature_celsius = metadata.avg_temperature;
      if (metrics.avg_power_watts != null) upgradeData.avg_power_watts = metrics.avg_power_watts;
      if (metrics.normalized_power_watts != null) upgradeData.normalized_power_watts = metrics.normalized_power_watts;
      if (metrics.max_power_watts != null) upgradeData.max_power_watts = metrics.max_power_watts;
      if (metrics.avg_hr_bpm != null) upgradeData.avg_hr_bpm = metrics.avg_hr_bpm;
      if (metrics.max_hr_bpm != null) upgradeData.max_hr_bpm = metrics.max_hr_bpm;
      if (metrics.avg_cadence_rpm != null) upgradeData.avg_cadence_rpm = metrics.avg_cadence_rpm;
      if (metrics.tss != null) upgradeData.tss = metrics.tss;
      if (metrics.intensity_factor != null) upgradeData.intensity_factor = metrics.intensity_factor;
      if (metrics.variability_index != null) upgradeData.variability_index = metrics.variability_index;
      if (metrics.efficiency_factor != null) upgradeData.efficiency_factor = metrics.efficiency_factor;
      if (metrics.hr_drift_pct != null) upgradeData.hr_drift_pct = metrics.hr_drift_pct;
      if (metrics.decoupling_pct != null) upgradeData.decoupling_pct = metrics.decoupling_pct;
      if (metrics.work_kj != null) upgradeData.work_kj = metrics.work_kj;
      if (metrics.zone_distribution) upgradeData.zone_distribution = metrics.zone_distribution;
      if (metrics.power_curve) upgradeData.power_curve = metrics.power_curve;
      if (lrBalance) upgradeData.lr_balance = lrBalance;

      await supabaseAdmin.from("activities").update(upgradeData).eq("id", duplicate.id);
      if (upgradeData.tss) {
        await updateDailyMetrics(session.userId, { started_at: metadata.started_at, tss: upgradeData.tss });
      }
      if (metrics.power_curve) {
        await updatePowerProfile(session.userId, metrics.power_curve, weightKg);
      }
      return res.status(200).json({ imported: 0, merged: 1, skipped: 0, activity: { id: duplicate.id, name: duplicate.name, started_at: metadata.started_at } });
    }

    // 6c. Duplicate exists with equal/higher priority — skip
    if (duplicate) {
      return res.status(200).json({ imported: 0, merged: 0, skipped: 1, activity: { id: duplicate.id, name: duplicate.name, started_at: metadata.started_at } });
    }

    // 7. New activity — insert
    const record = {
      user_id: session.userId,
      source: "device",
      source_id: metadata.source_id,
      activity_type: metadata.activity_type,
      name: cleanFilename(fileName) || "Workout",
      started_at: metadata.started_at,
      duration_seconds: metadata.duration_seconds,
      distance_meters: metadata.distance_meters,
      elevation_gain_meters: metadata.elevation_gain_meters,
      avg_power_watts: metrics.avg_power_watts ?? null,
      normalized_power_watts: metrics.normalized_power_watts ?? null,
      max_power_watts: metrics.max_power_watts ?? null,
      avg_hr_bpm: metrics.avg_hr_bpm ?? null,
      max_hr_bpm: metrics.max_hr_bpm ?? null,
      avg_cadence_rpm: metrics.avg_cadence_rpm ?? null,
      avg_speed_mps: metadata.avg_speed_mps ?? null,
      max_speed_mps: metadata.max_speed_mps ?? null,
      calories: metadata.calories ?? null,
      tss: metrics.tss ?? null,
      intensity_factor: metrics.intensity_factor ?? null,
      variability_index: metrics.variability_index ?? null,
      efficiency_factor: metrics.efficiency_factor ?? null,
      hr_drift_pct: metrics.hr_drift_pct ?? null,
      decoupling_pct: metrics.decoupling_pct ?? null,
      work_kj: metrics.work_kj ?? null,
      temperature_celsius: metadata.avg_temperature ?? null,
      zone_distribution: metrics.zone_distribution ?? null,
      power_curve: metrics.power_curve ?? null,
      lr_balance: lrBalance ?? null,
      start_lat: metadata.start_lat ?? null,
      start_lng: metadata.start_lng ?? null,
      timezone_iana: tz.timezone_iana,
      start_time_local: tz.start_time_local,
      source_data: { fit_file: fileName },
    };

    const { data: upserted } = await supabaseAdmin
      .from("activities")
      .upsert(record, { onConflict: "user_id,source,source_id" })
      .select("id")
      .single();

    // 8. Update training load
    if (record.tss) {
      await updateDailyMetrics(session.userId, record);
    }

    // 9. Update power profile
    if (metrics.power_curve) {
      await updatePowerProfile(session.userId, metrics.power_curve, weightKg);
    }

    // 10. Fire-and-forget AI analysis → then email + SMS notifications
    if (upserted?.id) {
      analyzeActivity(session.userId, upserted.id)
        .then(() => {
          sendWorkoutEmail(session.userId, upserted.id).catch(err =>
            console.error(`Email failed for FIT upload ${upserted.id}:`, err.message)
          );
          sendWorkoutSMS(session.userId, upserted.id).catch(err =>
            console.error(`SMS failed for FIT upload ${upserted.id}:`, err.message)
          );
        })
        .catch(err =>
          console.error(`AI analysis failed for FIT upload ${upserted.id}:`, err.message)
        );
    }

    return res.status(200).json({
      imported: 1, merged: 0, skipped: 0,
      activity: { id: upserted?.id, name: record.name, started_at: record.started_at, duration_seconds: record.duration_seconds },
    });
  } catch (err) {
    console.error("Process FIT error:", err);
    return res.status(500).json({ error: err.message || "FIT processing failed" });
  }
}

/** Strip path and extension from filename for activity name. */
function cleanFilename(name) {
  return name
    .replace(/^.*[/\\]/, "")
    .replace(/\.(fit|fit\.gz|gz)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find duplicate activity by source_id or time+duration match. */
function findDuplicate(existingActivities, startedAt, durationSeconds, sourceId) {
  const targetTime = new Date(startedAt).getTime();
  const WINDOW_MS = 2 * 60 * 1000;
  const DURATION_TOLERANCE = 0.05;

  for (const act of existingActivities) {
    if (act.source === "device" && act.source_id === sourceId) return act;

    const actTime = new Date(act.started_at).getTime();
    if (Math.abs(actTime - targetTime) > WINDOW_MS) continue;

    if (act.duration_seconds && durationSeconds) {
      const durationDiff = Math.abs(act.duration_seconds - durationSeconds) / Math.max(durationSeconds, 1);
      if (durationDiff > DURATION_TOLERANCE) continue;
    }
    return act;
  }
  return null;
}

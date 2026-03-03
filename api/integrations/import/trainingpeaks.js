/**
 * TrainingPeaks file import endpoint.
 * POST /api/integrations/import/trainingpeaks
 *
 * Receives a Supabase Storage path to a ZIP of .FIT/.TCX/.GPX files (and optional
 * base64 CSV workout summary), processes each file, computes metrics,
 * deduplicates against existing activities using source priority
 * (device > TrainingPeaks > Strava), and returns import stats.
 */
import AdmZip from "adm-zip";
import { parse as csvParse } from "csv-parse/sync";
import { parseFitFile } from "../../_lib/fit.js";
import { parseTcxFile } from "../../_lib/tcx.js";
import { parseGpxFile } from "../../_lib/gpx.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { isHigherPriority } from "../../_lib/source-priority.js";
import { backfillUserMetrics } from "../../_lib/backfill.js";
import { buildLapsPayload } from "../../_lib/intervals.js";

export const config = {
  maxDuration: 300, // 5 minutes for large imports
  api: {
    bodyParser: {
      sizeLimit: "50mb", // CSVs sent as base64 can be large
    },
  },
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { zipPath, csvData, metricsCsvData } = req.body || {};
    if (!zipPath && !csvData && !metricsCsvData) {
      return res.status(400).json({ error: "No files provided" });
    }

    // 1. Download and extract ZIP (if provided)
    let entries = [];
    if (zipPath) {
      const { data: zipBlob, error: dlError } = await supabaseAdmin.storage
        .from("import-files")
        .download(zipPath);

      if (dlError || !zipBlob) {
        return res.status(400).json({ error: `Failed to download ZIP: ${dlError?.message || "not found"}` });
      }

      const zipBuffer = Buffer.from(await zipBlob.arrayBuffer());

      // 2. Extract ZIP and filter to .FIT / .FIT.GZ / .GZ files
      const zip = new AdmZip(zipBuffer);
      entries = zip.getEntries().filter(e => {
        if (e.isDirectory) return false;
        const name = e.entryName.toLowerCase();
        return name.endsWith(".fit") || name.endsWith(".fit.gz") || name.endsWith(".gz")
          || name.endsWith(".tcx") || name.endsWith(".tcx.gz")
          || name.endsWith(".gpx") || name.endsWith(".gpx.gz");
      });

      if (entries.length === 0) {
        return res.status(400).json({ error: "ZIP contains no workout files (.fit, .tcx, .gpx)" });
      }
    }

    // 3. Parse optional CSV for metadata enrichment
    let csvRows = [];
    if (csvData) {
      try {
        const csvText = Buffer.from(csvData, "base64").toString("utf-8");
        csvRows = csvParse(csvText, { columns: true, skip_empty_lines: true, relax_column_count: true });
      } catch (csvErr) {
        console.error("CSV parse error (non-fatal):", csvErr.message);
      }
    }

    // 3b. Parse optional metrics CSV for daily metrics
    let metricsCsvRows = [];
    if (metricsCsvData) {
      try {
        const metricsText = Buffer.from(metricsCsvData, "base64").toString("utf-8");
        metricsCsvRows = csvParse(metricsText, { columns: true, skip_empty_lines: true, relax_column_count: true });
      } catch (csvErr) {
        console.error("Metrics CSV parse error (non-fatal):", csvErr.message);
      }
    }

    // 4. Get user profile for FTP
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts, weight_kg")
      .eq("id", session.userId)
      .single();

    const ftp = profile?.ftp_watts || null;
    const weightKg = profile?.weight_kg || null;

    // 5. Load existing activities for dedup (include metric fields for re-import enrichment)
    const { data: existingActivities } = await supabaseAdmin
      .from("activities")
      .select("id, source, source_id, started_at, duration_seconds, name, description, source_data, lr_balance, tss, intensity_factor, variability_index, efficiency_factor, work_kj, zone_distribution, power_curve, hr_drift_pct, decoupling_pct, avg_power_watts, normalized_power_watts, max_power_watts, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm")
      .eq("user_id", session.userId);

    const existing = existingActivities || [];

    // 6. Process each FIT file
    const results = { imported: 0, merged: 0, skipped: 0, failed: 0, errors: [], total: entries.length };

    for (const entry of entries) {
      try {
        let fileBuffer = entry.getData();
        let innerName = entry.entryName.toLowerCase();
        // Decompress .gz files
        if (innerName.endsWith(".gz")) {
          const { gunzipSync } = await import("zlib");
          fileBuffer = gunzipSync(fileBuffer);
          innerName = innerName.replace(/\.gz$/, "");
        }

        // Dispatch to correct parser based on file extension
        let parsed;
        if (innerName.endsWith(".tcx")) {
          parsed = parseTcxFile(fileBuffer, entry.entryName);
        } else if (innerName.endsWith(".gpx")) {
          parsed = parseGpxFile(fileBuffer, entry.entryName);
        } else {
          parsed = parseFitFile(fileBuffer, entry.entryName);
        }
        const { metadata, streams, lrBalance, fitLaps } = parsed;

        // 6a. Compute metrics from streams
        const hasWatts = streams.watts?.data?.length > 0 && streams.watts.data.some(w => w > 0);
        const metrics = hasWatts
          ? computeActivityMetrics(streams, metadata.duration_seconds, ftp)
          : {};

        // 6a-ii. Extract intervals (FIT laps preferred, fallback to detection)
        let lapsPayload = null;
        if (hasWatts && ftp) {
          try {
            lapsPayload = buildLapsPayload(streams, ftp, fitLaps);
          } catch (err) {
            console.error(`Interval extraction failed for ${entry.entryName}:`, err.message);
          }
        }

        // 6b. Check for duplicate
        const duplicate = findDuplicate(existing, metadata.started_at, metadata.duration_seconds, metadata.source_id);

        if (duplicate && duplicate.source === "trainingpeaks") {
          // Re-import from TP: fill in any fields that are now computable
          // but were missing on first import (e.g. lr_balance, TSS if FTP wasn't set)
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
          if (metrics.avg_hr_bpm != null && duplicate.avg_hr_bpm == null) enrichUpdates.avg_hr_bpm = metrics.avg_hr_bpm;
          if (metrics.max_hr_bpm != null && duplicate.max_hr_bpm == null) enrichUpdates.max_hr_bpm = metrics.max_hr_bpm;
          if (metrics.avg_cadence_rpm != null && duplicate.avg_cadence_rpm == null) enrichUpdates.avg_cadence_rpm = metrics.avg_cadence_rpm;

          if (Object.keys(enrichUpdates).length > 0) {
            await supabaseAdmin.from("activities").update(enrichUpdates).eq("id", duplicate.id);
            if (enrichUpdates.tss) {
              await updateDailyMetrics(session.userId, { started_at: metadata.started_at, tss: enrichUpdates.tss });
            }
            if (enrichUpdates.power_curve) {
              await updatePowerProfile(session.userId, enrichUpdates.power_curve, weightKg);
            }
            results.merged++;
          } else {
            results.skipped++;
          }
          continue;
        }

        // 6c. Match CSV row for metadata enrichment
        const csvMatch = matchCsvRow(csvRows, metadata.started_at);

        if (duplicate && isHigherPriority("trainingpeaks", duplicate.source)) {
          // UPGRADE: TP is more authoritative than existing (e.g. Strava).
          // Replace metrics with TP-computed values, keep useful metadata.
          const existingSourceData = duplicate.source_data || {};
          const tpSourceData = {
            rpe: csvMatch?.rpe,
            coach_comments: csvMatch?.comments,
            notes: csvMatch?.notes,
            planned_workout: csvMatch?.planned_workout,
            imported_from: entry.entryName,
          };

          const upgradeData = {
            source_data: { ...existingSourceData, trainingpeaks: tpSourceData, fit_file: entry.entryName },
          };

          // Override metrics with TP values (only where TP has data)
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

          // Use TP name/description if the existing ones are missing or generic
          if (csvMatch?.title && (!duplicate.name || /^(Morning|Afternoon|Evening|Lunch) Ride$/.test(duplicate.name))) {
            upgradeData.name = csvMatch.title;
          }
          if (csvMatch?.description && !duplicate.description) {
            upgradeData.description = csvMatch.description;
          }

          await supabaseAdmin
            .from("activities")
            .update(upgradeData)
            .eq("id", duplicate.id);

          // Recompute training load and power profile with upgraded metrics
          if (upgradeData.tss) {
            await updateDailyMetrics(session.userId, { started_at: metadata.started_at, tss: upgradeData.tss });
          }
          if (metrics.power_curve) {
            await updatePowerProfile(session.userId, metrics.power_curve, weightKg);
          }

          results.merged++;
          continue;
        }

        if (duplicate) {
          // ENRICH: existing source is higher or equal priority (e.g. Wahoo/Garmin).
          // Only add TP metadata without touching metrics.
          const existingSourceData = duplicate.source_data || {};
          const mergeData = {
            source_data: {
              ...existingSourceData,
              trainingpeaks: {
                rpe: csvMatch?.rpe,
                coach_comments: csvMatch?.comments,
                notes: csvMatch?.notes,
                planned_workout: csvMatch?.planned_workout,
                imported_from: entry.entryName,
              },
            },
          };

          if (csvMatch?.description && !duplicate.description) {
            mergeData.description = csvMatch.description;
          }
          if (csvMatch?.title && (!duplicate.name || /^(Morning|Afternoon|Evening|Lunch) Ride$/.test(duplicate.name))) {
            mergeData.name = csvMatch.title;
          }

          await supabaseAdmin
            .from("activities")
            .update(mergeData)
            .eq("id", duplicate.id);

          results.merged++;
          continue;
        }

        // 6d. Build new activity record (mirrors strava.js pattern)
        const record = {
          user_id: session.userId,
          source: "trainingpeaks",
          source_id: metadata.source_id,
          activity_type: metadata.activity_type,
          name: csvMatch?.title || cleanFilename(entry.entryName) || "TrainingPeaks Activity",
          description: csvMatch?.description || null,
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
          ftp_at_time: (metrics.tss != null && ftp) ? ftp : null,
          temperature_celsius: metadata.avg_temperature ?? null,
          zone_distribution: metrics.zone_distribution ?? null,
          power_curve: metrics.power_curve ?? null,
          lr_balance: lrBalance ?? null,
          laps: lapsPayload,
          source_data: {
            trainingpeaks: {
              rpe: csvMatch?.rpe,
              coach_comments: csvMatch?.comments,
              notes: csvMatch?.notes,
              body_weight_kg: csvMatch?.body_weight,
            },
            fit_file: entry.entryName,
          },
        };

        // 6e. Upsert
        const { data: upserted } = await supabaseAdmin
          .from("activities")
          .upsert(record, { onConflict: "user_id,source,source_id" })
          .select("id")
          .single();

        // Add to existing list so subsequent files can dedup against it
        existing.push({
          id: upserted?.id,
          source: "trainingpeaks",
          source_id: metadata.source_id,
          started_at: metadata.started_at,
          duration_seconds: metadata.duration_seconds,
        });

        // 6f. Update daily_metrics with training load
        if (record.tss) {
          await updateDailyMetrics(session.userId, record);
        }

        // 6g. Update power profile
        if (metrics.power_curve) {
          await updatePowerProfile(session.userId, metrics.power_curve, weightKg);
        }

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({ file: entry.entryName, error: err.message });
        console.error(`Failed to process ${entry.entryName}:`, err.message);
      }
    }

    // 6b. CSV-only enrichment: match CSV rows to existing activities by date
    if (!zipPath && csvRows.length > 0) {
      for (const act of existing) {
        const csvMatch = matchCsvRow(csvRows, act.started_at);
        if (!csvMatch) continue;

        const updates = {};
        const existingSourceData = act.source_data || {};

        // Add TP metadata
        const tpMeta = {
          rpe: csvMatch.rpe,
          coach_comments: csvMatch.comments,
          notes: csvMatch.notes,
          planned_workout: csvMatch.planned_workout,
        };
        if (Object.values(tpMeta).some(v => v != null)) {
          updates.source_data = { ...existingSourceData, trainingpeaks: { ...existingSourceData.trainingpeaks, ...tpMeta } };
        }

        // Enrich name/description if missing or generic
        if (csvMatch.title && (!act.name || /^(Morning|Afternoon|Evening|Lunch) Ride$/.test(act.name))) {
          updates.name = csvMatch.title;
        }
        if (csvMatch.description && !act.description) {
          updates.description = csvMatch.description;
        }

        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from("activities").update(updates).eq("id", act.id);
          results.merged++;
        }
      }
    }

    // 7. Update body weight from CSV if available
    if (csvRows.length > 0) {
      await updateBodyWeightFromCsv(session.userId, csvRows);
    }

    // 7b. Import daily metrics from metrics CSV
    if (metricsCsvRows.length > 0) {
      await importDailyMetricsFromCsv(session.userId, metricsCsvRows);
    }

    // 8. Create/update integration record
    await supabaseAdmin.from("integrations").upsert({
      user_id: session.userId,
      provider: "trainingpeaks",
      access_token: "file-import",
      is_active: true,
      last_sync_at: new Date().toISOString(),
      sync_status: results.failed > 0 ? "partial" : "success",
      sync_error: results.failed > 0 ? `${results.failed} files failed` : null,
      metadata: {
        import_type: "file",
        last_import: {
          date: new Date().toISOString(),
          files_total: entries.length,
          imported: results.imported,
          merged: results.merged,
          skipped: results.skipped,
          failed: results.failed,
          csv_only: !zipPath,
        },
      },
    }, { onConflict: "user_id,provider" });

    // 9. Clean up uploaded ZIP from storage
    if (zipPath) {
      await supabaseAdmin.storage.from("import-files").remove([zipPath]).catch(() => {});
    }

    // 10. Backfill derived metrics for any activities missing TSS/IF (fire-and-forget)
    backfillUserMetrics(session.userId).catch(err =>
      console.error(`Backfill after TP import failed:`, err.message)
    );

    return res.status(200).json({ ...results, analysisQueued: results.imported > 0 });
  } catch (err) {
    console.error("TrainingPeaks import error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Helpers ──

/**
 * Find a duplicate activity by matching start time and duration.
 * Matches: started_at within ±2 minutes AND duration within ±5%.
 * Also matches by exact source_id for TP re-imports.
 */
function findDuplicate(existingActivities, startedAt, durationSeconds, sourceId) {
  const targetTime = new Date(startedAt).getTime();
  const WINDOW_MS = 2 * 60 * 1000; // 2 minutes
  const DURATION_TOLERANCE = 0.05; // 5%

  for (const act of existingActivities) {
    // Exact source_id match (re-import from TP)
    if (act.source === "trainingpeaks" && act.source_id === sourceId) {
      return act;
    }

    // Time + duration match (cross-source dedup)
    const actTime = new Date(act.started_at).getTime();
    const timeDiff = Math.abs(actTime - targetTime);
    if (timeDiff > WINDOW_MS) continue;

    if (act.duration_seconds && durationSeconds) {
      const durationDiff = Math.abs(act.duration_seconds - durationSeconds) / Math.max(durationSeconds, 1);
      if (durationDiff > DURATION_TOLERANCE) continue;
    }

    return act;
  }
  return null;
}

/**
 * Match a CSV row to an activity by date.
 */
function matchCsvRow(csvRows, startedAt) {
  if (!csvRows.length) return null;
  const targetDate = new Date(startedAt).toISOString().split("T")[0];
  const targetHour = new Date(startedAt).getUTCHours();

  const matches = csvRows.filter(row => {
    const rowDate = parseCsvDate(row.WorkoutDay || row.Date || row.date);
    return rowDate === targetDate;
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return normalizeCsvRow(matches[0]);

  // Multiple activities on same day — match by closest time if available
  const withTime = matches.filter(r => r.StartTime || r.start_time);
  if (withTime.length > 0) {
    const best = withTime.reduce((closest, row) => {
      const rowHour = parseInt((row.StartTime || row.start_time || "12").split(":")[0], 10);
      const diff = Math.abs(rowHour - targetHour);
      return diff < closest.diff ? { row, diff } : closest;
    }, { row: withTime[0], diff: 24 });
    return normalizeCsvRow(best.row);
  }

  return normalizeCsvRow(matches[0]);
}

function normalizeCsvRow(row) {
  return {
    title: row.Title || row.WorkoutType || row.title || null,
    description: row.WorkoutDescription || row.Description || row.description || null,
    rpe: row.RPE || row.rpe ? parseFloat(row.RPE || row.rpe) : null,
    comments: row.CoachComments || row.Comments || row.comments || null,
    notes: row.AthleteNotes || row.Notes || row.notes || null,
    planned_workout: row.PlannedWorkout || row.planned_workout || null,
    body_weight: row.BodyWeight || row.body_weight ? parseFloat(row.BodyWeight || row.body_weight) : null,
  };
}

function parseCsvDate(dateStr) {
  if (!dateStr) return null;
  // Handle MM/DD/YYYY
  const slashParts = dateStr.split("/");
  if (slashParts.length === 3) {
    return `${slashParts[2]}-${slashParts[0].padStart(2, "0")}-${slashParts[1].padStart(2, "0")}`;
  }
  // Handle YYYY-MM-DD
  if (dateStr.includes("-")) return dateStr.split("T")[0];
  return null;
}

function cleanFilename(name) {
  return name
    .replace(/^.*[/\\]/, "")        // strip directory
    .replace(/\.(fit|tcx|gpx)\.gz$/i, "")  // strip .fit.gz/.tcx.gz/.gpx.gz
    .replace(/\.gz$/i, "")          // strip .gz
    .replace(/\.(fit|tcx|gpx)$/i, "")      // strip .fit/.tcx/.gpx
    .replace(/_/g, " ")             // underscores to spaces
    .replace(/\b\w/g, c => c.toUpperCase()); // title case
}

/**
 * Import daily metrics from TrainingPeaks metrics CSV.
 * The CSV has a pivoted format: each row is (Timestamp, Type, Value).
 * We group by date and upsert into daily_metrics.
 */
async function importDailyMetricsFromCsv(userId, rows) {
  // Group rows by date
  const byDate = {};
  for (const row of rows) {
    const ts = row.Timestamp || row.timestamp;
    const type = row.Type || row.type;
    const value = row.Value || row.value;
    if (!ts || !type || value == null || value === "") continue;

    const date = ts.split(" ")[0]; // "2025-03-02 06:15:00" → "2025-03-02"
    if (!byDate[date]) byDate[date] = {};

    const num = parseFloat(value);
    switch (type) {
      case "Weight Pounds":
        if (!isNaN(num) && num > 50 && num < 400) byDate[date].weight_kg = Math.round(num * 0.453592 * 10) / 10;
        break;
      case "Pulse":
        if (!isNaN(num) && num > 20 && num < 220) byDate[date].resting_hr_bpm = Math.round(num);
        break;
      case "HRV":
        if (!isNaN(num) && num > 0 && num < 300) byDate[date].hrv_ms = Math.round(num * 10) / 10;
        break;
      case "Sleep Hours":
        if (!isNaN(num) && num > 0 && num < 24) byDate[date].total_sleep_seconds = Math.round(num * 3600);
        break;
      case "Time In Deep Sleep":
        if (!isNaN(num) && num >= 0) byDate[date].deep_sleep_seconds = Math.round(num * 3600);
        break;
      case "Time In REM Sleep":
        if (!isNaN(num) && num >= 0) byDate[date].rem_sleep_seconds = Math.round(num * 3600);
        break;
      case "Time In Light Sleep":
        if (!isNaN(num) && num >= 0) byDate[date].light_sleep_seconds = Math.round(num * 3600);
        break;
      case "SPO2":
        if (!isNaN(num) && num > 50 && num <= 100) byDate[date].blood_oxygen_pct = Math.round(num);
        break;
      case "Percent Fat":
        if (!isNaN(num) && num > 1 && num < 60) byDate[date].body_fat_pct = Math.round(num * 10) / 10;
        break;
      case "Notes":
        // Parse Whoop recovery score from notes like "WHOOP Recovery Score: 51"
        const whoopMatch = String(value).match(/WHOOP Recovery Score:\s*(\d+)/i);
        if (whoopMatch) byDate[date].recovery_score = parseInt(whoopMatch[1], 10);
        break;
    }
  }

  // Upsert each date's metrics
  const dates = Object.keys(byDate).sort();
  for (const date of dates) {
    const metrics = byDate[date];
    if (Object.keys(metrics).length === 0) continue;

    const { data: existing } = await supabaseAdmin
      .from("daily_metrics")
      .select("id, weight_kg, resting_hr_bpm, hrv_ms, total_sleep_seconds, recovery_score")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    if (existing) {
      // Only fill in fields that are currently null (don't overwrite data from Oura/Whoop/EightSleep)
      const updates = {};
      for (const [key, val] of Object.entries(metrics)) {
        if (existing[key] == null) updates[key] = val;
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("daily_metrics").update(updates).eq("id", existing.id);
      }
    } else {
      await supabaseAdmin.from("daily_metrics").insert({ user_id: userId, date, ...metrics });
    }
  }
}

/**
 * Update daily_metrics body weight from CSV data.
 */
async function updateBodyWeightFromCsv(userId, csvRows) {
  for (const row of csvRows) {
    const weight = parseFloat(row.BodyWeight || row.body_weight);
    if (!weight || isNaN(weight) || weight < 20 || weight > 200) continue;

    const date = parseCsvDate(row.WorkoutDay || row.Date || row.date);
    if (!date) continue;

    // Only update if no weight recorded for this date
    const { data: existing } = await supabaseAdmin
      .from("daily_metrics")
      .select("id, weight_kg")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    if (existing && !existing.weight_kg) {
      await supabaseAdmin
        .from("daily_metrics")
        .update({ weight_kg: weight })
        .eq("id", existing.id);
    } else if (!existing) {
      await supabaseAdmin
        .from("daily_metrics")
        .insert({ user_id: userId, date, weight_kg: weight });
    }
  }
}

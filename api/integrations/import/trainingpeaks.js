/**
 * TrainingPeaks file import endpoint.
 * POST /api/integrations/import/trainingpeaks
 *
 * Receives a Supabase Storage path to a ZIP of .FIT files (and optional
 * base64 CSV workout summary), processes each file, computes metrics,
 * deduplicates against existing Strava activities, and returns import stats.
 */
import AdmZip from "adm-zip";
import { parse as csvParse } from "csv-parse/sync";
import { parseFitFile } from "../../_lib/fit.js";
import { computeActivityMetrics } from "../../_lib/metrics.js";
import { updateDailyMetrics, updatePowerProfile } from "../../_lib/training-load.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { analyzeActivity } from "../../_lib/ai.js";

export const config = {
  maxDuration: 300, // 5 minutes for large imports
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { zipPath, csvData } = req.body || {};
    if (!zipPath) return res.status(400).json({ error: "Missing zipPath" });

    // 1. Download ZIP from Supabase Storage
    const { data: zipBlob, error: dlError } = await supabaseAdmin.storage
      .from("import-files")
      .download(zipPath);

    if (dlError || !zipBlob) {
      return res.status(400).json({ error: `Failed to download ZIP: ${dlError?.message || "not found"}` });
    }

    const zipBuffer = Buffer.from(await zipBlob.arrayBuffer());

    // 2. Extract ZIP and filter to .FIT files
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries().filter(e =>
      !e.isDirectory && e.entryName.toLowerCase().endsWith(".fit")
    );

    if (entries.length === 0) {
      return res.status(400).json({ error: "ZIP contains no .FIT files" });
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

    // 4. Get user profile for FTP
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts, weight_kg")
      .eq("id", session.userId)
      .single();

    const ftp = profile?.ftp_watts || null;
    const weightKg = profile?.weight_kg || null;

    // 5. Load existing activities for dedup
    const { data: existingActivities } = await supabaseAdmin
      .from("activities")
      .select("id, source, source_id, started_at, duration_seconds, name, description, source_data")
      .eq("user_id", session.userId);

    const existing = existingActivities || [];

    // 6. Process each FIT file
    const results = { imported: 0, merged: 0, skipped: 0, failed: 0, errors: [], total: entries.length };

    for (const entry of entries) {
      try {
        const fitBuffer = entry.getData();
        const { metadata, streams } = parseFitFile(fitBuffer, entry.entryName);

        // 6a. Compute metrics from streams
        const hasWatts = streams.watts?.data?.length > 0 && streams.watts.data.some(w => w > 0);
        const metrics = hasWatts
          ? computeActivityMetrics(streams, metadata.duration_seconds, ftp)
          : {};

        // 6b. Check for duplicate
        const duplicate = findDuplicate(existing, metadata.started_at, metadata.duration_seconds, metadata.source_id);

        if (duplicate && duplicate.source === "trainingpeaks") {
          results.skipped++;
          continue;
        }

        // 6c. Match CSV row for metadata enrichment
        const csvMatch = matchCsvRow(csvRows, metadata.started_at);

        if (duplicate && duplicate.source !== "trainingpeaks") {
          // MERGE: enrich existing activity with TP metadata
          const mergeData = {};
          const existingSourceData = duplicate.source_data || {};

          if (csvMatch) {
            // Add TP metadata to source_data
            mergeData.source_data = {
              ...existingSourceData,
              trainingpeaks: {
                rpe: csvMatch.rpe,
                coach_comments: csvMatch.comments,
                notes: csvMatch.notes,
                planned_workout: csvMatch.planned_workout,
                imported_from: entry.entryName,
              },
            };

            // Enrich description if the existing one is empty
            if (csvMatch.description && !duplicate.description) {
              mergeData.description = csvMatch.description;
            }
            // Add title if existing name is generic
            if (csvMatch.title && duplicate.name && (
              duplicate.name === "Morning Ride" || duplicate.name === "Afternoon Ride" ||
              duplicate.name === "Evening Ride" || duplicate.name === "Lunch Ride"
            )) {
              mergeData.name = csvMatch.title;
            }
          } else {
            mergeData.source_data = {
              ...existingSourceData,
              trainingpeaks: { imported_from: entry.entryName },
            };
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
          temperature_celsius: metadata.avg_temperature ?? null,
          zone_distribution: metrics.zone_distribution ?? null,
          power_curve: metrics.power_curve ?? null,
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

        // 6h. AI analysis for recent activities only (fire-and-forget)
        const activityAge = Date.now() - new Date(metadata.started_at).getTime();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (upserted?.id && activityAge < thirtyDaysMs) {
          analyzeActivity(session.userId, upserted.id).catch(err =>
            console.error(`AI analysis failed for TP activity ${upserted.id}:`, err.message)
          );
        }

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({ file: entry.entryName, error: err.message });
        console.error(`Failed to process ${entry.entryName}:`, err.message);
      }
    }

    // 7. Update body weight from CSV if available
    if (csvRows.length > 0) {
      await updateBodyWeightFromCsv(session.userId, csvRows);
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
        },
      },
    }, { onConflict: "user_id,provider" });

    // 9. Clean up uploaded ZIP from storage
    await supabaseAdmin.storage.from("import-files").remove([zipPath]).catch(() => {});

    return res.status(200).json(results);
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
    .replace(/^.*[/\\]/, "") // strip directory
    .replace(/\.fit$/i, "")  // strip extension
    .replace(/_/g, " ")      // underscores to spaces
    .replace(/\b\w/g, c => c.toUpperCase()); // title case
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

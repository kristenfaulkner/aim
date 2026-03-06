import { verifySession, cors } from "../../_lib/auth.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import { getWhoopToken, fetchWhoopData, mapWhoopToMetrics, extractWhoopExtended } from "../../_lib/whoop.js";
import { refreshAthleteAnalytics } from "../../_lib/athlete-analytics.js";

/**
 * Sync a single day of Whoop data into daily_metrics.
 * Uses selective merge — only updates fields Whoop provides,
 * preserving fields set by other sources.
 */
async function syncDay(userId, date, whoopData, timezone) {
  const mapped = mapWhoopToMetrics(date, whoopData, timezone);
  if (!mapped) return null;

  const extended = extractWhoopExtended(date, whoopData);

  // Check for existing row to merge source_data
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, source_data")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const sourceData = {
    ...(existing?.source_data || {}),
    whoop_extended: extended,
  };

  // Tag HR fields with Whoop as source
  const hrSourceFields = {};
  if (mapped.resting_hr_bpm != null) hrSourceFields.rhr_source = 'whoop';
  if (mapped.hrv_ms != null) hrSourceFields.hrv_source = 'whoop';
  if (mapped.total_sleep_seconds != null) hrSourceFields.sleep_hr_source = 'whoop';

  if (existing) {
    await supabaseAdmin
      .from("daily_metrics")
      .update({ ...mapped, ...hrSourceFields, source_data: sourceData })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("daily_metrics")
      .insert({ user_id: userId, date, ...mapped, ...hrSourceFields, source_data: sourceData });
  }

  return { date, recovery_score: mapped.recovery_score, sleep_score: mapped.sleep_score };
}

/**
 * Full Whoop sync: fetch recovery, sleep, and body measurement data
 * for a date range and upsert into daily_metrics.
 */
export async function fullWhoopSync(userId, days = 7) {
  const tokenResult = await getWhoopToken(userId);
  if (!tokenResult) throw new Error("Whoop not connected or token refresh failed");

  const { accessToken, integration } = tokenResult;

  // Mark as syncing
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("id", integration.id);

  const syncStartedAt = new Date().toISOString();

  // Calculate date range
  const endDate = new Date().toISOString().split("T")[0];
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - days);
  const startDate = startDateObj.toISOString().split("T")[0];

  // Get user timezone for local bed/wake times
  const { data: tzProfile } = await supabaseAdmin
    .from("profiles").select("timezone").eq("id", userId).single();
  const timezone = tzProfile?.timezone || "America/New_York";

  try {
    // Fetch all data for the range in one batch
    const whoopData = await fetchWhoopData(accessToken, startDate, endDate);

    // Collect all unique dates from recovery and sleep data
    const dates = new Set();
    for (const r of whoopData.recovery) {
      if (r.created_at) dates.add(r.created_at.slice(0, 10));
    }
    for (const s of whoopData.sleep) {
      if (s.end) dates.add(s.end.slice(0, 10));
    }

    const results = [];
    const errors = [];

    for (const date of [...dates].sort()) {
      try {
        const result = await syncDay(userId, date, whoopData, timezone);
        if (result) results.push(result);
      } catch (err) {
        errors.push({ date, error: err.message });
      }
    }

    // Update profile weight from Whoop only if no weight exists yet
    // (Withings and manual input take priority over Whoop)
    if (whoopData.body?.weight_kilogram != null) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("weight_kg")
        .eq("id", userId)
        .single();
      if (!profile?.weight_kg) {
        await supabaseAdmin
          .from("profiles")
          .update({ weight_kg: whoopData.body.weight_kilogram })
          .eq("id", userId);
      }
    }

    // Update sync metadata
    await supabaseAdmin
      .from("integrations")
      .update({
        last_sync_at: syncStartedAt,
        sync_status: errors.length > 0 ? "partial" : "success",
        sync_error: errors.length > 0 ? `${errors.length} day(s) failed` : null,
      })
      .eq("id", integration.id);

    // Refresh cached athlete analytics (models, correlations) in background
    if (results.length > 0) {
      refreshAthleteAnalytics(userId).catch(() => {});
    }

    return { results, errors };
  } catch (err) {
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: err.message })
      .eq("id", integration.id);
    throw err;
  }
}

/**
 * POST /api/integrations/sync/whoop?days=7
 * Sync recent Whoop data (recovery, sleep, body measurements).
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = Math.min(parseInt(req.query.days) || 7, 365);

  try {
    const { results, errors } = await fullWhoopSync(session.userId, days);
    return res.status(200).json({
      synced: results.length,
      failed: errors.length,
      days,
      nights: results.map(r => ({ date: r.date, recovery_score: r.recovery_score, sleep_score: r.sleep_score })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

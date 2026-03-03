import { verifySession, cors } from "../../_lib/auth.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import { getOuraToken, fetchOuraData, mapOuraToMetrics, extractOuraExtended } from "../../_lib/oura.js";

/**
 * Sync a single day of Oura data into daily_metrics.
 * Uses selective merge — only updates fields Oura provides,
 * preserving fields set by other sources (Strava TSS, Eight Sleep, etc.).
 */
async function syncDay(userId, date, ouraData) {
  const mapped = mapOuraToMetrics(date, ouraData);
  if (!mapped) return null;

  const extended = extractOuraExtended(date, ouraData);

  // Check for existing row to merge source_data
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, source_data")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const sourceData = {
    ...(existing?.source_data || {}),
    oura_extended: extended,
  };

  if (existing) {
    await supabaseAdmin
      .from("daily_metrics")
      .update({ ...mapped, source_data: sourceData })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("daily_metrics")
      .insert({ user_id: userId, date, ...mapped, source_data: sourceData });
  }

  return { date, sleep_score: mapped.sleep_score, readiness_score: mapped.readiness_score };
}

/**
 * Full Oura sync: fetch sleep, readiness, activity, and SpO2 data
 * for a date range and upsert into daily_metrics.
 */
export async function fullOuraSync(userId, days = 7) {
  const tokenResult = await getOuraToken(userId);
  if (!tokenResult) throw new Error("Oura not connected or token refresh failed");

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

  try {
    // Fetch all data for the range in one batch (more efficient than per-day)
    const ouraData = await fetchOuraData(accessToken, startDate, endDate);

    // Collect all unique dates from the data
    const dates = new Set();
    for (const arr of [ouraData.sleep, ouraData.dailySleep, ouraData.readiness, ouraData.activity, ouraData.spo2]) {
      for (const item of arr) {
        if (item.day) dates.add(item.day);
        if (item.date) dates.add(item.date);
      }
    }

    const results = [];
    const errors = [];

    for (const date of [...dates].sort()) {
      try {
        const result = await syncDay(userId, date, ouraData);
        if (result) results.push(result);
      } catch (err) {
        errors.push({ date, error: err.message });
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
 * POST /api/integrations/sync/oura?days=7
 * Sync recent Oura data (sleep, readiness, activity, SpO2).
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = Math.min(parseInt(req.query.days) || 7, 365);

  try {
    const { results, errors } = await fullOuraSync(session.userId, days);
    return res.status(200).json({
      synced: results.length,
      failed: errors.length,
      days,
      nights: results.map(r => ({ date: r.date, sleep_score: r.sleep_score, readiness_score: r.readiness_score })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

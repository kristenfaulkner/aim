import { verifySession, cors } from "../../_lib/auth.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import { getWithingsToken, fetchWithingsData, mapWithingsToMetrics, extractWithingsExtended, updateProfileWeight } from "../../_lib/withings.js";

/**
 * Sync a single day of Withings data into daily_metrics.
 * Uses selective merge — only updates fields Withings provides,
 * preserving fields set by other sources.
 */
async function syncDay(userId, date, withingsData) {
  const mapped = mapWithingsToMetrics(date, withingsData);
  if (!mapped) return null;

  const extended = extractWithingsExtended(date, withingsData);

  // Check for existing row to merge source_data
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, source_data")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const sourceData = {
    ...(existing?.source_data || {}),
    withings_extended: extended,
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

  return { date, weight_kg: mapped.weight_kg, sleep_score: mapped.sleep_score };
}

/**
 * Full Withings sync: fetch body measurements, activity, and sleep data
 * for a date range and upsert into daily_metrics.
 */
export async function fullWithingsSync(userId, days = 7) {
  const tokenResult = await getWithingsToken(userId);
  if (!tokenResult) throw new Error("Withings not connected or token refresh failed");

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
    // Fetch all data for the range in one batch
    const withingsData = await fetchWithingsData(accessToken, startDate, endDate);

    // Collect all unique dates from the data
    const dates = new Set();
    for (const grp of withingsData.measurements) {
      if (grp.date) dates.add(new Date(grp.date * 1000).toISOString().split("T")[0]);
    }
    for (const a of withingsData.activity) {
      if (a.date) dates.add(a.date);
    }
    for (const s of withingsData.sleep) {
      if (s.date) dates.add(s.date);
    }

    const results = [];
    const errors = [];

    for (const date of [...dates].sort()) {
      try {
        const result = await syncDay(userId, date, withingsData);
        if (result) results.push(result);
      } catch (err) {
        errors.push({ date, error: err.message });
      }
    }

    // Update profile weight with the most recent weigh-in
    const latestWeight = [...results].reverse().find(r => r.weight_kg != null);
    if (latestWeight) {
      await updateProfileWeight(userId, latestWeight.weight_kg);
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
 * POST /api/integrations/sync/withings?days=7
 * Sync recent Withings data (body comp, activity, sleep).
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = Math.min(parseInt(req.query.days) || 7, 365);

  try {
    const { results, errors } = await fullWithingsSync(session.userId, days);
    return res.status(200).json({
      synced: results.length,
      failed: errors.length,
      days,
      entries: results.map(r => ({ date: r.date, weight_kg: r.weight_kg, sleep_score: r.sleep_score })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

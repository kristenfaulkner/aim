import { verifySession, cors } from "../../_lib/auth.js";
import { supabaseAdmin } from "../../_lib/supabase.js";
import { getEightSleepToken, fetchSleepData, mapEightSleepToMetrics, extractExtendedMetrics } from "../../_lib/eightsleep.js";

/**
 * Sync a single day of Eight Sleep data into daily_metrics.
 * Uses selective merge — only updates fields Eight Sleep provides,
 * preserving fields set by other sources (Strava TSS, Oura recovery, etc.).
 */
async function syncDay(userId, date, accessToken, eightSleepUserId, timezone) {
  const days = await fetchSleepData(accessToken, eightSleepUserId, date, date, timezone);
  if (!days || days.length === 0) return null;

  const dayData = days[0];

  // Skip nights that are still being recorded/processed by Eight Sleep
  // (e.g., bathroom breaks mid-sleep before the night is finalized)
  if (dayData.processing) return null;

  const mapped = mapEightSleepToMetrics(dayData);
  if (!mapped || Object.keys(mapped).length === 0) return null;

  // Extract extended metrics (all scores, HRV details, temp, disruptions, etc.)
  const extended = extractExtendedMetrics(dayData);

  // Check for existing row to merge source_data
  const { data: existing } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, source_data")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const sourceData = {
    ...(existing?.source_data || {}),
    eightsleep: dayData,              // Raw API response
    eightsleep_extended: extended,     // Structured extended metrics
  };

  // Tag HR fields with Eight Sleep as source
  const hrSourceFields = {};
  if (mapped.resting_hr_bpm != null) hrSourceFields.rhr_source = 'eightsleep';
  if (mapped.hrv_ms != null) hrSourceFields.hrv_source = 'eightsleep';
  if (mapped.total_sleep_seconds != null) hrSourceFields.sleep_hr_source = 'eightsleep';

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

  return { date, score: dayData.score };
}

/**
 * Full Eight Sleep sync: fetch sleep data for a date range and upsert into daily_metrics.
 */
export async function fullEightSleepSync(userId, days = 7) {
  const tokenResult = await getEightSleepToken(userId);
  if (!tokenResult) throw new Error("Eight Sleep not connected or token refresh failed");

  const { accessToken, integration } = tokenResult;
  const eightSleepUserId = integration.provider_user_id;
  if (!eightSleepUserId) throw new Error("Missing Eight Sleep user ID");

  // Get user timezone
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  const timezone = profile?.timezone || "America/New_York";

  // Mark as syncing
  await supabaseAdmin
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("id", integration.id);

  const syncStartedAt = new Date().toISOString();
  const results = [];
  const errors = [];

  // Iterate through each day
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    try {
      const result = await syncDay(userId, dateStr, accessToken, eightSleepUserId, timezone);
      if (result) results.push(result);
    } catch (err) {
      errors.push({ date: dateStr, error: err.message });
    }

    // 500ms delay between requests to avoid 429 rate limiting
    if (i < days - 1) {
      await new Promise(r => setTimeout(r, 500));
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
}

/**
 * POST /api/integrations/sync/eightsleep?days=7
 * Sync recent Eight Sleep sleep data.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const days = Math.min(parseInt(req.query.days) || 7, 365);

  try {
    const { results, errors } = await fullEightSleepSync(session.userId, days);
    return res.status(200).json({
      synced: results.length,
      failed: errors.length,
      days,
      nights: results.map(r => ({ date: r.date, score: r.score })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

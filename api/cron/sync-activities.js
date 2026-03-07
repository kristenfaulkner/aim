import { supabaseAdmin } from "../_lib/supabase.js";
import { fullStravaSync } from "../integrations/sync/strava.js";
import { fullWahooSync } from "../integrations/sync/wahoo.js";

export const config = {
  maxDuration: 300, // 5 minutes
};

const PROVIDERS = [
  { name: "strava", syncFn: fullStravaSync },
  { name: "wahoo", syncFn: fullWahooSync },
];

/**
 * GET /api/cron/sync-activities
 * Hourly cron that syncs Strava and Wahoo activities.
 * Catches any activities missed by webhooks.
 * Skips users who have already synced in the last hour.
 */
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const allResults = [];

  for (const { name, syncFn } of PROVIDERS) {
    const { data: integrations, error } = await supabaseAdmin
      .from("integrations")
      .select("user_id, last_sync_at")
      .eq("provider", name)
      .eq("is_active", true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${oneHourAgo}`);

    if (error) {
      allResults.push({ provider: name, error: error.message, synced: 0 });
      continue;
    }

    if (!integrations || integrations.length === 0) {
      allResults.push({ provider: name, skipped: "all recently synced", synced: 0 });
      continue;
    }

    for (const integration of integrations) {
      try {
        const results = await syncFn(integration.user_id);
        allResults.push({
          provider: name,
          userId: integration.user_id,
          synced: Array.isArray(results) ? results.length : results?.results?.length ?? 0,
        });
      } catch (err) {
        allResults.push({
          provider: name,
          userId: integration.user_id,
          synced: 0,
          error: err.message,
        });
        console.error(`[Cron] ${name} sync failed for ${integration.user_id}:`, err.message);
      }
    }
  }

  const totalSynced = allResults.reduce((sum, r) => sum + (r.synced || 0), 0);
  const totalFailed = allResults.filter((r) => r.error).length;

  return res.status(200).json({ totalSynced, totalFailed, results: allResults });
}

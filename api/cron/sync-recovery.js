import { supabaseAdmin } from "../_lib/supabase.js";
import { fullWithingsSync } from "../integrations/sync/withings.js";

export const config = {
  maxDuration: 300, // 5 minutes
};

const PROVIDERS = [
  { name: "withings", syncFn: fullWithingsSync },
];

/**
 * GET /api/cron/sync-recovery
 * Hourly cron that syncs the last 2 days of Withings data.
 * Oura, Whoop, and Eight Sleep sync on-demand when user opens the app.
 * Skips users who have already synced in the last 6 hours.
 */
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const allResults = [];

  for (const { name, syncFn } of PROVIDERS) {
    // Find active integrations that haven't synced recently
    const { data: integrations, error } = await supabaseAdmin
      .from("integrations")
      .select("user_id, last_sync_at")
      .eq("provider", name)
      .eq("is_active", true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${sixHoursAgo}`);

    if (error) {
      allResults.push({ provider: name, error: error.message, synced: 0 });
      continue;
    }

    if (!integrations || integrations.length === 0) {
      allResults.push({ provider: name, skipped: "all", synced: 0 });
      continue;
    }

    for (const integration of integrations) {
      try {
        const { results, errors } = await syncFn(integration.user_id, 2);
        allResults.push({
          provider: name,
          userId: integration.user_id,
          synced: results.length,
          failed: errors.length,
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
  const totalFailed = allResults.filter(r => r.error).length;

  return res.status(200).json({
    totalSynced,
    totalFailed,
    results: allResults,
  });
}

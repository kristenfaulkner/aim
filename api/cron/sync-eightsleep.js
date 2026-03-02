import { supabaseAdmin } from "../_lib/supabase.js";
import { fullEightSleepSync } from "../integrations/sync/eightsleep.js";

export const config = {
  maxDuration: 300, // 5 minutes — enough for many users
};

/**
 * GET /api/cron/sync-eightsleep
 * Hourly cron that syncs the last 2 days of Eight Sleep data.
 * Skips users who have already synced in the last 6 hours
 * so the first run after wake-up does the work and subsequent
 * runs are instant no-ops.
 */
export default async function handler(req, res) {
  // Verify this is a legitimate Vercel Cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Find active Eight Sleep integrations that haven't synced in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: integrations, error } = await supabaseAdmin
      .from("integrations")
      .select("user_id, last_sync_at")
      .eq("provider", "eightsleep")
      .eq("is_active", true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${sixHoursAgo}`);

    if (error) throw error;
    if (!integrations || integrations.length === 0) {
      return res.status(200).json({ message: "All users already synced recently", synced: 0, skipped: "all" });
    }

    const results = [];

    for (const integration of integrations) {
      try {
        const { results: nights, errors } = await fullEightSleepSync(integration.user_id, 2);
        results.push({
          userId: integration.user_id,
          synced: nights.length,
          failed: errors.length,
        });
      } catch (err) {
        results.push({
          userId: integration.user_id,
          synced: 0,
          error: err.message,
        });
        console.error(`Eight Sleep cron sync failed for ${integration.user_id}:`, err.message);
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + (r.synced || 0), 0);
    const totalFailed = results.filter(r => r.error).length;

    return res.status(200).json({
      users: integrations.length,
      totalSynced,
      totalFailed,
      results,
    });
  } catch (err) {
    console.error("Eight Sleep cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}

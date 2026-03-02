import { supabaseAdmin } from "../_lib/supabase.js";
import { fullEightSleepSync } from "../integrations/sync/eightsleep.js";

export const config = {
  maxDuration: 300, // 5 minutes — enough for many users
};

/**
 * GET /api/cron/sync-eightsleep
 * Daily cron job that syncs the last 2 days of Eight Sleep data
 * for all users with active Eight Sleep integrations.
 *
 * Syncs 2 days (not 1) to catch late-arriving sleep data
 * (e.g. sleep sessions that end after midnight).
 */
export default async function handler(req, res) {
  // Verify this is a legitimate Vercel Cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Find all active Eight Sleep integrations
    const { data: integrations, error } = await supabaseAdmin
      .from("integrations")
      .select("user_id")
      .eq("provider", "eightsleep")
      .eq("is_active", true);

    if (error) throw error;
    if (!integrations || integrations.length === 0) {
      return res.status(200).json({ message: "No active Eight Sleep integrations", synced: 0 });
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

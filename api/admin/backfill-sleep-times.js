import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { getUserTimezone } from "../_lib/date-utils.js";

/**
 * POST /api/admin/backfill-sleep-times
 *
 * Re-extract sleep_onset_time and wake_time from stored source_data
 * using the user's correct local timezone. Fixes data that was previously
 * stored in UTC due to Vercel's server timezone.
 *
 * Sources with raw timestamps in source_data:
 *   - Eight Sleep: source_data.eightsleep.presenceStart/End
 *   - Withings: source_data.withings_extended.startdate/enddate (epoch seconds)
 *   - Garmin: source_data.garmin_extended.sleep_start/sleep_end (epoch seconds)
 *
 * For Oura and Whoop, raw sleep timestamps aren't stored in extended data,
 * so a full re-sync (disconnect/reconnect or manual trigger) is needed.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const timezone = await getUserTimezone(supabaseAdmin, session.userId);

  // Fetch all daily_metrics with source_data for this user
  const { data: rows, error } = await supabaseAdmin
    .from("daily_metrics")
    .select("id, date, sleep_onset_time, wake_time, source_data")
    .eq("user_id", session.userId)
    .not("source_data", "is", null)
    .order("date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  let updated = 0;
  let skipped = 0;

  for (const row of rows || []) {
    const sd = row.source_data;
    let newOnset = null;
    let newWake = null;

    // Eight Sleep: source_data.eightsleep.presenceStart/End (ISO timestamps)
    if (sd.eightsleep?.presenceStart) {
      newOnset = toLocalTimeISO(sd.eightsleep.presenceStart, timezone);
    }
    if (sd.eightsleep?.presenceEnd) {
      newWake = toLocalTimeISO(sd.eightsleep.presenceEnd, timezone);
    }

    // Withings: source_data.withings_extended.startdate/enddate (epoch seconds)
    if (!newOnset && sd.withings_extended?.startdate) {
      newOnset = toLocalTimeEpoch(sd.withings_extended.startdate, timezone);
    }
    if (!newWake && sd.withings_extended?.enddate) {
      newWake = toLocalTimeEpoch(sd.withings_extended.enddate, timezone);
    }

    // Garmin: source_data.garmin_extended.sleep_start (epoch seconds)
    if (!newOnset && sd.garmin_extended?.sleep_start) {
      newOnset = toLocalTimeEpoch(sd.garmin_extended.sleep_start, timezone);
    }

    // Skip if we couldn't extract new times
    if (!newOnset && !newWake) {
      skipped++;
      continue;
    }

    // Only update if the value actually changed
    const changes = {};
    if (newOnset && newOnset !== row.sleep_onset_time) changes.sleep_onset_time = newOnset;
    if (newWake && newWake !== row.wake_time) changes.wake_time = newWake;

    if (Object.keys(changes).length > 0) {
      await supabaseAdmin.from("daily_metrics").update(changes).eq("id", row.id);
      updated++;
    } else {
      skipped++;
    }
  }

  return res.status(200).json({
    updated,
    skipped,
    total: (rows || []).length,
    timezone,
    note: "Oura and Whoop timestamps are not stored in source_data — re-sync those integrations to fix their bed/wake times.",
  });
}

function toLocalTimeISO(isoTimestamp, timezone) {
  try {
    return new Date(isoTimestamp).toLocaleTimeString("en-GB", { timeZone: timezone, hour12: false });
  } catch {
    return null;
  }
}

function toLocalTimeEpoch(epochSeconds, timezone) {
  try {
    return new Date(epochSeconds * 1000).toLocaleTimeString("en-GB", { timeZone: timezone, hour12: false });
  } catch {
    return null;
  }
}

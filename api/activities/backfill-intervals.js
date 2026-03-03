/**
 * Backfill interval extraction for existing activities.
 *
 * POST /api/activities/backfill-intervals
 *
 * Finds activities with power data but no laps, re-fetches streams from
 * Strava (or uses stored source_data), and runs interval detection.
 * Processes up to 50 activities per call.
 */
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { buildLapsPayload } from "../_lib/intervals.js";
import { getStravaToken, stravaFetch } from "../_lib/strava.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userId = session.userId;

    // Get user FTP
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts")
      .eq("id", userId)
      .single();

    const ftp = profile?.ftp_watts;
    if (!ftp) {
      return res.status(200).json({ processed: 0, message: "No FTP set — cannot detect intervals" });
    }

    // Find activities with power data but no laps (limit 50 per batch)
    const { data: activities } = await supabaseAdmin
      .from("activities")
      .select("id, source, source_id, avg_power_watts, started_at")
      .eq("user_id", userId)
      .not("avg_power_watts", "is", null)
      .is("laps", null)
      .order("started_at", { ascending: false })
      .limit(50);

    if (!activities?.length) {
      return res.status(200).json({ processed: 0, message: "No activities need interval backfill" });
    }

    // Try to get Strava token for stream re-fetch
    let accessToken = null;
    try {
      const tokenData = await getStravaToken(userId);
      accessToken = tokenData?.accessToken;
    } catch {
      // No Strava token — can only process activities with stored streams
    }

    let processed = 0;
    let failed = 0;

    for (const activity of activities) {
      try {
        let streams = null;

        // Re-fetch streams from Strava if available
        if (accessToken && activity.source === "strava" && activity.source_id) {
          try {
            const streamData = await stravaFetch(
              accessToken,
              `/activities/${activity.source_id}/streams?keys=watts,heartrate,cadence,altitude,time&key_by_type=true`
            );
            streams = {};
            if (Array.isArray(streamData)) {
              for (const s of streamData) streams[s.type] = s;
            } else {
              streams = streamData;
            }
          } catch {
            // Stream fetch failed — skip this activity
            continue;
          }
        }

        if (!streams?.watts) continue;

        const lapsPayload = buildLapsPayload(streams, ftp);
        if (!lapsPayload) continue;

        await supabaseAdmin
          .from("activities")
          .update({ laps: lapsPayload })
          .eq("id", activity.id);

        processed++;
      } catch (err) {
        failed++;
        console.error(`Interval backfill failed for ${activity.id}:`, err.message);
      }
    }

    return res.status(200).json({ processed, failed, total: activities.length });
  } catch (err) {
    console.error("Backfill intervals error:", err);
    return res.status(500).json({ error: err.message });
  }
}

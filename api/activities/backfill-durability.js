import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { stravaFetch, refreshStravaToken } from "../_lib/strava.js";
import { computeDurabilityData } from "../_lib/durability.js";

/**
 * POST /api/activities/backfill-durability
 * Recomputes durability data for activities that have power data but no durability_data.
 * Re-fetches Strava streams since raw streams aren't stored.
 * Processes up to 50 activities per call.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  // Get user profile for weight
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("weight_kg")
    .eq("id", session.userId)
    .single();

  if (!profile?.weight_kg) {
    return res.status(400).json({ error: "Weight required for durability computation. Set it in Settings." });
  }

  // Get Strava integration for stream fetching
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", session.userId)
    .eq("provider", "strava")
    .single();

  if (!integration) {
    return res.status(400).json({ error: "Strava connection required for durability backfill" });
  }

  // Find activities with power data but no durability_data (Strava source)
  const { data: activities } = await supabaseAdmin
    .from("activities")
    .select("id, source_id, avg_power_watts, duration_seconds")
    .eq("user_id", session.userId)
    .eq("source", "strava")
    .not("avg_power_watts", "is", null)
    .is("durability_data", null)
    .gte("duration_seconds", 1800) // at least 30 min
    .order("started_at", { ascending: false })
    .limit(50);

  if (!activities || activities.length === 0) {
    return res.status(200).json({ processed: 0, failed: 0, message: "No activities to backfill" });
  }

  let tokenData;
  try {
    tokenData = await refreshStravaToken(integration);
  } catch {
    return res.status(400).json({ error: "Failed to refresh Strava token" });
  }

  let processed = 0;
  let failed = 0;

  for (const activity of activities) {
    try {
      // Fetch power + time streams from Strava
      const streamData = await stravaFetch(
        tokenData.accessToken,
        `/activities/${activity.source_id}/streams?keys=watts,time&key_by_type=true`
      );

      let streams = {};
      if (Array.isArray(streamData)) {
        for (const s of streamData) streams[s.type] = s;
      } else {
        streams = streamData;
      }

      if (!streams.watts?.data) {
        failed++;
        continue;
      }

      const sampleRate = streams.time?.data?.length > 1
        ? (streams.time.data[streams.time.data.length - 1] - streams.time.data[0]) / (streams.time.data.length - 1)
        : 1;

      const durabilityData = computeDurabilityData(
        streams.watts.data,
        streams.time?.data,
        profile.weight_kg,
        sampleRate
      );

      if (durabilityData) {
        await supabaseAdmin
          .from("activities")
          .update({ durability_data: durabilityData })
          .eq("id", activity.id);
        processed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`Durability backfill failed for ${activity.id}:`, err.message);
      failed++;
    }
  }

  return res.status(200).json({
    processed,
    failed,
    remaining: activities.length - processed - failed,
    message: processed > 0 ? `Computed durability for ${processed} activities` : "No activities processed",
  });
}

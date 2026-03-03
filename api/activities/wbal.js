import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { stravaFetch, refreshStravaToken } from "../_lib/strava.js";
import { computeWbalStream } from "../_lib/wbal.js";

/**
 * GET /api/activities/wbal?id=<uuid>
 * Returns W'bal stream + summary for a single activity.
 * Separate from detail.js to avoid bloating every detail load with ~70KB stream data.
 * Lazy-loaded only when user views the W'bal chart.
 *
 * If wbal_data is already stored, returns it directly.
 * Otherwise, fetches streams from Strava and computes on demand.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const activityId = req.query.id;
  if (!activityId) return res.status(400).json({ error: "Activity ID required" });

  // Fetch activity with existing wbal_data
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("id, source, source_id, avg_power_watts, duration_seconds, wbal_data, wbal_min_pct, wbal_empty_events")
    .eq("id", activityId)
    .eq("user_id", session.userId)
    .single();

  if (!activity) return res.status(404).json({ error: "Activity not found" });

  // Return cached data if available
  if (activity.wbal_data) {
    return res.status(200).json(activity.wbal_data);
  }

  // Need power data
  if (!activity.avg_power_watts) {
    return res.status(400).json({ error: "No power data for this activity" });
  }

  // Need CP model
  const { data: powerProfile } = await supabaseAdmin
    .from("power_profiles")
    .select("cp_watts, w_prime_kj")
    .eq("user_id", session.userId)
    .order("computed_date", { ascending: false })
    .limit(1)
    .single();

  if (!powerProfile?.cp_watts || !powerProfile?.w_prime_kj) {
    return res.status(400).json({ error: "CP model required. Sync more activities with power data." });
  }

  // Only Strava activities have stream access
  if (activity.source !== "strava") {
    return res.status(400).json({ error: "W'bal requires power stream data (Strava only)" });
  }

  // Fetch Strava integration
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", session.userId)
    .eq("provider", "strava")
    .single();

  if (!integration) {
    return res.status(400).json({ error: "Strava connection required" });
  }

  try {
    const tokenData = await refreshStravaToken(integration);

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
      return res.status(400).json({ error: "No power stream available from Strava" });
    }

    const wPrimeJ = powerProfile.w_prime_kj * 1000;
    const result = computeWbalStream(
      streams.watts.data,
      streams.time?.data,
      powerProfile.cp_watts,
      wPrimeJ
    );

    if (!result) {
      return res.status(400).json({ error: "Insufficient data for W'bal computation" });
    }

    // Store for future requests
    await supabaseAdmin
      .from("activities")
      .update({
        wbal_data: result,
        wbal_min_pct: result.summary.min_wbal_pct,
        wbal_empty_events: result.summary.empty_tank_events,
      })
      .eq("id", activity.id);

    return res.status(200).json(result);
  } catch (err) {
    console.error(`W'bal computation failed for ${activityId}:`, err.message);
    return res.status(500).json({ error: "Failed to compute W'bal" });
  }
}

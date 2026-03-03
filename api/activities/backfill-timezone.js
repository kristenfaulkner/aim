/**
 * POST /api/activities/backfill-timezone
 * Retroactively populate timezone_iana, start_time_local, start_lat, start_lng
 * for existing activities that don't have them yet.
 *
 * Processes up to 50 activities per call. Returns { processed, remaining }.
 */
import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { resolveActivityTimezone, parseStravaTimezone } from "../_lib/timezone.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const limit = Math.min(parseInt(req.query?.limit) || 50, 100);

  try {
    // Get user profile timezone as fallback
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("timezone")
      .eq("id", session.userId)
      .single();

    const fallbackTz = profile?.timezone || "America/Los_Angeles";

    // Fetch activities missing timezone
    const { data: activities, error } = await supabaseAdmin
      .from("activities")
      .select("id, started_at, source, source_data, start_lat, start_lng")
      .eq("user_id", session.userId)
      .is("timezone_iana", null)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!activities || activities.length === 0) {
      return res.status(200).json({ processed: 0, remaining: 0 });
    }

    let processed = 0;

    for (const act of activities) {
      let lat = act.start_lat;
      let lng = act.start_lng;
      let stravaLocalTime = null;

      // Try to extract GPS and timezone from source_data
      if (act.source === "strava" && act.source_data) {
        const sd = act.source_data;
        // Strava stores start_latlng as [lat, lng]
        if (!lat && sd.start_latlng?.length === 2) {
          lat = sd.start_latlng[0];
          lng = sd.start_latlng[1];
        }
        // Strava provides pre-computed local time
        if (sd.start_date_local) {
          stravaLocalTime = sd.start_date_local;
        }
        // Strava provides timezone string
        if (sd.timezone && !lat) {
          // If no GPS, at least use Strava's timezone
          const ianaTz = parseStravaTimezone(sd.timezone);
          if (ianaTz) {
            const tz = resolveActivityTimezone(act.started_at, null, null, ianaTz);
            await supabaseAdmin.from("activities").update({
              timezone_iana: tz.timezone_iana,
              start_time_local: stravaLocalTime || tz.start_time_local,
            }).eq("id", act.id);
            processed++;
            continue;
          }
        }
      }

      // Resolve timezone
      const tz = resolveActivityTimezone(act.started_at, lat, lng, fallbackTz);

      const updates = {
        timezone_iana: tz.timezone_iana,
        start_time_local: stravaLocalTime || tz.start_time_local,
      };

      // Also populate start_lat/lng if we extracted them from source_data
      if (lat != null && act.start_lat == null) updates.start_lat = lat;
      if (lng != null && act.start_lng == null) updates.start_lng = lng;

      await supabaseAdmin.from("activities").update(updates).eq("id", act.id);
      processed++;
    }

    // Count remaining
    const { count } = await supabaseAdmin
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .is("timezone_iana", null);

    return res.status(200).json({ processed, remaining: count || 0 });
  } catch (err) {
    console.error("Backfill timezone error:", err);
    return res.status(500).json({ error: err.message });
  }
}

import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { haversineDistance } from "../_lib/travel.js";

const TRAVEL_DISTANCE_MIN_KM = 200;

/**
 * Compute timezone offset difference in hours between two IANA timezones.
 */
function getTimezoneShiftHours(tz1, tz2) {
  if (!tz1 || !tz2) return 0;
  try {
    const now = new Date();
    const fmt = (tz) => {
      const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
      const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      return (local - utc) / 60000;
    };
    return (fmt(tz1) - fmt(tz2)) / 60;
  } catch {
    return 0;
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  const { userId } = session;

  const { lat, lng, timezone } = req.body || {};
  if (lat == null || lng == null) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    // Fetch stored profile location
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("location_lat, location_lng, timezone")
      .eq("id", userId)
      .single();

    const storedLat = profile?.location_lat;
    const storedLng = profile?.location_lng;
    const storedTz = profile?.timezone;

    // First time — just store location, no travel event
    if (storedLat == null || storedLng == null) {
      await supabaseAdmin
        .from("profiles")
        .update({ location_lat: lat, location_lng: lng })
        .eq("id", userId);
      return res.status(200).json({ travelDetected: false });
    }

    const distance = haversineDistance(storedLat, storedLng, lat, lng);

    // Local movement — update location silently
    if (distance < TRAVEL_DISTANCE_MIN_KM) {
      await supabaseAdmin
        .from("profiles")
        .update({ location_lat: lat, location_lng: lng })
        .eq("id", userId);
      return res.status(200).json({ travelDetected: false });
    }

    // Significant travel detected — create event
    const tzShift = getTimezoneShiftHours(timezone, storedTz);
    const distanceRounded = Math.round(distance * 10) / 10;

    const eventData = {
      user_id: userId,
      origin_lat: storedLat,
      origin_lng: storedLng,
      origin_timezone: storedTz || null,
      dest_lat: lat,
      dest_lng: lng,
      dest_timezone: timezone || null,
      distance_km: distanceRounded,
      timezone_shift_hours: tzShift,
      altitude_change_m: null,
      travel_type: "unknown",
    };

    const { data: event, error: insertError } = await supabaseAdmin
      .from("travel_events")
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error("Travel event insert error:", insertError);
      return res.status(500).json({ error: "Failed to create travel event" });
    }

    // Update profile location to new destination
    await supabaseAdmin
      .from("profiles")
      .update({ location_lat: lat, location_lng: lng })
      .eq("id", userId);

    return res.status(200).json({ travelDetected: true, event });
  } catch (err) {
    console.error("detect-travel error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

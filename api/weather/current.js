import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { localDate, getUserTimezone } from "../_lib/date-utils.js";

const WEATHER_CODES = {
  0: "Clear",
  1: "Partly Cloudy",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Foggy",
  51: "Rain",
  53: "Rain",
  55: "Rain",
  56: "Rain",
  57: "Rain",
  61: "Rain",
  63: "Rain",
  65: "Rain",
  66: "Rain",
  67: "Rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  77: "Snow",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Rain Showers",
  85: "Snow",
  86: "Snow",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    let { lat, lng } = req.query;

    // Fall back to user profile location
    if (!lat || !lng) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("location_lat, location_lng, timezone")
        .eq("id", session.userId)
        .single();

      if (profile) {
        lat = lat || profile.location_lat;
        lng = lng || profile.location_lng;
      }
    }

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ error: "Location required (lat/lng query params or profile location)" });
    }

    const includeForecast = req.query.forecast === "true";

    const dailyParams = includeForecast
      ? "&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max,weather_code,uv_index_max&forecast_days=7"
      : "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto${dailyParams}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: "Weather API request failed" });
    }

    const data = await resp.json();
    const current = data.current;

    const weather = {
      temp_f: current.temperature_2m,
      humidity_pct: current.relative_humidity_2m,
      wind_mph: current.wind_speed_10m,
      conditions: WEATHER_CODES[current.weather_code] || "Unknown",
      uv_index: current.uv_index,
    };

    if (includeForecast && data.daily?.time) {
      weather.forecast = data.daily.time.map((date, i) => ({
        date,
        temp_max_f: data.daily.temperature_2m_max?.[i],
        temp_min_f: data.daily.temperature_2m_min?.[i],
        apparent_max_f: data.daily.apparent_temperature_max?.[i],
        apparent_min_f: data.daily.apparent_temperature_min?.[i],
        precip_mm: data.daily.precipitation_sum?.[i],
        wind_max_mph: data.daily.wind_speed_10m_max?.[i],
        conditions: WEATHER_CODES[data.daily.weather_code?.[i]] || "Unknown",
        uv_index_max: data.daily.uv_index_max?.[i],
      }));
    }

    // Cache in daily_metrics for today (using user's local date)
    const tz = await getUserTimezone(supabaseAdmin, session.userId);
    const today = localDate(tz);
    await supabaseAdmin.from("daily_metrics").upsert(
      {
        user_id: session.userId,
        date: today,
        weather_data: weather,
      },
      { onConflict: "user_id,date" }
    );

    return res.status(200).json(weather);
  } catch (err) {
    console.error("Weather error:", err);
    return res.status(500).json({ error: "Failed to fetch weather" });
  }
}

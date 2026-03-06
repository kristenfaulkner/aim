/**
 * Backfill tags and weather for existing activities.
 *
 * POST /api/activities/backfill-intervals
 *
 * Processes up to 50 activities per call. Call repeatedly until processed === 0.
 */
import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import { detectAllTags, persistTags } from "../_lib/tags.js";
import { fetchActivityWeather, extractLocationFromActivity } from "../_lib/weather-enrich.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userId = session.userId;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts, weight_kg")
      .eq("id", userId)
      .single();

    const ftp = profile?.ftp_watts;

    let tagsProcessed = 0;
    let weatherProcessed = 0;
    let failed = 0;

    // ── Tag detection + weather enrichment (activities with no tags) ──
    {
      // Find activities that have no tags yet
      const { data: allActivities } = await supabaseAdmin
        .from("activities")
        .select("id, activity_type, started_at, duration_seconds, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, hr_drift_pct, variability_index, avg_hr_bpm, avg_cadence_rpm, work_kj, temperature_celsius, activity_weather, laps, source_data, elevation_gain_meters")
        .eq("user_id", userId)
        .not("avg_power_watts", "is", null)
        .order("started_at", { ascending: false })
        .limit(200);

      if (allActivities?.length) {
        // Get existing tagged activity IDs
        const { data: existingTags } = await supabaseAdmin
          .from("activity_tags")
          .select("activity_id")
          .eq("user_id", userId);

        const taggedIds = new Set((existingTags || []).map(t => t.activity_id));

        // Filter to untagged activities
        const untagged = allActivities.filter(a => !taggedIds.has(a.id));

        // Get daily_metrics for context (sleep, HRV for readiness tags)
        const { data: dailyMetrics } = await supabaseAdmin
          .from("daily_metrics")
          .select("date, hrv_ms, hrv_overnight_avg_ms, sleep_score, total_sleep_seconds")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(365);

        const metricsByDate = {};
        for (const dm of (dailyMetrics || [])) {
          if (dm.date) metricsByDate[dm.date] = dm;
        }

        for (const activity of untagged.slice(0, 50)) {
          try {
            const actDate = activity.started_at?.split("T")[0];
            const dm = actDate ? metricsByDate[actDate] : null;

            const tags = detectAllTags(activity, dm, activity.activity_weather, ftp);
            if (tags.length > 0) {
              await persistTags(supabaseAdmin, activity.id, userId, tags);
              tagsProcessed++;
            }

            // Weather enrichment if missing
            if (!activity.activity_weather) {
              const location = extractLocationFromActivity(activity);
              if (location && activity.started_at) {
                try {
                  const weather = await fetchActivityWeather(activity.started_at, location.lat, location.lng);
                  if (weather) {
                    await supabaseAdmin.from("activities").update({ activity_weather: weather }).eq("id", activity.id);
                    weatherProcessed++;

                    // Re-run tags with weather context (may detect hot/cold/wind tags)
                    const weatherTags = detectAllTags({ ...activity, activity_weather: weather }, dm, weather, ftp);
                    const newWeatherTags = weatherTags.filter(t =>
                      ["hot_conditions", "cold_conditions", "high_wind_conditions"].includes(t.tag_id)
                    );
                    if (newWeatherTags.length > 0) {
                      await persistTags(supabaseAdmin, activity.id, userId, newWeatherTags);
                    }
                  }
                } catch { /* weather fetch failed — not critical */ }
              }
            }
          } catch (err) {
            failed++;
            console.error(`Tag backfill failed for ${activity.id}:`, err.message);
          }
        }
      }
    }

    return res.status(200).json({
      tags: tagsProcessed,
      weather: weatherProcessed,
      failed,
      message: tagsProcessed === 0
        ? "All activities are up to date"
        : `Processed ${tagsProcessed} activities`,
    });
  } catch (err) {
    console.error("Backfill error:", err);
    return res.status(500).json({ error: err.message });
  }
}

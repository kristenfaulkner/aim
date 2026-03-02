import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userId = session.userId;

  // Fetch all user data in parallel
  const [
    profileRes,
    activitiesRes,
    metricsRes,
    bloodPanelsRes,
    dexaRes,
    powerProfileRes,
    settingsRes,
    conversationsRes,
  ] = await Promise.allSettled([
    supabaseAdmin.from("profiles")
      .select("full_name, email, date_of_birth, sex, height_cm, weight_kg, ftp_watts, max_hr_bpm, lthr_bpm, riding_level, weekly_hours, uses_cycle_tracking, timezone, created_at")
      .eq("id", userId).single(),
    supabaseAdmin.from("activities")
      .select("name, activity_type, source, started_at, duration_seconds, distance_meters, avg_power_watts, normalized_power_watts, max_power_watts, tss, intensity_factor, variability_index, efficiency_factor, hr_drift_pct, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm, avg_speed_mps, elevation_gain_meters, calories, work_kj, temperature_c, zone_distribution, ai_analysis, user_notes, user_rating, user_rpe, user_tags, created_at")
      .eq("user_id", userId).order("started_at", { ascending: false }),
    supabaseAdmin.from("daily_metrics")
      .select("date, weight_kg, body_fat_pct, resting_hr_bpm, hrv_ms, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, sleep_score, recovery_score, readiness_score, blood_oxygen_pct, ctl, atl, tsb, daily_tss")
      .eq("user_id", userId).order("date", { ascending: false }),
    supabaseAdmin.from("blood_panels")
      .select("test_date, lab_name, ferritin, hemoglobin, iron, tibc, transferrin_saturation, vitamin_d, b12, folate, tsh, free_t3, free_t4, testosterone, cortisol, crp, hba1c, cholesterol_total, cholesterol_ldl, cholesterol_hdl, triglycerides, creatinine, bun, alt, ast, magnesium, zinc, all_results, ai_analysis, created_at")
      .eq("user_id", userId).order("test_date", { ascending: false }),
    supabaseAdmin.from("dexa_scans")
      .select("scan_date, facility_name, total_body_fat_pct, lean_mass_kg, fat_mass_kg, bone_mineral_density, visceral_fat_area, regional_data, ai_analysis, created_at")
      .eq("user_id", userId).order("scan_date", { ascending: false }),
    supabaseAdmin.from("power_profiles")
      .select("computed_date, p5s_watts, p30s_watts, p1m_watts, p5m_watts, p10m_watts, p20m_watts, p60m_watts, p5s_wkg, p30s_wkg, p1m_wkg, p5m_wkg, p10m_wkg, p20m_wkg, p60m_wkg")
      .eq("user_id", userId).order("computed_date", { ascending: false }),
    supabaseAdmin.from("user_settings")
      .select("notification_preferences, preferences, units")
      .eq("user_id", userId).single(),
    supabaseAdmin.from("ai_conversations")
      .select("id, type, activity_id, created_at, ai_messages(role, content, created_at)")
      .eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  const extract = (result) => result.status === "fulfilled" ? result.value.data : null;

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: extract(profileRes),
    activities: extract(activitiesRes) || [],
    daily_metrics: extract(metricsRes) || [],
    blood_panels: extract(bloodPanelsRes) || [],
    dexa_scans: extract(dexaRes) || [],
    power_profiles: extract(powerProfileRes) || [],
    settings: extract(settingsRes),
    conversations: extract(conversationsRes) || [],
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="aim-data-export-${new Date().toISOString().split("T")[0]}.json"`);
  return res.status(200).json(exportData);
}

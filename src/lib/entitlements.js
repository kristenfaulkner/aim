/**
 * Feature entitlements per subscription tier.
 * Used by PaywallGate to check access and by backend for enforcement.
 */

export const TIER_ORDER = ["free", "starter", "pro", "elite"];

export const TIERS = {
  free: {
    maxActivities: 30,
    aiAnalysesPerDay: 3,
    integrations: 2,
    features: [
      "dashboard", "activities", "basic_analysis",
    ],
  },
  starter: {
    maxActivities: Infinity,
    aiAnalysesPerDay: 10,
    integrations: 4,
    features: [
      "dashboard", "activities", "basic_analysis",
      "sleep", "health_lab", "workout_db", "nutrition_logger", "checkin",
    ],
  },
  pro: {
    maxActivities: Infinity,
    aiAnalysesPerDay: Infinity,
    integrations: Infinity,
    features: [
      "dashboard", "activities", "basic_analysis",
      "sleep", "health_lab", "workout_db", "nutrition_logger", "checkin",
      "cp_model", "durability", "adaptive_zones", "segments",
      "similar_sessions", "race_intelligence", "prescription", "sms_coach",
    ],
  },
  elite: {
    maxActivities: Infinity,
    aiAnalysesPerDay: Infinity,
    integrations: Infinity,
    features: [
      "dashboard", "activities", "basic_analysis",
      "sleep", "health_lab", "workout_db", "nutrition_logger", "checkin",
      "cp_model", "durability", "adaptive_zones", "segments",
      "similar_sessions", "race_intelligence", "prescription", "sms_coach",
      "api_access", "data_export", "priority_support", "custom_models", "coach_dashboard",
    ],
  },
};

/**
 * Feature display names for upgrade CTAs.
 */
export const FEATURE_LABELS = {
  sleep: "Sleep Intelligence",
  health_lab: "Health Lab",
  workout_db: "Workout Database",
  nutrition_logger: "Nutrition Logger",
  checkin: "Daily Check-in",
  cp_model: "Critical Power Model",
  durability: "Durability Tracking",
  adaptive_zones: "Adaptive Training Zones",
  segments: "Segment Comparison",
  similar_sessions: "Similar Sessions",
  race_intelligence: "Race Intelligence",
  prescription: "Training Prescriptions",
  sms_coach: "SMS Coach",
  api_access: "API Access",
  data_export: "Data Export",
  priority_support: "Priority Support",
  custom_models: "Custom Models",
  coach_dashboard: "Coach Dashboard",
};

/**
 * Check if a tier has access to a feature.
 */
export function hasFeature(tier, feature) {
  const t = TIERS[tier || "free"];
  if (!t) return false;
  return t.features.includes(feature);
}

/**
 * Get the minimum tier required for a feature.
 */
export function requiredTier(feature) {
  for (const tier of TIER_ORDER) {
    if (TIERS[tier].features.includes(feature)) return tier;
  }
  return "elite"; // default to highest if unknown
}

/**
 * Check if user's tier is >= required tier.
 */
export function tierAtLeast(userTier, requiredTier) {
  return TIER_ORDER.indexOf(userTier || "free") >= TIER_ORDER.indexOf(requiredTier);
}

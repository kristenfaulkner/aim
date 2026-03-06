/**
 * Training Prescription Engine — pure functions.
 *
 * Gap analysis: compares athlete's power profile to CP model predictions
 * to identify weak durations. Generates workout type recommendations
 * based on gaps, readiness, and recent training history.
 *
 * No DB calls — fully testable.
 */

// Duration labels → seconds + column names
const DURATIONS = [
  { key: "best_5s_watts", label: "5s", seconds: 5, category: "sprint" },
  { key: "best_30s_watts", label: "30s", seconds: 30, category: "anaerobic" },
  { key: "best_1m_watts", label: "1m", seconds: 60, category: "anaerobic" },
  { key: "best_5m_watts", label: "5m", seconds: 300, category: "vo2max" },
  { key: "best_20m_watts", label: "20m", seconds: 1200, category: "threshold" },
  { key: "best_60m_watts", label: "60m", seconds: 3600, category: "endurance" },
];

// Workout templates for each gap category
const WORKOUT_TEMPLATES = {
  sprint: {
    name: "Neuromuscular Sprints",
    type: "sprints",
    description: "Short maximal sprints to build peak power",
    durationMin: 60,
    tssEstimate: 55,
  },
  anaerobic: {
    name: "Anaerobic Capacity Builder",
    type: "intervals",
    description: "30/30 and Tabata-style intervals to build short-duration power",
    durationMin: 65,
    tssEstimate: 70,
  },
  vo2max: {
    name: "VO2max Builder",
    type: "intervals",
    description: "4-5 minute intervals at 105-120% CP to raise aerobic ceiling",
    durationMin: 75,
    tssEstimate: 85,
  },
  threshold: {
    name: "Threshold Development",
    type: "intervals",
    description: "Long intervals at 95-105% CP to push sustainable power higher",
    durationMin: 90,
    tssEstimate: 95,
  },
  endurance: {
    name: "Endurance Builder",
    type: "endurance",
    description: "Extended Z2 ride to build aerobic base and fat oxidation",
    durationMin: 150,
    tssEstimate: 110,
  },
};

/**
 * Predict power at a given duration using the CP model.
 * P(t) = W'/t + CP
 *
 * @param {number} cp - Critical Power in watts
 * @param {number} wPrimeJ - W' in joules
 * @param {number} durationS - Duration in seconds
 * @returns {number} Predicted power in watts
 */
export function predictPower(cp, wPrimeJ, durationS) {
  if (!cp || !wPrimeJ || !durationS || durationS <= 0) return 0;
  return Math.round(wPrimeJ / durationS + cp);
}

/**
 * Analyze power profile gaps by comparing actual bests to CP model predictions.
 *
 * A gap exists when actual power at a duration is significantly below
 * what the CP model predicts — meaning that duration is underdeveloped
 * relative to the athlete's overall fitness.
 *
 * @param {Object} powerProfile - power_profiles row with best_Xs_watts fields
 * @param {Object} cpModel - { cp_watts, w_prime_kj, pmax_watts }
 * @param {Object} [options] - { goalType?: 'road'|'crit'|'tt'|'climbing' }
 * @returns {Array} Gaps sorted by priority, each { duration, label, deficit, category, actual, expected, priority }
 */
export function analyzeProfileGaps(powerProfile, cpModel, options = {}) {
  if (!powerProfile || !cpModel?.cp_watts || !cpModel?.w_prime_kj) return [];

  const cp = cpModel.cp_watts;
  const wPrimeJ = cpModel.w_prime_kj * 1000;
  const goalType = options.goalType || "road";

  const gaps = [];

  for (const d of DURATIONS) {
    const actual = powerProfile[d.key];
    if (!actual || actual <= 0) continue;

    const expected = predictPower(cp, wPrimeJ, d.seconds);
    if (expected <= 0) continue;

    const ratio = actual / expected;

    // Gap threshold: < 95% of model prediction
    if (ratio < 0.95) {
      const deficit = Math.round((1 - ratio) * 100);
      const priority = computeGapPriority(d.category, deficit, goalType);

      gaps.push({
        duration: d.seconds,
        label: d.label,
        deficit,
        category: d.category,
        actual,
        expected,
        priority,
      });
    }
  }

  return gaps.sort((a, b) => b.priority - a.priority);
}

/**
 * Compute priority score for a gap based on category, deficit size, and athlete goals.
 *
 * @param {string} category - Gap category
 * @param {number} deficit - Deficit percentage
 * @param {string} goalType - Athlete's goal type
 * @returns {number} Priority score (higher = more important)
 */
function computeGapPriority(category, deficit, goalType) {
  // Base priority from deficit size
  let priority = deficit;

  // Goal-based multipliers
  const goalWeights = {
    road: { sprint: 0.7, anaerobic: 0.9, vo2max: 1.3, threshold: 1.2, endurance: 1.0 },
    crit: { sprint: 1.3, anaerobic: 1.3, vo2max: 1.2, threshold: 0.9, endurance: 0.6 },
    tt: { sprint: 0.4, anaerobic: 0.6, vo2max: 0.9, threshold: 1.4, endurance: 1.3 },
    climbing: { sprint: 0.4, anaerobic: 0.6, vo2max: 1.2, threshold: 1.3, endurance: 1.1 },
  };

  const weights = goalWeights[goalType] || goalWeights.road;
  priority *= weights[category] || 1.0;

  return Math.round(priority * 10) / 10;
}

/**
 * Select the best workout template for today based on gaps, readiness, and recent history.
 *
 * @param {Array} gaps - From analyzeProfileGaps
 * @param {Object} readiness - { recoveryScore, tsb, recentIntensityDays, raceInDays }
 * @param {Array} recentActivities - Last 14 days of activities
 * @returns {Object} { template, gap, reason, readinessCheck }
 */
export function selectWorkoutTemplate(gaps, readiness = {}, recentActivities = []) {
  const { recoveryScore, tsb, raceInDays } = readiness;

  // Edge case: athlete is sick/injured (extreme subjective values)
  if (readiness.muscleSoreness >= 5 && readiness.motivation <= 1) {
    return {
      template: { name: "Complete Rest", type: "rest", durationMin: 0, tssEstimate: 0 },
      gap: null,
      reason: "Your body is signaling it needs complete rest today.",
      readinessCheck: "red",
    };
  }

  // Red readiness: recovery ride or rest
  if (recoveryScore != null && recoveryScore < 45) {
    return {
      template: {
        name: "Recovery Spin",
        type: "recovery",
        description: "Easy spinning to promote blood flow and recovery",
        durationMin: 45,
        tssEstimate: 20,
      },
      gap: null,
      reason: `Recovery score ${Math.round(recoveryScore)}/100 — your body needs rest today.`,
      readinessCheck: "red",
    };
  }

  // Deep overreaching: lean toward recovery
  if (tsb != null && tsb < -30) {
    return {
      template: {
        name: "Active Recovery",
        type: "recovery",
        description: "Low-intensity ride to manage accumulated fatigue",
        durationMin: 60,
        tssEstimate: 30,
      },
      gap: null,
      reason: `TSB is ${Math.round(tsb)} — significant accumulated fatigue. Prioritize recovery.`,
      readinessCheck: "red",
    };
  }

  // Race in < 7 days: taper protocol
  if (raceInDays != null && raceInDays >= 0 && raceInDays < 7) {
    return {
      template: {
        name: "Taper Opener",
        type: "taper",
        description: "Short race-pace efforts to stay sharp without adding fatigue",
        durationMin: 45,
        tssEstimate: 35,
      },
      gap: null,
      reason: `Race in ${raceInDays} day${raceInDays !== 1 ? "s" : ""} — taper mode.`,
      readinessCheck: "green",
    };
  }

  // Count recent high-intensity days (last 7 days)
  const recentIntensityDays = countRecentIntensityDays(recentActivities);

  // Yellow readiness or too many intensity days: moderate workout
  const isYellow = recoveryScore != null && recoveryScore < 70;
  const tooManyIntensity = recentIntensityDays >= 3;

  if (gaps.length === 0) {
    // No gaps — balanced profile. Suggest endurance or recovery based on readiness.
    if (isYellow || tooManyIntensity) {
      return {
        template: {
          name: "Z2 Endurance",
          type: "endurance",
          description: "Aerobic base building at conversational pace",
          durationMin: 90,
          tssEstimate: 65,
        },
        gap: null,
        reason: "Power profile is well-balanced. Easy endurance ride to maintain base.",
        readinessCheck: isYellow ? "yellow" : "green",
      };
    }
    return {
      template: WORKOUT_TEMPLATES.threshold,
      gap: null,
      reason: "Power profile is well-balanced. Threshold work to push your ceiling higher.",
      readinessCheck: "green",
    };
  }

  // Find best gap to target (skip categories that need fresh legs if yellow/tired)
  const highIntensityCategories = ["sprint", "anaerobic", "vo2max"];
  let selectedGap = gaps[0]; // highest priority

  if (isYellow || tooManyIntensity) {
    // Skip high-intensity gaps if not fresh
    const lowIntensityGaps = gaps.filter(
      (g) => !highIntensityCategories.includes(g.category)
    );
    if (lowIntensityGaps.length > 0) {
      selectedGap = lowIntensityGaps[0];
    } else {
      // Only high-intensity gaps exist — do endurance instead
      return {
        template: {
          name: "Z2 Endurance",
          type: "endurance",
          description: "Build aerobic base — intensity gaps will be addressed when fresh",
          durationMin: 120,
          tssEstimate: 80,
        },
        gap: selectedGap,
        reason: `Your biggest gap is ${selectedGap.label} power (${selectedGap.deficit}% below model), but you need a lighter day. Endurance ride today.`,
        readinessCheck: "yellow",
      };
    }
  }

  // After lower-body strength < 48h, avoid VO2max/sprint
  if (readiness.recentLowerBodyStrength) {
    if (highIntensityCategories.includes(selectedGap.category)) {
      const alternativeGaps = gaps.filter(
        (g) => !highIntensityCategories.includes(g.category)
      );
      if (alternativeGaps.length > 0) {
        selectedGap = alternativeGaps[0];
      }
    }
  }

  const template = WORKOUT_TEMPLATES[selectedGap.category] || WORKOUT_TEMPLATES.threshold;
  const readinessCheck =
    recoveryScore != null && recoveryScore >= 70
      ? "green"
      : recoveryScore != null && recoveryScore >= 45
        ? "yellow"
        : "green"; // null recovery = assume green

  return {
    template,
    gap: selectedGap,
    reason: `Your ${selectedGap.label} power is ${selectedGap.deficit}% below model prediction. This session targets your biggest gap.`,
    readinessCheck,
  };
}

/**
 * Count days with high-intensity activities in the last 7 days.
 *
 * @param {Array} recentActivities - Activities from last 14 days
 * @returns {number} Number of high-intensity days in last 7 days
 */
export function countRecentIntensityDays(recentActivities) {
  if (!recentActivities || recentActivities.length === 0) return 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const intensityDates = new Set();

  for (const act of recentActivities) {
    const actDate = new Date(act.started_at || act.start_date);
    if (actDate < sevenDaysAgo) continue;

    // High intensity: IF > 0.85 or TSS > 80
    const isIntense =
      (act.intensity_factor && act.intensity_factor > 0.85) ||
      (act.tss && act.tss > 80);

    if (isIntense) {
      intensityDates.add(actDate.toISOString().split("T")[0]);
    }
  }

  return intensityDates.size;
}

/**
 * Adjust workout targets based on readiness and weather.
 *
 * @param {Object} workout - Workout with power targets
 * @param {number|null} recoveryScore - 0-100
 * @param {Object|null} weather - { temp_c, humidity_pct }
 * @returns {Object} Adjusted workout with modifier notes
 */
export function adjustForConditions(workout, recoveryScore, weather) {
  const adjustments = [];
  let powerFactor = 1.0;

  // Yellow readiness: reduce targets 5%
  if (recoveryScore != null && recoveryScore >= 45 && recoveryScore < 70) {
    powerFactor *= 0.95;
    adjustments.push("Targets reduced 5% based on your readiness score.");
  }

  // Extreme heat: reduce targets 3-5%
  if (weather?.temp_c != null && weather.temp_c > 30) {
    powerFactor *= 0.95;
    adjustments.push(`Hot conditions (${Math.round(weather.temp_c)}°C) — targets reduced 5%.`);
  } else if (weather?.temp_c != null && weather.temp_c > 25) {
    powerFactor *= 0.97;
    adjustments.push(`Warm conditions (${Math.round(weather.temp_c)}°C) — targets reduced 3%.`);
  }

  // Extreme cold
  if (weather?.temp_c != null && weather.temp_c < 0) {
    adjustments.push(`Cold conditions (${Math.round(weather.temp_c)}°C) — extend warm-up to 20 minutes.`);
  }

  return {
    ...workout,
    powerFactor,
    adjustmentNotes: adjustments.length > 0 ? adjustments : null,
  };
}

/**
 * Build the context object for Claude's workout prescription prompt.
 *
 * @param {Object} params
 * @returns {Object} Context object for AI
 */
export function buildPrescriptionContext({
  profile,
  powerProfile,
  cpModel,
  gaps,
  selectedTemplate,
  readiness,
  weather,
  recentActivities,
  dailyMetrics,
  crossTraining,
  travelEvents,
  races,
}) {
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return {
    athlete: {
      first_name: firstName,
      ftp_watts: profile?.ftp_watts,
      weight_kg: profile?.weight_kg,
      max_hr: profile?.max_hr,
    },
    powerProfile: powerProfile
      ? {
          best_5s: powerProfile.best_5s_watts,
          best_30s: powerProfile.best_30s_watts,
          best_1m: powerProfile.best_1m_watts,
          best_5m: powerProfile.best_5m_watts,
          best_20m: powerProfile.best_20m_watts,
          best_60m: powerProfile.best_60m_watts,
        }
      : null,
    cpModel: cpModel
      ? {
          cp_watts: cpModel.cp_watts,
          w_prime_kj: cpModel.w_prime_kj,
          pmax_watts: cpModel.pmax_watts,
        }
      : null,
    gaps: gaps?.slice(0, 3) || [],
    suggestedTemplate: selectedTemplate
      ? {
          name: selectedTemplate.template.name,
          type: selectedTemplate.template.type,
          reason: selectedTemplate.reason,
          readinessCheck: selectedTemplate.readinessCheck,
        }
      : null,
    readiness: readiness || {},
    weather: weather || null,
    recentActivities: (recentActivities || []).slice(0, 10).map((a) => ({
      name: a.name,
      date: (a.started_at || a.start_date || "").split("T")[0],
      tss: a.tss,
      duration_min: a.duration_seconds ? Math.round(a.duration_seconds / 60) : null,
      intensity_factor: a.intensity_factor,
    })),
    trainingLoad: dailyMetrics
      ? {
          ctl: dailyMetrics.ctl,
          atl: dailyMetrics.atl,
          tsb: dailyMetrics.tsb,
          recovery_score: dailyMetrics.recovery_score,
          hrv: dailyMetrics.hrv_overnight_avg_ms || dailyMetrics.hrv_ms,
          sleep_score: dailyMetrics.sleep_score,
          sleep_hours: dailyMetrics.total_sleep_seconds
            ? Math.round((dailyMetrics.total_sleep_seconds / 3600) * 10) / 10
            : null,
        }
      : null,
    crossTraining: crossTraining?.length > 0 ? crossTraining : undefined,
    travelEvents: travelEvents?.length > 0 ? travelEvents : undefined,
    upcomingRace: races?.length > 0 ? races[0] : undefined,
  };
}

/**
 * Format a prescription for saving to training_calendar.
 *
 * @param {Object} prescription - AI-generated prescription JSON
 * @param {string} userId - User ID
 * @param {string} date - ISO date string
 * @returns {Object} training_calendar row
 */
export function formatForCalendar(prescription, userId, date) {
  return {
    user_id: userId,
    date,
    title: prescription.workout_name,
    description: prescription.rationale,
    workout_type: prescription.workout_type || "prescribed",
    duration_minutes: prescription.duration_minutes,
    tss_target: prescription.tss_estimate,
    structure: prescription.structure
      ? { intervals: prescription.structure }
      : null,
    nutrition_plan: prescription.fueling || null,
    source: "ai_prescription",
  };
}

/**
 * Cached Athlete Analytics Layer
 *
 * Single source of truth for all derived analytics that don't change
 * except when new training data arrives. Every page calls
 * getAthleteAnalytics(userId) and picks the fields it needs.
 *
 * Cached in `athlete_analytics` table with fingerprint-based invalidation.
 * Recomputed when: new activity syncs, daily metrics update, FTP changes.
 *
 * Contains:
 *   - historicalPatterns: weekly blocks, high-load recovery, HR drift/EF by recovery
 *   - performanceModels: heat, sleep, HRV, fueling, durability models
 *   - sleepPerformance: correlations, quartiles, dose-response, patterns
 *   - trainingLoadSummary: current CTL/ATL/TSB, trend, ramp rate
 */

import { supabaseAdmin } from "./supabase.js";
import { matchActivitiesToContext, computeAllModels, formatModelsForAI } from "./performance-models.js";
import {
  matchSleepToActivities,
  computeCorrelations,
  computeQuartileAnalysis,
  computeAdjustedCorrelations,
  detectSleepPatterns,
  findBestAndWorstRides,
  computeDoseResponse,
} from "./sleep-correlations.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "./token-tracking.js";


// ── Fingerprint: auto-invalidates when data changes ──

async function computeFingerprint(userId) {
  const [latestActivity, latestMetrics, profile, sleepCount] = await Promise.all([
    supabaseAdmin
      .from("activities")
      .select("id, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("daily_metrics")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("ftp_watts, weight_kg")
      .eq("id", userId)
      .single(),
    // Count rows with sleep data — invalidates cache when sleep syncs add data
    supabaseAdmin
      .from("daily_metrics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("total_sleep_seconds", "is", null),
  ]);

  const parts = [
    latestActivity?.data?.id || "none",
    latestActivity?.data?.started_at || "none",
    latestMetrics?.data?.date || "none",
    profile?.data?.ftp_watts || 0,
    profile?.data?.weight_kg || 0,
    sleepCount?.count || 0,
  ];
  return parts.join("|");
}


// ── Historical Recovery Patterns ──

function computeHistoricalPatterns(activities90d, dailyMetrics90d) {
  if (!activities90d?.length || activities90d.length < 10) return null;

  const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10 : null;

  const metricsMap = {};
  for (const m of (dailyMetrics90d || [])) metricsMap[m.date] = m;

  // Today's date string for capping the current incomplete week
  const todayStr = new Date().toISOString().split("T")[0];

  // Group activities by ISO week (Monday start)
  const weeklyBlocks = {};
  for (const a of activities90d) {
    const date = a.started_at.split("T")[0];
    const d = new Date(date + "T00:00:00Z");
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    const weekKey = monday.toISOString().split("T")[0];

    if (!weeklyBlocks[weekKey]) {
      weeklyBlocks[weekKey] = { weekStart: weekKey, tss: 0, rides: 0, activityDates: new Set() };
    }
    weeklyBlocks[weekKey].tss += a.tss || 0;
    weeklyBlocks[weekKey].rides += 1;
    weeklyBlocks[weekKey].activityDates.add(date);
  }

  const weeks = Object.values(weeklyBlocks)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(w => {
      let restDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(w.weekStart + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        // Don't count future days as rest days
        if (dateStr > todayStr) break;
        if (!w.activityDates.has(dateStr)) restDays++;
      }
      const endDate = new Date(w.weekStart + "T00:00:00Z");
      endDate.setUTCDate(endDate.getUTCDate() + 6);
      const endMetrics = metricsMap[endDate.toISOString().split("T")[0]];
      return {
        week: w.weekStart,
        tss: Math.round(w.tss),
        rides: w.rides,
        restDays,
        endTSB: endMetrics?.tsb != null ? Math.round(endMetrics.tsb) : null,
      };
    });

  const tssSorted = weeks.map(w => w.tss).filter(t => t > 0).sort((a, b) => a - b);
  const highLoadThreshold = tssSorted[Math.floor(tssSorted.length * 0.75)] || 800;

  const highLoadRecovery = [];
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].tss < highLoadThreshold) continue;
    const nextWeek = weeks[i + 1];
    if (!nextWeek) continue;

    const weekEnd = new Date(weeks[i].week + "T00:00:00Z");
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    let consecutiveRestDays = 0;
    for (let d = 0; d < 5; d++) {
      const checkDate = new Date(weekEnd);
      checkDate.setUTCDate(checkDate.getUTCDate() + d);
      const dateStr = checkDate.toISOString().split("T")[0];
      const hadActivity = activities90d.some(a => a.started_at.startsWith(dateStr));
      if (!hadActivity) consecutiveRestDays++;
      else break;
    }

    const hrvAfter = [];
    for (let d = 0; d < 5; d++) {
      const checkDate = new Date(weekEnd);
      checkDate.setUTCDate(checkDate.getUTCDate() + d);
      const m = metricsMap[checkDate.toISOString().split("T")[0]];
      const hrv = m?.hrv_overnight_avg_ms || m?.hrv_ms;
      if (hrv) hrvAfter.push({ day: d + 1, hrv: Math.round(hrv) });
    }

    highLoadRecovery.push({
      weekOf: weeks[i].week,
      weekTSS: weeks[i].tss,
      restDaysAfter: consecutiveRestDays,
      nextWeekTSS: nextWeek.tss,
      tsbAtEnd: weeks[i].endTSB,
      hrvRecovery: hrvAfter.length > 0 ? hrvAfter : undefined,
    });
  }

  // HR drift by recovery state
  const activitiesWithDrift = [...activities90d]
    .filter(a => a.hr_drift_pct != null)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));

  const driftBuckets = { consecutive: [], after1Rest: [], after2PlusRest: [] };
  for (let i = 1; i < activitiesWithDrift.length; i++) {
    const curr = activitiesWithDrift[i];
    const prev = activitiesWithDrift[i - 1];
    const daysBetween = Math.round(
      (new Date(curr.started_at) - new Date(prev.started_at)) / 86400000
    );
    if (daysBetween <= 1) driftBuckets.consecutive.push(curr.hr_drift_pct);
    else if (daysBetween === 2) driftBuckets.after1Rest.push(curr.hr_drift_pct);
    else driftBuckets.after2PlusRest.push(curr.hr_drift_pct);
  }

  // EF by recovery state
  const efBuckets = { consecutive: [], after1Rest: [], after2PlusRest: [] };
  const activitiesWithEF = [...activities90d]
    .filter(a => a.efficiency_factor != null)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  for (let i = 1; i < activitiesWithEF.length; i++) {
    const curr = activitiesWithEF[i];
    const prev = activitiesWithEF[i - 1];
    const daysBetween = Math.round(
      (new Date(curr.started_at) - new Date(prev.started_at)) / 86400000
    );
    if (daysBetween <= 1) efBuckets.consecutive.push(curr.efficiency_factor);
    else if (daysBetween === 2) efBuckets.after1Rest.push(curr.efficiency_factor);
    else efBuckets.after2PlusRest.push(curr.efficiency_factor);
  }

  return {
    weeklyBlocks: weeks.slice(-12),
    highLoadThresholdTSS: Math.round(highLoadThreshold),
    highLoadRecovery: highLoadRecovery.length > 0 ? highLoadRecovery : undefined,
    hrDriftByRecovery: {
      consecutiveDays: { avg: avg(driftBuckets.consecutive), n: driftBuckets.consecutive.length },
      after1RestDay: { avg: avg(driftBuckets.after1Rest), n: driftBuckets.after1Rest.length },
      after2PlusRestDays: { avg: avg(driftBuckets.after2PlusRest), n: driftBuckets.after2PlusRest.length },
    },
    efficiencyByRecovery: {
      consecutiveDays: { avg: avg(efBuckets.consecutive), n: efBuckets.consecutive.length },
      after1RestDay: { avg: avg(efBuckets.after1Rest), n: efBuckets.after1Rest.length },
      after2PlusRestDays: { avg: avg(efBuckets.after2PlusRest), n: efBuckets.after2PlusRest.length },
    },
  };
}


// ── Training Load Summary ──

function computeTrainingLoadFromMetrics(dailyMetrics90d) {
  if (!dailyMetrics90d?.length) return null;
  const latest = dailyMetrics90d[0]; // sorted desc
  const weekAgo = dailyMetrics90d.find(d => {
    const diff = (new Date(dailyMetrics90d[0].date) - new Date(d.date)) / 86400000;
    return diff >= 6 && diff <= 8;
  });

  return {
    current: {
      ctl: latest.ctl != null ? Math.round(latest.ctl) : null,
      atl: latest.atl != null ? Math.round(latest.atl) : null,
      tsb: latest.tsb != null ? Math.round(latest.tsb) : null,
      date: latest.date,
    },
    weekAgo: weekAgo ? {
      ctl: weekAgo.ctl != null ? Math.round(weekAgo.ctl) : null,
      atl: weekAgo.atl != null ? Math.round(weekAgo.atl) : null,
      tsb: weekAgo.tsb != null ? Math.round(weekAgo.tsb) : null,
    } : null,
    ctlTrend: weekAgo?.ctl != null && latest.ctl != null
      ? Math.round((latest.ctl - weekAgo.ctl) * 10) / 10
      : null,
    rampRate: latest.ramp_rate != null ? Math.round(latest.ramp_rate * 10) / 10 : null,
  };
}


// ── Sleep Performance Correlations ──

function computeSleepPerformance(activities, dailyMetrics) {
  if (!activities?.length || !dailyMetrics?.length) return null;

  const matched = matchSleepToActivities(dailyMetrics, activities);
  if (matched.length < 7) return null;

  return {
    matchedPairs: matched.length,
    correlations: computeCorrelations(matched),
    quartiles: computeQuartileAnalysis(matched),
    adjustedCorrelations: computeAdjustedCorrelations(matched),
    sleepPatterns: detectSleepPatterns(dailyMetrics),
    bestAndWorstRides: findBestAndWorstRides(matched),
    doseResponse: computeDoseResponse(matched),
  };
}


// ── Raw Data Fetchers ──

const ACTIVITY_FIELDS = "id, name, activity_type, started_at, duration_seconds, avg_power_watts, normalized_power_watts, tss, intensity_factor, efficiency_factor, hr_drift_pct, variability_index, avg_hr_bpm, max_hr_bpm, avg_cadence_rpm, calories, work_kj, temperature_celsius, activity_weather, laps, elevation_gain_meters";

const DAILY_METRICS_FIELDS = "date, ctl, atl, tsb, ramp_rate, hrv_ms, hrv_overnight_avg_ms, resting_hr_bpm, sleep_score, recovery_score, weight_kg, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, sleep_latency_seconds, sleep_efficiency_pct, sleep_onset_time, wake_time, bed_temperature_celsius, body_fat_pct, muscle_mass_kg, life_stress_score, motivation_score, muscle_soreness_score, mood_score, checkin_completed_at, respiratory_rate, resting_spo2";

async function fetchRawData(userId) {
  const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
  const oneYearAgoDate = oneYearAgo.split("T")[0];
  const ninetyDaysAgoDate = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  const [activitiesResult, metricsResult, profileResult, nutritionResult] =
    await Promise.all([
      supabaseAdmin
        .from("activities")
        .select(ACTIVITY_FIELDS)
        .eq("user_id", userId)
        .gte("started_at", oneYearAgo)
        .order("started_at", { ascending: false }),
      supabaseAdmin
        .from("daily_metrics")
        .select(DAILY_METRICS_FIELDS)
        .eq("user_id", userId)
        .gte("date", oneYearAgoDate)
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("profiles")
        .select("ftp_watts, weight_kg")
        .eq("id", userId)
        .single(),
      // Nutrition only needed for 90-day performance models
      supabaseAdmin
        .from("nutrition_logs")
        .select("activity_id, date, totals, per_hour")
        .eq("user_id", userId)
        .gte("date", ninetyDaysAgoDate),
    ]);

  return {
    activities: activitiesResult.data || [],
    dailyMetrics: metricsResult.data || [],
    profile: profileResult.data || {},
    nutritionLogs: nutritionResult.data || [],
  };
}


// ── Core: Compute All Analytics ──

function computeAllAnalytics(activities, dailyMetrics, nutritionLogs, profile) {
  // Filter to 90 days for performance models (current physiology)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const activities90d = activities.filter(a => new Date(a.started_at) >= ninetyDaysAgo);
  const metrics90d = dailyMetrics.filter(m => new Date(m.date + "T00:00:00Z") >= ninetyDaysAgo);

  // 1. Historical recovery patterns (full 365-day window for richer pattern detection)
  const historicalPatterns = computeHistoricalPatterns(activities, dailyMetrics);

  // 2. Performance models — 90-day only (represents current fitness)
  let performanceModels = null;
  let performanceModelsText = "";
  if (activities90d.length >= 5) {
    const pairs = matchActivitiesToContext(
      activities90d, metrics90d, nutritionLogs, profile?.weight_kg
    );
    performanceModels = computeAllModels(pairs);
    performanceModelsText = formatModelsForAI(performanceModels);
  }

  // 3. Training load summary (90-day metrics for current CTL/ATL/TSB)
  const trainingLoad = computeTrainingLoadFromMetrics(metrics90d);

  // 4. Sleep-performance correlations (full 365-day window for more reliable correlations)
  const sleepPerformance = computeSleepPerformance(activities, dailyMetrics);

  return {
    historicalPatterns,
    performanceModels,
    performanceModelsText,
    trainingLoad,
    sleepPerformance,
    activityCount: activities.length,
    metricsCount: dailyMetrics.length,
  };
}


// ── AI Narrative Generation ──

const NARRATIVE_SYSTEM_PROMPT = `You are AIM's data interpreter for endurance athletes. Given pre-computed statistical models and a list of connected data sources, generate focused narratives for each domain.

Each narrative: 2-4 sentences, second person ("your"), reference specific numbers from the data. Be direct and insightful — these are the athlete's primary way of understanding their models.

CRITICAL RULES:
- ONLY generate narratives for domains where the input data is non-null AND meaningful. Set missing domains to null.
- NEVER fabricate data or mention metrics the athlete doesn't have. If a domain has partial data, narrate only what exists.
- The "connectedSources" field tells you which integrations are active. Do NOT reference data from disconnected sources.
- Use specific numbers from the data (r values, percentages, watts, temperatures, durations).
- Each narrative should contain at least one actionable insight.
- NEVER give direct medical advice. Use "research suggests" or "consider" language.
- Return ONLY valid JSON, no markdown.

DOMAIN DEFINITIONS — each domain covers multiple subcategories. Cover whichever subcategories have data:

1. "sleep" — Sleep → Performance
   - Sleep-performance correlations (duration, deep sleep, REM vs next-day power/EF/drift)
   - Optimal sleep duration and timing for this athlete
   - Sleep architecture quality (deep/REM/light ratios, sleep efficiency, latency)
   - Sleep consistency and timing patterns (bed/wake regularity)
   - Respiratory rate or SpO2 trends if available (illness early warning)
   - Perceived vs actual recovery alignment (subjective scores vs objective sleep)
   - Bed temperature effects on sleep quality (Eight Sleep data)

2. "heat" — Environmental & Conditions
   - Heat model: temperature breakpoint, EF penalty per degree, humidity compounding
   - Practical thresholds for race day (where performance degrades)
   - Travel & timezone disruption effects (jet lag impact on HRV/performance)
   - Altitude acclimation patterns if relevant
   - Seasonal performance trends (winter vs summer baselines)

3. "recovery" — Recovery & Readiness
   - Historical recovery patterns: response to high-load weeks, bounce-back speed
   - HR drift and EF by recovery state (consecutive days vs after rest)
   - HRV patterns → training readiness (HRV baseline, morning readings, trend)
   - Fatigue signatures: which metrics degrade first under accumulated load
   - Readiness-to-response: how well recovery metrics predict next-day output
   - Subjective-objective alignment (check-in mood/soreness/stress vs HRV/sleep)
   - RHR deviation from baseline as recovery indicator
   - Cross-training impact on recovery if data exists

4. "training_load" — Training Load & Progression
   - Current CTL/ATL/TSB status, trend direction, comparison to recent weeks
   - Ramp rate and injury risk (ACWR if >1.5, TSS ramp >7/week)
   - Workout type progression (are threshold/VO2 efforts improving over time?)
   - Long-term training adaptations (efficiency gains, power at HR trends)
   - Anomaly detection (unusual metrics that deviate from personal baselines)
   - W' balance and anaerobic reserve patterns if available
   - Body composition → performance trends (W/kg changes) if weight data exists
   - Blood work impact on training capacity if blood panels exist

5. "durability" — Durability & Race Readiness
   - Fatigue resistance model: power retention across duration buckets
   - Durability score and trend (improving or declining?)
   - Interval execution quality under fatigue
   - Fueling causality: how carb/calorie intake correlates with late-ride power
   - Race-specific readiness based on power profile and durability data
   - Segment performance trends if segment data exists

Return JSON:
{
  "sleep": "narrative or null",
  "heat": "narrative or null",
  "recovery": "narrative or null",
  "training_load": "narrative or null",
  "durability": "narrative or null"
}`;

async function generateNarratives(userId, analytics) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Only generate if we have meaningful data to interpret
  const hasData = analytics.sleepPerformance || analytics.performanceModels
    || analytics.historicalPatterns || analytics.trainingLoad;
  if (!hasData) return null;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Fetch connected integrations so Sonnet knows what data sources exist
    const { data: integrations } = await supabaseAdmin
      .from("integrations")
      .select("provider, is_active, last_sync_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    const connectedSources = (integrations || []).map(i => i.provider);

    const context = { connectedSources };
    if (analytics.sleepPerformance) context.sleepPerformance = analytics.sleepPerformance;
    if (analytics.performanceModels) context.performanceModels = analytics.performanceModels;
    if (analytics.historicalPatterns) context.historicalPatterns = analytics.historicalPatterns;
    if (analytics.trainingLoad) context.trainingLoad = analytics.trainingLoad;
    if (analytics.performanceModelsText) context.modelSummaries = analytics.performanceModelsText;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      system: NARRATIVE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });
    trackTokenUsage(userId, "model_narratives", "claude-opus-4-6", response.usage);

    const raw = response.content[0].text;
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* fall through */ }
      }
      return null;
    }
  } catch (err) {
    console.error("[athlete-analytics] narrative generation error:", err.message);
    return null;
  }
}


// ── Public API ──

/**
 * Get cached athlete analytics, recomputing if stale.
 * This is the main entry point — every page calls this.
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh] - Skip cache and recompute
 * @returns {Promise<object>} Analytics object
 */
export async function getAthleteAnalytics(userId, { forceRefresh = false } = {}) {
  const fingerprint = await computeFingerprint(userId);

  // Check cache (unless forced refresh)
  if (!forceRefresh) {
    try {
      const { data: cached } = await supabaseAdmin
        .from("athlete_analytics")
        .select("analytics, fingerprint, computed_at")
        .eq("user_id", userId)
        .single();

      if (cached && cached.fingerprint === fingerprint) {
        return cached.analytics;
      }
    } catch {
      // Table may not exist yet or no cache — continue to compute
    }
  }

  // Cache miss or stale — recompute
  const raw = await fetchRawData(userId);
  const analytics = computeAllAnalytics(
    raw.activities, raw.dailyMetrics, raw.nutritionLogs, raw.profile
  );

  // Generate AI narratives for each model domain (Sonnet — fast + cached)
  const narratives = await generateNarratives(userId, analytics);
  if (narratives) {
    analytics.narratives = narratives;
  }

  // Cache result (fire-and-forget)
  supabaseAdmin
    .from("athlete_analytics")
    .upsert({
      user_id: userId,
      fingerprint,
      analytics,
      computed_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch(() => {});

  return analytics;
}

/**
 * Force recompute analytics after new data arrives.
 * Call this from sync pipelines after processing activities.
 * Also triggers performance intelligence pre-computation (rate-limited to 6h).
 *
 * @param {string} userId
 * @returns {Promise<object>} Fresh analytics
 */
export async function refreshAthleteAnalytics(userId) {
  const analytics = await getAthleteAnalytics(userId, { forceRefresh: true });

  // Fire-and-forget: pre-compute Performance page intelligence (6h rate limit)
  // Dynamic import to avoid circular dependency
  import("./performance-intelligence.js")
    .then(({ refreshPerformanceIntelligence }) => refreshPerformanceIntelligence(userId))
    .catch(() => {});

  return analytics;
}

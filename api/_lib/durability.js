/**
 * Durability & Fatigue Resistance — pure functions.
 *
 * Computes per-activity fatigue-bucket power curves by walking the power
 * stream chronologically and tracking cumulative kJ/kg. Within each fatigue
 * bucket, extracts best rolling-average power at standard durations.
 *
 * No DB calls — fully testable.
 */

const BUCKET_EDGES = [0, 10, 20, 30]; // kJ/kg boundaries
const DURATIONS = {
  best_5s: 5,
  best_1m: 60,
  best_5m: 300,
  best_20m: 1200,
};

/**
 * Compute best rolling average power for a given window size within a
 * contiguous array of power samples.
 *
 * @param {number[]} samples - Power values
 * @param {number} window - Window size in samples
 * @returns {number|null} Best average power, or null if insufficient data
 */
function slidingWindowMax(samples, window) {
  if (!samples || samples.length < window || window < 1) return null;

  let runningSum = 0;
  for (let i = 0; i < window; i++) runningSum += samples[i];
  let maxAvg = runningSum / window;

  for (let i = window; i < samples.length; i++) {
    runningSum += samples[i] - samples[i - window];
    const avg = runningSum / window;
    if (avg > maxAvg) maxAvg = avg;
  }

  return Math.round(maxAvg);
}

/**
 * Compute per-activity fatigue-bucket power curves.
 *
 * Walks the power stream chronologically, tracking cumulative kJ/kg.
 * Assigns each sample to a fatigue bucket (0-10, 10-20, 20-30, 30+ kJ/kg).
 * Within each bucket, computes best rolling avg power at standard durations.
 *
 * @param {number[]} watts - Power stream (1Hz or variable)
 * @param {number[]} time - Time stream (seconds from start)
 * @param {number} weightKg - Athlete weight in kg
 * @param {number} sampleRate - Seconds per sample (default 1)
 * @returns {Object|null} { buckets, total_kj_per_kg, score_5s, score_1m, score_5m, score_20m } or null
 */
export function computeDurabilityData(watts, time, weightKg, sampleRate = 1) {
  if (!watts || !weightKg || watts.length < 300 || weightKg <= 0) return null;

  // Determine sample rate from time stream if available
  let sr = sampleRate;
  if (time && time.length > 1) {
    sr = (time[time.length - 1] - time[0]) / (time.length - 1);
    if (sr <= 0) sr = 1;
  }

  // Pass 1: Assign each sample to a fatigue bucket based on cumulative kJ/kg
  const bucketSamples = BUCKET_EDGES.map(() => []);
  let cumulativeKj = 0;

  for (let i = 0; i < watts.length; i++) {
    cumulativeKj += (watts[i] * sr) / 1000;
    const kjPerKg = cumulativeKj / weightKg;

    // Find bucket: last edge whose value <= kjPerKg
    let bucketIdx = BUCKET_EDGES.length - 1;
    for (let b = 0; b < BUCKET_EDGES.length - 1; b++) {
      if (kjPerKg < BUCKET_EDGES[b + 1]) {
        bucketIdx = b;
        break;
      }
    }

    bucketSamples[bucketIdx].push(watts[i]);
  }

  const totalKjPerKg = cumulativeKj / weightKg;
  if (totalKjPerKg < 10) return null;

  // Pass 2: For each bucket, compute best power at standard durations
  const buckets = [];
  for (let idx = 0; idx < BUCKET_EDGES.length; idx++) {
    const samples = bucketSamples[idx];
    if (samples.length < 5) continue;

    const entry = {
      range:
        idx < BUCKET_EDGES.length - 1
          ? `${BUCKET_EDGES[idx]}-${BUCKET_EDGES[idx + 1]}`
          : `${BUCKET_EDGES[idx]}+`,
      kj_kg_min: BUCKET_EDGES[idx],
      kj_kg_max: idx < BUCKET_EDGES.length - 1 ? BUCKET_EDGES[idx + 1] : null,
      samples: samples.length,
    };

    for (const [key, durationSec] of Object.entries(DURATIONS)) {
      const windowSamples = Math.max(1, Math.round(durationSec / sr));
      entry[key] = slidingWindowMax(samples, windowSamples);
    }

    buckets.push(entry);
  }

  if (buckets.length < 2) return null;

  // Compute retention scores: fatigued power / fresh power
  const freshBucket = buckets.find((b) => b.kj_kg_min === 0);
  const fatiguedBucket = buckets.find((b) => b.kj_kg_min === 30);

  const score = (dur) => {
    if (!freshBucket?.[dur] || !fatiguedBucket?.[dur]) return null;
    if (freshBucket[dur] === 0) return null;
    return (
      Math.round((fatiguedBucket[dur] / freshBucket[dur]) * 1000) / 1000
    );
  };

  return {
    buckets,
    total_kj_per_kg: Math.round(totalKjPerKg * 10) / 10,
    score_5s: score("best_5s"),
    score_1m: score("best_1m"),
    score_5m: score("best_5m"),
    score_20m: score("best_20m"),
  };
}

/**
 * Extract durability retention score from durability data.
 *
 * @param {Object|null} durabilityData - From computeDurabilityData
 * @param {string} duration - "best_5s" | "best_1m" | "best_5m" | "best_20m"
 * @returns {number|null} Retention ratio (0-1+), null if insufficient data
 */
export function computeDurabilityScore(
  durabilityData,
  duration = "best_5m"
) {
  if (!durabilityData) return null;
  const key = `score_${duration.replace("best_", "")}`;
  return durabilityData[key] ?? null;
}

/**
 * Aggregate durability data across multiple activities for power_profiles.
 *
 * @param {Array} activities - [{ date, durability_data }]
 * @param {number} windowDays - Rolling window (default 90)
 * @returns {{ avgScore: number, bestBuckets: Array, trend: Array }|null}
 */
export function aggregateDurability(activities, windowDays = 90) {
  if (!activities || activities.length < 3) return null;

  const cutoff = new Date(
    Date.now() - windowDays * 86400000
  ).toISOString();
  const recent = activities.filter(
    (a) => a.durability_data && a.date >= cutoff.split("T")[0]
  );
  if (recent.length < 3) return null;

  // Average 5m durability score
  const scores = recent
    .map((a) => a.durability_data.score_5m)
    .filter((s) => s != null);
  const avgScore =
    scores.length > 0
      ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 1000) / 1000
      : null;

  // Best-of buckets: highest power at each duration in each fatigue bucket
  const bucketMap = {};
  for (const a of recent) {
    if (!a.durability_data?.buckets) continue;
    for (const b of a.durability_data.buckets) {
      const key = b.range;
      if (!bucketMap[key]) {
        bucketMap[key] = { ...b };
      } else {
        for (const dur of Object.keys(DURATIONS)) {
          if (b[dur] != null && (bucketMap[key][dur] == null || b[dur] > bucketMap[key][dur])) {
            bucketMap[key][dur] = b[dur];
          }
        }
        bucketMap[key].samples = Math.max(bucketMap[key].samples || 0, b.samples || 0);
      }
    }
  }
  const bestBuckets = Object.values(bucketMap);

  // Trend: score by date (one entry per activity, sorted)
  const trend = recent
    .filter((a) => a.durability_data.score_5m != null)
    .map((a) => ({
      date: a.date,
      score: a.durability_data.score_5m,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { avgScore, bestBuckets, trend };
}

/**
 * Predict power at a given fatigue level using durability bucket interpolation.
 *
 * @param {Array} buckets - Durability bucket array
 * @param {number} targetKjPerKg - Target fatigue level (kJ/kg)
 * @param {string} duration - "best_5s" | "best_1m" | "best_5m" | "best_20m"
 * @returns {{ predictedWatts: number, confidence: string }|null}
 */
export function predictFatiguedPower(buckets, targetKjPerKg, duration = "best_5m") {
  if (!buckets || buckets.length < 2) return null;

  // Find the two buckets that bracket the target kJ/kg
  const sorted = [...buckets]
    .filter((b) => b[duration] != null)
    .sort((a, b) => a.kj_kg_min - b.kj_kg_min);
  if (sorted.length < 2) return null;

  // Bucket midpoints
  const midpoint = (b) =>
    b.kj_kg_max != null
      ? (b.kj_kg_min + b.kj_kg_max) / 2
      : b.kj_kg_min + 5; // assume 5 kJ/kg width for open-ended bucket

  // If target is within the range of our buckets, interpolate
  // If beyond, extrapolate from the last two buckets
  let lowerBucket = sorted[0];
  let upperBucket = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    const lowerMid = midpoint(sorted[i]);
    const upperMid = midpoint(sorted[i + 1]);
    if (targetKjPerKg >= lowerMid && targetKjPerKg <= upperMid) {
      lowerBucket = sorted[i];
      upperBucket = sorted[i + 1];
      break;
    }
  }

  const lowerMid = midpoint(lowerBucket);
  const upperMid = midpoint(upperBucket);
  const lowerPower = lowerBucket[duration];
  const upperPower = upperBucket[duration];

  if (lowerMid === upperMid) return { predictedWatts: lowerPower, confidence: "low" };

  // Linear interpolation (or extrapolation)
  const slope = (upperPower - lowerPower) / (upperMid - lowerMid);
  const predicted = Math.round(lowerPower + slope * (targetKjPerKg - lowerMid));

  const isExtrapolation = targetKjPerKg > midpoint(sorted[sorted.length - 1]);
  const confidence = isExtrapolation ? "low" : sorted.length >= 3 ? "medium" : "low";

  return { predictedWatts: Math.max(0, predicted), confidence };
}

/**
 * Format durability context for AI analysis.
 *
 * @param {Object|null} durabilityData - Per-ride data from computeDurabilityData
 * @param {number|null} aggregateScore - 90-day avg from power_profiles
 * @param {Array|null} trend - [{ date, score }]
 * @returns {string}
 */
export function formatDurabilityForAI(durabilityData, aggregateScore, trend) {
  if (!durabilityData && aggregateScore == null) return "";

  const parts = [];

  if (durabilityData) {
    const { total_kj_per_kg, score_5m, score_20m, buckets } = durabilityData;
    parts.push(`Ride work: ${total_kj_per_kg} kJ/kg`);

    if (score_5m != null) {
      parts.push(`5m power retention at 30+ kJ/kg: ${Math.round(score_5m * 100)}%`);
    }
    if (score_20m != null) {
      parts.push(`20m power retention: ${Math.round(score_20m * 100)}%`);
    }

    // Show fresh vs fatigued for key durations
    if (buckets?.length >= 2) {
      const fresh = buckets.find((b) => b.kj_kg_min === 0);
      const fatigued = buckets[buckets.length - 1];
      if (fresh?.best_5m && fatigued?.best_5m) {
        parts.push(
          `Fresh 5m: ${fresh.best_5m}W → Fatigued 5m: ${fatigued.best_5m}W`
        );
      }
    }
  }

  if (aggregateScore != null) {
    parts.push(`90-day avg durability: ${Math.round(aggregateScore * 100)}%`);
  }

  if (trend?.length >= 4) {
    const first = trend[0].score;
    const last = trend[trend.length - 1].score;
    const delta = Math.round((last - first) * 100);
    if (delta !== 0) {
      parts.push(
        `Trend: ${delta > 0 ? "+" : ""}${delta}% over ${trend.length} rides`
      );
    }
  }

  return parts.length > 0
    ? `\n--- DURABILITY & FATIGUE RESISTANCE ---\n${parts.join("\n")}`
    : "";
}

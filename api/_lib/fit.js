/**
 * FIT file parser utility.
 * Converts binary .FIT files (Garmin/Wahoo/etc.) into the streams format
 * expected by computeActivityMetrics() in metrics.js.
 */
import FitParser from "fit-file-parser";
import crypto from "crypto";

// Map FIT sport enum values to our activity_type strings
const SPORT_MAP = {
  cycling: "ride",
  running: "run",
  swimming: "swim",
  walking: "walk",
  hiking: "hike",
  generic: "workout",
  transition: "transition",
  multisport: "multisport",
};

/**
 * Parse a .FIT file buffer into structured activity data.
 *
 * @param {Buffer} buffer - Raw FIT file binary data
 * @param {string} filename - Original filename (for fallback source_id)
 * @returns {{ metadata: object, streams: object }}
 *
 * metadata: {
 *   started_at,           // ISO string
 *   duration_seconds,     // total elapsed time
 *   distance_meters,      // total distance
 *   elevation_gain_meters,
 *   activity_type,        // "ride", "run", etc.
 *   device_serial,        // for source_id generation
 *   calories,
 *   avg_temperature,
 *   avg_speed_mps,
 *   max_speed_mps,
 *   source_id,            // "tp_" + hash for dedup
 *   original_filename,
 * }
 *
 * streams: {
 *   watts:     { data: number[] },
 *   heartrate: { data: number[] },
 *   cadence:   { data: number[] },
 *   time:      { data: number[] },  // elapsed seconds from start
 *   altitude:  { data: number[] },
 *   left_right_balance: { data: number[] },  // left % per sample (0-100), empty if no dual-sided PM
 * }
 */
export function parseFitFile(buffer, filename = "unknown.fit") {
  const parser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "cascade",
  });

  // Parse synchronously via callback
  let fitData = null;
  let parseError = null;
  parser.parse(buffer, (err, data) => {
    if (err) parseError = err;
    else fitData = data;
  });

  if (parseError) throw new Error(`FIT parse error: ${parseError.message || parseError}`);
  if (!fitData) throw new Error("FIT parse returned no data");

  // Extract session metadata (summary of the activity)
  const session = fitData.sessions?.[0] || {};
  const activity = fitData.activity || {};
  const deviceInfo = fitData.device_infos?.[0] || {};
  const records = fitData.records || [];
  const fitLaps = fitData.laps || [];

  if (records.length === 0) {
    throw new Error("FIT file contains no records");
  }

  // --- Build metadata ---
  const startTime = session.start_time || session.timestamp || records[0]?.timestamp;
  const startedAt = startTime instanceof Date
    ? startTime.toISOString()
    : new Date(startTime).toISOString();

  const durationSeconds = Math.round(
    session.total_elapsed_time || session.total_timer_time ||
    (records.length > 1
      ? (new Date(records[records.length - 1].timestamp) - new Date(records[0].timestamp)) / 1000
      : 0)
  );

  const distanceMeters = session.total_distance || null;
  const calories = session.total_calories || null;

  // Sport type
  const sportRaw = (session.sport || activity.sport || "cycling").toString().toLowerCase();
  const activityType = SPORT_MAP[sportRaw] || "ride";

  // Speed
  const avgSpeedMps = session.enhanced_avg_speed || session.avg_speed || null;
  const maxSpeedMps = session.enhanced_max_speed || session.max_speed || null;

  // Temperature
  const avgTemperature = session.avg_temperature ?? null;

  // Device serial for source_id generation
  const deviceSerial = String(
    deviceInfo.serial_number || session.serial_number || activity.serial_number || ""
  );

  // --- Build streams from records ---
  const watts = [];
  const heartrate = [];
  const cadence = [];
  const time = [];
  const altitude = [];
  const lrBalance = [];

  const firstTimestamp = new Date(records[0].timestamp).getTime();
  let lastHr = 0;
  let lastAlt = 0;

  for (const rec of records) {
    // Elapsed time in seconds from start
    const recTime = new Date(rec.timestamp).getTime();
    const elapsed = (recTime - firstTimestamp) / 1000;
    time.push(Math.round(elapsed));

    // Power — zero if missing
    const power = rec.power ?? rec.Power ?? 0;
    watts.push(Math.max(0, Math.round(power)));

    // Heart rate — forward-fill if missing
    const hr = rec.heart_rate ?? rec.heartRate ?? null;
    if (hr !== null && hr > 0) {
      lastHr = hr;
    }
    heartrate.push(Math.round(lastHr));

    // Cadence — zero if missing
    const cad = rec.cadence ?? rec.Cadence ?? 0;
    cadence.push(Math.max(0, Math.round(cad)));

    // Altitude — forward-fill if missing
    const alt = rec.enhanced_altitude ?? rec.altitude ?? null;
    if (alt !== null) {
      lastAlt = alt;
    }
    altitude.push(Math.round(lastAlt * 10) / 10);

    // L/R power balance — from dual-sided power meters
    // FIT protocol: left_right_balance is a uint8, bit 7 = "right" flag,
    // bits 0-6 = contribution %. If bit 7 is set, value is right %;
    // otherwise it's left %. fit-file-parser may also expose a plain 0-100 value.
    const lrRaw = rec.left_right_balance ?? rec.leftRightBalance ?? null;
    if (lrRaw != null && lrRaw !== 0 && lrRaw !== 127 && lrRaw !== 128 && lrRaw !== 255) {
      // fit-file-parser typically gives the decoded percentage directly
      // Values > 100 use FIT encoding: bit 7 (128) = right side indicator
      let leftPct;
      if (lrRaw > 100) {
        // FIT encoded: strip bit 7, remaining is the contribution %
        const pct = lrRaw & 0x7F;
        const isRight = (lrRaw & 0x80) !== 0;
        leftPct = isRight ? (100 - pct) : pct;
      } else {
        // Already decoded as left %
        leftPct = lrRaw;
      }
      if (leftPct >= 0 && leftPct <= 100) {
        lrBalance.push(Math.round(leftPct * 10) / 10);
      }
    }
  }

  // Compute elevation gain from altitude stream
  let elevationGain = 0;
  for (let i = 1; i < altitude.length; i++) {
    const diff = altitude[i] - altitude[i - 1];
    if (diff > 0) elevationGain += diff;
  }
  // Use session value if available and larger (it accounts for smoothing)
  const elevationGainMeters = Math.round(
    Math.max(elevationGain, session.total_ascent || 0)
  );

  // Generate a stable source_id for dedup
  const hashInput = deviceSerial
    ? `${deviceSerial}_${startedAt}`
    : `${filename}_${startedAt}`;
  const sourceId = "tp_" + crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

  const metadata = {
    started_at: startedAt,
    duration_seconds: durationSeconds,
    distance_meters: distanceMeters ? Math.round(distanceMeters) : null,
    elevation_gain_meters: elevationGainMeters,
    activity_type: activityType,
    device_serial: deviceSerial || null,
    calories: calories ? Math.round(calories) : null,
    avg_temperature: avgTemperature,
    avg_speed_mps: avgSpeedMps,
    max_speed_mps: maxSpeedMps,
    source_id: sourceId,
    original_filename: filename,
  };

  // Compute L/R balance summary if we have data
  let lrBalanceSummary = null;
  if (lrBalance.length > 10) {
    const avgLeft = Math.round(lrBalance.reduce((s, v) => s + v, 0) / lrBalance.length * 10) / 10;
    const avgRight = Math.round((100 - avgLeft) * 10) / 10;
    lrBalanceSummary = {
      avg: [avgLeft, avgRight],
      samples: lrBalance.length,
    };
  }

  const streams = {
    watts: { data: watts },
    heartrate: { data: heartrate.some(v => v > 0) ? heartrate : [] },
    cadence: { data: cadence },
    time: { data: time },
    altitude: { data: altitude },
    left_right_balance: { data: lrBalance },
  };

  return { metadata, streams, lrBalance: lrBalanceSummary, fitLaps: fitLaps.length > 0 ? fitLaps : null };
}

/**
 * TCX file parser utility.
 * Converts Garmin TrainingCenterDatabase XML files into the streams format
 * expected by computeActivityMetrics() in metrics.js.
 *
 * Returns the same { metadata, streams, lrBalance } shape as parseFitFile().
 */
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

const SPORT_MAP = {
  biking: "ride",
  cycling: "ride",
  running: "run",
  swimming: "swim",
  walking: "walk",
  hiking: "hike",
  other: "workout",
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["Lap", "Trackpoint", "Track"].includes(name),
});

/**
 * Parse a TCX file buffer into structured activity data.
 *
 * @param {Buffer} buffer - Raw TCX XML data
 * @param {string} filename - Original filename (for fallback source_id)
 * @returns {{ metadata: object, streams: object, lrBalance: object|null }}
 */
export function parseTcxFile(buffer, filename = "unknown.tcx") {
  const xml = buffer.toString("utf-8");
  const parsed = xmlParser.parse(xml);

  const db = parsed.TrainingCenterDatabase;
  if (!db) throw new Error("Invalid TCX: missing TrainingCenterDatabase root");

  const activity = db.Activities?.Activity;
  if (!activity) throw new Error("TCX contains no activity");

  // Handle single activity or first in array
  const act = Array.isArray(activity) ? activity[0] : activity;

  // Sport type
  const sportRaw = (act["@_Sport"] || "Biking").toLowerCase();
  const activityType = SPORT_MAP[sportRaw] || "ride";

  // Collect all trackpoints across all laps
  const laps = Array.isArray(act.Lap) ? act.Lap : act.Lap ? [act.Lap] : [];
  const trackpoints = [];
  let totalCalories = 0;

  for (const lap of laps) {
    totalCalories += lap.Calories || 0;
    const tracks = Array.isArray(lap.Track) ? lap.Track : lap.Track ? [lap.Track] : [];
    for (const track of tracks) {
      const pts = Array.isArray(track.Trackpoint) ? track.Trackpoint : track.Trackpoint ? [track.Trackpoint] : [];
      trackpoints.push(...pts);
    }
  }

  if (trackpoints.length === 0) {
    throw new Error("TCX file contains no trackpoints");
  }

  // Parse timestamps and build streams
  const watts = [];
  const heartrate = [];
  const cadence = [];
  const time = [];
  const altitude = [];

  const firstTime = new Date(trackpoints[0].Time).getTime();
  let lastHr = 0;
  let lastAlt = 0;
  let maxSpeed = 0;
  let totalDistance = 0;

  for (const pt of trackpoints) {
    if (!pt.Time) continue;

    const elapsed = (new Date(pt.Time).getTime() - firstTime) / 1000;
    if (elapsed < 0) continue;
    time.push(Math.round(elapsed));

    // Power — check Extensions for Watts (various namespace patterns)
    const ext = pt.Extensions;
    let power = 0;
    if (ext) {
      // Common patterns: TPX > Watts, ns3:TPX > ns3:Watts, etc.
      const tpx = ext.TPX || ext["ns3:TPX"] || ext["x:TPX"] || ext;
      power = tpx?.Watts || tpx?.["ns3:Watts"] || tpx?.watts || 0;
    }
    watts.push(Math.max(0, Math.round(Number(power) || 0)));

    // Heart rate
    const hr = pt.HeartRateBpm?.Value || pt.HeartRateBpm || null;
    if (hr !== null && Number(hr) > 0) {
      lastHr = Number(hr);
    }
    heartrate.push(Math.round(lastHr));

    // Cadence — TCX has it at trackpoint level or in extensions
    let cad = pt.Cadence || 0;
    if (!cad && ext) {
      const tpx = ext.TPX || ext["ns3:TPX"] || ext["x:TPX"] || ext;
      cad = tpx?.RunCadence || tpx?.Cadence || 0;
    }
    cadence.push(Math.max(0, Math.round(Number(cad) || 0)));

    // Altitude
    const alt = pt.AltitudeMeters;
    if (alt !== undefined && alt !== null) {
      lastAlt = Number(alt);
    }
    altitude.push(Math.round(lastAlt * 10) / 10);

    // Distance (cumulative in TCX)
    if (pt.DistanceMeters != null) {
      totalDistance = Number(pt.DistanceMeters);
    }

    // Speed from extensions
    if (ext) {
      const tpx = ext.TPX || ext["ns3:TPX"] || ext["x:TPX"] || ext;
      const speed = Number(tpx?.Speed || 0);
      if (speed > maxSpeed) maxSpeed = speed;
    }
  }

  // Compute duration
  const durationSeconds = time.length > 1 ? time[time.length - 1] : 0;

  // Compute elevation gain from altitude stream
  let elevationGain = 0;
  for (let i = 1; i < altitude.length; i++) {
    const diff = altitude[i] - altitude[i - 1];
    if (diff > 0) elevationGain += diff;
  }

  // Average speed
  const avgSpeedMps = durationSeconds > 0 && totalDistance > 0
    ? totalDistance / durationSeconds
    : null;

  // Started at
  const startedAt = new Date(trackpoints[0].Time).toISOString();

  // Device info from Creator element
  const creator = act.Creator;
  const deviceSerial = creator?.UnitId || creator?.["@_UnitId"] || "";

  // Source ID
  const hashInput = deviceSerial
    ? `${deviceSerial}_${startedAt}`
    : `${filename}_${startedAt}`;
  const sourceId = "tp_" + crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

  const metadata = {
    started_at: startedAt,
    duration_seconds: durationSeconds,
    distance_meters: totalDistance ? Math.round(totalDistance) : null,
    elevation_gain_meters: Math.round(elevationGain),
    activity_type: activityType,
    device_serial: deviceSerial || null,
    calories: totalCalories || null,
    avg_temperature: null, // TCX doesn't typically include temperature
    avg_speed_mps: avgSpeedMps ? Math.round(avgSpeedMps * 100) / 100 : null,
    max_speed_mps: maxSpeed > 0 ? Math.round(maxSpeed * 100) / 100 : null,
    source_id: sourceId,
    original_filename: filename,
  };

  const streams = {
    watts: { data: watts },
    heartrate: { data: heartrate.some(v => v > 0) ? heartrate : [] },
    cadence: { data: cadence },
    time: { data: time },
    altitude: { data: altitude },
    left_right_balance: { data: [] },
  };

  return { metadata, streams, lrBalance: null };
}

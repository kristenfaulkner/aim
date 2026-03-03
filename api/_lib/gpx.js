/**
 * GPX file parser utility.
 * Converts GPS Exchange Format XML files into the streams format
 * expected by computeActivityMetrics() in metrics.js.
 *
 * Returns the same { metadata, streams, lrBalance } shape as parseFitFile().
 */
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["trk", "trkseg", "trkpt"].includes(name),
});

/**
 * Haversine distance between two lat/lon points in meters.
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Parse a GPX file buffer into structured activity data.
 *
 * @param {Buffer} buffer - Raw GPX XML data
 * @param {string} filename - Original filename (for fallback source_id)
 * @returns {{ metadata: object, streams: object, lrBalance: object|null }}
 */
export function parseGpxFile(buffer, filename = "unknown.gpx") {
  const xml = buffer.toString("utf-8");
  const parsed = xmlParser.parse(xml);

  const gpx = parsed.gpx;
  if (!gpx) throw new Error("Invalid GPX: missing gpx root element");

  const tracks = Array.isArray(gpx.trk) ? gpx.trk : gpx.trk ? [gpx.trk] : [];
  if (tracks.length === 0) throw new Error("GPX contains no tracks");

  // Use first track
  const trk = tracks[0];

  // Activity type from <type> element
  const typeRaw = (trk.type || gpx.type || "").toString().toLowerCase();
  const activityType = typeRaw.includes("run") ? "run"
    : typeRaw.includes("swim") ? "swim"
    : typeRaw.includes("walk") ? "walk"
    : typeRaw.includes("hike") ? "hike"
    : "ride";

  // Collect all trackpoints across all segments
  const segments = Array.isArray(trk.trkseg) ? trk.trkseg : trk.trkseg ? [trk.trkseg] : [];
  const trackpoints = [];
  for (const seg of segments) {
    const pts = Array.isArray(seg.trkpt) ? seg.trkpt : seg.trkpt ? [seg.trkpt] : [];
    trackpoints.push(...pts);
  }

  if (trackpoints.length === 0) {
    throw new Error("GPX file contains no trackpoints");
  }

  // Parse trackpoints and build streams
  const watts = [];
  const heartrate = [];
  const cadence = [];
  const time = [];
  const altitude = [];

  const firstTime = new Date(trackpoints[0].time).getTime();
  let lastHr = 0;
  let lastAlt = 0;
  let totalDistance = 0;
  let maxSpeed = 0;
  let prevLat = null;
  let prevLon = null;
  let prevTime = null;

  for (const pt of trackpoints) {
    if (!pt.time) continue;

    const ptTime = new Date(pt.time).getTime();
    const elapsed = (ptTime - firstTime) / 1000;
    if (elapsed < 0) continue;
    time.push(Math.round(elapsed));

    // Lat/lon for distance computation
    const lat = Number(pt["@_lat"]);
    const lon = Number(pt["@_lon"]);
    if (prevLat !== null && !isNaN(lat) && !isNaN(lon)) {
      const segDist = haversine(prevLat, prevLon, lat, lon);
      totalDistance += segDist;

      // Compute speed for max speed tracking
      const dt = (ptTime - prevTime) / 1000;
      if (dt > 0) {
        const speed = segDist / dt;
        if (speed > maxSpeed && speed < 50) maxSpeed = speed; // cap at 50 m/s to filter GPS noise
      }
    }
    if (!isNaN(lat) && !isNaN(lon)) {
      prevLat = lat;
      prevLon = lon;
      prevTime = ptTime;
    }

    // Extensions — various namespace patterns for HR, power, cadence
    const ext = pt.extensions || pt.Extensions;
    const tpx = ext?.TrackPointExtension || ext?.["gpxtpx:TrackPointExtension"] || ext?.TPX || ext || {};

    // Power
    const power = tpx.power || tpx.watts || tpx.Watts || tpx["power:power"] || 0;
    watts.push(Math.max(0, Math.round(Number(power) || 0)));

    // Heart rate
    const hr = tpx.hr || tpx["gpxtpx:hr"] || tpx.heartrate || tpx.HeartRate || null;
    if (hr !== null && Number(hr) > 0) {
      lastHr = Number(hr);
    }
    heartrate.push(Math.round(lastHr));

    // Cadence
    const cad = tpx.cad || tpx["gpxtpx:cad"] || tpx.cadence || tpx.Cadence || 0;
    cadence.push(Math.max(0, Math.round(Number(cad) || 0)));

    // Elevation
    const ele = pt.ele;
    if (ele !== undefined && ele !== null) {
      lastAlt = Number(ele);
    }
    altitude.push(Math.round(lastAlt * 10) / 10);
  }

  // Duration
  const durationSeconds = time.length > 1 ? time[time.length - 1] : 0;

  // Elevation gain
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
  const startedAt = new Date(trackpoints[0].time).toISOString();

  // Source ID (GPX has no device serial — use filename)
  const hashInput = `${filename}_${startedAt}`;
  const sourceId = "tp_" + crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

  const metadata = {
    started_at: startedAt,
    duration_seconds: durationSeconds,
    distance_meters: totalDistance ? Math.round(totalDistance) : null,
    elevation_gain_meters: Math.round(elevationGain),
    activity_type: activityType,
    device_serial: null,
    calories: null, // GPX doesn't include calories
    avg_temperature: null,
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

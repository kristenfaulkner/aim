import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";
import FitParser from "fit-file-parser";
import { XMLParser } from "fast-xml-parser";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

/**
 * POST /api/activities/parse-file
 * Body: { filename: string, data: string (base64) }
 * Returns parsed performance fields from .fit, .gpx, .tcx, .csv files.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { filename, data } = req.body || {};
  if (!filename || !data) return res.status(400).json({ error: "No file provided" });

  const ext = filename.split(".").pop().toLowerCase();
  const buffer = Buffer.from(data, "base64");

  // Fetch user FTP for TSS/IF computation
  let ftp = null;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ftp_watts")
      .eq("id", session.userId)
      .single();
    ftp = profile?.ftp_watts || null;
  } catch {}

  try {
    let parsed = {};
    let activity_type_hint = null;

    if (ext === "fit") {
      ({ parsed, activity_type_hint } = parseFit(buffer, ftp));
    } else if (ext === "gpx") {
      ({ parsed, activity_type_hint } = parseGpx(buffer));
    } else if (ext === "tcx") {
      ({ parsed, activity_type_hint } = parseTcx(buffer));
    } else if (ext === "csv") {
      ({ parsed } = parseCsv(buffer));
    } else {
      return res.status(422).json({ error: "Could not parse file", detail: "Unsupported format" });
    }

    // Remove empty values
    for (const key of Object.keys(parsed)) {
      if (parsed[key] == null || parsed[key] === "") delete parsed[key];
    }

    return res.status(200).json({ success: true, parsed, activity_type_hint });
  } catch (err) {
    console.error("Parse file error:", err);
    return res.status(422).json({ error: "Could not parse file", detail: "Unsupported format or corrupt file" });
  }
}

// ── FIT Parser ──

function parseFit(buffer, ftp) {
  const parser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "cascade",
  });

  let fitData = null;
  let parseError = null;
  parser.parse(buffer, (err, data) => {
    if (err) parseError = err;
    else fitData = data;
  });
  if (parseError) throw parseError;
  if (!fitData) throw new Error("FIT parse returned no data");

  const s = fitData.sessions?.[0] || {};
  const parsed = {};

  const duration = Math.round(s.total_elapsed_time || s.total_timer_time || 0);
  if (duration) parsed.duration_seconds = duration;

  if (s.total_distance) parsed.distance = String(Math.round((s.total_distance / 1609.34) * 10) / 10);
  if (s.enhanced_avg_speed || s.avg_speed) parsed.avg_speed = String(Math.round(((s.enhanced_avg_speed || s.avg_speed) * 2.237) * 10) / 10);
  if (s.avg_power) parsed.avg_power = String(Math.round(s.avg_power));
  if (s.normalized_power) parsed.norm_power = String(Math.round(s.normalized_power));
  if (s.avg_heart_rate) parsed.avg_hr = String(Math.round(s.avg_heart_rate));
  if (s.max_heart_rate) parsed.max_hr = String(Math.round(s.max_heart_rate));
  if (s.total_ascent) parsed.elev_gain = String(Math.round(s.total_ascent * 3.281));
  if (s.total_descent) parsed.elev_loss = String(Math.round(s.total_descent * 3.281));
  if (s.total_calories) parsed.calories = String(Math.round(s.total_calories));
  if (s.total_work) parsed.work = String(Math.round(s.total_work / 1000));

  // Compute TSS and IF if we have NP and FTP
  const np = s.normalized_power || (parsed.norm_power ? Number(parsed.norm_power) : null);
  if (np && ftp && duration) {
    const tss = Math.round((duration * np * (np / ftp)) / (ftp * 3600) * 100);
    parsed.tss = String(tss);
    parsed.if_score = (np / ftp).toFixed(2);
  }

  // Activity type hint
  const sportRaw = (s.sport || "").toString().toLowerCase();
  let activity_type_hint = null;
  if (sportRaw === "cycling") activity_type_hint = "cycling";
  else if (sportRaw === "running") activity_type_hint = "running";
  else if (sportRaw === "swimming") activity_type_hint = "swimming";

  return { parsed, activity_type_hint };
}

// ── GPX Parser ──

function parseGpx(buffer) {
  const xml = buffer.toString("utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const gpx = doc.gpx || doc;
  const parsed = {};

  // Get trackpoints
  let trkpts = [];
  const trk = gpx.trk;
  if (trk) {
    const segs = Array.isArray(trk) ? trk[0]?.trkseg : trk.trkseg;
    const seg = Array.isArray(segs) ? segs[0] : segs;
    trkpts = Array.isArray(seg?.trkpt) ? seg.trkpt : seg?.trkpt ? [seg.trkpt] : [];
  }

  if (trkpts.length < 2) return { parsed, activity_type_hint: null };

  // Duration
  const firstTime = new Date(trkpts[0].time);
  const lastTime = new Date(trkpts[trkpts.length - 1].time);
  const duration = Math.round((lastTime - firstTime) / 1000);
  if (duration > 0) parsed.duration_seconds = duration;

  // Distance (haversine) and elevation
  let totalDist = 0;
  let elevGain = 0;
  let elevLoss = 0;
  let hrSum = 0;
  let hrCount = 0;

  for (let i = 1; i < trkpts.length; i++) {
    const p0 = trkpts[i - 1];
    const p1 = trkpts[i];
    totalDist += haversine(
      Number(p0["@_lat"]), Number(p0["@_lon"]),
      Number(p1["@_lat"]), Number(p1["@_lon"])
    );
    const alt0 = getAltitude(p0);
    const alt1 = getAltitude(p1);
    if (alt0 != null && alt1 != null) {
      const diff = alt1 - alt0;
      if (diff > 0) elevGain += diff;
      else elevLoss += Math.abs(diff);
    }
    const hr = getHR(p1);
    if (hr) { hrSum += hr; hrCount++; }
  }
  // Check first point HR
  const hr0 = getHR(trkpts[0]);
  if (hr0) { hrSum += hr0; hrCount++; }

  if (totalDist > 0) parsed.distance = String(Math.round((totalDist / 1609.34) * 10) / 10);
  if (elevGain > 0) parsed.elev_gain = String(Math.round(elevGain * 3.281));
  if (elevLoss > 0) parsed.elev_loss = String(Math.round(elevLoss * 3.281));
  if (hrCount > 0) parsed.avg_hr = String(Math.round(hrSum / hrCount));

  // Activity type hint from <type> element
  let activity_type_hint = null;
  const typeEl = gpx.trk?.type || (Array.isArray(gpx.trk) ? gpx.trk[0]?.type : null);
  if (typeof typeEl === "string") {
    const t = typeEl.toLowerCase();
    if (t.includes("cycl") || t.includes("bik")) activity_type_hint = "cycling";
    else if (t.includes("run")) activity_type_hint = "running";
    else if (t.includes("swim")) activity_type_hint = "swimming";
    else if (t.includes("hik")) activity_type_hint = "hiking";
  }

  return { parsed, activity_type_hint };
}

// ── TCX Parser ──

function parseTcx(buffer) {
  const xml = buffer.toString("utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const parsed = {};

  const tcd = doc.TrainingCenterDatabase || doc;
  const activities = tcd.Activities?.Activity;
  const activity = Array.isArray(activities) ? activities[0] : activities;
  if (!activity) return { parsed, activity_type_hint: null };

  // Activity type hint
  const sport = (activity["@_Sport"] || "").toLowerCase();
  let activity_type_hint = null;
  if (sport.includes("bik") || sport.includes("cycl")) activity_type_hint = "cycling";
  else if (sport.includes("run")) activity_type_hint = "running";
  else if (sport.includes("swim")) activity_type_hint = "swimming";

  // Aggregate across laps
  const laps = Array.isArray(activity.Lap) ? activity.Lap : activity.Lap ? [activity.Lap] : [];
  let totalTime = 0;
  let totalDist = 0;
  let totalCals = 0;
  let hrSum = 0;
  let hrCount = 0;
  let elevGain = 0;
  let elevLoss = 0;

  for (const lap of laps) {
    if (lap.TotalTimeSeconds) totalTime += Number(lap.TotalTimeSeconds);
    if (lap.DistanceMeters) totalDist += Number(lap.DistanceMeters);
    if (lap.Calories) totalCals += Number(lap.Calories);

    const tracks = Array.isArray(lap.Track) ? lap.Track : lap.Track ? [lap.Track] : [];
    for (const track of tracks) {
      const pts = Array.isArray(track.Trackpoint) ? track.Trackpoint : track.Trackpoint ? [track.Trackpoint] : [];
      let prevAlt = null;
      for (const pt of pts) {
        const hr = pt.HeartRateBpm?.Value;
        if (hr) { hrSum += Number(hr); hrCount++; }
        const alt = pt.AltitudeMeters != null ? Number(pt.AltitudeMeters) : null;
        if (alt != null && prevAlt != null) {
          const diff = alt - prevAlt;
          if (diff > 0) elevGain += diff;
          else elevLoss += Math.abs(diff);
        }
        if (alt != null) prevAlt = alt;
      }
    }
  }

  if (totalTime > 0) parsed.duration_seconds = Math.round(totalTime);
  if (totalDist > 0) parsed.distance = String(Math.round((totalDist / 1609.34) * 10) / 10);
  if (totalCals > 0) parsed.calories = String(Math.round(totalCals));
  if (hrCount > 0) parsed.avg_hr = String(Math.round(hrSum / hrCount));
  if (elevGain > 0) parsed.elev_gain = String(Math.round(elevGain * 3.281));
  if (elevLoss > 0) parsed.elev_loss = String(Math.round(elevLoss * 3.281));

  return { parsed, activity_type_hint };
}

// ── CSV Parser ──

function parseCsv(buffer) {
  const text = buffer.toString("utf-8");
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { parsed: {} };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const values = lines[1].split(",").map(v => v.trim());

  const fieldMap = {
    duration: "duration_seconds", duration_seconds: "duration_seconds", elapsed_time: "duration_seconds",
    distance: "distance", distance_mi: "distance", distance_miles: "distance",
    avg_power: "avg_power", average_power: "avg_power", power: "avg_power",
    normalized_power: "norm_power", np: "norm_power",
    avg_hr: "avg_hr", average_hr: "avg_hr", avg_heart_rate: "avg_hr", average_heart_rate: "avg_hr",
    max_hr: "max_hr", max_heart_rate: "max_hr",
    tss: "tss", training_stress_score: "tss",
    calories: "calories", kcal: "calories",
    elevation_gain: "elev_gain", elev_gain: "elev_gain", total_ascent: "elev_gain",
    elevation_loss: "elev_loss", elev_loss: "elev_loss", total_descent: "elev_loss",
    avg_speed: "avg_speed", average_speed: "avg_speed",
    work: "work", work_kj: "work",
    if: "if_score", intensity_factor: "if_score",
  };

  const parsed = {};
  for (let i = 0; i < headers.length; i++) {
    const mapped = fieldMap[headers[i]];
    if (mapped && values[i] && values[i] !== "" && values[i] !== "0") {
      parsed[mapped] = values[i];
    }
  }

  return { parsed, activity_type_hint: null };
}

// ── Helpers ──

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getAltitude(pt) {
  const ele = pt.ele;
  return ele != null ? Number(ele) : null;
}

function getHR(pt) {
  // GPX extensions can use different namespaces
  const ext = pt.extensions;
  if (!ext) return null;
  // Try common patterns
  for (const key of Object.keys(ext)) {
    const val = ext[key];
    if (typeof val === "object" && val !== null) {
      if (val.hr) return Number(val.hr);
      // Nested namespace
      for (const k2 of Object.keys(val)) {
        if (k2.toLowerCase().includes("hr") && typeof val[k2] !== "object") return Number(val[k2]);
      }
    }
  }
  return null;
}

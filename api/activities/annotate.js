import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

// Canonical tag aliases — maps any variant to the canonical stored form.
// Keys are lowercase alias strings; values are canonical tags.
const TAG_ALIASES = {
  // ── Low cadence (Strength & Endurance) ──
  "s&e": "low cadence",
  "se": "low cadence",
  "strength and endurance": "low cadence",
  "strength & endurance": "low cadence",
  "force reps": "low cadence",
  "force rep": "low cadence",
  "big gear": "low cadence",
  "big gear reps": "low cadence",
  "heavy gear": "low cadence",
  "muscular endurance": "low cadence",
  "low-cadence": "low cadence",

  // ── High cadence ──
  "spinups": "high cadence",
  "spin ups": "high cadence",
  "spin-ups": "high cadence",
  "spin up": "high cadence",
  "leg speed": "high cadence",
  "cadence drills": "high cadence",
  "cadence drill": "high cadence",
  "spin drill": "high cadence",
  "high-cadence": "high cadence",

  // ── VO2max ──
  "vo2 max": "vo2max",
  "v02max": "vo2max",
  "vo2": "vo2max",
  "map": "vo2max",           // maximum aerobic power
  "aerobic power": "vo2max",
  "5min power": "vo2max",
  "5 min power": "vo2max",

  // ── Sweet spot ──
  "sweetspot": "sweet spot",
  "ss": "sweet spot",
  "sst": "sweet spot",       // sweet spot training

  // ── Threshold ──
  "ftp": "threshold",
  "lactate threshold": "threshold",
  "lt": "threshold",
  "at": "threshold",         // anaerobic threshold
  "ltp": "threshold",        // lactate threshold power
  "mlss": "threshold",       // maximal lactate steady state

  // ── Time trial ──
  "tt": "time trial",
  "tt bike": "time trial",
  "time trial bike": "time trial",
  "timetrial": "time trial",
  "time-trial": "time trial",
  "chrono": "time trial",    // French
  "clm": "time trial",       // contre la montre
  "contre la montre": "time trial",

  // ── Race ──
  "crit": "race",
  "criterium": "race",
  "criterion": "race",
  "crits": "race",
  "road race": "race",
  "rr": "race",
  "gran fondo": "race",
  "sportive": "race",
  "circuit race": "race",
  "masters race": "race",

  // ── Indoor ──
  "zwift": "indoor",
  "trainer": "indoor",
  "turbo": "indoor",
  "turbo trainer": "indoor",
  "rouvy": "indoor",
  "rollers": "indoor",
  "smart trainer": "indoor",
  "kickr": "indoor",
  "tacx": "indoor",
  "wahoo trainer": "indoor",

  // ── Group ride ──
  "group": "group ride",
  "chain gang": "group ride",
  "chaingang": "group ride",
  "club ride": "group ride",
  "team ride": "group ride",
  "shop ride": "group ride",
  "hammerfest": "group ride",

  // ── Recovery ──
  "active recovery": "recovery",
  "active rest": "recovery",
  "flush": "recovery",
  "flush ride": "recovery",
  "ez": "recovery",
  "easy ride": "recovery",

  // ── Endurance ──
  "lsd": "endurance",        // long slow distance
  "base": "endurance",
  "base miles": "endurance",
  "aerobic base": "endurance",
  "long ride": "endurance",
  "zone 2": "endurance",
  "z2": "endurance",

  // ── Hill repeats ──
  "hills": "hill repeats",
  "climbs": "hill repeats",
  "power climbs": "hill repeats",
  "ramps": "hill repeats",

  // ── Sprint ──
  "jumps": "sprint",
  "snap": "sprint",
  "accelerations": "sprint",
  "accels": "sprint",
  "max sprint": "sprint",
  "flying 200": "sprint",

  // ── Test ──
  "ftp test": "test",
  "ramp test": "test",
  "power test": "test",
  "20 min test": "test",
  "20min test": "test",
  "1 hr test": "test",
  "8 min test": "test",

  // ── Openers ──
  "opener": "openers",
  "activation": "openers",
  "activation ride": "openers",
  "priming": "openers",
  "pre-race": "openers",
  "pre race": "openers",
};

/** Normalize a user-supplied tag to its canonical form. */
function normalizeTag(tag) {
  const lower = tag.trim().toLowerCase();
  return TAG_ALIASES[lower] ?? lower;
}

// Keyword patterns for extracting structured tags from free-text notes.
// Matched tags are merged with any explicitly set user_tags.
const NOTE_TAG_PATTERNS = [
  { pattern: /\bintervals?\b/i, tag: "interval" },
  { pattern: /\b(race|racing|criterium|crit|road\s*race|gran\s*fondo|sportive)\b/i, tag: "race" },
  { pattern: /\b(recovery|easy\s*spin|active\s*recovery|flush|zone\s*1|z1)\b/i, tag: "recovery" },
  { pattern: /\b(group\s*ride|chain\s*gang|club\s*ride|team\s*ride|hammerfest)\b/i, tag: "group ride" },
  { pattern: /\b(indoor|zwift|trainer|turbo|rouvy|rollers|kickr|tacx)\b/i, tag: "indoor" },
  { pattern: /\boutdoor\b/i, tag: "outdoor" },
  { pattern: /\btempo\b/i, tag: "tempo" },
  { pattern: /\b(endurance|aerobic\s*base|zone\s*2|z2|long\s*ride|base\s*miles)\b/i, tag: "endurance" },
  { pattern: /\b(hill\s*repeats?|power\s*climbs?|climbing|ramps)\b/i, tag: "hill repeats" },
  { pattern: /\b(low[- ]cadence|s&e|strength\s*(and|&)\s*endurance|force\s*reps?|big\s*gear|muscular\s*endurance)\b/i, tag: "low cadence" },
  { pattern: /\b(high[- ]cadence|spin[- ]?ups?|leg\s*speed|cadence\s*drills?)\b/i, tag: "high cadence" },
  { pattern: /\b(sweet[- ]?spot|sst)\b/i, tag: "sweet spot" },
  { pattern: /\b(vo2\s*max|vo2max|map|aerobic\s*power)\b/i, tag: "vo2max" },
  { pattern: /\b(sprints?|sprinting|max\s*effort|jumps?|accelerations?)\b/i, tag: "sprint" },
  { pattern: /\bsolo\b/i, tag: "solo" },
  { pattern: /\b(threshold|lactate\s*threshold|mlss)\b/i, tag: "threshold" },
  { pattern: /\b(time\s*trial|tt\s*bike|time\s*trial\s*bike|\btt\b|chrono|contre\s*la\s*montre|clm)\b/i, tag: "time trial" },
  { pattern: /\b(ftp\s*test|ramp\s*test|power\s*test|20\s*min\s*test|8\s*min\s*test)\b/i, tag: "test" },
  { pattern: /\b(openers?|activation\s*ride?|priming|pre[- ]race)\b/i, tag: "openers" },
];

/**
 * Extract tags from free-text notes via keyword matching.
 * Returns only tags not already present in existingTags.
 */
function extractTagsFromNotes(notes, existingTags = []) {
  if (!notes) return [];
  const detected = [];
  for (const { pattern, tag } of NOTE_TAG_PATTERNS) {
    if (pattern.test(notes) && !existingTags.includes(tag) && !detected.includes(tag)) {
      detected.push(tag);
    }
  }
  return detected;
}

/**
 * PUT /api/activities/annotate?id=<uuid>
 * Saves user annotations (notes, rating, RPE, tags) on an activity.
 * When notes are provided, auto-extracts structured tags via keyword matching.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing activity id" });

  const { name, user_notes, user_rating, user_rpe, user_tags } = req.body;

  // Validate inputs
  if (name !== undefined && name !== null) {
    if (typeof name !== "string" || name.length > 200) {
      return res.status(400).json({ error: "Name must be a string under 200 characters" });
    }
  }

  if (user_notes !== undefined && user_notes !== null) {
    if (typeof user_notes !== "string" || user_notes.length > 5000) {
      return res.status(400).json({ error: "Notes must be a string under 5000 characters" });
    }
  }

  if (user_rating !== undefined && user_rating !== null) {
    if (!Number.isInteger(user_rating) || user_rating < 1 || user_rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }
  }

  if (user_rpe !== undefined && user_rpe !== null) {
    if (!Number.isInteger(user_rpe) || user_rpe < 1 || user_rpe > 10) {
      return res.status(400).json({ error: "RPE must be an integer between 1 and 10" });
    }
  }

  if (user_tags !== undefined && user_tags !== null) {
    if (!Array.isArray(user_tags) || user_tags.some((t) => typeof t !== "string")) {
      return res.status(400).json({ error: "Tags must be an array of strings" });
    }
  }

  // Build update object — activities table has no updated_at column
  const update = {};
  if (name !== undefined) update.name = name;
  if (user_notes !== undefined) update.user_notes = user_notes;
  if (user_rating !== undefined) update.user_rating = user_rating;
  if (user_rpe !== undefined) update.user_rpe = user_rpe;

  // When notes are provided, auto-extract tags and merge with explicit user_tags.
  // Normalize all tags (explicit + auto) to canonical form before storing.
  if (user_notes !== undefined && user_notes !== null) {
    const explicitTags = (user_tags ?? []).map(normalizeTag);
    const autoTags = extractTagsFromNotes(user_notes, explicitTags);
    update.user_tags = [...new Set([...explicitTags, ...autoTags])];
  } else if (user_tags !== undefined) {
    update.user_tags = [...new Set(user_tags.map(normalizeTag))];
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const { data, error } = await supabaseAdmin
    .from("activities")
    .update(update)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

// Canonical tag aliases — maps any variant to the canonical stored form.
// Keys are lowercase alias strings; values are canonical tags.
const TAG_ALIASES = {
  // Time trial
  "tt": "time trial",
  "tt bike": "time trial",
  "time trial bike": "time trial",
  "timetrial": "time trial",
  "time-trial": "time trial",
  // Race
  "crit": "race",
  "criterium": "race",
  "criterion": "race",
  "crits": "race",
  // Indoor
  "zwift": "indoor",
  "trainer": "indoor",
  "turbo": "indoor",
  "rouvy": "indoor",
  "turbo trainer": "indoor",
  // VO2max
  "vo2 max": "vo2max",
  "v02max": "vo2max",
  "vo2": "vo2max",
  // Sweet spot
  "sweetspot": "sweet spot",
  "ss": "sweet spot",
  // Threshold
  "ftp": "threshold",
  "lactate threshold": "threshold",
  "lt": "threshold",
  // Group ride
  "group": "group ride",
  // Hill repeats
  "hills": "hill repeats",
  "climbs": "hill repeats",
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
  { pattern: /\b(race|racing|criterium|crit)\b/i, tag: "race" },
  { pattern: /\b(recovery|easy spin|zone\s*1|z1)\b/i, tag: "recovery" },
  { pattern: /\b(group\s*ride|group)\b/i, tag: "group ride" },
  { pattern: /\b(indoor|zwift|trainer|turbo|rouvy)\b/i, tag: "indoor" },
  { pattern: /\boutdoor\b/i, tag: "outdoor" },
  { pattern: /\btempo\b/i, tag: "tempo" },
  { pattern: /\b(endurance|aerobic|zone\s*2|z2|long\s*ride)\b/i, tag: "endurance" },
  { pattern: /\b(hill\s*repeats?|climbs?|climbing|mountain)\b/i, tag: "hill repeats" },
  { pattern: /\blow[- ]cadence\b/i, tag: "low cadence" },
  { pattern: /\bhigh[- ]cadence\b/i, tag: "high cadence" },
  { pattern: /\bsweet[- ]spot\b/i, tag: "sweet spot" },
  { pattern: /\b(vo2\s*max|vo2max)\b/i, tag: "vo2max" },
  { pattern: /\b(sprints?|sprinting|max\s*effort)\b/i, tag: "sprint" },
  { pattern: /\bsolo\b/i, tag: "solo" },
  { pattern: /\b(threshold|ftp|lactate)\b/i, tag: "threshold" },
  { pattern: /\b(time\s*trial|tt\s*bike|time\s*trial\s*bike|\btt\b)\b/i, tag: "time trial" },
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

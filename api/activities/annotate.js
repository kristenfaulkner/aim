import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

/**
 * PUT /api/activities/annotate?id=<uuid>
 * Saves user annotations (notes, rating, RPE, tags) on an activity.
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

  const update = { updated_at: new Date().toISOString() };
  if (name !== undefined) update.name = name;
  if (user_notes !== undefined) update.user_notes = user_notes;
  if (user_rating !== undefined) update.user_rating = user_rating;
  if (user_rpe !== undefined) update.user_rpe = user_rpe;
  if (user_tags !== undefined) update.user_tags = user_tags;

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

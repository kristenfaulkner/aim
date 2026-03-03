import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { estimateRecoveryImpact, estimateCrossTrainingTSS } from "../_lib/cross-training.js";

const VALID_TYPES = ["strength", "yoga", "swimming", "hiking", "pilates", "other"];
const VALID_REGIONS = ["upper_body", "lower_body", "full_body", "core"];

/**
 * POST /api/cross-training/log — Log a cross-training session
 *
 * Body: { activity_type, body_region?, perceived_intensity (1-5), duration_minutes, notes?, date? }
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { activity_type, body_region, perceived_intensity, duration_minutes, notes, date } = req.body;

  // Validate required fields
  if (!activity_type || !VALID_TYPES.includes(activity_type)) {
    return res.status(400).json({ error: `activity_type must be one of: ${VALID_TYPES.join(", ")}` });
  }
  if (perceived_intensity != null && (!Number.isInteger(perceived_intensity) || perceived_intensity < 1 || perceived_intensity > 5)) {
    return res.status(400).json({ error: "perceived_intensity must be an integer between 1 and 5" });
  }
  if (duration_minutes != null && (!Number.isInteger(duration_minutes) || duration_minutes < 1)) {
    return res.status(400).json({ error: "duration_minutes must be a positive integer" });
  }
  if (body_region != null && !VALID_REGIONS.includes(body_region)) {
    return res.status(400).json({ error: `body_region must be one of: ${VALID_REGIONS.join(", ")}` });
  }

  const entry = { activity_type, body_region: body_region || null, perceived_intensity, duration_minutes };
  const recovery_impact = estimateRecoveryImpact(entry);
  const estimated_tss = estimateCrossTrainingTSS(entry);

  const record = {
    user_id: session.userId,
    date: date || new Date().toISOString().slice(0, 10),
    activity_type,
    body_region: body_region || null,
    perceived_intensity: perceived_intensity || null,
    duration_minutes: duration_minutes || null,
    notes: notes || null,
    estimated_tss,
    recovery_impact,
  };

  const { data, error } = await supabaseAdmin
    .from("cross_training_log")
    .insert(record)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ entry: data });
}

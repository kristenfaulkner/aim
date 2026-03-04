import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

// Admin user IDs who can create invite codes
const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

/**
 * POST /api/invite/create
 * Body: { code, tier, expires_at?, max_uses?, notes? }
 * Admin-only endpoint to create invite codes.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!ADMIN_IDS.includes(session.userId)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { code, tier, expires_at, max_uses, notes } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "code is required" });
  }
  if (!tier || !["starter", "pro", "elite"].includes(tier)) {
    return res.status(400).json({ error: "tier must be starter, pro, or elite" });
  }

  const normalized = code.toUpperCase().trim();

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from("invite_codes")
    .select("id")
    .eq("code", normalized)
    .single();

  if (existing) {
    return res.status(409).json({ error: "An invite code with this name already exists" });
  }

  const { data: created, error } = await supabaseAdmin
    .from("invite_codes")
    .insert({
      code: normalized,
      tier,
      expires_at: expires_at || null,
      max_uses: max_uses || 1,
      created_by: session.userId,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Invite] Create error:", error.message);
    return res.status(500).json({ error: "Failed to create invite code" });
  }

  return res.status(201).json({
    success: true,
    invite: created,
  });
}

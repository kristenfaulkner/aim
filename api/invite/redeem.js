import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * POST /api/invite/redeem
 * Body: { code: "MATT-ELITE" }
 * Redeems an invite code, granting the user tier access without Stripe.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Invite code is required" });
  }

  const normalized = code.toUpperCase().trim();

  // Look up the code
  const { data: invite } = await supabaseAdmin
    .from("invite_codes")
    .select("*")
    .eq("code", normalized)
    .eq("is_active", true)
    .single();

  if (!invite) {
    return res.status(404).json({ error: "Invalid or expired invite code" });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return res.status(410).json({ error: "This invite code has expired" });
  }

  if (invite.current_uses >= invite.max_uses) {
    return res.status(410).json({ error: "This invite code has reached its limit" });
  }

  // Check if user already redeemed this code
  const { data: existing } = await supabaseAdmin
    .from("invite_redemptions")
    .select("id")
    .eq("invite_code_id", invite.id)
    .eq("user_id", session.userId)
    .single();

  if (existing) {
    return res.status(409).json({ error: "You have already used this code" });
  }

  // Check if user is on a higher paid plan — don't downgrade
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_tier, access_source")
    .eq("id", session.userId)
    .single();

  const tierOrder = ["free", "starter", "pro", "elite"];
  const currentIdx = tierOrder.indexOf(profile?.subscription_tier || "free");
  const inviteIdx = tierOrder.indexOf(invite.tier);

  if (profile?.access_source === "stripe" && currentIdx >= inviteIdx && currentIdx > 0) {
    return res.status(409).json({ error: "You're already on a higher or equal plan" });
  }

  // Grant access
  await supabaseAdmin.from("profiles").update({
    subscription_tier: invite.tier,
    access_source: "invite",
    invite_access_expires_at: invite.expires_at || null,
  }).eq("id", session.userId);

  // Record redemption
  await supabaseAdmin.from("invite_redemptions").insert({
    invite_code_id: invite.id,
    user_id: session.userId,
    tier_granted: invite.tier,
    access_expires_at: invite.expires_at,
  });

  // Increment use count
  await supabaseAdmin.from("invite_codes").update({
    current_uses: invite.current_uses + 1,
  }).eq("id", invite.id);

  return res.status(200).json({
    success: true,
    tier: invite.tier,
    expires_at: invite.expires_at,
    message: invite.expires_at
      ? `You now have ${invite.tier.charAt(0).toUpperCase() + invite.tier.slice(1)} access until ${new Date(invite.expires_at).toLocaleDateString()}`
      : `You now have ${invite.tier.charAt(0).toUpperCase() + invite.tier.slice(1)} access — enjoy!`,
  });
}

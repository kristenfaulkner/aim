import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { stripe, TIER_LABELS, tierFromPriceId } from "../_lib/stripe.js";

/**
 * GET /api/payments/status
 * Returns current subscription status for the authenticated user.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_tier, stripe_customer_id, stripe_subscription_id, access_source, invite_access_expires_at")
    .eq("id", session.userId)
    .single();

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const result = {
    tier: profile.subscription_tier || "free",
    tierLabel: TIER_LABELS[profile.subscription_tier || "free"],
    accessSource: profile.access_source || "stripe",
    inviteExpiresAt: profile.invite_access_expires_at || null,
    subscription: null,
  };

  // Fetch subscription details from Stripe if we have one
  if (profile.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      result.subscription = {
        status: sub.status, // active, trialing, past_due, canceled, etc.
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd: sub.trial_end,
        interval: sub.items.data[0]?.price?.recurring?.interval, // month or year
        pausedUntil: sub.pause_collection?.resumes_at || null,
      };

      // Check for pending downgrade
      if (sub.pending_update) {
        try {
          const pendingItems = sub.pending_update.subscription_items;
          if (pendingItems?.[0]?.price) {
            const pendingTier = tierFromPriceId(pendingItems[0].price);
            result.subscription.pendingDowngrade = {
              tier: pendingTier,
              tierLabel: TIER_LABELS[pendingTier],
              effectiveDate: sub.current_period_end,
            };
          }
        } catch {
          // pending_update format may vary — ignore errors
        }
      }
    } catch {
      // Subscription may have been deleted — treat as free
      result.subscription = null;
    }
  }

  return res.status(200).json(result);
}

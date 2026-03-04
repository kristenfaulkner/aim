import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { stripe } from "../_lib/stripe.js";

/**
 * POST /api/payments/portal
 * Returns: { url: "https://billing.stripe.com/..." }
 * Opens Stripe Customer Portal for subscription management.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", session.userId)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: "No active subscription found" });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://aimfitness.ai"}/settings?tab=subscription`,
  });

  return res.status(200).json({ url: portalSession.url });
}

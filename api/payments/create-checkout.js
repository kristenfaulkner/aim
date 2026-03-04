import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { stripe, PRICE_IDS, findOrCreateCustomer } from "../_lib/stripe.js";

/**
 * POST /api/payments/create-checkout
 * Body: { priceKey: "starter_monthly" | "pro_annual" | etc. }
 * Returns: { url: "https://checkout.stripe.com/..." }
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { priceKey } = req.body;
  const priceId = PRICE_IDS[priceKey];
  if (!priceId) return res.status(400).json({ error: "Invalid price key" });

  // Get user profile for email + name
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, stripe_customer_id")
    .eq("id", session.userId)
    .single();

  // Get email from auth
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(session.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  let customerId = profile?.stripe_customer_id;

  // Create or find Stripe customer if we don't have one
  if (!customerId) {
    const customer = await findOrCreateCustomer(session.userId, user.email, profile?.full_name);
    customerId = customer.id;

    // Store customer ID on profile
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", session.userId);
  }

  const isAnnual = priceKey.endsWith("_annual");

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { aim_user_id: session.userId },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://aimfitness.ai"}/settings?tab=subscription&checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://aimfitness.ai"}/pricing?checkout=cancelled`,
    metadata: { aim_user_id: session.userId },
    allow_promotion_codes: true,
  });

  return res.status(200).json({ url: checkoutSession.url });
}

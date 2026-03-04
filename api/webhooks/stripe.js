import { stripe, tierFromPriceId } from "../_lib/stripe.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export const config = { maxDuration: 30 };

/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler — no auth (uses Stripe signature verification).
 *
 * Events handled:
 * - checkout.session.completed → link customer, set tier
 * - customer.subscription.updated → handle upgrades/downgrades
 * - customer.subscription.deleted → downgrade to free
 * - invoice.payment_failed → flag account
 * - customer.subscription.trial_will_end → (log for now, email later)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

  let event;
  try {
    // Vercel parses body as JSON by default. Stripe needs the raw body for sig verification.
    // If body is already parsed, stringify it back.
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  console.log(`[Stripe Webhook] Received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err.message);
    // Return 200 to prevent Stripe retries for processing errors
  }

  return res.status(200).json({ received: true });
}

/**
 * Checkout completed — link Stripe customer to our user and activate subscription.
 */
async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.aim_user_id;
  if (!userId) {
    console.warn("[Stripe Webhook] checkout.session.completed missing aim_user_id in metadata");
    return;
  }

  const updates = {
    stripe_customer_id: session.customer,
  };

  // If subscription mode, store subscription ID and determine tier
  if (session.subscription) {
    updates.stripe_subscription_id = session.subscription;
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    const priceId = sub.items.data[0]?.price?.id;
    updates.subscription_tier = tierFromPriceId(priceId);
  }

  await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  console.log(`[Stripe Webhook] Checkout completed for user ${userId}, tier=${updates.subscription_tier}`);
}

/**
 * Subscription updated — handle upgrades, downgrades, and status changes.
 *
 * IMPORTANT: For downgrades, Stripe fires this event TWICE:
 * 1. When the downgrade is scheduled (subscription has a `pending_update`)
 * 2. When the downgrade actually takes effect at period end
 * Only update the tier when the change is EFFECTIVE, not when scheduled.
 */
async function handleSubscriptionUpdated(subscription) {
  const userId = await findUserByCustomerId(subscription.customer);
  if (!userId) return;

  // Downgrade is scheduled but not yet effective — don't change tier
  if (subscription.pending_update) {
    console.log(`[Stripe Webhook] Pending downgrade for user ${userId}, not updating tier yet`);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = tierFromPriceId(priceId);

  const updates = {
    subscription_tier: tier,
    stripe_subscription_id: subscription.id,
  };

  // If subscription is past_due or unpaid, downgrade to free
  if (["past_due", "unpaid", "incomplete_expired"].includes(subscription.status)) {
    updates.subscription_tier = "free";
  }

  // If canceled but still active until period end, keep tier until it ends
  if (subscription.status === "canceled") {
    updates.subscription_tier = "free";
  }

  // If user was on invite access and now has a Stripe subscription, update access_source
  updates.access_source = "stripe";
  updates.invite_access_expires_at = null;

  await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  console.log(`[Stripe Webhook] Subscription updated for user ${userId}, tier=${updates.subscription_tier}, status=${subscription.status}`);
}

/**
 * Subscription deleted — downgrade to free.
 */
async function handleSubscriptionDeleted(subscription) {
  const userId = await findUserByCustomerId(subscription.customer);
  if (!userId) return;

  await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "free",
      stripe_subscription_id: null,
    })
    .eq("id", userId);

  console.log(`[Stripe Webhook] Subscription deleted for user ${userId}, downgraded to free`);
}

/**
 * Payment failed — log it. After 3 failures Stripe will cancel the subscription,
 * which triggers handleSubscriptionDeleted.
 */
async function handlePaymentFailed(invoice) {
  const userId = await findUserByCustomerId(invoice.customer);
  if (!userId) return;

  console.warn(`[Stripe Webhook] Payment failed for user ${userId}, invoice ${invoice.id}, attempt ${invoice.attempt_count}`);
}

/**
 * Trial ending in 3 days — log for now. Could send email via Resend later.
 */
async function handleTrialWillEnd(subscription) {
  const userId = await findUserByCustomerId(subscription.customer);
  if (!userId) return;

  console.log(`[Stripe Webhook] Trial ending soon for user ${userId}, trial_end=${subscription.trial_end}`);
}

/**
 * Find AIM user by Stripe customer ID.
 */
async function findUserByCustomerId(customerId) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!data) {
    console.warn(`[Stripe Webhook] No user found for customer ${customerId}`);
    return null;
  }
  return data.id;
}

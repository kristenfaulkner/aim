import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Tier → Stripe Price ID mapping.
 * Price IDs are configured in env vars from Stripe Dashboard.
 */
export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  elite: process.env.STRIPE_PRICE_ELITE_MONTHLY,
};

/**
 * Reverse lookup: Stripe Price ID → tier name.
 */
export function tierFromPriceId(priceId) {
  for (const [key, id] of Object.entries(PRICE_IDS)) {
    if (id === priceId) return key; // direct tier name
  }
  return "free";
}

/**
 * Tier display names and ordering.
 */
export const TIER_ORDER = ["free", "starter", "pro", "elite"];

export const TIER_LABELS = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};

/**
 * Find or create a Stripe customer for a user.
 */
export async function findOrCreateCustomer(userId, email, name) {
  // Check if customer already exists in Stripe by metadata
  const existing = await stripe.customers.list({
    limit: 1,
    email,
  });

  if (existing.data.length > 0) {
    const customer = existing.data[0];
    // Ensure metadata has our user ID
    if (customer.metadata?.aim_user_id !== userId) {
      await stripe.customers.update(customer.id, {
        metadata: { aim_user_id: userId },
      });
    }
    return customer;
  }

  return stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { aim_user_id: userId },
  });
}

import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { stripe } from "../_lib/stripe.js";

/**
 * POST /api/payments/pause
 * Body: { months: 1 | 2 }
 * Pauses the user's subscription for 1-2 months.
 * Billing stops during pause, resumes automatically.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { months } = req.body;
  if (!months || ![1, 2].includes(months)) {
    return res.status(400).json({ error: "months must be 1 or 2" });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", session.userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return res.status(400).json({ error: "No active subscription to pause" });
  }

  const resumesAt = Math.floor(Date.now() / 1000) + (months * 30 * 24 * 60 * 60);

  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    pause_collection: {
      behavior: "void", // don't charge during pause
      resumes_at: resumesAt,
    },
  });

  return res.status(200).json({
    paused: true,
    resumes_at: resumesAt,
    message: `Subscription paused. It will resume on ${new Date(resumesAt * 1000).toLocaleDateString()}.`,
  });
}

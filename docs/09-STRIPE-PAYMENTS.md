# BUILD PLAN: Stripe Payments & Subscription Management

## Feature Summary
**What:** 3-tier monthly subscription system (Starter $19/Pro $49/Elite $99) using Stripe Checkout, customer portal, and webhook-based entitlement management. 14-day free trial, no credit card required. Promo code support for marketing campaigns and partnerships. Annual billing intentionally deferred — see rationale below.

**Why it matters:** Revenue. AIM currently has no payment infrastructure. Every feature we build increases the platform's value, but without payments, we can't sustain development. Stripe is the standard — reliable, well-documented, and handles the complexity of subscriptions, trials, upgrades, downgrades, and failed payments.

**Who cares:**
- **The business:** Revenue is existential. Every day without payments is leaving money on the table.
- **Athletes:** Want to know what they're paying for. Clear tier differentiation builds perceived value.
- **Coaches/Teams:** Will need team billing (future), but individual billing comes first.

**Competitive differentiation:** The pricing itself isn't differentiating — it's what you get for the money. AIM's cross-domain AI insights are the value prop. The payment system should be invisible (no friction) and the tier gates should feel fair (not "gotcha" paywalls).

**Stickiness:** Once athletes are paying, they're invested. The key is ensuring they get enough value in the first 14 days of the free trial to convert. Feature gating should encourage upgrade, not frustrate.

## Why Monthly Only at Launch
Annual billing is intentionally deferred for the following reasons:
1. **Churn data is more valuable than cash lock-in right now.** Monthly subscribers who cancel after 2 months give us a signal that something isn't working. Annual subscribers mask that signal for 12 months.
2. **Pricing will likely change.** The product is still actively growing (features 1-10 in the backlog). Tier structure and pricing may shift as major features like race intelligence, training prescriptions, and the coach platform ship. Annual subscribers complicate price changes.
3. **Reduced operational complexity.** No prorated annual refunds, no mid-year upgrade math, no awkwardness around someone paying $468 upfront for a product that's still being built.
4. **When to add annual:** After 3+ months of stable monthly churn data AND the core feature set is complete. Target: 4-6 months post-launch. At that point, upsell annual to the stickiest monthly cohort via email campaign.

## Closed Beta Strategy

AIM will launch in **closed beta** for approximately 2 months. During this period:
- **Stripe checkout is hidden.** No pricing page, no trial banners, no paywalls. All the Stripe code is built and tested, but toggled off via a feature flag.
- **Access is invite-only.** Users get in via invite codes that grant full tier access (typically Elite) with no expiration or a generous expiration window.
- **All features are unlocked.** Beta testers get the full experience so they can give feedback on everything.
- **When beta ends:** Flip the feature flag, Stripe goes live. Existing beta users get a grace period (30 days) to choose a plan, or they can keep their invite access if it hasn't expired.

### Feature Flag: `PAYMENTS_ENABLED`

**Environment variable:**
```
PAYMENTS_ENABLED=false   # Set to 'true' when ready to go live
```

**This single flag controls:**
1. **Pricing page visibility** — `/pricing` route is hidden from navigation and redirects to `/dashboard` when `false`
2. **PaywallGate behavior** — when `false`, the gate is transparent (all features unlocked for everyone). When `true`, normal tier checking applies.
3. **Trial banner** — hidden when `false`
4. **Settings subscription section** — hidden when `false` (invite code input still visible)
5. **Checkout endpoints** — return 403 when `false` (safety net in case someone finds the URL)

**Implementation:**
```javascript
// src/lib/featureFlags.js
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

// In PaywallGate.jsx:
import { PAYMENTS_ENABLED } from '../lib/featureFlags';

export default function PaywallGate({ requiredTier, children, fallback }) {
  const { tier } = useAuth();

  // During closed beta, everything is unlocked
  if (!PAYMENTS_ENABLED) return children;

  // Normal gating logic
  if (tierLevel(tier) >= tierLevel(requiredTier)) return children;
  return fallback || <UpgradeCTA requiredTier={requiredTier} />;
}

// In navigation (hide Pricing link):
{PAYMENTS_ENABLED && <NavLink to="/pricing">Pricing</NavLink>}

// In Dashboard (hide trial banner):
{PAYMENTS_ENABLED && trialDaysLeft > 0 && <TrialBanner daysLeft={trialDaysLeft} />}

// In Settings (hide subscription management):
{PAYMENTS_ENABLED && <SubscriptionSection />}

// In api/payments/create-checkout.js (safety net):
if (process.env.PAYMENTS_ENABLED !== 'true') {
  return res.status(403).json({ error: 'Payments are not enabled' });
}
```

**Going live checklist (when beta ends):**
1. Set `PAYMENTS_ENABLED=true` in Vercel environment variables
2. Redeploy (Vercel picks up the new env var)
3. Pricing page appears in navigation
4. PaywallGate starts enforcing tier checks
5. Trial banners appear for users without a subscription
6. Existing invite users are unaffected — their access continues based on their invite code terms
7. Send email to all beta users: "AIM is now live! Your beta access continues until [date]. Subscribe anytime to keep your features."

**No code changes required to go live. It's a single environment variable toggle + redeploy.**

## Status
- **Backend:** Not built — needs Stripe integration, webhook handler, entitlement logic
- **Frontend:** Not built — needs pricing page, checkout flow, subscription management
- **Database:** `profiles` has `subscription_tier`, `stripe_customer_id`, `stripe_subscription_id` columns

## Dependencies
- None — can build independently

## Reference Files
- `docs/product-blueprint.md` → Pricing section
- `CLAUDE.md` → Pricing table, P4 feature description
- `docs/technical-architecture.md` → profiles table schema

---

## CRITICAL: Stripe Dashboard Configuration (Already Configured)

The following settings have been configured manually in the Stripe Dashboard. The code must be built to match these settings. **Do not override these settings via the API.**

### Subscription Plan Switching
**Setting:** "Prorate charges and credits" is enabled.
- When a customer upgrades (e.g., Starter → Pro), Stripe issues a credit for the unused portion of the current billing period and charges the new price for the remaining time.
- **Charge timing:** "Invoice prorations immediately at the time of the update" — the customer is charged the prorated difference right away and gets access to the new tier instantly.

### Downgrades
- **When switching to a cheaper plan:** "Wait until end of billing period to update" — the customer keeps their current tier's features through the end of what they've already paid for. The downgrade takes effect at the next billing cycle.

### Cancellation Reasons (Configured in Stripe Dashboard)
All 8 cancellation reasons are enabled. When a customer cancels, they see:
1. ✅ It's too expensive
2. ✅ I need more features
3. ✅ I found an alternative
4. ✅ I no longer need it
5. ✅ Customer service was less than expected
6. ✅ Ease of use was less than expected
7. ✅ Quality was less than expected
8. ✅ Other reason

### Retention Coupons (Configured in Stripe Dashboard)
Retention coupons are enabled **selectively** as part of the churn reduction strategy:
- When the cancellation reason is **"It's too expensive"**: offer a 50% off coupon for the next 2 months. This is handled by Stripe's built-in cancellation flow.
- For all other cancellation reasons: no coupon is offered. Instead, offer a **subscription pause** option for "I no longer need it" (implemented in our custom cancellation flow, see Phase 6).
- Retention coupons are limited to **once per customer** to prevent gaming.

### Promo Codes
Promo codes are enabled in Stripe. The following setup is needed:
- **Stripe Checkout sessions must include `allow_promotion_codes: true`** so customers can enter promo codes during checkout.
- Promo codes are created in the Stripe Dashboard (not via API) by the business owner for marketing campaigns, partnerships, and influencer deals.
- The Pricing page UI should show a "Have a promo code?" link near the CTA buttons that reassures users they can enter it on the checkout page.

---

## Implementation Plan

### Phase 1: Stripe Backend Setup
**Files to create:**
- `api/_lib/stripe.js` — Stripe client init + helper functions
- `api/payments/create-checkout.js` — POST: Create Stripe Checkout session
- `api/payments/portal.js` — POST: Create Stripe Customer Portal session
- `api/payments/status.js` — GET: Current subscription status
- `api/webhooks/stripe.js` — POST: Stripe webhook handler (no auth — uses Stripe signature verification)

**Environment variables needed:**
```
PAYMENTS_ENABLED=false   # Toggle to 'true' when ready to go live (also add VITE_PAYMENTS_ENABLED for frontend)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_ELITE_MONTHLY
```

**Stripe product setup (manual in Stripe Dashboard):**
- Product: AIM Starter — $19/month
- Product: AIM Pro — $49/month
- Product: AIM Elite — $99/month
- All products: 14-day free trial, no credit card required to start

**Checkout session creation — MUST include promo code support:**
```javascript
// api/payments/create-checkout.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // ... auth, CORS, method check ...

  const { priceId, successUrl, cancelUrl } = req.body;

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email, // or customer: stripeCustomerId if exists
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,  // ← CRITICAL: enables promo code field on checkout page
    subscription_data: {
      trial_period_days: 14,
    },
    success_url: successUrl || `${process.env.NEXT_PUBLIC_URL}/dashboard?checkout=success`,
    cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_URL}/pricing`,
    metadata: {
      user_id: user.id,
    },
  });

  res.json({ url: session.url });
}
```

**Webhook handler — handle subscription changes carefully:**
```javascript
// api/webhooks/stripe.js
// IMPORTANT: This endpoint does NOT use verifySession — it uses Stripe signature verification instead.

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      // New subscription created (or trial started)
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const tier = mapPriceToTier(subscription.items.data[0].price.id);

      await supabaseAdmin.from('profiles').update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_tier: tier,
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.updated': {
      // Handle upgrades AND scheduled downgrades
      const subscription = event.data.object;
      const tier = mapPriceToTier(subscription.items.data[0].price.id);

      // IMPORTANT: For downgrades, Stripe fires this event TWICE:
      // 1. When the downgrade is scheduled (subscription has a `pending_update`)
      // 2. When the downgrade actually takes effect at period end
      //
      // Only update the tier when the change is EFFECTIVE, not when scheduled.
      if (subscription.pending_update) {
        // Downgrade is scheduled but not yet effective — don't change tier
        // Optionally: store the pending tier for UI display
        // "Your plan will change to Starter on [date]"
        break;
      }

      // Change is effective — update the tier
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (profile) {
        await supabaseAdmin.from('profiles').update({
          subscription_tier: tier,
        }).eq('id', profile.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled — downgrade to free
      const subscription = event.data.object;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (profile) {
        await supabaseAdmin.from('profiles').update({
          subscription_tier: 'free',
          stripe_subscription_id: null,
        }).eq('id', profile.id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — flag account, send notification
      const invoice = event.data.object;
      console.warn(`Payment failed for customer ${invoice.customer}`);
      // TODO: Send email via Resend notifying the customer
      break;
    }

    case 'customer.subscription.trial_will_end': {
      // Trial ending in 3 days — send notification via Resend
      const subscription = event.data.object;
      // TODO: Send email with upgrade CTA
      break;
    }
  }

  res.json({ received: true });
}

function mapPriceToTier(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY]: 'starter',
    [process.env.STRIPE_PRICE_PRO_MONTHLY]: 'pro',
    [process.env.STRIPE_PRICE_ELITE_MONTHLY]: 'elite',
  };
  return map[priceId] || 'free';
}
```

### Phase 2: Feature Gating
**Files to create:**
- `src/lib/entitlements.js` — Feature-to-tier mapping
- `src/components/PaywallGate.jsx` — Wrapper component that shows upgrade CTA for gated features

**Tier definitions:**
```javascript
const TIERS = {
  free: {
    maxActivities: 30, // last 30 days only
    aiAnalysesPerDay: 3,
    integrations: 2,
    features: ['dashboard', 'activities', 'basic_analysis'],
  },
  starter: {
    maxActivities: Infinity,
    aiAnalysesPerDay: 10,
    integrations: 4,
    features: ['...free', 'sleep', 'health_lab', 'workout_db', 'nutrition_logger', 'checkin'],
  },
  pro: {
    maxActivities: Infinity,
    aiAnalysesPerDay: Infinity,
    integrations: Infinity,
    features: ['...starter', 'cp_model', 'durability', 'adaptive_zones', 'segments',
               'similar_sessions', 'race_intelligence', 'prescription', 'sms_coach'],
  },
  elite: {
    maxActivities: Infinity,
    aiAnalysesPerDay: Infinity,
    integrations: Infinity,
    features: ['...pro', 'api_access', 'data_export', 'priority_support',
               'custom_models', 'coach_dashboard'],
  },
};
```

**PaywallGate component:**
- Wraps any feature component
- Checks current tier against required tier
- If insufficient: shows blurred/dimmed preview with upgrade CTA overlay
- **IMPORTANT:** Show the user's own historical data behind the blur when possible. "Upgrade to Pro to unlock Segment Comparison" over their actual segment data is far more compelling than a generic marketing message.
- Should feel encouraging, not blocking — show what they're missing, not just "locked"

### Phase 3: Pricing Page
**Files to create:**
- `src/pages/Pricing.jsx` — Public pricing page (also accessible from Settings)

**Design:**
- 3-column pricing cards (Starter | Pro | Elite)
- Pro card highlighted as "Most Popular" with accent border
- Feature comparison table below cards
- **Monthly pricing only** — no monthly/annual toggle at launch
- CTA buttons: "Start Free Trial" → Stripe Checkout
- **Promo code callout:** Below the CTA buttons or in the FAQ section, include: "Have a promo code? You can enter it on the checkout page."
- FAQ section at bottom

**Pricing display:**
```
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│   Starter    │  │   ★ Pro ★        │  │    Elite     │
│              │  │   Most Popular   │  │              │
│   $19/mo     │  │   $49/mo         │  │   $99/mo     │
│              │  │                  │  │              │
│ • Unlimited  │  │ • Everything in  │  │ • Everything │
│   activities │  │   Starter, plus: │  │   in Pro,    │
│ • 10 AI/day  │  │ • Unlimited AI   │  │   plus:      │
│ • 4 sources  │  │ • All sources    │  │ • API access │
│ • Sleep      │  │ • CP/W' model    │  │ • Data export│
│ • Health Lab │  │ • Race intel     │  │ • Coach view │
│ • Workout DB │  │ • Prescriptions  │  │ • Priority   │
│              │  │ • Segments       │  │   support    │
│              │  │ • SMS coach      │  │              │
│[Start Trial] │  │[Start Trial]     │  │[Start Trial] │
└──────────────┘  └──────────────────┘  └──────────────┘

        Have a promo code? Enter it on the checkout page.
```

### Phase 4: Settings Integration
**Files to modify:**
- `src/pages/Settings.jsx` — Add Subscription section

**Subscription management:**
- Current plan + billing cycle display
- "Manage Subscription" → Stripe Customer Portal (handles upgrade/downgrade/cancel via Stripe's hosted UI, which respects all the proration and downgrade settings configured in the Dashboard)
- "View Invoices" → Stripe Customer Portal
- Trial status: "X days remaining in your free trial" with upgrade CTA
- **Pending downgrade display:** If the webhook detected a `pending_update`, show: "Your plan will change to [Starter] on [date]. You'll keep [Pro] features until then."

**Customer Portal session creation:**
```javascript
// api/payments/portal.js
const session = await stripe.billingPortal.sessions.create({
  customer: profile.stripe_customer_id,
  return_url: `${process.env.NEXT_PUBLIC_URL}/settings`,
});
res.json({ url: session.url });
```

The Stripe Customer Portal handles plan changes, cancellation (with the cancellation reasons and retention coupons we configured), and invoice viewing. This means we don't need to build custom UI for most subscription management — Stripe's hosted portal does it.

### Phase 5: Trial Conversion Flow
**Files to create:**
- `src/components/TrialBanner.jsx` — Persistent banner during trial

**Trial UX:**
- Day 1-10: subtle banner at top of dashboard "14-day free trial — X days left"
- Day 11-13: more prominent banner with feature highlights and upgrade CTA
- Day 14 (expiration): full-screen modal: "Your trial has ended. Subscribe to keep your data and insights."
- After expiration: account drops to free tier, data retained for 30 days, then archived

### Phase 6: Custom Cancellation Enhancements (Beyond Stripe's Built-in Flow)
**Files to create:**
- `api/payments/pause.js` — POST: Pause subscription for 1-2 months

**Subscription pause (for "I no longer need it" cancellations):**
When a user selects "I no longer need it" as a cancellation reason, before the cancellation completes, offer a pause option:
- "Would you rather pause your subscription for 1-2 months? Your data will be preserved and you can resume anytime."
- If they choose pause: use Stripe's `subscription.pause_collection` to stop billing for the chosen period
- The subscription automatically resumes after the pause period
- During pause: user sees "Subscription paused — resumes on [date]" in Settings

```javascript
// api/payments/pause.js
const subscription = await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'void',  // don't charge during pause
    resumes_at: Math.floor(Date.now() / 1000) + (pauseMonths * 30 * 24 * 60 * 60),
  },
});
```

### Phase 7: Invite Code System (Free Access Without Stripe)
**Purpose:** Give select people (friends, beta testers, influencers, partners) full access to any tier without ever touching Stripe. No credit card, no checkout page, no anxiety about getting charged later. This is completely separate from Stripe promo codes — invite codes bypass Stripe entirely.

**Files to create:**
- `api/invite/redeem.js` — POST: Redeem an invite code
- `api/invite/create.js` — POST: Admin-only endpoint to create invite codes
- `supabase/migrations/017_invite_codes.sql` — Invite codes table

**Database:**
```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,          -- e.g., 'MATT-ELITE', 'BETATEAM2026'
  tier TEXT NOT NULL                   -- 'starter', 'pro', 'elite'
    CHECK (tier IN ('starter', 'pro', 'elite')),
  expires_at TIMESTAMPTZ,             -- when the granted access expires (null = forever)
  max_uses INTEGER DEFAULT 1,         -- how many people can use this code
  current_uses INTEGER DEFAULT 0,     -- how many have used it so far
  created_by UUID REFERENCES profiles(id),  -- admin who created it
  notes TEXT,                         -- internal note: "For Matt", "Beta testers batch 1"
  is_active BOOLEAN DEFAULT TRUE,     -- can be deactivated without deleting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code) WHERE is_active = TRUE;

-- Track who redeemed what
CREATE TABLE invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID REFERENCES invite_codes(id),
  user_id UUID REFERENCES profiles(id),
  tier_granted TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ,      -- copied from invite_codes.expires_at at redemption time
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invite_code_id, user_id)     -- each user can only redeem a code once
);
```

**Add to profiles table:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_source TEXT DEFAULT 'stripe'
  CHECK (access_source IN ('stripe', 'invite', 'admin'));
-- 'stripe' = paying customer or trial
-- 'invite' = got access via invite code
-- 'admin' = manually granted by admin
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_access_expires_at TIMESTAMPTZ;
```

**Redeem endpoint:**
```javascript
// api/invite/redeem.js
export default async function handler(req, res) {
  // ... auth check ...
  const { code } = req.body;

  // Look up the code
  const { data: invite } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single();

  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite code' });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This invite code has expired' });
  }
  if (invite.current_uses >= invite.max_uses) {
    return res.status(410).json({ error: 'This invite code has reached its limit' });
  }

  // Check if user already redeemed this code
  const { data: existing } = await supabaseAdmin
    .from('invite_redemptions')
    .select('id')
    .eq('invite_code_id', invite.id)
    .eq('user_id', userId)
    .single();

  if (existing) return res.status(409).json({ error: 'You have already used this code' });

  // Grant access
  await supabaseAdmin.from('profiles').update({
    subscription_tier: invite.tier,
    access_source: 'invite',
    invite_access_expires_at: invite.expires_at || null,
  }).eq('id', userId);

  // Record redemption
  await supabaseAdmin.from('invite_redemptions').insert({
    invite_code_id: invite.id,
    user_id: userId,
    tier_granted: invite.tier,
    access_expires_at: invite.expires_at,
  });

  // Increment use count
  await supabaseAdmin.from('invite_codes').update({
    current_uses: invite.current_uses + 1,
  }).eq('id', invite.id);

  res.json({
    success: true,
    tier: invite.tier,
    expires_at: invite.expires_at,
    message: invite.expires_at
      ? `You now have ${invite.tier} access until ${new Date(invite.expires_at).toLocaleDateString()}`
      : `You now have ${invite.tier} access — enjoy!`,
  });
}
```

**Creating invite codes (admin only — for now, just use Supabase dashboard or a simple admin endpoint):**
```javascript
// api/invite/create.js — protect with admin check
// Example codes you might create:
// { code: 'MATT-ELITE', tier: 'elite', expires_at: null, max_uses: 1, notes: 'For Matt' }
// { code: 'BETATEAM2026', tier: 'pro', expires_at: '2026-09-01', max_uses: 50, notes: 'Beta testers' }
// { code: 'INFLUENCER-PRO', tier: 'pro', expires_at: '2026-06-01', max_uses: 10, notes: 'Cycling influencer deal' }
```

**Frontend — where to enter invite codes:**
- **Option A (recommended): On the Pricing page.** Below the pricing cards and promo code callout, add: "Have an invite code? [Enter it here]" → expands a simple text input + "Redeem" button. On success, page refreshes and user has access.
- **Option B: In Settings.** Under the Subscription section, if the user is on free tier or trial, show: "Have an invite code?" input.
- **Option C: During signup.** Add an optional "Invite code" field to the signup flow. If provided, skip the trial and go straight to the granted tier.

**How you'd give Matt free Elite access:**
1. Go to Supabase dashboard (or use the admin endpoint)
2. Insert: `{ code: 'MATT-ELITE', tier: 'elite', max_uses: 1, expires_at: null }`
3. Text Matt: "Sign up at aimfitness.ai, then enter code MATT-ELITE on the pricing page"
4. Matt signs up, enters code, gets Elite access forever. No credit card. No Stripe.

**Invite access expiration handling:**
- A daily cron job (or Supabase scheduled function) checks `profiles` where `access_source = 'invite'` and `invite_access_expires_at < now()`
- Expired invite users get downgraded to free tier: `subscription_tier = 'free'`, `access_source = 'stripe'` (so they enter the normal Stripe flow)
- Send an email 7 days before expiration: "Your complimentary access expires on [date]. Subscribe to keep your features."
- Send email on expiration: "Your access has been updated. Subscribe to continue using AIM Pro/Elite features."

**Feature gating integration:**
The existing `PaywallGate` and `entitlements.js` check `profiles.subscription_tier` — they don't care whether the tier came from Stripe or an invite code. So invite users get the exact same experience as paying users. No code changes needed in the gating logic.

**Settings display for invite users:**
- Instead of "Manage Subscription" (Stripe portal), show: "Access: Elite (via invite)" 
- If expires: "Your complimentary Elite access expires on [date]"
- If permanent: "Your complimentary Elite access has no expiration"
- Below: "Want to switch to a paid subscription? [View Plans]"

## Edge Cases
- **Signup without trial:** If athlete goes directly to a paid plan, skip trial.
- **Promo code + free trial:** Stripe handles this — a promo code discount applies AFTER the trial ends. The user gets 14 days free, then the discounted price kicks in.
- **Downgrade with gated features in use:** Features become read-only. Data isn't deleted. Show upgrade CTA when they try to use a gated feature. Historical data (race plans, segment comparisons, CP visualizations) remains visible but new analysis/generation is blocked.
- **Failed payment:** Grace period of 3 days (configured in Stripe as "Smart Retries"). After 3 failed attempts, Stripe cancels the subscription. Our webhook handles `customer.subscription.deleted` and downgrades to free tier.
- **Team billing (future):** Individual subscriptions now, team billing as separate future feature (Coach Platform — Feature 10).
- **Refunds:** Handle via Stripe Dashboard manually for now.
- **Existing users before Stripe:** Grandfather them with a 30-day grace period to choose a plan. Show a non-dismissable banner: "AIM now has subscription plans. Choose a plan before [date] to continue using premium features."
- **Webhook event ordering:** Stripe doesn't guarantee event order. The webhook handler must be idempotent — processing the same event twice should produce the same result.
- **Future annual billing:** When ready (4-6 months post-launch), add 3 new price IDs to env vars (`STRIPE_PRICE_STARTER_ANNUAL`, etc.), extend `mapPriceToTier`, add a monthly/annual toggle to the Pricing page, and update the checkout session to accept either price ID. No structural changes needed — the architecture supports it.
- **Invite user starts paying:** If an invite user decides to subscribe via Stripe, the Stripe webhook updates their `access_source` to `'stripe'` and clears `invite_access_expires_at`. They're now a normal paying customer. The invite redemption record is kept for analytics.
- **Invite user's access expires while they have data:** Same as any downgrade — features become read-only, data is preserved, upgrade CTA shown. No data deletion.
- **Invite code shared publicly:** If someone leaks a code, you can deactivate it in the database (`is_active = false`). Existing redemptions are NOT affected — only future uses are blocked.
- **User tries to redeem invite code while on a paid Stripe plan:** Allow it if the invite tier is higher. Pause their Stripe subscription (don't cancel). When invite expires, their Stripe subscription resumes. If invite tier is lower than their current plan, reject with: "You're already on a higher plan."

## Testing Requirements
- **Must test:** Checkout session creation returns valid URL and includes `allow_promotion_codes: true`
- **Must test:** Webhook handler correctly updates `subscription_tier` on `checkout.session.completed`
- **Must test:** Webhook handler does NOT update tier on scheduled downgrades (when `pending_update` exists)
- **Must test:** Webhook handler correctly downgrades to free on `customer.subscription.deleted`
- **Must test:** Feature gating correctly blocks/allows based on tier
- **Must test:** `mapPriceToTier` correctly maps all 3 price IDs to tiers
- **Must test:** When `PAYMENTS_ENABLED=false`, PaywallGate passes all children through (no gating)
- **Must test:** When `PAYMENTS_ENABLED=false`, checkout endpoint returns 403
- **Must test:** Invite code redemption grants correct tier and records redemption
- **Must test:** Expired invite codes are rejected
- **Must test:** Invite codes at max uses are rejected
- **Must test:** Same user cannot redeem the same invite code twice
- **Should test:** PaywallGate renders upgrade CTA with correct pricing
- **Should test:** Trial expiration triggers correct state change
- **Should test:** Pause subscription correctly sets `pause_collection` and resumes at the right time
- **Should test:** Invite access expiration cron correctly downgrades expired invite users
- **Should test:** Settings page shows correct state for invite users vs Stripe users

## Success Metrics
- **Trial-to-paid conversion:** >15% within 14 days
- **Monthly churn:** <5%
- **Average revenue per user:** Target $35/month (weighted across tiers)
- **Promo code redemption:** Track usage to measure marketing campaign effectiveness
- **Pause vs cancel:** >20% of "I no longer need it" cancellers choose pause instead
- **Retention coupon save rate:** >15% of price-sensitive cancellers are retained by the 50% off offer

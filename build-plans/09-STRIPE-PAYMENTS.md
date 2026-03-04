# BUILD PLAN: Stripe Payments & Subscription Management

## Feature Summary
**What:** 3-tier subscription system (Starter $19/Pro $49/Elite $99 monthly, with annual discounts) using Stripe Checkout, customer portal, and webhook-based entitlement management. 14-day free trial, no credit card required.

**Why it matters:** Revenue. AIM currently has no payment infrastructure. Every feature we build increases the platform's value, but without payments, we can't sustain development. Stripe is the standard — reliable, well-documented, and handles the complexity of subscriptions, trials, upgrades, downgrades, and failed payments.

**Who cares:**
- **The business:** Revenue is existential. Every day without payments is leaving money on the table.
- **Athletes:** Want to know what they're paying for. Clear tier differentiation builds perceived value.
- **Coaches/Teams:** Will need team billing (future), but individual billing comes first.

**Competitive differentiation:** The pricing itself isn't differentiating — it's what you get for the money. AIM's cross-domain AI insights are the value prop. The payment system should be invisible (no friction) and the tier gates should feel fair (not "gotcha" paywalls).

**Stickiness:** Once athletes are paying, they're invested. The key is ensuring they get enough value in the first 14 days of the free trial to convert. Feature gating should encourage upgrade, not frustrate.

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
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_STARTER_ANNUAL
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL
STRIPE_PRICE_ELITE_MONTHLY
STRIPE_PRICE_ELITE_ANNUAL
```

**Stripe product setup (manual in Stripe Dashboard):**
- Product: AIM Starter ($19/mo or $15/mo annual)
- Product: AIM Pro ($49/mo or $39/mo annual)
- Product: AIM Elite ($99/mo or $79/mo annual)
- All products: 14-day free trial, no credit card required to start

**Webhook handler events:**
```javascript
// api/webhooks/stripe.js
switch (event.type) {
  case 'checkout.session.completed':
    // Create/update customer, set subscription_tier
    break;
  case 'customer.subscription.updated':
    // Handle upgrades/downgrades, update tier
    break;
  case 'customer.subscription.deleted':
    // Downgrade to free tier
    break;
  case 'invoice.payment_failed':
    // Flag account, send notification
    break;
  case 'customer.subscription.trial_will_end':
    // Send trial ending notification (3 days before)
    break;
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
- "Upgrade to Pro to unlock Segment Comparison" with pricing and CTA button
- Should feel encouraging, not blocking — show what they're missing, not just "locked"

### Phase 3: Pricing Page
**Files to create:**
- `src/pages/Pricing.jsx` — Public pricing page (also accessible from Settings)

**Design:**
- 3-column pricing cards (Starter | Pro | Elite)
- Pro card highlighted as "Most Popular" with accent border
- Feature comparison table below cards
- Monthly/Annual toggle (show savings for annual)
- CTA buttons: "Start Free Trial" → Stripe Checkout
- FAQ section at bottom

### Phase 4: Settings Integration
**Files to modify:**
- `src/pages/Settings.jsx` — Add Subscription section

**Subscription management:**
- Current plan + billing cycle display
- "Manage Subscription" → Stripe Customer Portal (handles upgrade/downgrade/cancel)
- "View Invoices" → Stripe Customer Portal
- Trial status: "X days remaining in your free trial" with upgrade CTA

### Phase 5: Trial Conversion Flow
**Files to create:**
- `src/components/TrialBanner.jsx` — Persistent banner during trial

**Trial UX:**
- Day 1-10: subtle banner at top of dashboard "14-day free trial — X days left"
- Day 11-13: more prominent banner with feature highlights and upgrade CTA
- Day 14 (expiration): full-screen modal: "Your trial has ended. Subscribe to keep your data and insights."
- After expiration: account drops to free tier, data retained for 30 days, then archived

## Edge Cases
- **Signup without trial:** If athlete goes directly to a paid plan, skip trial.
- **Downgrade with gated features in use:** Features become read-only. Data isn't deleted. Show upgrade CTA when they try to use a gated feature.
- **Failed payment:** Grace period of 3 days. After 3 failed attempts, downgrade to free tier. Send email notifications.
- **Team billing (future):** Individual subscriptions now, team billing as separate future feature.
- **Refunds:** Handle via Stripe Dashboard manually for now.
- **Existing users before Stripe:** Grandfather them with a 30-day grace period to choose a plan.

## Testing Requirements
- **Must test:** Checkout session creation returns valid URL
- **Must test:** Webhook handler correctly updates subscription_tier
- **Must test:** Feature gating correctly blocks/allows based on tier
- **Should test:** PaywallGate renders upgrade CTA with correct pricing
- **Should test:** Trial expiration triggers correct state change

## Success Metrics
- **Trial-to-paid conversion:** >15% within 14 days
- **Monthly churn:** <5%
- **Average revenue per user:** Target $35/month (weighted across tiers)
- **Annual plan adoption:** >40% of paid users choose annual

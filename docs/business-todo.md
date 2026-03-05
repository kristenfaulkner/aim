# Business To-Do Items

Non-engineering tasks that need to happen before/at/after launch. Organized by category.

---

## Launch Prep

- [ ] **Stripe production keys** — Switch from test mode to live keys in Vercel env vars; verify webhook endpoint receives real events
- [ ] **Stripe promo codes / coupons** — Set up promotional codes in Stripe Dashboard for early adopters, influencers, beta testers
- [ ] **Stripe pricing finalization** — Confirm Starter $19 / Pro $49 / Elite $99 tiers and 14-day free trial config in Stripe product catalog
- [ ] **Domain email** — Set up support@aimfitness.ai, hello@aimfitness.ai (for Resend sender, support replies)
- [ ] **Demo video** — Record product demo for landing page; re-add "Watch Demo" button once ready
- [ ] **Terms of Service / Privacy Policy review** — Legal review of existing pages before public launch
- [ ] **TCPA / SMS compliance audit** — Confirm opt-in flows, disclosures, and Twilio toll-free verification URL updated to `https://aimfitness.ai`

---

## Admin & Internal Tools

- [ ] **Admin dashboard** — Internal page/tool for CS team to view AI feedback (thumbs up/down + text comments + the AI insight that was rated). Query the `ai_feedback` table.
- [ ] **Admin user management** — Ability to look up users, view their subscription status, grant/revoke access, issue refunds
- [ ] **Feedback review workflow** — Regular cadence for reviewing AI feedback to improve insight quality (filter by thumbs down, read user comments, identify patterns)
- [ ] **Error monitoring** — Set up error tracking (Sentry or similar) for production API errors and client-side crashes

---

## Third-Party Accounts & API Keys

- [ ] **Garmin Connect API approval** — Application submitted; waiting for `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET`
- [ ] **Apple Developer account** — Configure Apple OAuth (Sign in with Apple) in Apple Developer portal + Supabase Auth settings
- [ ] **Twilio toll-free verification** — Update opt-in proof URL to `https://aimfitness.ai` in Twilio console
- [ ] **Resend production domain** — Verify `aimfitness.ai` domain in Resend for branded email delivery (SPF/DKIM/DMARC)
- [ ] **Open-Meteo** — Confirm usage limits are sufficient for production traffic (currently free tier)

---

## Database Migrations (Supabase)

Run these in Supabase SQL Editor before the features that depend on them go live:

- [ ] `006_dashboard_v2_tables.sql` — training_calendar, working_goals, nutrition_logs
- [ ] `008_structured_workouts.sql` — activity_tags, activity_weather, annotation columns
- [ ] `010_expansion_checkin_travel_crosstraining.sql` — check-in columns, travel_events, cross_training_log
- [ ] `011_cp_model.sql` — cp_watts, w_prime_kj, pmax_watts on power_profiles
- [ ] `012_adaptive_zones_durability.sql` — zone_preference, durability_data, zones_history
- [ ] `013_ai_feedback.sql` — ai_feedback table
- [ ] `014_wbal.sql` — wbal_data, wbal_min_pct, wbal_empty_events on activities
- [ ] `015_hr_source_priority.sql` — hr_source_config, source columns on activities/daily_metrics
- [ ] `016_segments.sql` — segment_efforts table
- [ ] `017_feedback_text.sql` — feedback_text and insight_body columns on ai_feedback

---

## Marketing & Growth

- [ ] **Beta tester outreach** — Identify 10-20 serious cyclists for private beta; generate promo codes
- [ ] **Social media accounts** — Set up Instagram, X/Twitter, Strava Club for AIM
- [ ] **Landing page SEO** — Review meta tags, Open Graph images, structured data for search/social sharing
- [ ] **App Store / PWA listing** — If going PWA route, configure manifest and icons for "Add to Home Screen"
- [ ] **Analytics** — Set up product analytics (Mixpanel, PostHog, or similar) to track user engagement, feature usage, conversion funnel

---

## Ongoing Operations

- [ ] **AI insight quality reviews** — Weekly/biweekly review of `ai_feedback` table, especially thumbs-down with text comments
- [ ] **Cost monitoring** — Track Anthropic API usage, Supabase usage, Vercel bandwidth, Twilio SMS costs
- [ ] **Support channel** — Set up support email or intercom for user questions/bugs
- [ ] **Backup strategy** — Confirm Supabase PITR (point-in-time recovery) is enabled for production database

---

## Legal & Compliance

- [ ] **Business entity** — Confirm LLC/Corp formation, EIN, business bank account
- [ ] **Stripe Atlas or equivalent** — If not already set up for payment processing
- [ ] **Update Privacy Policy** — Review and update for: all current data sources collected (Strava, Wahoo, Oura, Whoop, EightSleep, Withings, blood panels, DEXA scans), AI processing disclosures (data sent to Anthropic), SMS data handling (Twilio), email processing (Resend), weather data (Open-Meteo). Ensure accuracy with what we actually collect vs what's listed.
- [ ] **Update Terms of Service** — Review and update for: current pricing tiers, subscription terms, AI-generated content disclaimers, data accuracy limitations, integration data usage, cancellation/refund policy
- [ ] **International users / GDPR** — Review compliance for EU/UK/international users:
  - [ ] Cookie consent banner (GDPR requirement; cookie policy page exists but no banner)
  - [ ] Right to data export (Article 20 — data portability)
  - [ ] Right to deletion workflow (Article 17 — account deletion must remove all user data)
  - [ ] Data processing agreements (DPAs) with Supabase, Anthropic, Twilio, Resend
  - [ ] Data residency disclosures — where is user data stored? (Supabase region, Vercel edge, Anthropic API)
  - [ ] Lawful basis for processing — document consent vs legitimate interest for each data type
  - [ ] GDPR-compliant privacy policy language (EU-specific rights section exists but may need legal review)
- [ ] **CCPA (California)** — Review California-specific disclosure requirements (sale/sharing of data, opt-out rights)
- [ ] **Health data regulations** — HIPAA likely does not apply (not a covered entity), but confirm. Review state-level health data privacy laws (e.g., Washington My Health My Data Act)
- [ ] **Health data disclaimers** — Ensure "not medical advice" language is visible at first use, not just buried in Terms
- [ ] **Age restrictions** — Confirm minimum age policy (13+ COPPA, 16+ GDPR) is documented and enforced in signup

---

## Finance & Subscriptions

- [ ] **Business bank account** — Open dedicated business checking account
- [ ] **Business credit card** — Get business card, move all subscriptions off personal cards
- [ ] **Update payment methods** — Transfer the following subscriptions to the business card:
  - [ ] **Anthropic (Claude API)** — AI analysis engine, ~usage-based pricing
  - [ ] **Supabase** — Database + Auth + Storage, Pro plan
  - [ ] **Vercel** — Hosting + serverless functions + cron jobs, Pro plan
  - [ ] **Google Workspace** — Email, Drive, calendar (aimfitness.ai domain)
  - [ ] **GitHub** — Repository hosting (may be free tier, confirm)
  - [ ] **Twilio** — SMS sending + receiving, usage-based
  - [ ] **Resend** — Transactional email, usage-based
  - [ ] **Stripe** — Payment processing (fees deducted from revenue, but confirm monthly platform fee)
  - [ ] **Domain registrar** — aimfitness.ai annual renewal (check which registrar)
  - [ ] **Apple Developer Program** — $99/year (needed for Sign in with Apple)
  - [ ] **Strava API** — Currently free tier, may need paid agreement at scale
  - [ ] **Claude Code (CLI)** — If on a paid plan for development
- [ ] **Accounting setup** — QuickBooks, Xero, or similar for expense tracking + tax prep
- [ ] **Tax planning** — Consult accountant re: business structure, estimated taxes, deductible expenses

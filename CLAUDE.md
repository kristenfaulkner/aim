# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build → /dist
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test framework is configured.

## Architecture

**AIM** is a performance intelligence platform for endurance athletes. It's a React SPA with Vercel serverless API functions, backed by Supabase (PostgreSQL) and Claude AI for cross-source data analysis.

### Stack
- **Frontend**: React 19 + Vite 7 + React Router DOM 7 (client-side routing)
- **Backend**: Vercel serverless functions in `/api/`
- **Database**: Supabase with Row-Level Security (RLS handles user isolation)
- **AI**: Anthropic Claude for multi-source activity analysis (`/api/_lib/ai.js`)
- **Charting**: Recharts
- **Styling**: Inline styles with design tokens (`/src/theme/tokens.js`), no CSS framework

### Frontend (`/src/`)
- `App.jsx` — route definitions; protected routes wrap with `ProtectedRoute`
- `context/AuthContext.jsx` — user auth state, profile management, Supabase auth listeners
- `pages/` — route-level pages (Dashboard, Boosters, HealthLab, ConnectApps, ActivityDetail, etc.)
- `hooks/useDashboardData.js` — parallel Supabase queries (7 concurrent) using `Promise.allSettled`
- `lib/api.js` — `apiFetch()` utility adds Bearer token to all `/api` calls
- `lib/supabase.js` — Supabase client init
- `data/` — static data: integrations metadata, biomarker clinical ranges, booster protocols, power classification tables
- `theme/tokens.js` — design tokens exported as `T` (colors, fonts); `catColors` for booster categories

### Backend (`/api/`)
- `_lib/` — shared utilities (supabase admin client, auth, strava client, eightsleep client, redis, AI pipeline, metrics)
- `auth/connect/` — OAuth flow initiators per provider
- `auth/callback/` — OAuth return handlers
- `integrations/sync/` — sync logic with metrics computation
- `chat/ask.js` — Claude AI coach conversation endpoint

**API pattern**: Every endpoint calls `cors(res)`, checks `req.method`, calls `verifySession(req)` for auth, returns `{ error: "message" }` on failure.

### Key Data Flows

**Integration sync pipeline** (e.g. Strava):
1. OAuth connect → token stored in `integrations` table
2. Sync fetches activity + streams from provider API
3. Backend computes metrics (NP, TSS, IF, VI, EF, HR drift, zones, power curve) via `/api/_lib/metrics.js`
4. Upserts to `activities` table, updates `daily_metrics` (CTL/ATL/TSB), updates `power_profiles`
5. Fire-and-forget AI analysis → stored in `activities.ai_analysis` JSONB

**AI analysis** (`/api/_lib/ai.js`):
- `buildAnalysisContext()` assembles data from activities, daily metrics, power profiles, blood panels, DEXA scans, boosters, cycle phase, and race calendar
- System prompt defines 13+ insight categories for cross-source pattern detection
- Output is structured JSON: summary, insights (with type/category/confidence), and dataGaps
- Triggered post-sync, non-blocking

**Metrics computation** (`/api/_lib/metrics.js`):
- Coggan methodology: normalizedPower, intensityFactor, trainingStressScore, variabilityIndex, efficiencyFactor, hrDrift, zoneDistribution, powerCurve
- Training load: CTL (42-day), ATL (7-day), TSB = CTL - ATL

### Database (Supabase)

Core tables (10): `profiles`, `integrations`, `activities`, `daily_metrics`, `power_profiles`, `blood_panels`, `dexa_scans`, `user_settings`, `ai_conversations`, `ai_messages`

- All tables reference `profiles.id` (UUID from Supabase Auth) with CASCADE delete
- RLS policies scope all client-side queries to the authenticated user
- Backend uses `supabaseAdmin` (service role key) to bypass RLS when needed
- Key unique constraints: `activities(user_id, source, source_id)`, `daily_metrics(user_id, date)`, `integrations(user_id, provider)`
- Trigger `handle_new_user()` auto-creates profile on auth signup
- Trigger `update_updated_at()` auto-maintains timestamps on profiles, integrations, daily_metrics, user_settings, ai_conversations
- Full schema: `/supabase/migrations/001_initial_schema.sql`; annotation columns: `/sql/add_activity_annotations.sql`

### Deployment

Vercel auto-deploys from GitHub. Frontend SPA rewrite in `vercel.json` routes non-API paths to `index.html`. Environment variables configured in Vercel dashboard.

## Product Context

### Vision
AIM is the performance intelligence layer that sits on top of all athlete health and fitness data. It replaces fragmented tools (Strava for social, Oura for recovery, Whoop for strain, Withings for body comp) with a single platform that uses Claude AI to find cross-domain patterns no individual app can detect. Founded by Kristen Faulkner, 2x Olympic Gold Medalist in Cycling (Paris 2024, Road Race & Team Pursuit).

### Target Users
1. Competitive cyclists (Cat 1-5, masters racers, triathletes)
2. Serious amateurs who train 8-15+ hrs/week and care about data
3. Coaches who want AI-augmented analysis
4. Eventually: runners, triathletes, swimmers, multisport

### Brand
- **Name:** AIM — the "AI" is visually highlighted in gradient in the logo
- **Tagline:** AI-powered performance intelligence
- **Aesthetic:** Dark theme, luxury-minimal
- **Colors:** `#05060a` (bg), `#0c0d14` (surface), `#111219` (card), `#00e5a0` (accent green), `#3b82f6` (blue), green-to-blue gradient for premium elements
- **Fonts:** Outfit (body/UI), JetBrains Mono (metrics/numbers)
- **Icons:** Lucide React

### Pricing
| Plan | Monthly | Annual |
|------|---------|--------|
| Starter | $19/mo | $15/mo ($180/yr) |
| Pro | $49/mo | $39/mo ($468/yr) |
| Elite | $99/mo | $79/mo ($948/yr) |

All plans include 14-day free trial, no credit card required.

## Integrations

### Tier 1 — Cycling Core (launch priority)
- **Strava** — activities, segments, routes ✅ (OAuth + sync + metrics + webhook)
- **Wahoo** — ride files, structured workouts, power/HR/cadence/GPS (OAuth connect/callback exist, sync TODO)
- **Garmin Connect** — activities, body battery, stress, daily HR
- **TrainingPeaks** — TSS/CTL/ATL, workout library, planned workouts

### Tier 2 — Recovery & Body
- **Oura Ring** — HRV, RHR, sleep stages, readiness, body temp (OAuth connect/callback exist, sync TODO)
- **Whoop** — strain, recovery, HRV, sleep, respiratory rate (OAuth connect/callback exist, sync TODO)
- **EightSleep** — bed temp, sleep/wake, HRV during sleep ✅ (credential auth + sync)
- **Withings** — weight, body fat %, muscle mass, hydration (OAuth connect/callback exist, sync TODO)

### Tier 3 — Advanced
Apple Health, Supersapiens/Lingo (CGM), MyFitnessPal, Cronometer, TrainerRoad, Intervals.icu, Zwift, Hammerhead, Hexis, Noom

### Integration Pattern
OAuth2 flow: connect/callback file pairs in `/api/auth/`. Credential-based for EightSleep (email/password in `integrations.metadata`). Tokens stored with refresh logic in `integrations` table. Data normalized to `activities` and `daily_metrics`.

## AI Analysis Engine

### Core Principle
Cross-domain insights are the product. Every AI insight must connect 2+ data sources and tell the athlete something they cannot learn from any single app. "Your HRV was low" is Whoop-level. "Your HRV was 38ms, which explains why cardiac drift was 8.1% today vs 3.2% on Feb 18 when HRV was 72ms" is AIM-level.

### 13 Insight Categories
1. **Body Composition → Performance** — W/kg from Withings + power output, weight loss rate monitoring, hydration impact on cardiac drift, race weight projection
2. **Sleep Architecture → Next-Day Performance** — deep sleep vs NP/EF, REM vs tactical performance, sleep timing correlations, EightSleep temperature optimization
3. **HRV Patterns → Training Prescription** — personal HRV thresholds, dose-response curves, readiness traffic light (Green 70+/Yellow 45-69/Red <45)
4. **Environmental Performance Modeling** — heat adaptation (power:HR at temperature), altitude impact, wind-adjusted performance
5. **Fatigue Signature Analysis** — L/R balance shift under fatigue, cadence decay, power fade patterns, pacing intelligence
6. **Long-Term Training Adaptations** — dose-response modeling (zone minutes → FTP change), periodization, year-over-year progress, strain/recovery balance
7. **Nutrition & Fueling Intelligence** — carb/hr vs power fade, CGM glucose monitoring, caloric balance, pre-ride timing
8. **Predictive Analytics** — race-day FTP prediction, event time estimation (VAM + weight + gradient), taper protocol, power profile vs race demands
9. **Benchmarking & Classification** — Coggan power classification at each duration, weakest-link identification, age-adjusted percentile ranking
10. **Menstrual Cycle Intelligence** — cycle phase detection from Oura basal temperature, luteal HR/temp adjustments, personal patterns after 3+ cycles (opt-in via `uses_cycle_tracking`)
11. **Performance Booster Cross-References** — supplement impact detection (pre/post metrics), protocol compliance, recovery recommendations
12. **Blood Work → Training Impact** — ferritin vs VO2max (athlete-optimal >50, not clinical >12), vitamin D, thyroid, CRP inflammation, hormonal health
13. **DEXA Scan → Power & Body Composition** — lean mass W/kg accuracy, regional L/R imbalances, visceral fat tracking

### Insight Quality Rules
- Connect 2+ data sources in most insights
- Use specific numbers from the athlete's own data
- Compare to athlete's own history before population benchmarks
- Include one actionable takeaway per insight
- Assign confidence level (high/medium/low)
- Never assume causation without evidence — use "may be related to"

### AI Output Format
```json
{
  "summary": "2-3 sentence workout summary",
  "insights": [{ "type": "insight|positive|warning|action", "icon": "emoji", "category": "performance|body|recovery|training|nutrition|environment|health", "title": "Short title with key number", "body": "Explanation connecting 2+ sources with actionable takeaway", "confidence": "high|medium|low" }],
  "dataGaps": ["Suggestions for additional integrations"]
}
```

## Auto-Calculated Metrics

### TrainingPeaks Parity (in `/api/_lib/metrics.js`)
- **Power:** Average, Normalized (30s rolling avg → 4th power → avg → 4th root), Max, Intensity Factor (NP/FTP), TSS, Variability Index (NP/Avg), Work (kJ)
- **Heart Rate:** Avg/Max HR, HR Drift % (2nd half vs 1st half), Efficiency Factor (NP/Avg HR), Decoupling %
- **Training Load (PMC):** CTL (42-day EWA of TSS), ATL (7-day EWA), TSB = CTL - ATL, Ramp Rate (flag >7 TSS/week)
- **Zones:** Coggan Power Zones (Z1-Z7) time-in-zone

### Novel Body Comp Metrics (require Withings/DEXA)
- W/kg = FTP / Withings weight (updates with each weigh-in)
- W/kg lean = FTP / lean body mass from DEXA
- Race weight projection (loss rate extrapolated to event date)
- Climbing physics: system weight (rider + bike + gear), gravity power at gradient, watts/lb saved, time saved per kg

### Recovery Score (0-100)
HRV vs personal baseline (30%) + sleep quality (25%) + RHR deviation (15%) + Whoop/Oura readiness (15%) + body temp deviation (10%) + recent training load (5%). Green 70+ / Yellow 45-69 / Red <45.

## Build Status

### Completed
- Project setup (Vite + React + React Router + Supabase)
- Design system (theme tokens, dark theme, NeuralBackground animation)
- Auth (email/password, Google SSO, protected routes, onboarding)
- Strava integration (full: OAuth, sync, metrics, streams, webhook, backfill)
- EightSleep integration (credential auth, trends API, sleep metrics sync)
- Wahoo, Oura, Whoop, Withings OAuth connect/callback (sync logic TODO)
- AI post-ride analysis engine (Claude pipeline, 13-category system prompt)
- Dashboard (activities list, quick stats, recovery metrics, training load chart, sleep summary)
- Activity detail view with AI analysis and user annotations
- Boosters page (searchable/filterable protocol library)
- Health Lab page (blood panels, DEXA scans, biomarker tracking with athlete-optimal ranges)
- Landing page with pricing, founder section, neural background
- Connect Apps page with integration management
- Settings, onboarding, legal pages
- Vercel deployment with GitHub auto-deploy

### Remaining
- Wahoo / Garmin / Oura / Whoop / Withings sync logic
- Daily readiness summary (scheduled morning assessment)
- Cross-domain AI insights (multi-source pattern detection beyond single-activity analysis)
- Training prescription engine (workout recommendations from power profile gaps)
- Menstrual cycle intelligence (Oura temperature-based phase detection)
- AI chat coach (streaming conversation with full athlete context)
- Stripe payments (3-tier subscription + feature gating)
- Remaining Tier 3 integrations
- Coach sharing, community benchmarks, weekly digest emails, mobile app

## Conventions

- **No TypeScript** — plain JavaScript throughout
- **Inline styles** using design token object `T` from `src/theme/tokens.js`; no Tailwind or CSS-in-JS
- **Fonts**: Outfit (UI), JetBrains Mono (numbers/code)
- **Dark theme only** — backgrounds `#05060a`/`#0c0d14`, accent `#00e5a0`
- **Icons**: Lucide React
- **Auth tokens**: Bearer token via `Authorization` header; `apiFetch()` handles this automatically on frontend
- OAuth integrations use connect/callback file pairs in `/api/auth/`; credential-based auth (EightSleep) stores email/password in `integrations.metadata`

## Reference Docs

Detailed specifications archived in `docs/`:
- `docs/product-blueprint.md` — full product spec, booster library (20+ protocols with dosing/timing/evidence), menstrual cycle science (10 peer-reviewed papers), onboarding fields, community benchmarking engine, pricing tiers and feature gating, user stories
- `docs/technical-architecture.md` — complete database schema SQL, 25-task build plan, Strava API appendix, EightSleep workarounds, environment variable reference
- `docs/insights-catalog.md` — all 13 insight categories with detailed examples and specific numbers, insight quality checklist, system prompt integration guide, template for adding new categories

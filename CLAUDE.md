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

Core tables: `profiles`, `integrations`, `activities`, `daily_metrics`, `power_profiles`, `blood_panels`, `dexa_scans`, `user_settings`

- RLS policies scope all client-side queries to the authenticated user
- Backend uses `supabaseAdmin` (service role key) to bypass RLS when needed
- Integration tokens stored in `integrations` table with refresh logic
- Migrations in `/supabase/migrations/`

### Deployment

Vercel auto-deploys from GitHub. Frontend SPA rewrite in `vercel.json` routes non-API paths to `index.html`. Environment variables configured in Vercel dashboard.

## Conventions

- **No TypeScript** — plain JavaScript throughout
- **Inline styles** using design token object `T` from `src/theme/tokens.js`; no Tailwind or CSS-in-JS
- **Fonts**: Outfit (UI), JetBrains Mono (numbers/code)
- **Dark theme only** — backgrounds `#05060a`/`#0c0d14`, accent `#00e5a0`
- **Icons**: Lucide React
- **Auth tokens**: Bearer token via `Authorization` header; `apiFetch()` handles this automatically on frontend
- OAuth integrations use connect/callback file pairs in `/api/auth/`; credential-based auth (EightSleep) stores email/password in `integrations.metadata`

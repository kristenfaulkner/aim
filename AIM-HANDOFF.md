# AIM — Project Handoff for Claude Code

## What is AIM?
AIM is an AI-powered performance intelligence platform for endurance athletes. It connects fitness data from 18+ sources (Strava, Wahoo, Garmin, Oura, Whoop, EightSleep, Withings, etc.) plus blood work and DEXA scans, and delivers actionable insights with specific recommendations. Founded by Kristen Faulkner, 2x Olympic Gold Medalist in Cycling.

## Brand
- **Name:** AIM (the "AI" is visually highlighted in gradient in the logo)
- **Tagline:** AI-powered performance intelligence
- **Design:** Dark theme, luxury-minimal aesthetic
- **Colors:** #05060a (bg), #00e5a0 (accent green), #3b82f6 (blue), green-to-blue gradient
- **Fonts:** Outfit (body), JetBrains Mono (metrics/numbers)

## Files Overview

All files are currently **single-file React artifacts** (self-contained JSX with inline styles). They need to be broken into a proper React app with components, routing, shared design system, etc.

### 1. `aim-landing-page.jsx` (main file, ~700 lines)
Contains 4 pages with state-based routing:
- **Landing page** — Hero, emotional section, founder message, "Why AIM is different" section, AI insight examples, feature grid, 3-tier pricing ($19/$49/$99 with monthly/annual toggle), testimonials, CTA, footer
- **Auth page (signup/signin)** — Split layout: form on left, branding on right. Google/Strava/Apple SSO buttons, email/password form
- **Connect Apps page** — Onboarding step 2. 18 integrations organized by category (Training, Recovery, Body Comp, Nutrition). Search, category filters, connect/disconnect toggles, request integration form

### 2. `apex-dashboard.jsx` (~1100 lines)
Main dashboard after login:
- Sidebar navigation with 8 sections
- Today's Summary with AI readiness assessment
- Recent activities list with AI analysis
- Active Boosters tracking
- Quick stats (FTP, VO2max, CTL, weight)
- Recovery metrics
- Weekly training load chart

### 3. `apex-boosters.jsx` (~800 lines)
Performance Boosters library:
- Searchable/filterable catalog of evidence-based protocols
- Categories: Endurance, Recovery, Nutrition, Cognitive, Heat/Cold, Altitude
- Each booster: description, dosing, timing, evidence grade, mechanism
- Active boosters tracking with compliance

### 4. `apex-health-lab.jsx` (~900 lines)
Health Lab for blood work and DEXA:
- Upload blood panels and DEXA scans
- Biomarker tracking with athlete-optimal ranges (not clinical)
- Trend charts over time
- AI analysis cross-referencing with training data
- Menstrual cycle integration

### 5. `APEX-Product-Blueprint.md`
Comprehensive product spec — features, integrations, data model, AI analysis framework, user stories. **Note: still says "Apex" throughout, needs renaming to "AIM".**

## What Needs to Happen in Claude Code

### Immediate priorities:
1. **Set up a proper React project** (Vite + React + React Router)
2. **Extract shared design system** — theme colors, typography, button styles, card components are duplicated across all files
3. **Break artifacts into components** — each file has 700-1100 lines of inline-styled JSX that needs to become proper components
4. **Set up routing** — React Router replacing the current state-based `page` navigation
5. **Rename remaining "Apex" references to "AIM"** in dashboard, boosters, health lab, and blueprint files
6. **Add the founder photo** — placeholder exists in the landing page founder section. Image is at `Dropbox/Cursor/athlete-website/assets/portraits/EF2026-headshot_right2.jpg`

### Architecture suggestions:
```
src/
  components/
    ui/          # Button, Card, Input, Badge, etc.
    layout/      # Sidebar, Nav, Footer
    charts/      # Reusable chart components
  pages/
    Landing.jsx
    Auth.jsx
    ConnectApps.jsx
    Dashboard.jsx
    Boosters.jsx
    HealthLab.jsx
  theme/
    tokens.js    # Colors, fonts, spacing
    styles.js    # Shared style objects
  data/
    integrations.js  # The 18 app integrations
    boosters.js      # Performance boosters catalog
    biomarkers.js    # Health lab reference ranges
  App.jsx
  main.jsx
```

### Tech stack to consider:
- **Vite + React** for the frontend
- **Tailwind CSS** to replace inline styles (the design system maps well to Tailwind)
- **React Router** for navigation
- **Recharts** for charts (already used in the artifacts)
- **Lucide React** for icons (already used throughout)
- **Supabase or Firebase** for auth + database (when ready for backend)
- **Stripe** for the 3-tier pricing/subscriptions

## Pricing Structure
| Plan | Monthly | Annual |
|------|---------|--------|
| Starter | $19/mo | $15/mo ($180/yr) |
| Pro | $49/mo | $39/mo ($468/yr) |
| Elite | $99/mo | $79/mo ($948/yr) |

All plans include 14-day free trial. No credit card required to start.

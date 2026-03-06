# AIM Design Bible

_Last updated: 2026-03-03_

The single source of truth for anyone designing or prototyping AIM pages and features. Import any section into Figma, Claude, or any design tool to produce mockups that match the existing product.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Design System & Tokens](#2-design-system--tokens)
3. [Layout & Responsive Patterns](#3-layout--responsive-patterns)
4. [Component Library](#4-component-library)
5. [User Personas & Goals](#5-user-personas--goals)
6. [Page-by-Page Specs](#6-page-by-page-specs)
7. [Unbuilt Feature Designs](#7-unbuilt-feature-designs)
8. [Accessibility & Performance](#8-accessibility--performance)

---

## 1. Brand Identity

### Name & Logo
- **Name:** AIM — the "AI" is visually highlighted in a teal-to-blue gradient
- **Tagline:** AI-powered performance intelligence
- **Founded by:** Kristen Faulkner, 2x Olympic Gold Medalist in Cycling (Paris 2024, Road Race & Team Pursuit)

### Aesthetic
- **Light, luxury-minimal** — clean whites, soft grays, with a single bold accent color
- **Premium but approachable** — no dark mode, no clutter, generous whitespace
- **Data-forward** — metrics are first-class citizens; numbers use monospace font for clarity
- **Athlete-centric** — language is second-person ("your power", "your sleep"), warm and personal

### Voice & Tone
- Confident but not clinical
- Second person always ("Your worst sleep nights correlate with..." not "Athletes who...")
- Actionable — every insight has a "so what" takeaway
- Non-prescriptive on health/medical topics (see No Medical Advice Policy in CLAUDE.md)

### Competitive Positioning
AIM replaces 5+ fragmented tools (Strava, Oura, Whoop, TrainingPeaks, MyFitnessPal) with one AI layer that finds cross-domain patterns none of them can detect individually. The UI should feel unified, not like a dashboard of dashboards.

---

## 2. Design System & Tokens

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#f8f8fa` | Page background |
| `surface` | `#f0f0f3` | Slightly darker surface (filter bars, input backgrounds) |
| `card` | `#ffffff` | Card backgrounds |
| `cardHover` | `#f5f5f8` | Card hover state |
| `border` | `rgba(0,0,0,0.08)` | Default borders |
| `borderHover` | `rgba(0,0,0,0.15)` | Hover borders |
| `accent` | `#10b981` | Primary accent (teal-green) |
| `accentDim` | `rgba(16,185,129,0.08)` | Subtle accent background |
| `accentMid` | `rgba(16,185,129,0.2)` | Medium accent fill |
| `accentGlow` | `rgba(16,185,129,0.35)` | Strong accent highlight |
| `text` | `#1a1a2e` | Primary text |
| `textSoft` | `#6b7280` | Secondary text |
| `textDim` | `#9ca3af` | Tertiary / placeholder text |
| `white` | `#ffffff` | White text on accent backgrounds |
| `gradient` | `#10b981 → #3b82f6` | Premium elements, logo highlight, CTA buttons |
| `gradientSubtle` | Same, at 0.06 opacity | Subtle gradient backgrounds |

**Status colors:**
| Status | Hex | Usage |
|--------|-----|-------|
| Green | `#10b981` | Good / positive / on-track |
| Yellow/Amber | `#f59e0b` | Warning / moderate / caution |
| Red | `#ef4444` | Bad / danger / critical |
| Blue | `#3b82f6` | Info / secondary accent |
| Purple | `#8b5cf6` | Recovery category |
| Pink | `#ec4899` | Nutrition category |
| Orange | `#f97316` | Emphasis / tertiary |

**Booster category colors:**
| Category | Color |
|----------|-------|
| Supplement | `#10b981` (accent) |
| Protocol | `#f59e0b` (amber) |
| Training | `#3b82f6` (blue) |
| Nutrition | `#ec4899` (pink) |
| Recovery | `#8b5cf6` (purple) |

### Typography

| Role | Font | Weight | Size (desktop) |
|------|------|--------|----------------|
| Body / UI | DM Sans | 400, 500, 600, 700 | 14-16px |
| Page titles | DM Sans | 700 | 24-28px |
| Section headers | DM Sans | 600 | 18-20px |
| Card titles | DM Sans | 600 | 16px |
| Metrics / numbers | JetBrains Mono | 500, 700 | 14-28px |
| Small labels | DM Sans | 500 | 12-13px |
| Captions / tertiary | DM Sans | 400 | 12px |

### Spacing & Sizing

| Element | Value |
|---------|-------|
| Card padding | 20px |
| Card border-radius | 16px |
| Card border | `1px solid rgba(0,0,0,0.06)` |
| Card shadow | None (flat design) |
| Section gap | 16-20px |
| Grid gap | 16px |
| Button padding | 12px 24px |
| Button border-radius | 12px |
| Input border-radius | 10px |
| Touch target minimum | 44px (mobile) |
| Page max-width | None (fluid grid) |
| Page padding | 20-32px |

### Icons
- **Library:** Lucide React
- **Stroke width:** Default (2px)
- **Size:** 16-20px inline, 24px standalone
- **Color:** Inherits from text color, accent for interactive elements

---

## 3. Layout & Responsive Patterns

### Breakpoints

| Name | Range | Columns |
|------|-------|---------|
| Mobile | < 768px | 1 column |
| Tablet | 768–1024px | 2 columns |
| Desktop | > 1024px | 2-3 columns |

### Today Page Layout (Primary Template)

The primary authenticated page is the **Today** page (`src/pages/Today.jsx`), an AI-first single-column centered layout. All content flows vertically in a single column with a max-width of 700px, centered on screen.

```
Desktop & Mobile (single-column, 700px max-width, centered):
┌──────────────────────────────────────┐
│ Greeting + Date                      │
├──────────────────────────────────────┤
│ AI Intelligence Card                 │
├──────────────────────────────────────┤
│ Readiness / Recovery                 │
├──────────────────────────────────────┤
│ Last Ride Summary                    │
├──────────────────────────────────────┤
│ Prescription / Next Workout          │
├──────────────────────────────────────┤
│ Action Items                         │
└──────────────────────────────────────┘
```

### Legacy Dashboard Layout (Two-Column)

> **Note:** This two-column layout was the original Dashboard design. It has been replaced by the single-column Today page above, but is retained here for reference.

```
Desktop (> 1024px):
┌────────────────────────┬──────────────┐
│ Left Column (1fr)      │ Right (380px)│
│ ┌────────────────────┐ │ ┌──────────┐ │
│ │ ReadinessCard      │ │ │ AIPanel  │ │
│ └────────────────────┘ │ │ (sticky) │ │
│ ┌────────────────────┐ │ │          │ │
│ │ LastRideCard       │ │ └──────────┘ │
│ └────────────────────┘ │ ┌──────────┐ │
│ ┌────────────────────┐ │ │ Goals    │ │
│ │ Charts             │ │ │ (sticky) │ │
│ └────────────────────┘ │ └──────────┘ │
└────────────────────────┴──────────────┘

Mobile (< 768px):
┌──────────────────────────────────────┐
│ ReadinessCard                        │
├──────────────────────────────────────┤
│ AIPanel (expanded)                   │
├──────────────────────────────────────┤
│ LastRideCard                         │
├──────────────────────────────────────┤
│ Charts                               │
├──────────────────────────────────────┤
│ Goals                                │
└──────────────────────────────────────┘
```

### Standard Page Layout
```
Desktop:
┌──────────────────────────────────────┐
│ Nav Bar (sticky top)                 │
├──────────────────────────────────────┤
│ Page Header (title + subtitle)       │
├──────────────────────────────────────┤
│ Filter Bar (time period, search)     │
├──────────────────────────────────────┤
│ Content Grid (varies by page)        │
└──────────────────────────────────────┘
```

### Navigation
- **Desktop:** Horizontal nav bar at top with route links
- **Mobile:** Hamburger icon (Menu/X from Lucide) → slide-out drawer
- **Active state:** Accent color underline or background
- **Order:** Today, Activities, Performance, My Stats, Sleep, Health Lab, Connect

### Modal Patterns
- **Full-screen modal (mobile):** `maxWidth: 100%`, `height: 100vh`, `borderRadius: 0`
- **Centered modal (desktop):** `maxWidth: 520-600px`, centered, `borderRadius: 16px`, overlay backdrop `rgba(0,0,0,0.5)`
- **Conversational modal:** NutritionLogger pattern — multi-stage flow with chat-like UI, progress indicator

### Card Patterns
- All cards: white bg, 1px border, 16px radius, 20px padding
- No box-shadows (flat design)
- Cards are direct children of the grid — no nesting
- Hover state: `borderColor` transitions to `borderHover`

---

## 4. Component Library

### Existing Reusable Components

#### ReadinessCard
- **Location:** `src/components/dashboard/ReadinessCard.jsx`
- **Design:** SVG ring (0-100 score), color-coded (green/yellow/red), 4 metric pills below (Sleep, HRV, RHR, Recovery)
- **Data:** Recovery score computed from HRV, sleep, RHR, training load
- **Interaction:** Static display, updates on dashboard load

#### AIPanel
- **Location:** `src/components/dashboard/AIPanel.jsx`
- **Design:** 3-tab card (Analysis | Summary | Chat), markdown-rendered content, "Unlock More Insights" section at bottom
- **Tabs:** Tab pills with accent color active state
- **Chat tab:** Input field + send button, message bubbles (user right-aligned, AI left-aligned)

#### LastRideCard
- **Location:** `src/components/dashboard/LastRideCard.jsx`
- **Design:** 8-metric grid (2x4 or 4x2), JetBrains Mono numbers, small labels below
- **Metrics:** Distance, Duration, Avg Power, NP, TSS, IF, Avg HR, Calories

#### TrainingWeekChart
- **Location:** `src/components/dashboard/TrainingWeekChart.jsx`
- **Design:** 7-day horizontal bar chart (Recharts), TSS values, day labels
- **Interaction:** Hover tooltips

#### FitnessChart
- **Location:** `src/components/dashboard/FitnessChart.jsx`
- **Design:** SVG line chart with CTL (blue), ATL (red), TSB (green/red fill), 90-day span
- **Interaction:** Hover crosshair with tooltip

#### WorkingGoals
- **Location:** `src/components/dashboard/WorkingGoals.jsx`
- **Design:** Expandable goal cards with 3 tabs (Progress | Action Plan | This Week)
- **Interaction:** Click to expand, checklist toggle for This Week items

#### NutritionLogger
- **Location:** `src/components/dashboard/NutritionLogger.jsx`
- **Design:** 5-stage conversational modal — Activity Select → Free Text Input → AI Parse → Review Items → Confirmation
- **Interaction:** Full-screen on mobile, centered on desktop, chat-like message flow

#### SessionNotes
- **Location:** `src/components/SessionNotes.jsx`
- **Design:** Activity annotation panel with: 5-star rating row, RPE slider (0-10) with labels, GI Comfort slider (1-5), Mental Focus slider (1-5), Pre-Ride Recovery slider (1-5), freeform notes textarea, tag input with autocomplete + alias normalization
- **Interaction:** Auto-saves on change (debounced), shared across Activities list and ActivityDetail page

#### BloodPanelUpload
- **Location:** `src/components/BloodPanelUpload.jsx`
- **Design:** Multi-file drag-and-drop zone, file list with progress, Claude AI extraction feedback

#### DexaScanUpload
- **Location:** `src/components/DexaScanUpload.jsx`
- **Design:** Single-file drag-and-drop, body composition extraction preview

#### TrainingPeaksImport
- **Location:** `src/components/TrainingPeaksImport.jsx`
- **Design:** ZIP + CSV file upload with import progress, step-by-step status messages

#### ActivityBrowser
- **Location:** `src/components/ActivityBrowser.jsx`
- **Design:** Popover with time period filter pills (Week/Month/Year/All), search input, paginated activity list
- **Interaction:** Click activity → navigates to detail; used on Dashboard for activity selection

### Slider Pattern (Standard)
Used consistently across SessionNotes:
- Horizontal track with tappable circle markers (5 or 11 positions)
- Active marker: accent color fill, slightly larger
- Labels at endpoints (e.g., "None" ← → "Very Sore")
- Value label above selected marker
- 44px touch targets on mobile

### Filter Pill Pattern
Used on Activities, Sleep, WorkoutDatabase:
- Horizontal row of pill buttons
- Active pill: accent background, white text
- Inactive pill: surface background, soft text
- Mobile: horizontal scroll with overflow hidden

### Metric Grid Pattern
Used on LastRideCard, ActivityDetail:
- CSS Grid with equal columns
- Large number (JetBrains Mono, 700 weight, 20-28px)
- Small label below (DM Sans, 500 weight, 12px, textSoft)
- Optional unit suffix in textDim

---

## 5. User Personas & Goals

### Primary Persona: Competitive Cyclist
- **Who:** Cat 1-5 racers, masters competitors, triathletes
- **Training:** 8-15+ hours/week, structured plans, power meter + HR monitor
- **Data sources:** Strava, Garmin/Wahoo, Oura/Whoop, Eight Sleep, TrainingPeaks
- **Goals:** Optimize training, avoid overtraining, peak for key events, track body composition
- **Pain point:** Data scattered across 5+ apps, no cross-domain insights

### Secondary Persona: Serious Amateur
- **Who:** Committed recreational athletes, data-driven
- **Training:** 6-12 hours/week, semi-structured
- **Data sources:** Strava + maybe one recovery wearable
- **Goals:** Improve consistently, understand recovery, avoid injury
- **Pain point:** Doesn't know how to interpret all the data they collect

### Future Persona: Coach
- **Who:** Cycling/triathlon coaches managing 5-30 athletes
- **Goals:** Monitor all athletes in one view, flag concerns, prescribe training
- **Pain point:** Currently uses spreadsheets + TrainingPeaks + texts

### What Users Care About (Priority Order)
1. **Am I ready to train today?** → ReadinessCard, daily check-in, recovery score
2. **How did my last workout go?** → LastRideCard, AI analysis, interval execution
3. **Am I getting fitter?** → Fitness chart (CTL/ATL/TSB), power profile trends
4. **What should I do next?** → AI recommendations, training calendar
5. **How is my body responding?** → Sleep trends, HRV patterns, blood work, body comp
6. **Am I fueling well?** → Nutrition logging, GI comfort tracking

---

## 6. Page-by-Page Specs

### 6.1 Dashboard
- **URL:** `/dashboard`
- **Purpose:** Morning command center — answer "Am I ready?" and "How did yesterday go?" in 10 seconds
- **Audience:** Every athlete, every day
- **Key stats front and center:** Recovery score (ring), last ride metrics, fitness trend, AI insights
- **Layout:** Two-column on desktop (`1fr 380px`), single-column mobile
- **Left column:** ReadinessCard → ActionItems (conditional) → LastRideCard → TrainingWeekChart → FitnessChart → ActivityBrowser
- **Right column (sticky):** AIPanel (3 tabs) → WorkingGoals
- **Modals launched from here:** NutritionLogger (from action items)
- **Data:** 7 concurrent Supabase queries via `useDashboardData` hook
- **Empty state:** Onboarding prompts to connect Strava/devices

### 6.2 Activities
- **URL:** `/activities`
- **Purpose:** Browse all synced activities, annotate them, quick-access to detail
- **Audience:** Athletes reviewing recent training, adding subjective notes
- **Key stats:** Activity name, date, distance, duration, TSS, sport type
- **Layout:** Activity list (cards or rows) with filter pills (time period). Selected activity opens inline detail panel on desktop, full-screen on mobile.
- **Sections:** Filter bar (Week/Month/Year/All + search) → Activity list → Selected activity detail (inline right panel or expandable)
- **Each activity row shows:** Sport icon, name, date, distance, duration, TSS badge
- **Selected activity panel:** Full metrics grid, AI analysis (if available), SessionNotes component
- **Key interaction:** Click activity → loads detail + SessionNotes. Star rating, RPE, GI comfort, mental focus, pre-ride recovery, notes, tags — all save inline.

### 6.3 Activity Detail
- **URL:** `/activity/:id`
- **Purpose:** Deep dive into a single activity — full metrics, AI analysis, intervals, weather, session notes
- **Audience:** Athletes reviewing a specific ride in depth
- **Key stats:** All Coggan metrics (NP, IF, TSS, VI), HR metrics (avg, max, drift, decoupling), zones, intervals
- **Layout:** Single-column, scrollable. Nav link "← Activities" at top left.
- **Sections (top to bottom):**
  1. Header: Activity name, date, sport type, edit name button
  2. Metric grid: 8-12 key metrics in a responsive grid
  3. AI Analysis panel (same 3-tab pattern as Dashboard AIPanel)
  4. Intervals table (if structured workout): per-interval metrics, execution quality badges, interval insights
  5. Planned vs Actual (if training plan exists): side-by-side comparison, execution score
  6. Weather card: conditions during the ride
  7. Tag pills: canonical workout tags
  8. SessionNotes: rating, RPE, GI, focus, recovery, notes, tags
- **Mobile:** Full-width stacked cards

### 6.4 Sleep Intelligence
- **URL:** `/sleep`
- **Purpose:** Sleep and recovery trends, Eight Sleep data, morning readiness report
- **Audience:** Athletes tracking recovery quality
- **Key stats:** Sleep score, duration, HRV, RHR, sleep stages, bed temperature
- **Layout:** Single-column with filter pills (7d/30d/90d)
- **Sections:**
  1. Morning AI Readiness Report (Claude-generated, today's assessment)
  2. Key metrics summary cards (avg sleep score, avg duration, avg HRV, avg RHR)
  3. Sleep trend charts (Recharts line charts for score, duration, HRV, RHR over time)
  4. Nightly detail list (expandable rows with full night metrics)
- **Data source:** Eight Sleep via `daily_metrics`, fetched by `useSleepData` hook

### 6.5 Health Lab
- **URL:** `/health`
- **Purpose:** Blood work analysis, DEXA body composition, health biomarker tracking
- **Audience:** Athletes monitoring health markers for performance optimization
- **Key stats:** Biomarker values vs athlete-optimal ranges, body composition, trends
- **Layout:** Tabbed interface (Blood Panels | DEXA Scans)
- **Blood Panels tab:**
  1. Upload zone (BloodPanelUpload — multi-file drag-and-drop)
  2. Panel list (date-sorted, expandable)
  3. Per-panel: biomarker table with value, range, status badge (optimal/suboptimal/deficient)
  4. AI cross-reference insights (how blood work relates to training)
- **DEXA tab:**
  1. Upload zone (DexaScanUpload — single file)
  2. Body composition summary: total body fat %, lean mass, bone density
  3. Regional breakdown: arms, legs, trunk, android/gynoid ratio
  4. Trend chart if multiple scans
- **Medical disclaimer:** Non-prescriptive language throughout

### 6.6 Boosters
- **URL:** `/boosters`
- **Purpose:** Evidence-based performance enhancement protocols (supplements, recovery, nutrition, training techniques)
- **Audience:** Athletes seeking science-backed performance gains
- **Key stats:** Protocol name, evidence level, category, expected benefit
- **Layout:** Category filter pills (Supplements, Protocols, Training, Nutrition, Recovery) → Card grid
- **Each booster card:** Title, category badge (colored by catColors), evidence summary, dosage/protocol, research citations
- **Medical disclaimer:** All supplement/health content uses non-prescriptive language ("Research suggests...", "Consider discussing with your doctor...")
- **Category colors:** supplement=teal, protocol=amber, training=blue, nutrition=pink, recovery=purple

### 6.7 Connect Apps
- **URL:** `/connect`
- **Purpose:** Connect and manage data source integrations
- **Audience:** New users during setup, returning users adding new sources
- **Key stats:** Connection status, last sync time, data types synced
- **Layout:** Integration cards in a grid (2-3 columns desktop, 1 column mobile)
- **Each card:** App logo, name, status badge (Connected ✅ / Not Connected), Connect/Disconnect button, last sync timestamp
- **Integrations shown:** Strava, Wahoo, Eight Sleep, TrainingPeaks, Oura, Whoop, Withings, Garmin (coming soon)
- **Connect flow:** Button → OAuth redirect → callback → status updates to Connected
- **File import:** TrainingPeaks has a separate import section (ZIP + CSV upload)

### 6.8 Settings
- **URL:** `/settings`
- **Purpose:** Profile configuration, training zones, notification preferences
- **Audience:** All users (setup and ongoing)
- **Key stats:** FTP, max HR, weight, power zones, HR zones, notification toggles
- **Layout:** Single-column form sections
- **Sections (tabbed sidebar):**
  1. Units & Display: imperial/metric toggle
  2. Preferences: timezone selector, training zones preference (Auto/CP-Based/Coggan — 3-card selector, saves via `PUT /api/settings`)
  3. Notifications: email toggles, SMS coach (phone, consent, per-type toggles)
  4. Password: reset via email
  5. Appearance: coming soon (dashboard layout)
  6. Account & Data: export JSON, reprocess activities, delete account (confirmation modal)

### 6.9 Workout Database
- **URL:** `/workout-db`
- **Purpose:** Search and analyze past workouts by tags, filters, and aggregations
- **Audience:** Athletes looking for patterns, comparing similar sessions, tracking progression
- **Key stats:** Matching workout count, aggregated metrics (avg TSS, NP, duration), grouped comparisons
- **Layout:** Left panel (filters) + right panel (results) on desktop; stacked on mobile
- **Filter panel:** Tag multi-select (from canonical tag dictionary), date range, sport type, metric range sliders
- **Smart chips:** AI-suggested one-click query filters (e.g., "Sweet spot rides last 3 months")
- **Results:** Sortable table/cards with key metrics, aggregation bar (averages across selection), grouped comparison mode
- **Interaction:** Click result → navigates to ActivityDetail

### 6.10 Onboarding
- **URL:** `/onboarding`
- **Purpose:** First-time setup — collect basic athlete data and connect first integration
- **Audience:** New users immediately after signup
- **Key stats collected:** Name, weight, FTP, max HR, location (for weather), health data consent
- **Layout:** Multi-step wizard (4-5 steps)
- **Steps:**
  1. Health data consent checkbox (required)
  2. Basic profile (name, weight, FTP, max HR)
  3. Training zones preview (auto-computed, editable)
  4. Connect first integration (Strava recommended)
  5. Completion → redirect to Dashboard
- **Design notes:** Clean, focused, one thing per step, progress indicator at top

### 6.11 Landing Page
- **URL:** `/`
- **Purpose:** Marketing page — convert visitors to signups
- **Audience:** Prospective users discovering AIM
- **Layout:** Full-width sections, hero + features + pricing + CTA
- **Sections:**
  1. Hero: headline, tagline, CTA button, hero image/mockup
  2. Feature highlights (cross-domain AI, readiness, analysis)
  3. Integration logos (Strava, Garmin, Oura, etc.)
  4. Pricing table (Starter $19/Pro $49/Elite $99)
  5. Founder story (Kristen Faulkner, 2x Olympic Gold)
  6. Final CTA
- **SEO:** JSON-LD structured data, OpenGraph meta tags, canonical URL

### 6.12 Auth Pages
- **URLs:** `/auth`, `/reset-password`, `/accept-terms`
- **Purpose:** Login, signup, password reset, terms acceptance
- **Audience:** All users
- **Layout:** Centered card on page background, logo at top
- **Auth methods:** Email/password, Google SSO, magic link
- **Accept Terms:** Interstitial for SSO users who haven't accepted terms yet
- **Design notes:** Minimal, branded, accent CTA button

### 6.13 My Stats
- **URL:** `/my-stats`
- **Purpose:** Read-only athlete stats dashboard — power model, zones, durability, body comp, training load, recovery baselines
- **Audience:** Serious athletes who want to see all their metrics in one place
- **Layout:** Single column, max-width 900px, `SectionCard` containers with 16px gap
- **Sections:**
  1. **Power Model** — FTP, CP, W', Pmax StatBoxes. Edit button links to Profile. Shows CP-vs-FTP delta and R² fit quality.
  2. **Power Profile Bests** — 6-column grid (5s/30s/1m/5m/20m/60m) with W and W/kg. 3-column on mobile.
  3. **Training Zones** — Tabbed (Power | HR | CP). ZoneBar rows with colored bars and watt ranges.
     - **Readiness adjustment banner:** Appears on Power/CP tabs when readiness shifts zones. Shows adjustment % and reason. Base/Today toggle switches between unadjusted and shifted zone wattages.
     - **Zone evolution:** CP tab shows delta text ("Z4 floor +8W") and a mini line chart of CP evolution from `zones_history` (up to 52 snapshots).
  4. **Body Composition** — Weight, height, FTP W/kg, DEXA body fat %, lean W/kg.
  5. **Training Load** — CTL/ATL/TSB/Ramp Rate StatBoxes. Form label (Fresh/Optimal/Fatigued/Overreaching) color-coded.
  6. **Durability** — Durability Score (% retention, green/yellow/red). Fatigue-bucket power grid (kJ/kg rows × 5s/1m/5m/20m columns). Race prediction chips (5m power at 30/40/50 kJ/kg). Durability trend line chart. Recent rides table (date, name, kJ/kg, 5m%, 20m% — click navigates to activity).
  7. **Recovery Baselines** — HRV, RHR, Sleep Score, Sleep Duration with 30-day averages. Recovery traffic light.
- **Data hooks:** `useMyStats`, `useAdaptiveZones`, `useDurability`
- **Design notes:** Mono font for all metrics. Empty states guide user to Profile or integrations. Zone preference (auto/CP/Coggan) is set in Settings > Preferences.

---

## 7. Unbuilt Feature Designs

Features that have backend support but need UI design and implementation. Each entry has enough context for a designer to produce a mockup.

### 7.1 Daily Check-In Modal

**Priority:** High — this is the first thing athletes should see each morning

**Purpose:** Collect 4 subjective scores (1-5) before the athlete sees their dashboard. Feeds AI analysis with subjective context. Takes < 15 seconds to complete.

**Data collected:**
| Field | Scale | Labels (1 → 5) |
|-------|-------|-----------------|
| Life Stress | 1-5 | None → Overwhelming |
| Motivation | 1-5 | Very Low → Fired Up |
| Muscle Soreness | 1-5 | None → Very Sore |
| Mood | 1-5 | Poor → Excellent |

**Backend:** `POST /api/checkin/submit` saves to `daily_metrics`. `GET /api/checkin/status` returns today's check-in or null.

**Interaction model — two options to consider:**

**Option A — Interstitial modal** (like NutritionLogger pattern)
- On Dashboard load, if `checkin_completed_at` is null for today → show modal overlay
- 4 sliders on one screen, each with emoji or icon + label + 5 tappable circles
- "Save & Continue" button at bottom → dismisses modal, loads dashboard
- "Skip for now" link below the button
- Should feel quick and lightweight, not like a chore

**Option B — Inline dashboard card** (like ReadinessCard pattern)
- A card at the top of the left column: "How are you feeling today?"
- 4 compact slider rows inline
- Once submitted, card transforms to show today's scores (collapsed)
- Can re-open to edit

**Placement:** Dashboard — either as modal on load (Option A) or top of left column (Option B)

**Mobile:** Full-screen modal for Option A. Full-width card for Option B.

**Design notes:**
- Should feel warm and personal ("Good morning, Kristen")
- Emojis or simple icons for each category make it scannable
- Color-code the selected value (green=good, yellow=moderate, red=concerning)
- After submission, the ReadinessCard could incorporate a "Subjective" pill showing the blended score

### 7.2 Cross-Training Logger

**Priority:** Medium — athletes do gym/yoga sessions that affect cycling recovery

**Purpose:** Log non-cycling sessions (strength, yoga, swimming, hiking, pilates) with enough detail for AI to assess recovery impact. Quick entry, < 30 seconds.

**Data collected:**
| Field | Type | Options |
|-------|------|---------|
| Activity Type | Select | Strength, Yoga, Swimming, Hiking, Pilates, Other |
| Body Region | Select (conditional, shows for Strength) | Upper Body, Lower Body, Full Body, Core |
| Perceived Intensity | 1-5 slider | Easy → Max Effort |
| Duration | Number input | Minutes |
| Notes | Text (optional) | Free-form |
| Date | Date picker | Defaults to today |

**Backend:** `POST /api/cross-training/log` auto-computes `estimated_tss` and `recovery_impact`. `GET /api/cross-training/list?days=30` returns recent entries.

**Auto-computed (shown after save):**
- Estimated TSS (e.g., "~45 TSS")
- Recovery Impact badge: None (green), Minor (blue), Moderate (yellow), Major (red)

**Interaction model — follows NutritionLogger pattern:**
- Triggered from Dashboard via a button/FAB or action item
- Modal overlay with form fields
- Activity type as icon grid (6 icons in 2x3 or 3x2 grid) — tap to select
- Body region appears only when "Strength" is selected
- Intensity as 5 tappable circles with labels
- Duration as a simple number input with "min" suffix
- Save button → shows confirmation with computed TSS + recovery impact
- Recent entries list below the form (last 7 days)

**Placement:** Dashboard — triggered from an action button alongside NutritionLogger trigger.

**Mobile:** Full-screen modal.

**Design notes:**
- Activity type icons: Dumbbell (strength), Person in lotus (yoga), Waves (swimming), Mountain (hiking), Person stretching (pilates), Ellipsis (other)
- After logging, the entry should appear in a "Recent Cross-Training" mini-list on the dashboard or in a dedicated section
- Recovery impact badge is the key visual: "This session will have a **moderate** impact on tomorrow's cycling performance"
- Consider showing a weekly cross-training summary somewhere (e.g., "3 sessions this week, 92 estimated TSS")

### 7.3 Travel & Altitude Status Card

**Priority:** Low-medium — travel is auto-detected, this is informational

**Purpose:** Show the athlete when travel has been detected and its impact on performance. Jet lag recovery timeline, altitude acclimation progress, and expected power penalty.

**Data available (from `travel_events` table):**
- Distance traveled (km)
- Travel type: Flight / Drive / Unknown
- Timezone shift (hours)
- Altitude change (meters)
- Acclimation day counter (0-14)
- Estimated jet lag recovery (days remaining)
- Estimated power penalty (% at current altitude + acclimation)

**Interaction model — passive dashboard card:**
- Only appears when there's an active travel event (within recovery window)
- Auto-dismisses when jet lag recovery is complete AND altitude acclimation is done
- Not always visible — conditional, like a notification card

**Card content example:**
```
✈️ Travel Detected — NYC → Denver
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Timezone: -2h shift → ~2 days recovery (Day 1 of 2)
⛰️ Altitude: 1,609m → ~2.8% power penalty
   Acclimation: Day 3 of 14 ████░░░░░░░░░░

   Estimated penalty will decrease as you acclimate.
   Your AI coach factors this into all recommendations.
```

**Placement:** Dashboard left column, between ReadinessCard and LastRideCard (only when active).

**Mobile:** Full-width card, same as desktop but stacked.

**Design notes:**
- Progress bar for acclimation (0-14 days)
- Color shifts from red → yellow → green as acclimation progresses
- Plane icon for flights, car icon for drives
- Very compact — shouldn't dominate the dashboard, just inform
- Could be expandable: collapsed shows "✈️ Denver — Day 3, -2.1% power" and expands to full detail

### 7.4 Check-In History / Trends (Future)

**Priority:** Low — nice-to-have visualization

**Purpose:** Show 7-day and 30-day trends for subjective check-in scores. Helps athletes see patterns (e.g., stress climbs before races, soreness tracks with training load).

**Data:** 4 time series from `daily_metrics` (life_stress, motivation, soreness, mood).

**Possible placements:**
- Expandable section within ReadinessCard
- Dedicated tab on the Sleep page
- Small sparkline charts on the check-in card after submission

**Design notes:**
- 4 small sparkline charts (7 dots each) or a combined line chart
- Color-coded by metric
- Show correlation with training load (CTL overlay) if space allows

### 7.5 Cross-Training History View (Future)

**Priority:** Low — listing view for logged cross-training

**Purpose:** Browse past cross-training sessions, see weekly summary, filter by type.

**Data:** `GET /api/cross-training/list?days=30`

**Possible placements:**
- Section on a dedicated "Training Log" page
- Expandable section on Dashboard
- Tab within the Activities page

### 7.6 Recovery Device Connect Cards (Future)

**Priority:** Medium — OAuth connect flows exist but no sync status UI

**Purpose:** Show sync status, last sync time, and data preview for each connected recovery device (Oura, Whoop, Withings).

**Placement:** ConnectApps page (already exists with Strava/Eight Sleep cards)

### 7.7 Critical Power (CP) Model Visualization (Future)

**Priority:** High (P0 feature) — CP model exists in schema but no UI

**Purpose:** Display the 3-parameter power model (CP/W'/Pmax), show the hyperbolic power-duration curve, compare to historical values, and show how zones derive from CP.

**Data:** `power_profiles` table columns: `cp_watts`, `w_prime_kj`, `pmax_watts`, `cp_model_r_squared`, `cp_model_data`

**Possible placements:**
- Dedicated section on Settings/profile page
- New "Power Model" card on Dashboard
- Section on ActivityDetail showing W' balance during ride

**Design notes:**
- Power-duration curve (log scale x-axis: 1s → 3600s, linear y-axis: watts)
- Three key numbers prominently displayed: CP, W', Pmax
- Model fit quality indicator (R² value)
- Historical overlay showing progression

---

## 8. Accessibility & Performance

### Accessibility Standards
- **Touch targets:** 44px minimum on mobile (per WCAG 2.5.8)
- **Color contrast:** All text meets WCAG AA (4.5:1 for body text, 3:1 for large text)
- **Status colors:** Never rely on color alone — always pair with text labels, icons, or badges
- **Focus states:** Visible focus rings on interactive elements (keyboard navigation)
- **Alt text:** All meaningful images/icons need descriptive alt text
- **Semantic HTML:** Use heading hierarchy (h1 → h2 → h3), button vs link distinction, form labels

### Performance Guidelines
- **No layout shift:** Cards should have fixed or min-height containers
- **Lazy loading:** Charts and heavy components loaded on scroll
- **Optimistic UI:** Save operations should feel instant (update UI before server confirms)
- **Loading states:** Skeleton cards or subtle pulse animation while data loads
- **Error states:** Toast notifications for failures, inline error messages for forms

### Animation & Motion
- **Transitions:** 200ms ease for hover states, 300ms for modals/drawers
- **No gratuitous animation:** Motion serves function (state change, attention)
- **Reduced motion:** Respect `prefers-reduced-motion` media query

---

## Implementation Status

| # | Feature / Page | Built | Designed | Design File |
|---|---------------|-------|----------|-------------|
| 1 | Dashboard | ✅ | ✅ | `/prototypes/aim-dashboard-v2-light.jsx` |
| 2 | Activities | ✅ | ✅ | — (inline styles) |
| 3 | Activity Detail | ✅ | ✅ | — |
| 4 | Sleep Intelligence | ✅ | ✅ | — |
| 5 | Health Lab | ✅ | ✅ | — |
| 6 | Boosters | ✅ | ✅ | — |
| 7 | Connect Apps | ✅ | ✅ | — |
| 8 | Settings | ✅ | ✅ | — |
| 9 | Workout Database | ✅ | ✅ | — |
| 10 | Onboarding | ✅ | ✅ | — |
| 11 | Landing Page | ✅ | ✅ | — |
| 12 | Auth Pages | ✅ | ✅ | — |
| 13 | My Stats | ✅ | ✅ | — |
| 14 | Daily Check-In | ✅ backend | Needs Design | — |
| 15 | Cross-Training Logger | ✅ backend | Needs Design | — |
| 16 | Travel Status Card | ✅ backend | Needs Design | — |
| 17 | Check-In Trends | Future | Future | — |
| 18 | Cross-Training History | Future | Future | — |
| 19 | Recovery Device Cards | ✅ OAuth | Needs Design | — |
| 20 | CP Model Visualization | ✅ schema | Needs Design | — |
| 20 | Post-Workout Email (full AI analysis) | ✅ | Needs Design | — |
| 21 | Athlete Bio Card | ✅ | Needs Design | — |

---

## How to Use This Document

1. **Prototyping a new feature:** Read Section 2 (tokens) + Section 4 (components) + the relevant entry in Section 7
2. **Redesigning an existing page:** Read Section 2 + Section 3 (layout) + the page spec in Section 6
3. **Building without a mockup:** Reference Section 4 for component patterns and Section 3 for layout templates
4. **Designer handoff:** Share the full document — it contains everything needed to produce pixel-accurate mockups

When a design is approved, update the Implementation Status table with "Designed ✅" and the design file reference.

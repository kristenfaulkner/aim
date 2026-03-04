# AIM — Engineering Standards & Best Practices

Referenced from `CLAUDE.md`. Read before building any feature.

---

## Pre-Build Checklist

Before writing code for a feature that touches 3+ files:

1. **Read relevant docs** — CLAUDE.md, AIM-DESIGN-BIBLE.md, technical-architecture.md
2. **Identify reusable patterns** — find the closest existing component/hook/endpoint and follow its structure
3. **Plan briefly** — what components, endpoints, DB changes, and edge cases (loading/error/empty/mobile)?
4. **Ask about UX, decide technical** — ask the user about layout, hierarchy, interactions, CTAs. Make technical decisions (data structures, API shape, component architecture, error handling) autonomously. Flag big assumptions before pushing.
5. **Responsive from day one** — every new component must work at mobile/tablet/desktop. Not "later."
6. **Tests ship with features** — critical path tests in the same commit, not a follow-up

---

## Reference Components

When building something new, find the closest match and follow its patterns:

| Pattern | Reference | Key Techniques |
|---|---|---|
| Metric display grid | `LastRideCard.jsx` | Clean layout, responsive grid, T.mono for numbers |
| Interactive tabs | `AIPanel.jsx` | Tab state, markdown rendering, input handling |
| Multi-stage modal flow | `NutritionLogger.jsx` | Stage management, AI integration, conversational UI |
| Expandable cards | `WorkingGoals.jsx` | Expand/collapse, tabbed content, checklist |
| Annotation/form UI | `SessionNotes.jsx` | Sliders, star ratings, tag input, auto-save |
| Paginated browser | `ActivityBrowser.jsx` | Time filters, search, cursor-based pagination |
| Parallel data loading | `useDashboardData.js` | `Promise.allSettled`, independent error handling per query |
| Lazy-loaded chart | `WbalChart.jsx` | Conditional fetch, Recharts, gradient fills |

---

## Component Rules

### One File Per Component
Component = styles + logic + render in a single `.jsx` file. No separate CSS/style files.

### Three States — Every Time
Every component that fetches data must handle:
1. **Loading** — skeleton or spinner, never blank
2. **Error** — friendly message + retry action, never raw error text or crash
3. **Empty** — helpful CTA guiding to next action (e.g., "Connect Strava to get started"), never just "No data"

### Self-Contained
Each component:
- Imports its own dependencies
- Defines its own inline styles using `T` from `src/theme/tokens.js`
- Handles its own loading/error/empty states
- Is responsive via `useResponsive()`

---

## Styling

### Inline Styles Only
No Tailwind, no CSS files, no CSS-in-JS, no CSS media queries.

```jsx
// ✅ Correct
import { T } from '../theme/tokens';
const styles = {
  card: { background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 },
  title: { fontFamily: T.font, fontSize: 16, fontWeight: 600, color: T.text },
  metric: { fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.text },
};

// ❌ Wrong — hardcoded colors
<div style={{ background: '#ffffff', color: '#333' }}>

// ❌ Wrong — CSS classes
<div className="bg-white rounded-lg p-4">
```

### Token Reference
| Token | Value | Use |
|---|---|---|
| `T.bg` | `#f8f8fa` | Page background |
| `T.surface` | `#f0f0f3` | Slightly darker surface |
| `T.card` | `#ffffff` | Card background |
| `T.accent` | `#10b981` | Primary accent (green) |
| `T.text` | `#1a1a2e` | Primary text |
| `T.textSoft` | `#6b7280` | Secondary text |
| `T.textDim` | `#9ca3af` | Tertiary text |
| `T.border` | `rgba(0,0,0,0.08)` | Default border |
| `T.font` | DM Sans | All UI text |
| `T.mono` | JetBrains Mono | All numbers/metrics |

**All numbers and metrics use `T.mono`. All UI text uses `T.font`. No exceptions.**

### Responsive Styles
```jsx
const { isMobile, isTablet } = useResponsive();
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)',
  gap: isMobile ? 12 : 16,
  padding: isMobile ? 16 : 20,
}}>
```

Mobile rules:
- Touch targets: 44px minimum (`touchMin` from tokens)
- Full-screen modals on mobile (no centered popups)
- Horizontal scroll for filter pills/tabs that overflow
- No hover-only interactions — everything works with tap
- Body text never below 14px, labels never below 12px
- Reduce card padding to 16px and gaps to 12px

---

## State Management

No state management library. React built-ins only:
- `useState` for local component state
- `useEffect` for side effects and data fetching
- `AuthContext` for auth state only
- Custom hooks for shared data-fetching logic

### Hook Pattern
```jsx
export function useFeatureData(params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await apiFetch('/api/feature/list', {
          method: 'POST', body: JSON.stringify(params)
        });
        if (!cancelled) { setData(res); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [/* destructured primitive deps, not object references */]);

  return { data, loading, error };
}
```

Critical rules:
- **Always** use a `cancelled` flag to prevent state updates on unmounted components
- **Always** return `{ data, loading, error }` — never silently swallow errors
- Use `Promise.allSettled` (not `Promise.all`) for parallel fetches where partial results are useful (dashboards, multi-widget pages). Use `Promise.all` when partial results are meaningless (multi-step transactions).
- Destructure specific primitive values in `useEffect` deps — never pass object references

---

## API Endpoint Pattern

Every endpoint follows this exact structure:

```js
import { cors, verifySession } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = await verifySession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const userId = session.userId;

    // --- Business logic ---

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('[feature/action]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

Rules:
- `cors(res)` is always the first call
- Always check `req.method` — return 405 for unexpected methods
- Always call `verifySession(req)` — no unauthenticated endpoints except auth flows
- `verifySession` returns `{ userId }` (not `session.user.id`)
- Always return `{ error: "message" }` on failure — never expose stack traces
- Log errors with `[endpoint/name]` prefix for traceability
- Use `supabaseAdmin` for server-side queries (bypasses RLS)
- Always scope queries with `.eq('user_id', userId)`

---

## Database Conventions

### Schema Design
- **Typed columns** for data you query/sort/filter (TSS, dates, FTP)
- **JSONB** for flexible/display-only data (weather, interval structure, AI analysis, raw API responses)
- Every table: `user_id` referencing `profiles(id)` with `ON DELETE CASCADE`
- Every table: RLS enabled + user-scoped policy
- Migrations: numbered files in `/supabase/migrations/`, always use `IF NOT EXISTS` / `IF EXISTS` guards
- Add indexes for columns used in `WHERE` / `ORDER BY` clauses

### Query Patterns
```js
// ✅ Scoped to user
const { data } = await supabaseAdmin
  .from('activities')
  .select('id, name, started_at, tss')
  .eq('user_id', userId)
  .order('started_at', { ascending: false })
  .limit(50);

// ❌ Missing user_id filter
// ❌ select('*') on a list endpoint returning 100+ rows
```

For list endpoints returning many rows, select only needed columns. `select('*')` is fine for single-record fetches or small tables.

---

## Business Logic Placement

**Rule of thumb:** If a function doesn't import React, it's a utility. If it does, it's a component or hook.

| Logic Type | Location | Why |
|---|---|---|
| Computation, validation, transformation | `/api/_lib/` or `/src/lib/` | Reusable from any client (web, future mobile, SMS) |
| Data fetching + UI state | `/src/hooks/` | React-specific, web only |
| Rendering + interaction | `/src/components/` | React-specific, web only |
| Static data, enums, config | `/src/data/` | Shared constants |

Keep hooks thin — they fetch data and manage UI state. Heavy computation belongs server-side in `/api/_lib/`.

Don't use browser-only APIs (`window`, `document`, `localStorage`) in utility functions in `/src/lib/`. Isolate those to React components/hooks.

---

## Performance Guidelines

### Frontend
- **Parallel loading**: `Promise.allSettled` for pages with multiple independent API calls
- **Pagination**: Any list that could exceed 50 items must be paginated. Use cursor-based pagination (see `useActivityBrowser`)
- **Expensive computation**: If it processes >1000 data points, it belongs on the server
- **Lazy loading**: Heavy charts/visualizations below the fold should lazy-load (see `WbalChart` pattern)
- **Bundle size**: Don't import entire libraries for one function (`import debounce from 'lodash/debounce'`, not `import _ from 'lodash'`)

### Backend
- **AI calls**: Fire-and-forget when triggered by sync pipelines. Never block user-facing responses on AI unless the user explicitly requested it (chat, analysis button)
- **Cache AI results**: Store in DB columns (`activities.ai_analysis`), never recompute on page load
- **Token refresh**: All OAuth integrations must handle expired tokens gracefully
- **Rate limits**: Implement backoff for external APIs — never retry in a tight loop
- **No unbounded queries**: Always `.limit()` result sets

---

## AI Integration Standards

### System Prompt Rules
- Store prompts as constants in `_lib/` files, not inline in endpoints
- Include a DATA STRUCTURE section telling Claude what fields are available
- Include the No Medical Advice policy in every health-related prompt
- Always request structured JSON output, not freeform text
- Note significant prompt changes in commit messages

### Context Assembly
Follow the 3-layer pattern from `ai.js` — don't dump all data:
1. **Recent window** (7 days) — full detail
2. **Historical context** (90 days) — pre-computed summaries, baselines, percentiles
3. **Current focus** — the specific activity/question being analyzed

This reduces tokens ~60% while improving insight quality.

### AI Error Handling
- Parse AI JSON responses in a try/catch — if parsing fails, log and return a graceful error
- Never expose raw AI output to the user without parsing
- Store both the raw AI response and the parsed version when debugging is needed

---

## Security Essentials

- All sensitive operations happen server-side in `/api/` — never in frontend code
- Secrets and tokens never appear in frontend bundles
- Input validation at API boundaries — validate required fields, check enums, sanitize user text
- Use parameterized Supabase queries (the client handles this) — never string-concatenate SQL
- Credentials stored with AES-256-GCM encryption (`/api/_lib/crypto.js`)
- OAuth state params validated via Redis to prevent CSRF

---

## Error Handling Philosophy

- **Validate at boundaries** (user input, external API responses), trust internal code
- **Graceful degradation** — one failing widget shouldn't break the whole page (`Promise.allSettled`)
- **User-friendly messages** — "Couldn't load your data" not "ECONNREFUSED 127.0.0.1:5432"
- **Don't over-handle** — no try/catch around code that can't fail; no fallbacks for impossible scenarios
- **Log with context** — `console.error('[endpoint/name]', err)` so errors are traceable

---

## What Not To Do

1. **Don't put business logic in React components.** Computation → `/api/_lib/` or `/src/lib/`.
2. **Don't hardcode colors, fonts, or spacing.** Use `T` tokens.
3. **Don't skip empty states.** If a list can be empty, design the CTA.
4. **Don't make the user wait for AI** unless they explicitly asked. Sync-triggered AI → fire-and-forget.
5. **Don't ship desktop-only components.** Responsive from day one, tested at 375px.
6. **Don't let documentation drift.** Update docs in the same commit as code.
7. **Don't add unnecessary abstraction.** Three similar lines > a premature helper function.
8. **Don't future-proof for hypotheticals.** Build for the current requirement. Refactor when the next requirement arrives.

# Prompt for Claude Code — Testing Setup

Paste this into Claude Code:

---

**Set up testing for the project. Read `AIM-TESTING-STRATEGY.md` first — it has the full plan.**

**Step 1: Install testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw playwright @playwright/test
```

**Step 2: Configure Vitest**

Add to `vite.config.js`:
```javascript
export default defineConfig({
  // ...existing config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    css: true,
  },
});
```

Create `tests/setup.js`:
```javascript
import '@testing-library/jest-dom';
```

**Step 3: Add test scripts to package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

**Step 4: Create mock fixtures**

Create `tests/fixtures/` with mock data files as described in AIM-TESTING-STRATEGY.md — mock-profile.json, mock-activities.json, mock-daily-metrics.json, etc. Use realistic data that matches the database schema.

**Step 5: Write tests for everything that's already built**

Go through the existing codebase and write tests for the Priority 1 items listed in AIM-TESTING-STRATEGY.md. Focus on:

- Auth flows (signup, signin, protected routes, session persistence)
- Any metric calculation functions (NP, TSS, IF, VI, EF — these have exact formulas, test with known inputs and expected outputs)
- Supabase data fetching (mock with MSW)
- Component rendering (dashboard loads without crashing, forms validate correctly)
- RLS policy verification

**Step 6: Going forward**

After setting up the framework and writing tests for existing code, follow this rule for all future features: **build the feature, then write tests for its critical paths before moving on.** Every PR should include tests.

Run `npm run test` after setup to make sure everything passes.

---

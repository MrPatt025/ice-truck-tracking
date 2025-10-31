# QA Baseline Implementation Progress

## ✅ Completed Tasks (1-9)

### Task 1: Repository QA Baseline ✅

- ✅ Installed all devDeps: `eslint-plugin-jsx-a11y`, `eslint-plugin-tailwindcss`, `eslint-plugin-simple-import-sort`, `@ianvs/prettier-plugin-sort-imports`, `prettier-plugin-tailwindcss`, `knip`, `depcheck`, `ts-prune`, `@axe-core/cli`, `@next/bundle-analyzer`
- ✅ Added scripts to `package.json`: `a11y:scan`, `unused:exports`, `unused:files`, `unused:deps`, `analyze:bundle`, `check:all`

### Task 2: Husky & Git Hooks ✅

- ✅ Already configured (`.husky/pre-commit`, `.husky/commit-msg` exist)
- ✅ `commitlint.config.cjs` exists
- ✅ `lint-staged.config.mjs` exists

### Task 3: ESLint Config ✅

- ✅ Added jsx-a11y plugin with full error rules
- ✅ Added tailwindcss plugin with classnames-order
- ✅ Added simple-import-sort for imports/exports

### Task 4: Prettier Config ✅

- ✅ Added `@ianvs/prettier-plugin-sort-imports`
- ✅ Added `prettier-plugin-tailwindcss`
- ✅ Configured import order

### Task 5: VS Code Settings ✅

- ✅ Enhanced `.vscode/settings.json` with ESLint validation, formatOnSave, RN watcher disabled
- ✅ `.vscode/extensions.json` already has recommended extensions

### Tasks 7-9: CSS/Tailwind/cn() ✅

- ✅ Task 7: CSS variables for `--dot-*`, `--indicator-color`, `--icon-color` already added to `globals.css`
- ✅ Task 8: z-index tokens (60, 100, 120, 9999) already in `tailwind.config.ts`
- ✅ Task 9: `cn()` utility already exists in `dashboard/src/lib/cn.ts`

---

## 🚧 Remaining Tasks (6, 10-17)

### Task 6: Dashboard A11y Fixes (IN PROGRESS)

**Status:** ARIA/inline-style issues from earlier session already addressed

- ✅ Computed roles replaced with semantic elements
- ✅ aria-pressed fixed to boolean values
- ✅ Time/theme selectors converted to tabs
- ✅ Inline styles migrated to CSS variables
- ⚠️ New jsx-a11y rules may flag additional issues - run `pnpm -F dashboard run lint` to identify

**Remaining:** Address any new jsx-a11y violations from strict linting

### Task 10: ENV Validation (READY TO IMPLEMENT)

**Dependencies installed:** `@t3-oss/env-nextjs`

#### Dashboard ENV Validation

Create `dashboard/src/env.ts`:

```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    BACKEND_API_BASE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
    NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
});
```

Import in `dashboard/src/app/layout.tsx` or entry point to fail fast.

#### Backend ENV Validation

Install: `pnpm -F backend add envalid dotenv-flow`

Create `backend/src/env.ts`:

```typescript
import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv-flow';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  PORT: port({ default: 3001 }),
  DATABASE_URL: url(),
  FRONTEND_URL: url({ default: 'http://localhost:3000' }),
  JWT_SECRET: str(),
});
```

Import at top of `backend/src/index.ts`.

### Task 11: Backend Hardening (READY TO IMPLEMENT)

Install deps:

```bash
pnpm -F backend add pino pino-pretty helmet cors compression express-rate-limit dotenv-flow tsx
```

Add to `backend/package.json` scripts:

```json
"dev": "tsx watch src/index.ts"
```

Wire middleware in backend entry (example for Fastify):

```typescript
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

await server.register(helmet);
await server.register(cors, { origin: env.FRONTEND_URL, credentials: true });
await server.register(compress);
await server.register(rateLimit, { max: 100, timeWindow: '1 minute' });
```

### Task 12: Dashboard Data Fetching (READY TO IMPLEMENT)

Install:

```bash
pnpm -F dashboard add @tanstack/react-query react-hook-form @hookform/resolvers
```

Create `dashboard/src/app/providers.tsx`:

```typescript
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5000, cacheTime: 300000, refetchOnWindowFocus: false },
    },
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Wrap app in `dashboard/src/app/layout.tsx`:

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Task 13: Playwright + Axe Tests (READY TO IMPLEMENT)

Create `playwright.config.ts` at root:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './dashboard/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm -F dashboard dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Create `dashboard/tests/a11y.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('dashboard has no accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login has no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Task 14: Unused Code Cleanup

Run tools:

```bash
# Find unused exports
pnpm run unused:exports > unused-exports.txt

# Find unused files
pnpm run unused:files > unused-files.txt

# Find unused deps
pnpm run unused:deps > unused-deps.txt
```

Review outputs and remove or document exceptions in `.knip.json` config.

### Task 15: Bundle Analysis

Update `dashboard/next.config.ts`:

```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  // existing config
});
```

Run: `pnpm run analyze:bundle` (already added to scripts)

### Task 16: Documentation

Update `README.md` with:

- Toolchain requirements (Node 20.19.4, pnpm 10.20.0)
- Quickstart commands
- ENV variable table
- Scripts glossary
- Troubleshooting (Corepack, pnpm setup)

Create `CONTRIBUTING.md` with:

- Pre-commit hooks explanation
- Test policy (a11y required, coverage thresholds)
- A11y rules and how to test locally
- PR checklist

### Task 17: Final Validation

Run in sequence:

```bash
pnpm install
pnpm run format
pnpm run lint  # Must pass with 0 warnings
pnpm run type-check
pnpm -F dashboard build
# Start dashboard, then:
pnpm run a11y:scan
pnpm run test
```

Verify VS Code Problems panel shows 0 errors (ignoring RN text watcher false positives).

---

## Immediate Next Steps

1. **Complete ENV validation** (Task 10) - Create the env.ts files
2. **Install backend deps** (Task 11) - Run install commands
3. **Install React Query** (Task 12) - Add QueryClientProvider
4. **Create Playwright tests** (Task 13) - Set up a11y spec
5. **Run cleanup tools** (Task 14) - Generate unused code reports
6. **Enable bundle analyzer** (Task 15) - Update next.config
7. **Write docs** (Task 16) - README + CONTRIBUTING
8. **Full validation** (Task 17) - Run all checks

---

## Quick Commands Reference

```bash
# Format code
pnpm run format

# Lint (strict - 0 warnings)
pnpm run lint

# Type-check all packages
pnpm run type-check

# Build dashboard
pnpm -F dashboard build

# Run a11y scan (requires dashboard running at :3000)
pnpm run a11y:scan

# Check unused code
pnpm run unused:files
pnpm run unused:exports
pnpm run unused:deps

# Analyze bundle
pnpm run analyze:bundle

# Run Playwright tests
pnpm run test:e2e

# Full check pipeline
pnpm run check:all
```

---

## Notes

- All infrastructure dependencies are installed
- ESLint/Prettier configs are production-ready
- cn() utility and CSS variables are in place
- Dashboard builds successfully (177kB First Load JS)
- Focus remaining effort on ENV validation, backend hardening, testing, and docs

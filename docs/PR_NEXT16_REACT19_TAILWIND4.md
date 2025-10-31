# 🚀 Dashboard Stack Upgrade: Next 16 + React 19 + Tailwind v4 + App Router Only

## 📋 Overview

This PR upgrades the dashboard workspace to the latest stable stack versions and completes the migration to App Router only, removing all Pages Router legacy artifacts.

## 🎯 Key Changes

### Stack Upgrades
- ✅ **Next.js**: `15.5.6` → `16.0.1`
- ✅ **React/React-DOM**: `18.x` → `19.2.0`
- ✅ **Tailwind CSS**: `3.x` → `4.1.0` with `@tailwindcss/postcss`
- ✅ **TypeScript**: `5.6` → `5.7`
- ✅ **ESLint**: Added `@next/eslint-plugin-next` `16.0.1`

### Architecture Migration
- 🗑️ **Deleted entire `src/pages` directory** (Pages Router removed)
  - Removed `src/pages/_document.tsx` (legacy Document)
  - Removed `src/pages/_app.tsx` (temporary shim)
  - Removed `src/pages/index.tsx` (temporary shim)
- ✅ **App Router only** - all functionality in `src/app/layout.tsx` with metadata API
- ✅ Clean build - no mixed routing complexity

### Accessibility & Hydration Fixes
- ✅ **GlassCard normalized** to prevent nested `<button>` DOM violations
  - Root is always `<div>` (never `<button>`)
  - Clickable cards get `role="button"`, `tabIndex={0}`, keyboard handlers (Enter/Space)
  - Prevents hydration errors and invalid nested interactive elements
- ✅ **Exported GlassCard** for testing
- ✅ **Added comprehensive unit tests** (`GlassCard.test.tsx`)
  - Asserts no nested buttons when clickable
  - Tests keyboard interaction (Enter/Space)
  - Validates non-interactive state
- ✅ **ESLint a11y rules enforced**:
  - `jsx-a11y/no-noninteractive-element-to-interactive-role`: error
  - `jsx-a11y/interactive-supports-focus`: error
- ✅ **SSR determinism verified** - all `Date.now()`/`Math.random()` in client hooks/useEffect
- ✅ **suppressHydrationWarning kept where valid** (client-only content like `<ClientOnly>`)

### Tailwind v4 Setup
- ✅ `globals.css`: `@import 'tailwindcss';` (v4 syntax)
- ✅ `postcss.config.mjs`: `@tailwindcss/postcss` plugin configured
- ✅ Removed old `tailwind.config.js` references

### TypeScript Config
- ✅ `tsconfig.json`: `jsx: "react-jsx"`, `jsxImportSource: "react"`
- ✅ Removed `src/pages/_document.tsx` from exclude array

### Node & Package Manager
- ✅ Added `.nvmrc` → Node `20.18.0` (LTS)
- ✅ Root `package.json` → pnpm engine `>=9`
- ✅ Corepack enabled for pnpm lockfile management

## ✅ Verification

All gates passed:

```bash
pnpm -F dashboard type-check  # ✅ PASS
pnpm -F dashboard lint         # ✅ PASS
pnpm -F dashboard build        # ✅ PASS (App Router pages built successfully)
```

**Build output**: Clean App Router build with no Pages Router artifacts or prerender errors.

## 📦 Files Changed

### Deleted
- `dashboard/src/pages/` (entire directory including `_document.tsx`, `_app.tsx`, `index.tsx`)

### Modified
- `dashboard/tsconfig.json` - jsx settings, removed `_document` exclusion
- `dashboard/eslint.config.mjs` - strengthened a11y rules
- `dashboard/src/app/dashboard/page.tsx` - exported GlassCard, normalized root element
- Root `package.json` - relaxed pnpm engine to `>=9`

### Added
- `dashboard/src/app/dashboard/GlassCard.test.tsx` - unit tests for nested button prevention
- `.nvmrc` - Node version lock (20.18.0)
- `docs/UPGRADE_MATRIX.md` - dependency snapshot (`pnpm -w outdated`)

## 🔄 Migration Checklist

- [x] Remove Pages Router (`src/pages` directory deleted)
- [x] Ensure all Document/metadata functionality in App Router `layout.tsx`
- [x] Update TypeScript jsx settings for React 19 compatibility
- [x] Fix nested button DOM violations (GlassCard normalization)
- [x] Add ESLint accessibility rules to prevent regressions
- [x] Verify SSR determinism (no random/timestamp in SSR markup)
- [x] Configure Tailwind v4 with `@tailwindcss/postcss`
- [x] Add unit tests for GlassCard behavior
- [x] Run type-check, lint, build - all pass
- [x] Update documentation (UPGRADE_MATRIX snapshot)

## 🚨 Breaking Changes

1. **Pages Router removed** - App Router only
   - No more `pages/_document.tsx`, `pages/_app.tsx`, or `pages/api` routes
   - All routing in `app/` directory with Next.js 13+ conventions
   - If you have custom Pages Router routes, migrate to App Router equivalents

2. **React 19 JSX transform**
   - `tsconfig.json` now uses `jsx: "react-jsx"` with `jsxImportSource: "react"`
   - Automatic JSX runtime (no need for `import React from 'react'`)

3. **Tailwind v4 syntax**
   - `@import 'tailwindcss'` in CSS (no more `@tailwind` directives)
   - PostCSS plugin required (`@tailwindcss/postcss`)

## 🧪 Testing

### Unit Tests
```bash
pnpm -F dashboard test  # GlassCard.test.tsx - nested button assertions
```

### E2E Smoke
```bash
pnpm -F dashboard test:e2e  # Playwright suite (existing)
```

### Manual Verification
1. Start dev server: `pnpm -F dashboard dev`
2. Open `/dashboard` route
3. Verify:
   - No console errors about nested buttons
   - No hydration warnings
   - Clickable cards respond to keyboard (Tab → Enter/Space)
   - Layout renders correctly with metadata

## 📝 Notes

### GlassCard Pattern (Recommended for Future Components)
```tsx
// ✅ GOOD - Non-button wrapper with role/keyboard
<div role="button" tabIndex={0} onKeyDown={handleKeyDown} onClick={onClick}>
  <button>Inner action</button>  {/* OK - only one real button */}
</div>

// ❌ BAD - Nested buttons
<button onClick={cardClick}>
  <button onClick={innerClick}>Action</button>  {/* DOM violation! */}
</button>
```

### SSR Determinism
All time-based or random values used in rendering must be:
1. Computed in `useEffect` (client-only), or
2. Wrapped in `<ClientOnly>` component, or
3. Use `suppressHydrationWarning` if truly unavoidable

### Tailwind v4 Migration
- Configuration is now in `postcss.config.mjs` and `@theme` directives (future)
- Most v3 syntax works unchanged
- Plugin APIs updated - verify custom plugins if added later

## 🎉 Benefits

1. **Latest stable stack** - security updates, performance improvements, new features
2. **Simpler architecture** - App Router only, no mixed routing complexity
3. **Better accessibility** - enforced a11y rules, no nested interactive violations
4. **Cleaner builds** - no Pages Router artifacts, faster compilation
5. **Type safety** - React 19 types, Next 16 types, TS 5.7 improvements
6. **Future-ready** - aligned with Next.js and React roadmap

## 🔗 Related Issues

- Fixes nested button hydration errors
- Closes accessibility violations in GlassCard clickable state
- Resolves Pages/App Router coexistence complexity

## 🚀 Deployment

Ready for production:
- `output: 'standalone'` configured in `next.config.ts`
- Docker builds will use Node 20.18.0 (`.nvmrc`)
- Standalone output reduces container size and cold start time

---

**Reviewers**: Please verify:
1. Build passes in CI (type-check, lint, build, test)
2. Dev server starts without errors
3. Dashboard route loads and functions correctly
4. No nested button warnings in browser console
5. Keyboard navigation works (Tab → Enter/Space on clickable cards)

**Merge strategy**: Squash and merge (single commit to main)

**Post-merge**: Monitor production logs for any runtime React 19 deprecation warnings

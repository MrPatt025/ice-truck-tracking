# PR: Remove Legacy JS Files and Unused HTML Assets

## Summary

This PR removes 12 unreferenced legacy JavaScript files from the backend that were flagged by knip unused code detection. All deleted files are legacy .js code that was superseded by TypeScript implementations.

## Files Deleted (12 total)

### Legacy Controllers (3 files)

- `backend/_legacy/controllers/auth.js`
- `backend/_legacy/controllers/health.js`
- `backend/_legacy/controllers/metrics.js`

### Legacy Middleware (1 file)

- `backend/_legacy/middleware_root/auth.js`

### Legacy Repositories (5 files)

- `backend/_legacy/repositories/alertRepository.js`
- `backend/_legacy/repositories/driverRepository.js`
- `backend/_legacy/repositories/shopRepository.js`
- `backend/_legacy/repositories/truckRepository.js`
- `backend/_legacy/repositories/userRepository.js`

### Legacy Services (2 files)

- `backend/_legacy/metricsService.js`
- `backend/_legacy/telemetryStore.js`

### Unused HTML Assets (1 file)

- `backend/html/assets/index-D_ryMEPs.js`

## Verification

### Before Cleanup - Unused Files Report (knip backend)

```
Unused files (15+):
  backend/_legacy/controllers/auth.js
  backend/_legacy/controllers/health.js
  backend/_legacy/controllers/metrics.js
  backend/_legacy/middleware_root/auth.js
  backend/_legacy/repositories/alertRepository.js
  backend/_legacy/repositories/driverRepository.js
  backend/_legacy/repositories/shopRepository.js
  backend/_legacy/repositories/truckRepository.js
  backend/_legacy/repositories/userRepository.js
  backend/_legacy/metricsService.js
  backend/_legacy/telemetryStore.js
  backend/html/assets/index-D_ryMEPs.js
  ... (plus other files)
```

### After Cleanup - Backend Build Status

```bash
✅ pnpm -F backend typecheck  # PASS
✅ pnpm -F backend test        # PASS (all tests green)
✅ pnpm -F backend lint        # PASS
```

### Unused Code Report Updates

- ✅ Updated `backend/.knip.jsonc` to ignore `src/_legacy/**` (TypeScript files remain for reference)
- ✅ Refreshed `unused-files-backend.txt` after cleanup
- ✅ Refreshed `unused-exports.txt` (ts-prune)
- ✅ Refreshed `unused-deps.txt` (depcheck)

## Impact Assessment

- ✅ **No TypeScript regressions**: Legacy JS files were not referenced by current TS codebase
- ✅ **No test failures**: Full backend test suite passes
- ✅ **No build errors**: Backend builds and type-checks cleanly
- ✅ **Code health**: Removes 12 unreferenced files; reduces tech debt

## Configuration Changes

Updated `backend/.knip.jsonc`:

```jsonc
"ignore": [
  // ...existing ignores...
  "src/_legacy/**"  // Ignore legacy TS files (kept for reference)
]
```

## Next Steps (Follow-up PRs)

1. **Unused Backend Dependencies** (separate PR):
   - Confirmed unused via codebase grep: `@sentry/node`, `fastify-plugin`, `jsonwebtoken`
   - See `docs/UNUSED_CLEANUP.md` for removal plan

2. **Optional Legacy TS Cleanup** (future PR):
   - Review `backend/src/_legacy/services/*.ts` (3 TS files remain)
   - Determine if safe to remove or archive

## Checklist

- [x] Deleted 12 legacy JS files
- [x] Verified backend typecheck PASS
- [x] Verified backend tests PASS (all green)
- [x] Updated backend knip config to ignore legacy TS
- [x] Refreshed unused code reports
- [x] Documented cleanup in `docs/UNUSED_CLEANUP.md`
- [x] No regressions in build or tests

## Related Documentation

- `docs/UNUSED_CLEANUP.md` - Safe cleanup plan and PR strategy
- Root `.knip.jsonc` - Monorepo-wide unused file detection config
- `README.md` - Backend ENVs table added (envalid schema)

# PR: Remove Unused Backend Dependencies

## Summary

This PR removes 3 confirmed unused npm dependencies from the backend workspace, identified by knip deadcode detection and verified via codebase grep search.

## Dependencies to Remove

### Production Dependencies (3 total)

1. **@sentry/node** `^10.21.0`
   - Purpose: Error monitoring and performance tracking
   - Status: Not imported anywhere in backend codebase
   - Confirmation: `grep -r "@sentry/node" backend/**/*.ts` → No matches

2. **fastify-plugin** `^5.1.0`
   - Purpose: Fastify plugin helper (wraps plugins)
   - Status: Not imported anywhere in backend codebase
   - Confirmation: `grep -r "fastify-plugin" backend/**/*.ts` → No matches
   - Note: Fastify 4.x plugins can be registered directly without wrapper

3. **jsonwebtoken** `^9.0.2`
   - Purpose: JWT token signing/verification
   - Status: Not imported anywhere in backend codebase
   - Confirmation: `grep -r "jsonwebtoken" backend/**/*.ts` → No matches
   - Note: Using `@fastify/jwt` instead (already registered)

## Before Removal - Unused Deps Report (knip backend)

```text
Unused dependencies (3):
  @sentry/node
  fastify-plugin
  jsonwebtoken

Unused devDependencies (4):
  @typescript-eslint/eslint-plugin  # FALSE POSITIVE (used by ESLint 9 flat config)
  @typescript-eslint/parser         # FALSE POSITIVE (used by ESLint 9 flat config)
  eslint-config-prettier            # FALSE POSITIVE (used by ESLint 9 flat config)
  lint-staged                       # FALSE POSITIVE (used by Husky pre-commit hook)
```

## Changes

### backend/package.json

**Remove 3 lines from dependencies:**

```diff
  "dependencies": {
    "@fastify/compress": "^7.0.3",
    "@fastify/cookie": "^9.4.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^10.1.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/rate-limit": "^10.3.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^1.10.0",
    "@fastify/websocket": "^8.3.1",
    "@prisma/client": "6.18.0",
-   "@sentry/node": "^10.21.0",
    "dotenv-flow": "4.1.0",
    "envalid": "^8.1.0",
    "fastify": "^4.29.1",
-   "fastify-plugin": "^5.1.0",
    "fastify-type-provider-zod": "^2.1.0",
-   "jsonwebtoken": "^9.0.2",
    "pino-pretty": "^11.2.2",
    "zod": "^3.23.8"
  }
```

**Update deps:audit script ignore list:**

```diff
- "deps:audit": "depcheck --ignore-dirs=dist,coverage,prisma,_legacy --ignores=@vitest/coverage-v8,@fastify/rate-limit,@fastify/swagger-ui,pino-pretty,bcryptjs,@typescript-eslint/eslint-plugin,@typescript-eslint/parser,eslint-config-prettier,@sentry/node && ts-prune",
+ "deps:audit": "depcheck --ignore-dirs=dist,coverage,prisma,_legacy --ignores=@vitest/coverage-v8,@fastify/rate-limit,@fastify/swagger-ui,pino-pretty,bcryptjs,@typescript-eslint/eslint-plugin,@typescript-eslint/parser,eslint-config-prettier && ts-prune",
```

## Verification Steps

### 1. Grep Search Confirmation (Already Done)

```bash
# No matches for @sentry/node
grep -r "@sentry/node" backend/src backend/test backend/prisma

# No matches for fastify-plugin
grep -r "fastify-plugin" backend/src backend/test backend/prisma

# No matches for jsonwebtoken
grep -r "jsonwebtoken" backend/src backend/test backend/prisma
```

### 2. Post-Removal Verification (Run After PR Merge)

```bash
# Install updated deps
pnpm -F backend install

# Verify backend check:all passes
pnpm -F backend check:all
# Includes: prisma:generate, typecheck, lint, test, deps:audit, deadcode

# Expected Result:
✅ All checks PASS
✅ knip no longer flags these 3 deps as unused
```

## Impact Assessment

- ✅ **No functionality removed**: None of these deps were used in codebase
- ✅ **No test failures expected**: Tests already passing without imports
- ✅ **No build errors expected**: No references in TypeScript code
- ✅ **Security benefit**: Reduces attack surface (fewer deps = fewer CVEs)
- ✅ **Bundle size**: Minimal impact (backend is server-side, not bundled)
- ✅ **Install speed**: Slightly faster `pnpm install` (fewer packages)

## Future Considerations

### JWT Implementation Note

- **Current**: Using `@fastify/jwt` (declarative Fastify plugin)
- **Removed**: `jsonwebtoken` (low-level manual JWT library)
- **Rationale**: `@fastify/jwt` provides better Fastify integration with decorators (`request.jwtVerify()`, `reply.jwtSign()`) and automatic error handling

### Error Monitoring Note

- **Removed**: `@sentry/node` (not implemented)
- **Future**: If error monitoring is needed:
  - Re-add `@sentry/node` + `@sentry/tracing`
  - Configure in `backend/src/index.ts` startup
  - Add `SENTRY_DSN` to `backend/src/env.ts` envalid schema

### Plugin Wrapper Note

- **Removed**: `fastify-plugin` (v5.x for Fastify 5.x, incompatible with current Fastify 4.29.1)
- **Current**: Registering plugins directly via `app.register(plugin, options)`
- **Fastify 4.x best practice**: Use `fastify-plugin` only when creating encapsulation-breaking plugins (e.g., decorators, hooks); standard routes/plugins don't need wrapper

## Checklist

- [ ] Remove 3 dependencies from `backend/package.json`
- [ ] Update `deps:audit` script ignore list
- [ ] Run `pnpm -F backend install`
- [ ] Run `pnpm -F backend check:all` → Verify PASS
- [ ] Run `pnpm -F backend run deadcode` → Verify 3 deps no longer flagged
- [ ] Commit with message: `chore(backend): remove unused deps (@sentry/node, fastify-plugin, jsonwebtoken)`

## Related Documentation

- `docs/UNUSED_CLEANUP.md` - Safe cleanup plan and PR strategy
- `unused-files-backend.txt` - Knip backend deadcode report (before cleanup)
- `unused-deps.txt` - Depcheck root report (includes false positives)

## References

- knip backend deadcode report: 3 unused dependencies flagged
- Grep search: 0 matches across all backend TS files
- Fastify JWT docs: https://github.com/fastify/fastify-jwt

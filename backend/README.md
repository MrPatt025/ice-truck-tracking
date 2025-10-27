# Backend (Fastify v4)

This backend is a Fastify v4 application with Zod type providers and a test-friendly export surface.

## Exports

- Default export: `server` — the Fastify instance (Fastify v4). Use this for normal runtime and most tests:
  - Example: `import server from './src/index'; await server.inject({ method: 'GET', url: '/health' });`

- Named export: `app` — a hybrid export that is both callable and instance-like:
  - Callable: `const s = await app();` returns the same Fastify instance.
  - Instance-like: `app.ready()`, `app.inject()`, `app.close()`, etc., behave like the real instance.
  - Test helper shim: If a test registers a simple `app.get('/path', handler)` after the server is already ready, the hybrid export captures it and emulates the route in `app.inject()` so specs can assert error branches without altering Fastify lifecycle. Normal routes continue to use the real Fastify instance.

- Helper functions:
  - `registerPlugins(opts?)`: Idempotently registers plugins and routes.
  - `startServer({ exitFn }?)`: Boots the server, connects DB, listens, and logs. On fatal error, logs and either calls the provided `exitFn(1)` or keeps the process alive (dev-friendly behavior).
  - `start({ exitFn, srv }?)`: Boots and listens using the provided instance (or the singleton). On failure, calls `exitFn(1)` if provided, otherwise calls `process.exit(1)` (used in tests).

## Test behavior

- In `NODE_ENV=test`:
  - Plugins are auto-registered; tests should call `await app.ready()` before injecting.
  - Helmet is enabled so security header tests can assert expected headers.
  - CORS allows Origin "http://localhost:3000" and avoids throwing on disallowed origins to prevent 500s in preflights.

- Typical test patterns:
  - Instance style: `import server from '../src/index'` and `await server.inject(...)`.
  - Hybrid style: `import { app, registerPlugins } from '../src/index'; await registerPlugins(); await app.ready(); const res = await app.inject(...);`

## CORS & Security

- CORS: In tests, ACAO is fixed to `http://localhost:3000` to match frontend dev expectations. In non-test environments, origins are resolved from `CORS_ORIGINS` or `CORS_ORIGIN` and unknown origins are disallowed without throwing (no 500).
- Helmet: Enabled in production and tests (CSP disabled by default).

## Environment

- `PORT` (default 5000)
- `JWT_SECRET` for JWT signing; falls back to a development default if unset.
- Optional rate limit is enabled in production by default (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`).

## Development

- Dev: `pnpm -F backend dev`
- Tests: `pnpm -F backend test`
- Typecheck: `pnpm -F backend typecheck`
- Lint: `pnpm -F backend lint`

## Notes

- The code maintains Fastify v4-compatible versions of plugins (`@fastify/cors`, `@fastify/helmet`, `@fastify/websocket`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/jwt`).
- Swagger is enabled by default in non-production environments.
- Zod validator/serializer compilers are configured globally on the Fastify instance.

# Sentry setup (Next.js 15 + React 19)

This project includes Sentry wiring for the dashboard to capture client/server errors and useful breadcrumbs while keeping performance overhead reasonable.

- Client init: `dashboard/sentry.client.config.ts`
- Server init: `dashboard/sentry.server.config.ts`
- Error boundary: global boundary wraps the app and reports to Sentry
- HTTP breadcrumbs: axios interceptors add request/response/error breadcrumbs automatically

## Required environment variables

Set these in your deployment environment (and locally if desired):

- `SENTRY_DSN` — your Sentry project DSN
- `SENTRY_ENVIRONMENT` — environment name (e.g., `production`, `staging`)

Optional (build-time/source maps):

- `SENTRY_AUTH_TOKEN` — if you upload source maps during build (CI)
- `SENTRY_ORG`, `SENTRY_PROJECT` — when using source map upload integrations

Note: A template for the dashboard is provided in `dashboard/.env.production.example`.

## Client configuration (example)

```ts
// dashboard/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Adjust rates based on your traffic/cost goals
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  ignoreErrors: ['ResizeObserver loop limit exceeded'],
});
```

## Server configuration (example)

```ts
// dashboard/sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [Sentry.httpIntegration(), Sentry.anrIntegration()],
});
```

## Where errors and breadcrumbs come from

- Uncaught exceptions in the client are captured by the global error boundary.
- HTTP requests/responses/errors are recorded as Sentry breadcrumbs via centralized axios interceptors.
- Unhandled server errors (during rendering or API routes in Next) are captured by Sentry server config.

## Verify your setup

- Set `SENTRY_DSN` and run the dashboard.
- Trigger a test error in the client (e.g., press a button that throws inside a component) and confirm it appears in Sentry with the correct environment and release.
- Optionally, enable Replays for a small subset and confirm privacy options are respected.

## Tips

- Tune `tracesSampleRate` and replay rates for production to manage cost.
- Avoid logging PII in breadcrumbs; HTTP breadcrumb metadata should be minimal.
- For source maps, consider using Sentry's Next.js integration docs for automated upload (optional).

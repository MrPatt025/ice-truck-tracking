// Client-only Sentry init, gated to production to avoid dev-time OTel warnings
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (
  process.env.NODE_ENV === 'production' &&
  dsn &&
  typeof window !== 'undefined'
) {
  void import('@sentry/browser').then((Sentry) => {
    try {
      Sentry.init({
        dsn,
        tracesSampleRate: Number(
          process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
        ),
        replaysSessionSampleRate: Number(
          process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.0,
        ),
        replaysOnErrorSampleRate: Number(
          process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1.0,
        ),
        enabled: true,
        integrations: (integrations) => integrations,
      });
    } catch {}
  });
}

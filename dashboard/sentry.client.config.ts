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
        // Scrub PII and secrets before sending
        beforeSend(event) {
          const sanitize = (obj: any) => {
            if (!obj || typeof obj !== 'object') return obj;
            const sensitive = [
              'password',
              'authorization',
              'auth',
              'token',
              'accessToken',
              'refreshToken',
              'email',
              'phone',
            ];
            for (const key of Object.keys(obj)) {
              if (sensitive.includes(key.toLowerCase())) {
                obj[key] = '[REDACTED]';
              } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
              }
            }
            return obj;
          };
          try {
            if (event.request?.headers) sanitize(event.request.headers as any);
            if (event.request?.cookies) sanitize(event.request.cookies as any);
            if (event.user) sanitize(event.user as any);
            if (event.extra) sanitize(event.extra as any);
            if (event.tags) sanitize(event.tags as any);
          } catch {}
          return event;
        },
      });
    } catch {}
  });
}

// Disable server-side Sentry init to avoid bundling OpenTelemetry/require-in-the-middle
// and emitting critical-dependency warnings during Next builds.
// If server error capture is needed later, re-enable behind a strict production flag
// with a minimal SDK that avoids OTel, or use Edge Runtime reporting.
export {};

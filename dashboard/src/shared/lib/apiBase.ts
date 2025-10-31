// dashboard/src/shared/lib/apiBase.ts
// Centralized API base resolution so we never double-prefix `/api/v1`.

/**
 * Returns the absolute API base URL that already includes the version prefix
 * e.g. http://localhost:5000/api/v1
 *
 * Resolution order:
 * - NEXT_PUBLIC_API_BASE_URL (if provided)
 * - NEXT_PUBLIC_API_URL + NEXT_PUBLIC_API_PREFIX
 * - fallback http://localhost:5000/api/v1
 */
export function getApiBase(): string {
  // Prefer a single authoritative base if provided
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
  if (raw) {
    const base = raw.replace(/\/+$/, '');
    // If caller accidentally set a root (e.g., http://host:5000) without a versioned API prefix,
    // and a prefix is configured, append it defensively in dev and prod alike.
    const prefix = (process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1')
      .trim()
      .replace(/^\/*/, '/')
      .replace(/\/+$/, '');
    // Heuristics: if base already ends with /api or /api/v{n}, or already ends with the given prefix, do not append.
    const endsWithApi = /\/api(?:\/v\d+)?$/i.test(base);
    const endsWithPrefix = base.endsWith(prefix);
    return endsWithApi || endsWithPrefix ? base : `${base}${prefix}`;
  }

  // Otherwise, compose from root + prefix (both have safe defaults)
  const root = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    .trim()
    .replace(/\/+$/, '');
  const prefix = (process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1')
    .trim()
    .replace(/^\/*/, '/')
    .replace(/\/+$/, '');
  return `${root}${prefix}`;
}

/**
 * Join resource path to the resolved API base with exactly one slash boundary.
 * Accepts 'auth/me' or '/auth/me'. Returns absolute URL.
 */
export function apiUrl(resource: string): string {
  const base = getApiBase();
  const path = resource.replace(/^\/+/, '');
  return `${base}/${path}`;
}

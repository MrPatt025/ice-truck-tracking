// dashboard/src/shared/lib/wsUrl.ts
'use client';

/** Build a WebSocket URL using env and current location, without hardcoding ports.
 * Priority:
 * 1) NEXT_PUBLIC_WS_URL (can be ws(s):// or http(s)://; if http(s), it will be converted to ws(s))
 * 2) Host/port from NEXT_PUBLIC_API_BASE_URL (scheme mapped to ws(s), path ignored)
 * 3) window.location (scheme mapped to ws(s))
 * Path: use explicit pathOverride if provided; otherwise NEXT_PUBLIC_WS_PATH; fallback '/ws'.
 */
export function buildWsUrl(pathOverride?: string): string {
  // SSR fallback for tests/build
  if (typeof window === 'undefined') return 'ws://localhost:5000/ws';

  const normalizePath = (p?: string) => {
    const raw = (p || process.env.NEXT_PUBLIC_WS_PATH || '/ws').toString();
    return raw.startsWith('/') ? raw : `/${raw}`;
  };

  const toWsScheme = (proto: string) =>
    proto === 'https:'
      ? 'wss'
      : proto === 'http:'
        ? 'ws'
        : proto.startsWith('ws')
          ? proto.replace(':', '')
          : 'ws';

  const desiredPath = normalizePath(pathOverride);

  // 1) Explicit WS base URL provided
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    try {
      const u = new URL(explicit);
      const scheme = toWsScheme(u.protocol);
      // If explicit already contains a path other than '/', prefer the override if provided
      const path =
        desiredPath || (u.pathname && u.pathname !== '/' ? u.pathname : '/ws');
      return `${scheme}://${u.host}${path}`;
    } catch {
      // If not a valid URL, assume it's host:port or similar and prepend scheme
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${scheme}://${explicit}${desiredPath}`;
    }
  }

  // 2) Derive from API base (only host/port; ignore path like /api/v1)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiBase) {
    try {
      const u = new URL(apiBase);
      const scheme = toWsScheme(u.protocol);
      return `${scheme}://${u.host}${desiredPath}`;
    } catch {
      // fall through
    }
  }

  // 3) Fallback to current location
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host; // includes port when present
  return `${scheme}://${host}${desiredPath}`;
}

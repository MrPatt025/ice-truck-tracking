function trimPathTrailingSlashes(url: URL): void {
  while (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
}

function normalizeApiRoot(configuredApiRoot: string): string {
  const trimmed = configuredApiRoot.trim()
  const candidate = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `http://${trimmed}`

  const url = new URL(candidate)
  trimPathTrailingSlashes(url)

  const pathLower = url.pathname.toLowerCase()
  if (pathLower.endsWith('/api/v1')) {
    url.pathname = url.pathname.slice(0, -7) || '/'
  } else if (pathLower.endsWith('/api')) {
    url.pathname = url.pathname.slice(0, -4) || '/'
  }

  trimPathTrailingSlashes(url)
  return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
}

export function resolveBackendOrigin(): string {
  const configuredApiRoot = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configuredApiRoot) {
    return normalizeApiRoot(configuredApiRoot)
  }

  return 'http://localhost:5000'
}

export function resolveApiBaseV1(): string {
  const configuredApiRoot = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configuredApiRoot) {
    return `${normalizeApiRoot(configuredApiRoot)}/api/v1`
  }

  if (
    globalThis.window !== undefined
    && (globalThis.window.location.hostname === 'localhost'
      || globalThis.window.location.hostname === '127.0.0.1')
  ) {
    return '/api/v1'
  }

  return 'http://localhost:5000/api/v1'
}

export function resolveBackendHealthUrl(): string {
  return `${resolveBackendOrigin()}/api/v1/health/livez`
}

export function resolveMetricsIngestUrl(): string {
  const configuredApiRoot = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configuredApiRoot) {
    return `${normalizeApiRoot(configuredApiRoot)}/metrics`
  }

  if (
    globalThis.window !== undefined
    && (globalThis.window.location.hostname === 'localhost'
      || globalThis.window.location.hostname === '127.0.0.1')
  ) {
    return '/metrics'
  }

  return 'http://localhost:5000/metrics'
}

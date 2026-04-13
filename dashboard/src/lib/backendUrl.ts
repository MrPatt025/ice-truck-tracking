function normalizeApiRoot(configuredApiRoot: string): string {
  return configuredApiRoot
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api(?:\/v1)?$/i, '')
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
    && /^(localhost|127\.0\.0\.1)$/i.test(globalThis.window.location.hostname)
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
    && /^(localhost|127\.0\.0\.1)$/i.test(globalThis.window.location.hostname)
  ) {
    return '/metrics'
  }

  return 'http://localhost:5000/metrics'
}
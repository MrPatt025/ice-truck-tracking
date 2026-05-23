import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js proxy — handles auth checks, security headers, and API healing
 * for local development and production preview deployments.
 */

const PROTECTED_ROUTES = [
  '/dashboard',
  '/fleet',
  '/reports',
  '/alerts',
  '/settings',
  '/admin',
]

const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

const HTTP_SCHEME = 'http://'
const HTTPS_SCHEME = 'https://'

function trimPathTrailingSlashes(url: URL): void {
  while (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
}

function normalizeBackendOrigin(rawUrl: string): string {
  const candidate =
    rawUrl.startsWith(HTTP_SCHEME) || rawUrl.startsWith(HTTPS_SCHEME)
      ? rawUrl
      : `${HTTP_SCHEME}${rawUrl}`
  const url = new URL(candidate)

  trimPathTrailingSlashes(url)
  const pathnameLower = url.pathname.toLowerCase()

  if (pathnameLower.endsWith('/api/v1')) {
    url.pathname = url.pathname.slice(0, -7) || '/'
  } else if (pathnameLower.endsWith('/api')) {
    url.pathname = url.pathname.slice(0, -4) || '/'
  }

  trimPathTrailingSlashes(url)
  return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
}

function resolveBackendOrigin(): string {
  const configuredApiRoot =
    process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000'
  return normalizeBackendOrigin(configuredApiRoot)
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/metrics'
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const backendOrigin = resolveBackendOrigin()

  if (process.env.PLAYWRIGHT_BYPASS_AUTH === 'true') {
    return NextResponse.next()
  }

  if (
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-icon') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  )
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )

  const token = request.cookies.get('access_token')?.value
  if (token) {
    requestHeaders.set('x-auth-token', token)
  }

  if (isApiRoute(pathname)) {
    const targetUrl = new URL(pathname + search, backendOrigin)
    return NextResponse.rewrite(targetUrl, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const clientIp =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  response.headers.set('X-RateLimit-Policy', '100;w=900')
  response.headers.set('X-Forwarded-For', clientIp)

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-|apple-icon|robots.txt).*)',
  ],
}

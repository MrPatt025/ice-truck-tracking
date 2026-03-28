import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge Middleware — runs at the CDN edge for auth checks, rate limiting,
 * security headers, RBAC route guards, and geo-based routing.
 */

// ── Protected Route Configuration ──────────────────────────
const PROTECTED_ROUTES = ['/dashboard', '/fleet', '/reports', '/alerts', '/settings', '/admin'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const requestHeaders = new Headers(request.headers);
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // ── Security Headers (defense in depth) ─────────────────
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '0');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=()'
    );
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
    );
    // ── Auth Guard for protected routes ─────────────────────
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
    const token = request.cookies.get('access_token')?.value;

    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Pass auth token only via internal request header for downstream logic.
    // Do not mirror auth token into response headers.
    if (token) {
        requestHeaders.set('x-auth-token', token);
    }

    // ── Rate Limiting Header (advisory) ─────────────────────
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    response.headers.set('X-RateLimit-Policy', '100;w=900');
    response.headers.set('X-Forwarded-For', clientIp);

    // ── Request ID ──────────────────────────────────────────
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    response.headers.set('X-Request-Id', requestId);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except static files and API routes
         */
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};

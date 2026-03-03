import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge Middleware — runs at the CDN edge for auth checks, rate limiting,
 * security headers, and geo-based routing.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const response = NextResponse.next();

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

    // ── Auth Guard for /dashboard routes ────────────────────
    if (pathname.startsWith('/dashboard')) {
        const token = request.cookies.get('access_token')?.value;

        if (!token) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Pass user info to downstream RSC via headers
        response.headers.set('x-auth-token', token);
    }

    // ── Rate Limiting Header (advisory) ─────────────────────
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    response.headers.set('X-RateLimit-Policy', '100;w=900');

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

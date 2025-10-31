/**
 * AUTH FLOW IS LOCKED/STABLE:
 * - Login sets HttpOnly cookies via /api/v1/auth/login
 * - Frontend forces full redirect to /dashboard (not client-side push)
 * - middleware.ts checks /api/v1/auth/me using forwarded cookies
 * - Backend exposes ONLY /api/v1/auth/* (no legacy /auth/* paths)
 * Do not change this contract without updating README, RELEASE_NOTES.md, and smoke-login.mjs.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    // Construct full API base URL with /api/v1 prefix
    const API_BASE =
      process.env.BACKEND_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      'http://localhost:5000/api/v1';

    // Forward incoming cookies to backend auth check
    const cookieHeader = req.headers.get('cookie') || '';

    const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/auth/me`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
      },
      credentials: 'include',
      // Do not cache auth checks
      cache: 'no-store',
    });

    return res.status === 200;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Only guard private routes
  if (pathname.startsWith('/dashboard')) {
    const ok = await isAuthenticated(req);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      const redirectTo = `${pathname}${search ?? ''}`;
      url.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // If hitting /login or /register and already authenticated -> bounce to dashboard
  if (pathname === '/login' || pathname === '/register') {
    const ok = await isAuthenticated(req);
    if (ok) {
      const url = req.nextUrl.clone();
      const back = req.nextUrl.searchParams.get('redirect') || '/dashboard';
      url.pathname = back;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};

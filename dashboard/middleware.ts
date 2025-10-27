import { NextResponse, type NextRequest } from 'next/server';

// Public routes that don't require auth
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth', // allow any nested under /api/auth
];

function isPublic(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return true;
  }
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }
  return false;
}

function hasTokenCookie(req: NextRequest) {
  const c1 = req.cookies.get('authToken')?.value;
  const c2 = req.cookies.get('auth_token')?.value;
  return Boolean(c1 || c2);
}

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const isAuth = hasTokenCookie(req);
  const publicRoute = isPublic(req);

  // If not authenticated and not on a public route, redirect to /login
  if (!isAuth && !publicRoute) {
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // If authenticated and hitting root or login/register, send to /dashboard
  if (isAuth && (url.pathname === '/' || url.pathname === '/login' || url.pathname === '/register')) {
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|assets|favicon.ico|robots.txt|sitemap.xml).*)'],
};

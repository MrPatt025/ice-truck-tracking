# Login Flow Test Documentation

This document describes the manual testing steps for the authentication flow after the unified provider and base URL consistency fixes.

## Architecture Overview

### Provider Hierarchy

```
RootLayout (dashboard/src/app/layout.tsx)
└── Providers (QueryClient, RefreshSettings, Flags, Theme, ErrorBoundary)
    └── AuthProvider
        └── children (pages)
```

### API Configuration

- **Environment**: `.env.local`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1` (client-side)
  - `BACKEND_API_BASE_URL=http://localhost:5000/api/v1` (server-side)
- **Helper**: `getApiBase()` in `dashboard/src/shared/lib/apiBase.ts`
  - Returns: `http://localhost:5000/api/v1` (with trailing slash stripped)
- **Axios client**: `dashboard/src/shared/lib/apiClient.ts`
  - baseURL: `getApiBase()`
  - withCredentials: `true` (for HttpOnly cookies)
  - Request interceptor: strips leading `/` from paths
  - Response interceptor: handles 401 with refresh retry

### Authentication Flow

1. User submits login form at `/login`
2. `AuthContext.login()` → `api.post('auth/login', { username, password })`
   - Full URL: `http://localhost:5000/api/v1/auth/login`
   - Backend sets HttpOnly cookies: `auth_token`, `authToken`
3. `AuthContext.fetchMe()` → `api.get('auth/me')`
   - Full URL: `http://localhost:5000/api/v1/auth/me`
4. Login page waits 150ms, then: `window.location.href = '/dashboard'`
5. Middleware intercepts `/dashboard` request:
   - Forwards cookies to `${BACKEND_API_BASE_URL}/auth/me`
   - If 200 → allow access
   - If 401 → redirect to `/login?redirect=/dashboard`

## Prerequisites

- Backend running on port 5000 (`pnpm -F backend dev`)
- Dashboard running on port 3000 (`pnpm -F dashboard dev`)
- Clean browser state (clear cookies, or use incognito)
- DevTools Network tab open

## Acceptance Test: Manual Login Flow

### Step 1: Verify Backend is Ready

```bash
# In browser, visit:
http://localhost:5000/api/v1
```

**Expected response:**

```json
{
  "ok": true,
  "name": "Ice Truck API",
  "version": "1.0.0"
}
```

### Step 2: Navigate to Login Page

```bash
http://localhost:3000/login
```

**Expected:**

- Login form renders
- No console errors
- DevTools Network tab shows no failed requests

### Step 3: Submit Login Form

**Credentials:**

- Username: `admin`
- Password: `password`

**Click:** "Sign in" button

### Step 4: Verify Network Requests

**In DevTools Network tab, you should see:**

1. **Request 1:** POST `http://localhost:5000/api/v1/auth/login`
   - Status: `200 OK`
   - Response headers:
     - `Set-Cookie: auth_token=...` (HttpOnly)
     - `Set-Cookie: authToken=...` (HttpOnly)
   - Response body:
     ```json
     {
       "user": { "id": 1, "username": "admin", "role": "admin" },
       "token": "...",
       "accessToken": "..."
     }
     ```

2. **Request 2:** GET `http://localhost:5000/api/v1/auth/me`
   - Status: `200 OK`
   - Request headers include: `Cookie: auth_token=...; authToken=...`
   - Response body:
     ```json
     {
       "id": 1,
       "username": "admin",
       "role": "admin"
     }
     ```

3. **Navigation:** Browser hard-reloads to `/dashboard`
   - Status: `200 OK` (document load)
   - No redirect to `/login`

### Step 5: Verify Backend Logs

**Backend terminal should show:**

```
POST /api/v1/auth/login 200
GET /api/v1/auth/me 200
```

**Should NOT show:**

```
POST /auth/login 404
POST /auth/refresh 404
GET /auth/me 404
```

### Step 6: Verify Dashboard Renders

- URL stays at: `http://localhost:3000/dashboard`
- No redirect loop to `/login`
- Dashboard content loads successfully
- User info displays in header (e.g., "admin" username)

### Step 7: Test Session Persistence

1. Refresh the page (`F5`)
2. **Expected:**
   - Dashboard remains loaded
   - No redirect to `/login`
   - Network tab shows: GET `/api/v1/auth/me` → 200

### Step 8: Test Logout Flow

1. Click "Logout" button in dashboard header
2. **Expected:**
   - POST `http://localhost:5000/api/v1/auth/logout` → 200
   - Browser redirects to `/login`
   - Cookies cleared

## Known Good Configuration Summary

✅ **RootLayout** (`dashboard/src/app/layout.tsx`)

- Providers → AuthProvider → children (no duplicate ThemeProvider)

✅ **Environment** (`.env.local`)

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1`
- `BACKEND_API_BASE_URL=http://localhost:5000/api/v1`
- No trailing slashes

✅ **API Helper** (`dashboard/src/shared/lib/apiBase.ts`)

- `getApiBase()` returns `http://localhost:5000/api/v1`

✅ **Axios Client** (`dashboard/src/shared/lib/apiClient.ts`)

- baseURL: `getApiBase()`
- withCredentials: `true`
- Leading slash stripped in request interceptor

✅ **AuthContext** (`dashboard/src/shared/auth/AuthContext.tsx`)

- login() uses `api.post('auth/login', ...)`
- fetchMe() uses `api.get('auth/me')`
- logout() uses `api.post('auth/logout', {})`
- Returns structured result: `{ ok: true }` or `{ ok: false, status?, message? }`

✅ **Login Page** (`dashboard/src/app/login/page.tsx`)

- Uses `AuthContext.login()`
- On success: waits 150ms, then `window.location.href = '/dashboard'`

✅ **Middleware** (`dashboard/middleware.ts`)

- Uses `BACKEND_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`
- Forwards cookies to `/auth/me`
- Matcher: `['/dashboard/:path*', '/login', '/register']`

✅ **Backend** (`backend/src/index.ts`)

- All auth routes under `/api/v1/auth/*`
- CORS allows `http://localhost:3000` with credentials
- Cookies: HttpOnly, SameSite=Lax, Path=/, Max-Age=1 day

## Troubleshooting

### Issue: Redirect loop between /login and /dashboard

**Cause:** Middleware not seeing cookies on first navigation  
**Fix:** Login page must use `window.location.href = '/dashboard'` (hard reload), not `router.push()` or `router.replace()`

### Issue: 404 on POST /auth/login

**Cause:** Calling `/auth/login` without `/api/v1` prefix  
**Fix:** Verify `getApiBase()` returns `http://localhost:5000/api/v1` and all API calls use the shared axios client or properly constructed URLs

### Issue: Cookies not sent to backend

**Cause:** Missing `withCredentials: true` or CORS misconfiguration  
**Fix:** Verify:

- Axios client has `withCredentials: true`
- Backend CORS allows origin `http://localhost:3000` with `credentials: true`
- Cookies are HttpOnly, SameSite=Lax, Path=/

### Issue: Middleware always redirects to /login

**Cause:** Middleware not forwarding cookies to backend auth check  
**Fix:** Verify middleware includes:

```typescript
const cookieHeader = req.headers.get('cookie') || '';
await fetch(`${API_BASE}/auth/me`, {
  headers: cookieHeader ? { cookie: cookieHeader } : undefined,
});
```

## Automated Test Command (Future)

```bash
pnpm -F dashboard test:e2e -- guards.spec.ts
```

## Current Status

✅ All configuration verified as correct  
✅ No hardcoded wrong API paths found  
✅ Provider hierarchy unified  
✅ Ready for manual acceptance testing

#!/usr/bin/env node
// scripts/smoke-login.mjs
// Lightweight smoke test for cookie-based auth

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
const CREDENTIALS = { username: 'admin', password: 'password' };

async function main() {
  try {
    // 1) POST /auth/login
    const loginRes = await fetch(`${API.replace(/\/+$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(CREDENTIALS),
    });

    if (!loginRes.ok) {
      throw new Error(
        `login failed: ${loginRes.status} ${loginRes.statusText}`,
      );
    }

    // Grab Set-Cookie headers
    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('no set-cookie header received from /auth/login');
    }

    // Build Cookie header for subsequent requests (take name=value from each cookie)
    const cookie = setCookieHeader
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .join('; ');

    // 2) GET /auth/me with cookies
    const meRes = await fetch(`${API.replace(/\/+$/, '')}/auth/me`, {
      method: 'GET',
      headers: { cookie },
    });

    if (meRes.status !== 200) {
      throw new Error(`/auth/me returned ${meRes.status}`);
    }

    const data = await meRes.json();
    if (!data || typeof data !== 'object')
      throw new Error('invalid /auth/me JSON');
    if (!('id' in data) || !('username' in data) || !('role' in data)) {
      throw new Error(
        'response shape mismatch from /auth/me: ' + JSON.stringify(data),
      );
    }

    console.log('SMOKE LOGIN: PASS');
    process.exit(0);
  } catch (err) {
    console.error('SMOKE LOGIN: FAIL');
    console.error(err);
    process.exit(1);
  }
}

// Node 18+ provides global fetch
if (typeof fetch === 'undefined') {
  console.error(
    'global fetch is not available in this Node runtime. Use Node 18+ / 20+.',
  );
  process.exit(2);
}

main();

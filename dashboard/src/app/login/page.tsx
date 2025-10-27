'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/auth/AuthContext';

// Note: legacy LoginResponse type removed in favor of useAuth().login

export default function LoginPage() {
  const router = useRouter();
  const { login, token, loading, error: ctxError } = useAuth();

  // --- hydration-safe mount guard -------------------------
  // We only render the actual <form> after we're on the client.
  // This prevents hydration mismatch warnings caused by browser
  // extensions injecting attributes into <input>.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- form state -----------------------------------------
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- helper: computed API base url ----------------------
  function getApiBase() {
    const base = (
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
    ).replace(/\/+$/, '');
    return base;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // prevent double click spam

    setError(null);
    setSubmitting(true);
    try {
      // Use shared AuthContext to ensure consistent token storage and profile fetch
      await login(username, password);
      // AuthProvider may redirect to '/'; direct to dashboard for clarity
      router.replace('/dashboard');
    } catch {
      // Any thrown error is already reflected in ctxError; keep a local fallback
      setError(
        'Login failed. Check credentials or backend availability (CORS, port 5000).',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // If already authenticated, redirect away from login
  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
    }
  }, [router, token]);

  // --- if not mounted yet, render lightweight shell only ---
  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1f] text-white">
        <div className="text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  // --- actual login form (client-only render) --------------
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0f1f] text-white">
      <div className="w-full max-w-sm rounded-md bg-[#0f1b2f] p-6 shadow-lg border border-slate-800/50">
        <h2 className="text-lg font-semibold mb-1 text-white">Sign in</h2>
        <p className="text-[11px] text-slate-400 mb-4">
          Use admin/password or demo/demo (local dev)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field */}
          <div>
            <label className="text-xs text-gray-300 block mb-1">Username</label>
            <input
              className="w-full rounded bg-[#1e2a3f] text-white p-2 text-sm outline-none focus:ring focus:ring-cyan-500/40 border border-transparent disabled:opacity-50"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              disabled={submitting}
            />
          </div>

          {/* Password field */}
          <div>
            <label className="text-xs text-gray-300 block mb-1">Password</label>
            <input
              className="w-full rounded bg-[#1e2a3f] text-white p-2 text-sm outline-none focus:ring focus:ring-cyan-500/40 border border-transparent disabled:opacity-50"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              disabled={submitting}
            />
          </div>

          {/* Error message */}
          {(error || ctxError) && (
            <div className="text-red-400 bg-red-400/10 border border-red-500/30 rounded p-2 text-[11px] leading-snug">
              {error ?? ctxError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-sm font-medium rounded py-2 transition-colors"
          >
            {submitting || loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Debug info (optional for dev; comment out in prod) */}
        <div className="mt-4 text-[10px] text-slate-500 leading-relaxed">
          <div>API: {getApiBase()}</div>
          <div>Will POST /api/v1/auth/login</div>
        </div>
      </div>
    </main>
  );
}

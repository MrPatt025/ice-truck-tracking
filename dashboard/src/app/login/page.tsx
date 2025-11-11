'use client';

/**
 * AUTH FLOW IS LOCKED/STABLE:
 * - Login sets HttpOnly cookies via /api/v1/auth/login
 * - Frontend forces full redirect to /dashboard (not client-side push)
 * - middleware.ts checks /api/v1/auth/me using forwarded cookies
 * - Backend exposes ONLY /api/v1/auth/* (no legacy /auth/* paths)
 * Do not change this contract without updating README, RELEASE_NOTES.md, and smoke-login.mjs.
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/shared/auth/AuthContext';
import { apiUrl, getApiBase } from '@/shared/lib/apiBase';
import { api } from '@/shared/lib/apiClient';

// ============================================================================
// Constants & Configuration
// ============================================================================

const CONSTANTS = {
  MIN_USERNAME_LENGTH: 3,
  MIN_PASSWORD_LENGTH: 8,
  SUBMIT_THROTTLE_MS: 1500,
  DEFAULT_REDIRECT: '/dashboard',
  REQUEST_ID_HEADER: 'x-request-id',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 300000, // 5 minutes
  PASSWORD_VISIBILITY_TOGGLE_DELAY: 100,
} as const;

const VALIDATION_MESSAGES = {
  USERNAME_TOO_SHORT: `Username must be at least ${CONSTANTS.MIN_USERNAME_LENGTH} characters`,
  USERNAME_REQUIRED: 'Username is required',
  PASSWORD_TOO_SHORT: `Password must be at least ${CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
  PASSWORD_REQUIRED: 'Password is required',
  ACCOUNT_LOCKED: 'Too many failed attempts. Please try again later.',
} as const;

const ERROR_MESSAGES = {
  NETWORK_DEV: (base: string, rid?: string) =>
    `Unable to reach the service. Is the API running at ${base}?${rid ? ` (request: ${rid})` : ''}`,
  NETWORK_PROD: (rid?: string) =>
    `Unable to reach the service. Please try again in a moment.${rid ? ` (request: ${rid})` : ''}`,
  AUTH_FAILED: (rid?: string) =>
    `Invalid username or password. Please try again.${rid ? ` (request: ${rid})` : ''}`,
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
} as const;

const DEV_CREDENTIALS = {
  username: 'admin',
  password: 'password',
} as const;

const STORAGE_KEYS = {
  LOGIN_ATTEMPTS: 'login_attempts',
  LOCKOUT_UNTIL: 'lockout_until',
} as const;

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  error: string | null;
  field?: 'username' | 'password';
}

interface ErrorInfo {
  message: string;
  requestId?: string;
  type?: 'network' | 'auth';
}
// Internal type for tracking login attempts in storage
type LoginAttemptData = {
  count: number;
  lastAttempt: number;
};
// Utility Functions
// ============================================================================

/**
 * Securely manages login attempt tracking
 */
class LoginAttemptManager {
  private static getAttempts(): LoginAttemptData {
    if (typeof window === 'undefined') {
      return { count: 0, lastAttempt: 0 };
    }

    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
      return data ? JSON.parse(data) : { count: 0, lastAttempt: 0 };
    } catch {
      return { count: 0, lastAttempt: 0 };
    }
  }

  private static setAttempts(data: LoginAttemptData): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store login attempts:', error);
    }
  }

  static getLockoutTime(): number | null {
    if (typeof window === 'undefined') return null;

    try {
      const lockout = sessionStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL);
      return lockout ? parseInt(lockout, 10) : null;
    } catch {
      return null;
    }
  }

  private static setLockout(until: number): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, until.toString());
    } catch (error) {
      console.error('Failed to set lockout:', error);
    }
  }

  static isLockedOut(): boolean {
    const lockoutUntil = this.getLockoutTime();
    if (!lockoutUntil) return false;

    const now = Date.now();
    if (now < lockoutUntil) return true;

    // Clear expired lockout
    this.clearLockout();
    return false;
  }

  static recordAttempt(): void {
    const attempts = this.getAttempts();
    const newCount = attempts.count + 1;

    if (newCount >= CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = Date.now() + CONSTANTS.LOCKOUT_DURATION_MS;
      this.setLockout(lockoutUntil);
      this.setAttempts({ count: 0, lastAttempt: Date.now() });
    } else {
      this.setAttempts({ count: newCount, lastAttempt: Date.now() });
    }
  }

  static getRemainingAttempts(): number {
    if (this.isLockedOut()) return 0;
    const attempts = this.getAttempts();
    return Math.max(0, CONSTANTS.MAX_LOGIN_ATTEMPTS - attempts.count);
  }

  static clearAttempts(): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
      sessionStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
    } catch (error) {
      console.error('Failed to clear attempts:', error);
    }
  }

  static clearLockout(): void {
    this.clearAttempts();
  }
}

/**
 * Validates login form inputs with detailed feedback
 */
function validateCredentials(
  username: string,
  password: string,
): ValidationResult {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.USERNAME_REQUIRED,
      field: 'username',
    };
  }

  if (trimmedUsername.length < CONSTANTS.MIN_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.USERNAME_TOO_SHORT,
      field: 'username',
    };
  }

  if (!password) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.PASSWORD_REQUIRED,
      field: 'password',
    };
  }

  if (password.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.PASSWORD_TOO_SHORT,
      field: 'password',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Checks if an error is network-related
 */
function isNetworkError(error: any): boolean {
  const errorCode = error?.code;
  const errorName = error?.name;
  const errorMessage = String(error?.message ?? '');

  return (
    errorCode === 'ERR_NETWORK' ||
    errorCode === 'ECONNREFUSED' ||
    errorName === 'TypeError' ||
    errorName === 'NetworkError' ||
    /Failed to fetch|NetworkError|Network\s?request|fetch failed|ECONNREFUSED/i.test(
      errorMessage,
    )
  );
}

/**
 * Extracts request ID from error object or headers
 */
function extractRequestId(error: any): string | undefined {
  const headerName =
    process.env.NEXT_PUBLIC_REQUEST_ID_HEADER?.toLowerCase() ??
    CONSTANTS.REQUEST_ID_HEADER;

  return (
    error?.__requestId ??
    error?.response?.headers?.[headerName] ??
    error?.headers?.[headerName] ??
    (typeof window !== 'undefined'
      ? (window as any).__lastRequestId
      : undefined)
  );
}

/**
 * Formats error message based on error type and environment
 */
function formatErrorMessage(error: any, isDev: boolean): ErrorInfo {
  const requestId = extractRequestId(error);
  const isNetwork = isNetworkError(error);

  if (isNetwork) {
    const apiBase = getApiBase();
    const message = isDev
      ? ERROR_MESSAGES.NETWORK_DEV(apiBase, requestId)
      : ERROR_MESSAGES.NETWORK_PROD(requestId);
    const base: { message: string; type: 'network' } = {
      message,
      type: 'network',
    };
    return requestId ? { ...base, requestId } : base;
  }

  // Check for specific HTTP status codes
  const status = error?.response?.status ?? error?.status;
  if (status === 401 || status === 403) {
    const base: { message: string; type: 'auth' } = {
      message: ERROR_MESSAGES.AUTH_FAILED(requestId),
      type: 'auth',
    };
    return requestId ? { ...base, requestId } : base;
  }

  // Default authentication error
  {
    const base: { message: string; type: 'auth' } = {
      message: ERROR_MESSAGES.AUTH_FAILED(requestId),
      type: 'auth',
    };
    return requestId ? { ...base, requestId } : base;
  }
}

/**
 * Parses request ID from error message string
 */
function parseRequestIdFromMessage(message: string | null): string | undefined {
  if (!message) return undefined;
  const match = message.match(/\(request:\s*([^)]+)\)/i);
  return match?.[1];
}

/**
 * Formats remaining lockout time
 */
function formatLockoutTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/**
 * Sanitizes input to prevent XSS
 */
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook for managing lockout state with auto-refresh
 */
function useLockout() {
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  useEffect(() => {
    const checkLockout = () => {
      const locked = LoginAttemptManager.isLockedOut();
      setIsLocked(locked);

      if (locked) {
        const lockoutUntil = LoginAttemptManager.getLockoutTime();
        if (lockoutUntil) {
          setLockoutRemaining(lockoutUntil - Date.now());
        }
      } else {
        setLockoutRemaining(null);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);

    return () => clearInterval(interval);
  }, []);

  return { isLocked, lockoutRemaining };
}

/**
 * Hook for managing form field focus
 */
function useFieldFocus() {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const focusField = useCallback((field: 'username' | 'password') => {
    const ref = field === 'username' ? usernameRef : passwordRef;
    setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 100);
  }, []);

  return { usernameRef, passwordRef, focusField };
}

// ============================================================================
// Main Component
// ============================================================================

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { login, loading: authLoading, error: authError } = useAuth();

  const isDev = process.env.NODE_ENV !== 'production';
  const { isLocked, lockoutRemaining } = useLockout();
  const { usernameRef, passwordRef, focusField } = useFieldFocus();

  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------

  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState(
    isDev ? DEV_CREDENTIALS.username : '',
  );
  const [password, setPassword] = useState(
    isDev ? DEV_CREDENTIALS.password : '',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationError, setValidationError] =
    useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // -------------------------------------------------------------------------
  // Computed Values
  // -------------------------------------------------------------------------

  const redirectPath = useMemo(() => {
    return searchParams?.get('redirect') || CONSTANTS.DEFAULT_REDIRECT;
  }, [searchParams]);

  const displayError = useMemo(() => {
    if (isLocked && lockoutRemaining && lockoutRemaining > 0) {
      return `${VALIDATION_MESSAGES.ACCOUNT_LOCKED} (${formatLockoutTime(lockoutRemaining)} remaining)`;
    }
    return localError ?? authError ?? validationError?.error;
  }, [localError, authError, validationError, isLocked, lockoutRemaining]);

  const apiBaseDisplay = useMemo(() => {
    const base = getApiBase();
    return base || '(via Next dev proxy → http://localhost:5000/api/v1)';
  }, []);

  const isFormDisabled = isSubmitting || authLoading || isLocked;
  const remainingAttempts = LoginAttemptManager.getRemainingAttempts();
  const showAttemptWarning = remainingAttempts > 0 && remainingAttempts <= 2;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeInput(e.target.value);
      setUsername(sanitized);
      if (validationError?.field === 'username') {
        setValidationError(null);
      }
    },
    [validationError],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (validationError?.field === 'password') {
        setValidationError(null);
      }
    },
    [validationError],
  );

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Check lockout status
      if (isLocked) {
        setLocalError(VALIDATION_MESSAGES.ACCOUNT_LOCKED);
        return;
      }

      // Prevent concurrent submissions
      if (isSubmitting || authLoading) {
        return;
      }

      // Throttle rapid submissions
      const now = Date.now();
      if (now - lastSubmitTime < CONSTANTS.SUBMIT_THROTTLE_MS) {
        return;
      }
      setLastSubmitTime(now);

      // Validate inputs
      const validation = validateCredentials(username, password);
      if (!validation.isValid) {
        setValidationError(validation);
        setLocalError(validation.error);
        if (validation.field) {
          focusField(validation.field);
        }
        return;
      }

      // Clear any previous errors
      setLocalError(null);
      setValidationError(null);
      setIsSubmitting(true);

      try {
        // Attempt login through auth context
        const result = await login(username.trim(), password);

        if (result && 'ok' in result && result.ok) {
          // Clear login attempts on success
          LoginAttemptManager.clearAttempts();

          // Show success message briefly and give cookie a moment to persist
          setShowSuccessMessage(true);
          await new Promise((r) => setTimeout(r, 150));

          // Hard reload so the first /dashboard SSR request includes cookies
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          }
          return;
        }

        // If we reach here, login failed
        const status = (result as any)?.status as number | undefined;
        const msg = (result as any)?.message as string | undefined;
        throw Object.assign(new Error(msg || 'Login failed'), { status });
      } catch (error: any) {
        // Record failed attempt
        LoginAttemptManager.recordAttempt();

        // Format and display error
        const errorInfo = formatErrorMessage(error, isDev);
        setLocalError(errorInfo.message);

        // Focus appropriate field
        if (errorInfo.type === 'auth') {
          focusField('username');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      username,
      password,
      login,
      isDev,
      isSubmitting,
      authLoading,
      lastSubmitTime,
      isLocked,
      focusField,
    ],
  );

  const handleDismissError = useCallback(() => {
    setLocalError(null);
    setValidationError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Clear error on any input
      if (displayError && e.key.length === 1) {
        setLocalError(null);
        setValidationError(null);
      }
    },
    [displayError],
  );

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Mount guard for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    const validateAndRedirect = async () => {
      try {
        const res = await api.get('auth/me');
        if (!isCancelled && res.status === 200) {
          // Force full page navigation to guarantee cookies are attached
          if (typeof window !== 'undefined') {
            window.location.href = redirectPath;
          }
        }
      } catch {
        // stay on login if backend not reachable or unauthorized
        if (isDev) {
          // optional noise for local debugging only
          // console.debug('auth/me check failed', _err);
        }
      }
    };

    validateAndRedirect();

    return () => {
      isCancelled = true;
    };
  }, [mounted, redirectPath, isDev]);

  // Handle session expiration from URL params
  useEffect(() => {
    if (!mounted || !searchParams) return;

    const sessionExpired = searchParams.get('session_expired');
    if (sessionExpired === 'true') {
      setLocalError(ERROR_MESSAGES.SESSION_EXPIRED);
      // Clear the param after showing message (client-side only)
      if (typeof window !== 'undefined') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('session_expired');
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
      }
    }
  }, [mounted, searchParams]);

  // -------------------------------------------------------------------------
  // Render: Loading State
  // -------------------------------------------------------------------------

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1f] text-white">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <div
            className="text-sm text-slate-400"
            role="status"
            aria-live="polite"
          >
            Loading…
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Success State
  // -------------------------------------------------------------------------

  if (showSuccessMessage) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1f] text-white">
        <div className="flex flex-col items-center gap-3">
          <SuccessIcon />
          <div
            className="text-sm text-green-400"
            role="status"
            aria-live="polite"
          >
            Sign in successful! Redirecting…
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Login Form
  // -------------------------------------------------------------------------

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0f1f] text-white p-4">
      <div
        className="w-full max-w-sm rounded-lg bg-[#0f1b2f] p-6 shadow-xl border border-slate-800/50"
        role="main"
      >
        {/* Accessible heading */}
        <h1 className="sr-only">Ice Truck Tracking — Access</h1>

        {/* Logo or Icon Area */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-1 text-white text-center">
          Sign in
        </h2>

        <p className="text-xs text-slate-400 mb-6 text-center">
          {isDev
            ? 'For local development, you can use admin/password or demo/demo.'
            : 'Use your work credentials to access the console.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className="text-xs text-gray-300 block mb-1.5 font-medium"
            >
              Username
            </label>
            <input
              ref={usernameRef}
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              aria-required="true"
              aria-invalid={
                validationError?.field === 'username' ? 'true' : 'false'
              }
              aria-describedby={
                validationError?.field === 'username'
                  ? 'username-error'
                  : undefined
              }
              className={`w-full rounded-md bg-[#1e2a3f] text-white px-3 py-2.5 text-sm outline-none focus:ring-2 transition-all ${
                validationError?.field === 'username'
                  ? 'ring-2 ring-red-500/50 focus:ring-red-500/70'
                  : 'focus:ring-cyan-500/40 border border-transparent'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              value={username}
              onChange={handleUsernameChange}
              onKeyDown={handleKeyDown}
              placeholder={isDev ? 'admin' : 'your username'}
              disabled={isFormDisabled}
            />
            {validationError?.field === 'username' && (
              <p
                id="username-error"
                className="mt-1 text-xs text-red-400"
                role="alert"
              >
                {validationError.error}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="text-xs text-gray-300 block mb-1.5 font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-required="true"
                aria-invalid={
                  validationError?.field === 'password' ? 'true' : 'false'
                }
                aria-describedby={
                  validationError?.field === 'password'
                    ? 'password-error'
                    : undefined
                }
                className={`w-full rounded-md bg-[#1e2a3f] text-white px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 transition-all ${
                  validationError?.field === 'password'
                    ? 'ring-2 ring-red-500/50 focus:ring-red-500/70'
                    : 'focus:ring-cyan-500/40 border border-transparent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyDown}
                placeholder={isDev ? 'password' : '••••••••'}
                disabled={isFormDisabled}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isFormDisabled}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            {validationError?.field === 'password' && (
              <p
                id="password-error"
                className="mt-1 text-xs text-red-400"
                role="alert"
              >
                {validationError.error}
              </p>
            )}
          </div>

          {/* Error Display */}
          {displayError && !validationError && (
            <ErrorAlert message={displayError} onDismiss={handleDismissError} />
          )}

          {/* Attempt Warning */}
          {showAttemptWarning && !displayError && (
            <div
              className="text-amber-200 bg-amber-500/20 border border-amber-500/40 rounded-md p-2.5 text-xs leading-snug flex items-start gap-2"
              role="alert"
            >
              <svg
                className="w-4 h-4 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {remainingAttempts === 1
                  ? 'Last attempt remaining before temporary lockout'
                  : `${remainingAttempts} attempts remaining`}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold rounded-md py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0f1b2f] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
            aria-busy={isFormDisabled ? 'true' : 'false'}
          >
            {isSubmitting || authLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Signing in…</span>
              </span>
            ) : isLocked ? (
              'Account Locked'
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Additional Options */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <a
            href="/forgot-password"
            className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded transition-colors"
          >
            Forgot password?
          </a>
          <a
            href="/register"
            className="text-slate-400 hover:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded transition-colors"
          >
            Request access →
          </a>
        </div>

        {/* Development Debug Info */}
        {isDev && (
          <DebugInfo
            apiBase={apiBaseDisplay}
            loginEndpoint={apiUrl('auth/login')}
            remainingAttempts={remainingAttempts}
            isLocked={isLocked}
          />
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  const requestId = parseRequestIdFromMessage(message);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-red-200 bg-red-500/20 border border-red-500/40 rounded-md p-2.5 text-xs leading-snug flex items-start gap-2"
      title={requestId ? `Request ID: ${requestId}` : undefined}
      data-request-id={requestId}
    >
      <svg
        className="w-4 h-4 shrink-0 mt-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L11 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto text-rose-200/80 hover:text-rose-50 focus:outline-none focus:ring-1 focus:ring-rose-300 rounded px-1 transition-colors shrink-0"
        aria-label="Dismiss error message"
      >
        ✕
      </button>
    </div>
  );
}

interface DebugInfoProps {
  apiBase: string;
  loginEndpoint: string;
  remainingAttempts: number;
  isLocked: boolean;
}

function DebugInfo({
  apiBase,
  loginEndpoint,
  remainingAttempts,
  isLocked,
}: DebugInfoProps) {
  return (
    <div className="mt-5 pt-4 border-t border-slate-800/50 text-[10px] text-slate-500 leading-relaxed space-y-1">
      <div className="font-mono text-slate-400 mb-2">Debug Information</div>
      <div>
        <span className="font-mono text-slate-400">API Base:</span>{' '}
        <span className="text-slate-500">{apiBase}</span>
      </div>
      <div>
        <span className="font-mono text-slate-400">POST Endpoint:</span>{' '}
        <span className="text-slate-500 break-all">{loginEndpoint}</span>
      </div>
      <div>
        <span className="font-mono text-slate-400">Environment:</span>{' '}
        <span className="text-slate-500">{process.env.NODE_ENV}</span>
      </div>
      <div>
        <span className="font-mono text-slate-400">Login Attempts:</span>{' '}
        <span
          className={`${isLocked ? 'text-red-400' : remainingAttempts <= 2 ? 'text-amber-400' : 'text-slate-500'}`}
        >
          {isLocked ? 'Locked' : `${remainingAttempts} remaining`}
        </span>
      </div>
      <div>
        <span className="font-mono text-slate-400">Session Storage:</span>{' '}
        <span className="text-slate-500">
          {typeof window !== 'undefined' &&
          typeof sessionStorage !== 'undefined'
            ? 'Available'
            : 'Not available'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

interface IconProps {
  className?: string;
}

function EyeIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-cyan-400`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
      <svg
        className="w-8 h-8 text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
  );
}

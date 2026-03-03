import { secureStorage } from './secureStorage';
import { offlineQueue } from './offlineQueue';

/**
 * API Client — typed HTTP client with automatic auth, refresh token rotation,
 * and offline-first queue for writes.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  /** Make an authenticated API request */
  async request<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const token = await secureStorage.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const res = await fetch(url, { ...options, headers });

      // Auto-refresh on 401
      if (res.status === 401 && token) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          const newToken = await secureStorage.getAccessToken();
          headers.Authorization = `Bearer ${newToken}`;
          const retryRes = await fetch(url, { ...options, headers });
          const retryData = await retryRes.json().catch(() => null);
          return { data: retryData as T, status: retryRes.status, ok: retryRes.ok };
        }
        // Refresh failed — clear tokens, user must re-login
        await secureStorage.clearTokens();
        return { data: null as T, status: 401, ok: false };
      }

      const data = await res.json().catch(() => null);
      return { data: data as T, status: res.status, ok: res.ok };
    } catch {
      // Network error — queue writes for later
      if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
        await offlineQueue.enqueue({
          url,
          method: options.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          body: (options.body as string) || '',
          headers,
        });
      }
      return { data: null as T, status: 0, ok: false };
    }
  }

  /** Refresh access token using stored refresh token */
  private refreshToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) return false;

        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (res.ok) {
          const tokens: TokenPair = await res.json();
          await secureStorage.setTokens(tokens.accessToken, tokens.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Convenience methods
  get<T = unknown>(path: string) {
    return this.request<T>(path);
  }

  post<T = unknown>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T = unknown>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T = unknown>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

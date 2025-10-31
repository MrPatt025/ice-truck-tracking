import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Provide a minimal mock for Next.js App Router to avoid the invariant during unit tests
jest.mock('next/navigation', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  };

  return {
    // Only export what our tests/components actually use
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  };
});

// Provide a default mock for AuthContext hooks to avoid requiring AuthProvider
jest.mock('@/shared/auth/AuthContext', () => {
  return {
    useAuth: () => ({
      login: jest.fn().mockResolvedValue(undefined),
      token: null,
      loading: false,
      error: null,
    }),
    AuthProvider: ({ children }: any) => children as any,
  };
});

'use client';

import type { JSX } from 'react';

import { useEffect, useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  type DehydratedState,
} from '@tanstack/react-query';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';
import { RefreshSettingsProvider } from '@/shared/refresh/RefreshSettings';
import GlobalFetchIndicator from '@/ui/components/GlobalFetchIndicator';
import { ThemeProvider } from '@/components/ThemeProvider';
import { FlagsProvider } from '@/shared/flags/FlagsProvider';

type ProvidersProps = {
  children: ReactNode;
  /** dehydrated state ที่ dehydrate ฝั่งเซิร์ฟเวอร์ (ถ้ามี) */
  state?: DehydratedState;
};

export default function Providers({
  children,
  state,
}: ProvidersProps): JSX.Element {
  // สร้าง QueryClient ครั้งเดียวต่อ mount
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 2,
            // Exponential backoff up to 30s
            retryDelay: (attempt: number) =>
              Math.min(1000 * Math.pow(2, attempt), 30_000),
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  // Initialize Sentry client-side only in production
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    // Dynamically import the client config which initializes Sentry
    import('../../sentry.client.config').catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>
        <RefreshSettingsProvider>
          <FlagsProvider>
            <ThemeProvider>
              <ErrorBoundary>
                {children}
                <GlobalFetchIndicator />
              </ErrorBoundary>
            </ThemeProvider>
          </FlagsProvider>
        </RefreshSettingsProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

'use client';

import type { JSX } from 'react';

import { useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  type DehydratedState,
} from '@tanstack/react-query';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';

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
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

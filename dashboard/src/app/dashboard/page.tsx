// dashboard/src/app/dashboard/page.tsx
'use client';

import dynamic from 'next/dynamic';
import type { JSX } from 'react';
import { RequireAuth } from '@/shared/auth/AuthContext';
import { HeaderBar } from '@/components/dashboard/HeaderBar';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import Fleet3DScene from '@/components/dashboard/Fleet3DScene';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';

const FleetMapPanel = dynamic(
  () =>
    import('@/components/dashboard/FleetMapPanel').then((m) => m.FleetMapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    ),
  },
);

export default function DashboardPage(): JSX.Element {
  return (
    <RequireAuth>
      <div className="min-h-dvh">
        <HeaderBar />
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
          <section>
            <Fleet3DScene />
          </section>
          <MetricsGrid />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <FleetMapPanel />
            </section>
            <section className="flex flex-col gap-4">
              <InsightsPanel />
              <AlertsPanel />
              <PerformanceCharts />
            </section>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

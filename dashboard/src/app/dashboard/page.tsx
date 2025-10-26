// dashboard/src/app/dashboard/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense, type JSX, memo } from 'react';
import { RequireAuth } from '@/shared/auth/AuthContext';
import { HeaderBar } from '@/components/dashboard/HeaderBar';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';

// Lazy load heavy components with optimized loading states
const Fleet3DScene = dynamic(
  () =>
    import('@/components/dashboard/Fleet3DScene').then((m) => ({
      default: m.default,
    })),
  {
    ssr: false,
    loading: () => <Fleet3DSceneSkeleton />,
  },
);

const FleetMapPanel = dynamic(
  () =>
    import('@/components/dashboard/FleetMapPanel').then((m) => ({
      default: m.FleetMapPanel,
    })),
  {
    ssr: false,
    loading: () => <FleetMapSkeleton />,
  },
);

// Optimized skeleton components
const Fleet3DSceneSkeleton = memo(() => (
  <div
    className="relative h-[380px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800"
    aria-label="Loading 3D fleet visualization"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    <div className="flex h-full items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="h-12 w-12 mx-auto rounded-full border-4 border-zinc-300 border-t-zinc-600 animate-spin dark:border-zinc-700 dark:border-t-zinc-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Loading 3D Fleet View
        </p>
      </div>
    </div>
  </div>
));
Fleet3DSceneSkeleton.displayName = 'Fleet3DSceneSkeleton';

const FleetMapSkeleton = memo(() => (
  <div
    className="h-[420px] w-full overflow-hidden rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900"
    aria-label="Loading fleet map"
  >
    <div className="relative h-full">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      <div className="flex h-full items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-zinc-300 border-t-zinc-600 animate-spin dark:border-zinc-700 dark:border-t-zinc-400" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Loading Map Data
          </p>
        </div>
      </div>
    </div>
  </div>
));
FleetMapSkeleton.displayName = 'FleetMapSkeleton';

// Error Boundary Fallback
const ErrorFallback = memo(
  ({ error, reset }: { error: Error; reset: () => void }) => (
    <div
      className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20"
      role="alert"
    >
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
        {error.message || 'Failed to load this section'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
      >
        Try Again
      </button>
    </div>
  ),
);
ErrorFallback.displayName = 'ErrorFallback';

// Main Dashboard Layout Component
const DashboardLayout = memo(() => (
  <main
    className="mx-auto max-w-[1920px] space-y-4 px-4 py-4 sm:px-6 lg:px-8 xl:space-y-6"
    role="main"
  >
    {/* Skip to main content link for accessibility */}
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lg focus:ring-2 focus:ring-zinc-900 dark:focus:bg-zinc-900 dark:focus:text-white"
    >
      Skip to main content
    </a>

    {/* 3D Fleet Visualization */}
    <section aria-labelledby="fleet-3d-title" className="animate-fade-in">
      <h2 id="fleet-3d-title" className="sr-only">
        Fleet 3D Visualization
      </h2>
      <Suspense fallback={<Fleet3DSceneSkeleton />}>
        <Fleet3DScene />
      </Suspense>
    </section>

    {/* Metrics Overview */}
    <section
      aria-labelledby="metrics-title"
      className="animate-fade-in animation-delay-100"
      id="main-content"
    >
      <h2 id="metrics-title" className="sr-only">
        Fleet Metrics
      </h2>
      <MetricsGrid />
    </section>

    {/* Map and Insights Grid */}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-6 animate-fade-in animation-delay-200">
      {/* Fleet Map */}
      <section
        aria-labelledby="map-title"
        className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-950/50"
      >
        <h2 id="map-title" className="sr-only">
          Fleet Map
        </h2>
        <Suspense fallback={<FleetMapSkeleton />}>
          <FleetMapPanel />
        </Suspense>
      </section>

      {/* Right Column: Insights, Alerts, Performance */}
      <div className="flex flex-col gap-4 xl:gap-6">
        <section aria-labelledby="insights-title">
          <h2 id="insights-title" className="sr-only">
            Fleet Insights
          </h2>
          <InsightsPanel />
        </section>

        <section aria-labelledby="alerts-title">
          <h2 id="alerts-title" className="sr-only">
            Active Alerts
          </h2>
          <AlertsPanel />
        </section>

        <section aria-labelledby="performance-title">
          <h2 id="performance-title" className="sr-only">
            Performance Charts
          </h2>
          <PerformanceCharts />
        </section>
      </div>
    </div>
  </main>
));
DashboardLayout.displayName = 'DashboardLayout';

// Main Page Component with Error Boundary
export default function DashboardPage(): JSX.Element {
  return (
    <RequireAuth>
      <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 transition-colors">
        <HeaderBar />
        <DashboardLayout />
      </div>
    </RequireAuth>
  );
}

// Add global styles for animations (add to your global CSS or Tailwind config)
/*
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

.animation-delay-100 {
  animation-delay: 0.1s;
  opacity: 0;
}

.animation-delay-200 {
  animation-delay: 0.2s;
  opacity: 0;
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
*/

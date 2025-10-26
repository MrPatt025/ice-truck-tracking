// dashboard/src/components/dashboard/AlertsPanel.tsx
'use client';

import type { JSX } from 'react';
import { useAlerts } from '@/shared/hooks/useAlerts';

function SkeletonRow(): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-1/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}

export function AlertsPanel(): JSX.Element {
  const { data, isLoading, isError } = useAlerts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }
  if (isError) {
    return (
      <div
        role="status"
        className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
      >
        Failed to load alerts.
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No recent alerts.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
      {data.slice(0, 20).map((a) => {
        const badgeClass =
          a.level === 'critical'
            ? 'bg-red-100 text-red-800'
            : a.level === 'warning'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-zinc-200 text-zinc-800';
        return (
          <li key={a.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {a.message}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Truck {a.truckId ?? '—'} ·{' '}
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
              data-level={a.level}
            >
              {a.level}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

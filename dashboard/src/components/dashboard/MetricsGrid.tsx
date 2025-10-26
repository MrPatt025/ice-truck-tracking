// dashboard/src/components/dashboard/MetricsGrid.tsx
'use client';

import type { JSX } from 'react';
import { useStats } from '@/shared/hooks/useStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/Card';

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}): JSX.Element {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {suffix ? (
            <span className="text-sm font-medium text-zinc-500"> {suffix}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid(): JSX.Element {
  const { data, isLoading, isError } = useStats('1h');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
        Failed to load KPIs.
      </div>
    );
  }

  const s = data.summary;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Metric label="Active trucks" value={s.activeTrucks} />
      <Metric
        label="Avg cargo temp"
        value={s.avgCargoTempC.toFixed(1)}
        suffix="°C"
      />
      <Metric
        label="On-time rate"
        value={s.onTimeRatePct.toFixed(1)}
        suffix="%"
      />
      <Metric label="Deliveries" value={s.deliveriesCompleted} />
    </div>
  );
}
export default MetricsGrid;

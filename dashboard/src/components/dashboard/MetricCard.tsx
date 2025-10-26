// /dashboard/src/components/dashboard/MetricCard.tsx
'use client';

import type { JSX } from 'react';
import { memo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type MetricCardProps = {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: LucideIcon;
  'data-testid': string;
  isLoading?: boolean;
};

const TrendBadge = ({
  trend,
  change,
}: {
  trend: 'up' | 'down' | 'stable';
  change: string;
}): JSX.Element => {
  const cls =
    trend === 'up'
      ? 'text-emerald-400'
      : trend === 'down'
        ? 'text-rose-400'
        : 'text-slate-300';

  const Icon =
    trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold ${cls}`}
      aria-label={`trend ${trend}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {change}
    </span>
  );
};

function MetricCardComponent({
  title,
  value,
  change,
  trend,
  icon: Icon,
  'data-testid': testId,
  isLoading,
}: MetricCardProps): JSX.Element {
  return (
    <div
      className="bg-slate-800/50 rounded-xl p-5 ring-1 ring-white/10"
      data-testid="metric-card"
      role="group"
      aria-label={title}
    >
      {isLoading ? (
        <div className="animate-pulse" aria-busy="true" aria-live="polite">
          <div className="h-8 w-8 rounded-lg bg-slate-700 mb-4" />
          <div className="h-4 w-3/4 rounded bg-slate-700 mb-2" />
          <div className="h-10 w-1/2 rounded bg-slate-700" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="p-2 bg-slate-700/50 rounded-lg" aria-hidden="true">
              <Icon className="h-5 w-5 text-cyan-400" />
            </div>
            <TrendBadge trend={trend} change={change} />
          </div>
          <p className="mt-4 text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white" data-testid={testId}>
            {value}
          </p>
        </>
      )}
    </div>
  );
}

export default memo(MetricCardComponent);

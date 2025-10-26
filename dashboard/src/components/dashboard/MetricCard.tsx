// /components/dashboard/MetricCard.tsx
import { ArrowDownRight, ArrowUpRight, LucideIcon } from 'lucide-react';
import React from 'react';

export type MetricCardProps = {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: LucideIcon;
  'data-testid': string;
  isLoading?: boolean;
};

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  'data-testid': testId,
  isLoading,
}: MetricCardProps) => {
  return (
    <div
      className="bg-slate-800/50 rounded-xl p-5 ring-1 ring-white/10"
      data-testid="metric-card"
    >
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-8 w-8 rounded-lg bg-slate-700 mb-4"></div>
          <div className="h-4 w-3/4 rounded bg-slate-700 mb-2"></div>
          <div className="h-10 w-1/2 rounded bg-slate-700"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="p-2 bg-slate-700/50 rounded-lg">
              <Icon className="h-5 w-5 text-cyan-400" />
            </div>
            <span
              className={`flex items-center text-xs font-semibold ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {change}
            </span>
          </div>
          <p className="mt-4 text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white" data-testid={testId}>
            {value}
          </p>
        </>
      )}
    </div>
  );
};

export default MetricCard;

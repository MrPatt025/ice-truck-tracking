// dashboard/src/components/dashboard/InsightsPanel.tsx
'use client';

import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useInsights } from '@/shared/hooks/useInsights';
import type { AlertTrend, RiskyTruckDto } from '@/shared/types/api';

function TrendBadge({ trend }: { trend: AlertTrend }): JSX.Element {
  const label =
    trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable';
  const bgClass =
    trend === 'up'
      ? 'bg-(--status-critical)'
      : trend === 'down'
        ? 'bg-(--status-success)'
        : 'bg-(--status-warning)';
  return (
    <span
      aria-label={`Alert trend ${label}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white ${bgClass}`}
    >
      <span aria-hidden>●</span>
      {label}
    </span>
  );
}

function RiskItem({ t }: { t: RiskyTruckDto }): JSX.Element {
  return (
    <li className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Truck {t.id}
        </div>
        {t.temp !== undefined ? (
          <span className="text-sm text-(--status-warning)">{t.reason}</span>
        ) : t.speed !== undefined ? (
          <span className="text-sm text-(--status-critical)">{t.reason}</span>
        ) : (
          <span className="text-sm text-zinc-500">{t.reason}</span>
        )}
      </div>
    </li>
  );
}

export function InsightsPanel(): JSX.Element {
  const { data, isLoading, isError } = useInsights('1h');

  return (
    <motion.section
      role="region"
      aria-labelledby="insights-heading"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2
          id="insights-heading"
          className="text-base font-semibold tracking-tight"
        >
          Insights
        </h2>
        {data && <TrendBadge trend={data.alertTrend} />}
      </header>

      {isLoading && (
        <div
          className="h-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800"
          aria-hidden
        />
      )}

      {isError && (
        <p className="text-sm text-zinc-500" role="status">
          Unable to load insights at the moment.
        </p>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section aria-labelledby="risky-heading" className="space-y-2">
            <h3
              id="risky-heading"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Top risky trucks
            </h3>
            {data.riskyTrucks.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No risky trucks detected in the selected period.
              </p>
            ) : (
              <ol className="space-y-2" aria-label="Top risky trucks">
                {data.riskyTrucks.map((t) => (
                  <RiskItem key={t.id + t.reason} t={t} />
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="suggestions-heading" className="space-y-2">
            <h3
              id="suggestions-heading"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Suggested actions
            </h3>
            {data.suggestions.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No actions suggested right now.
              </p>
            ) : (
              <ul
                className="list-disc space-y-1 pl-4"
                aria-label="Suggested actions"
              >
                {data.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-zinc-800 dark:text-zinc-200"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* TODO: replace ruleEngine() with AI risk scoring without changing InsightsResponse */}
    </motion.section>
  );
}

export default InsightsPanel;

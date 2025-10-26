// /dashboard/src/components/dashboard/AnalyticsDashboard.tsx
'use client';

import type { JSX } from 'react';

import { memo, useMemo } from 'react';

type Stats = Readonly<{
  active: number; // count
  distance: number; // kilometers
  avgSpeed: number; // km/h
}>;

type Props = Readonly<{
  stats: Stats;
  locale?: string;
}>;

function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

type MetricCardProps = Readonly<{
  id: string;
  label: string;
  unit?: string;
  formatted: string;
  raw: number;
  testid: string;
}>;

const MetricCard = memo(function MetricCard({
  id,
  label,
  unit,
  formatted,
  raw,
  testid,
}: MetricCardProps) {
  return (
    <article
      data-testid={testid}
      aria-labelledby={`${id}-label`}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur"
    >
      <div id={`${id}-label`} className="text-sm opacity-70">
        {label}
        {unit ? (
          <abbr title={unit} className="opacity-60 no-underline">
            {' '}
            ({unit})
          </abbr>
        ) : null}
      </div>
      <div
        role="status"
        aria-live="polite"
        className="mt-1 tabular-nums text-3xl font-semibold tracking-tight"
        title={String(raw)}
        data-value={raw}
        suppressHydrationWarning
      >
        {formatted}
      </div>
    </article>
  );
});

const AnalyticsDashboard = ({ stats, locale }: Props): JSX.Element => {
  const active = safeNumber(stats.active, 0);
  const distance = safeNumber(stats.distance, 0);
  const avgSpeed = safeNumber(stats.avgSpeed, 0);

  const { intFmt, oneDecFmt } = useMemo(() => {
    return {
      intFmt: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
      oneDecFmt: new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    };
  }, [locale]);

  const formatted = useMemo(
    () => ({
      active: intFmt.format(active),
      distance: oneDecFmt.format(distance),
      avgSpeed: oneDecFmt.format(avgSpeed),
    }),
    [intFmt, oneDecFmt, active, distance, avgSpeed],
  );

  return (
    <section
      id="analytics"
      role="region"
      aria-labelledby="analytics-heading"
      data-testid="analytics-dashboard"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <h2 id="analytics-heading" className="sr-only">
        Analytics
      </h2>

      <MetricCard
        id="active-trucks"
        testid="active-trucks"
        label="Active Trucks"
        formatted={formatted.active}
        raw={active}
      />

      <MetricCard
        id="total-distance"
        testid="total-distance"
        label="Total Distance"
        unit="km"
        formatted={formatted.distance}
        raw={distance}
      />

      <MetricCard
        id="average-speed"
        testid="average-speed"
        label="Average Speed"
        unit="km/h"
        formatted={formatted.avgSpeed}
        raw={avgSpeed}
      />
    </section>
  );
};

function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.locale === next.locale &&
    prev.stats.active === next.stats.active &&
    prev.stats.distance === next.stats.distance &&
    prev.stats.avgSpeed === next.stats.avgSpeed
  );
}

export default memo(AnalyticsDashboard, arePropsEqual);
export type { Props as AnalyticsDashboardProps, Stats as AnalyticsStats };

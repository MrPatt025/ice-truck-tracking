'use client';

import { memo, useMemo } from 'react';

type Stats = Readonly<{
  active: number;
  distance: number; // kilometers
  avgSpeed: number; // km/h
}>;

type Props = Readonly<{
  stats: Stats;
  locale?: string; // ใช้กำหนดรูปแบบตัวเลขตาม locale ถ้าไม่ระบุจะ fallback เป็นค่าเริ่มต้นของบราวเซอร์
}>;

function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

const AnalyticsDashboard = ({ stats, locale }: Props) => {
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

      <article
        data-testid="active-trucks"
        aria-label="Active Trucks"
        className="rounded-xl border border-white/10 bg-white/5 p-3"
      >
        <div className="text-sm opacity-70">Active Trucks</div>
        <div className="text-2xl font-semibold">{intFmt.format(active)}</div>
      </article>

      <article
        data-testid="total-distance"
        aria-label="Total Distance"
        className="rounded-xl border border-white/10 bg-white/5 p-3"
      >
        <div className="text-sm opacity-70">
          Total Distance <span className="opacity-60">(km)</span>
        </div>
        <div className="text-2xl font-semibold">
          {oneDecFmt.format(distance)}
        </div>
      </article>

      <article
        data-testid="average-speed"
        aria-label="Average Speed"
        className="rounded-xl border border-white/10 bg-white/5 p-3"
      >
        <div className="text-sm opacity-70">
          Average Speed <span className="opacity-60">(km/h)</span>
        </div>
        <div className="text-2xl font-semibold">
          {oneDecFmt.format(avgSpeed)}
        </div>
      </article>
    </section>
  );
};

export default memo(AnalyticsDashboard);
export type { Props as AnalyticsDashboardProps, Stats as AnalyticsStats };

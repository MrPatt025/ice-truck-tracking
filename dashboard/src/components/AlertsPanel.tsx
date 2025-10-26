// dashboard/src/components/AlertsPanel.tsx
'use client';

import type { JSX } from 'react';

import { memo, useMemo } from 'react';
import { useAlerts } from '@/shared/hooks/useAlerts';

type Level = 'info' | 'warn' | 'critical';

type UIAlert = {
  id: string;
  level: Level;
  message: string;
  ts: number; // เก็บเป็น timestamp number เพื่อเรนเดอร์เร็ว/ง่าย
};

const badge = (lvl: Level) =>
  lvl === 'critical'
    ? 'bg-red-500/20 text-red-300'
    : lvl === 'warn'
      ? 'bg-yellow-500/20 text-yellow-300'
      : 'bg-sky-500/20 text-sky-300';

function normalizeLevel(input: unknown): Level {
  const s = String(input ?? 'info').toLowerCase();
  if (s === 'critical' || s === 'warn' || s === 'info') return s;
  if (s === 'error' || s === 'err' || s === 'fatal') return 'critical';
  if (s === 'warning' || s === 'warnning') return 'warn';
  return 'info';
}

/** ให้ key เดิม-คงที่เสมอ ถ้าไม่มี id ก็ประกอบจากเวลา+ข้อความ */
function deriveStableId(
  a: Record<string, unknown>,
  fallbackIndex: number,
): string {
  const rawId =
    (a.id as string | number | undefined) ??
    (a.alertId as string | number | undefined) ??
    (a.uuid as string | number | undefined);
  if (rawId != null) return String(rawId);

  const ts = a.ts ?? a.timestamp ?? a.createdAt ?? '';
  const msg = a.message ?? a.msg ?? '';
  const candidate = `${ts}::${msg}`;
  return candidate !== '::' ? candidate : `alert-${fallbackIndex}`;
}

function toUIAlert(a: Record<string, unknown>, idx: number): UIAlert {
  const any = a as Record<string, unknown>;
  const id = deriveStableId(any, idx);
  const level = normalizeLevel(any.level ?? any.severity);
  const message = String(any.message ?? any.msg ?? '');
  const tsVal = any.ts ?? any.timestamp ?? any.createdAt ?? Date.now();
  const ts =
    typeof tsVal === 'number'
      ? tsVal
      : typeof tsVal === 'string'
        ? new Date(tsVal).getTime()
        : tsVal instanceof Date
          ? tsVal.getTime()
          : Date.now();

  return { id, level, message, ts: Number.isFinite(ts) ? ts : Date.now() };
}

function AlertsPanelBase(): JSX.Element {
  const { data: alerts, error } = useAlerts();

  // map โดยตรงจาก ReadonlyArray<AlertItem> -> UIAlert[] (ไม่มีการ cast เป็น unknown[])
  const items: UIAlert[] = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];
    return alerts.map((a, i) =>
      toUIAlert(a as unknown as Record<string, unknown>, i),
    );
  }, [alerts]);

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/5 p-4"
      aria-labelledby="alerts-heading"
      aria-live="polite"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 id="alerts-heading" className="text-base font-semibold">
          Recent Alerts
        </h3>
        {error && (
          <span className="text-xs text-red-300" role="status">
            {String(error)}
          </span>
        )}
      </div>

      <ul className="space-y-2" role="list">
        {items.slice(0, 10).map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`text-[11px] px-2 py-0.5 rounded ${badge(a.level)}`}
              >
                {a.level}
              </span>
              <span className="truncate text-sm">{a.message}</span>
            </div>
            <time
              className="shrink-0 text-[11px] text-slate-400"
              dateTime={new Date(a.ts).toISOString()}
              aria-label={new Date(a.ts).toLocaleString()}
              title={new Date(a.ts).toLocaleString()}
            >
              {new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              }).format(a.ts)}
            </time>
          </li>
        ))}

        {items.length === 0 && !error && (
          <li className="text-sm text-slate-400">No alerts.</li>
        )}
      </ul>
    </section>
  );
}

export default memo(AlertsPanelBase);

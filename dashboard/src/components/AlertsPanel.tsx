'use client';
import { useAlerts } from '@/hooks/useAlerts';

const badge = (lvl: 'info' | 'warn' | 'critical') =>
  lvl === 'critical'
    ? 'bg-red-500/20 text-red-300'
    : lvl === 'warn'
      ? 'bg-yellow-500/20 text-yellow-300'
      : 'bg-sky-500/20 text-sky-300';

export default function AlertsPanel() {
  const { alerts, error } = useAlerts();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent Alerts</h3>
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>
      <ul className="space-y-2">
        {alerts.slice(0, 10).map((a) => (
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
            <time className="shrink-0 text-[11px] text-slate-400">
              {new Date(a.ts).toLocaleTimeString()}
            </time>
          </li>
        ))}
        {alerts.length === 0 && !error && (
          <li className="text-sm text-slate-400">No alerts.</li>
        )}
      </ul>
    </div>
  );
}

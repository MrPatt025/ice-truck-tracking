'use client';

import React from 'react';
import { useAlertsData } from './useAlertsData';

export default function AlertsSection(): React.JSX.Element {
  const { data, isLoading, isError } = useAlertsData();

  if (isLoading) {
    return (
      <section className="p-4 bg-[#071127] rounded-md">
        <div className="text-sm text-gray-400">Loading alerts…</div>
        <ul className="mt-3 space-y-2">
          <li className="h-8 bg-slate-800 rounded animate-pulse" />
          <li className="h-8 bg-slate-800 rounded animate-pulse" />
        </ul>
      </section>
    );
  }

  if (isError || !data || !Array.isArray(data)) {
    return (
      <section className="p-4 bg-[#071127] rounded-md">
        <div className="text-sm text-red-400">Alerts unavailable</div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="p-4 bg-[#071127] rounded-md">
        <div className="text-sm text-slate-400">No active alerts 🎉</div>
      </section>
    );
  }

  return (
    <section className="p-4 bg-[#071127] rounded-md">
      <h3 className="text-sm font-medium text-white">Alerts</h3>
      <ul className="mt-3 divide-y divide-slate-800">
        {data.map((a) => (
          <li key={a.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-white">{a.title}</div>
              <div className="text-xs text-slate-400">
                {new Date(a.timestamp).toLocaleString()}
              </div>
            </div>
            <div>
              <span
                className={`px-2 py-1 rounded text-xs ${a.severity === 'high' ? 'bg-red-600' : a.severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'}`}
              >
                {a.severity}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

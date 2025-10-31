'use client';

import React from 'react';
import { useRecentActivity } from './useRecentActivity';

export default function RecentActivitySection(): React.JSX.Element {
  const { data, isLoading, isError } = useRecentActivity();

  if (isLoading) {
    return (
      <section className="p-4 bg-[#071127] rounded-md">
        <div className="text-sm text-gray-400">Loading activity…</div>
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
        <div className="text-sm text-red-400">Activity unavailable</div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="p-4 bg-[#071127] rounded-md">
        <div className="text-sm text-slate-400">No recent activity</div>
      </section>
    );
  }

  return (
    <section className="p-4 bg-[#071127] rounded-md">
      <h3 className="text-sm font-medium text-white">Recent activity</h3>
      <ul className="mt-3 space-y-2">
        {data.map((a) => (
          <li key={a.id} className="text-sm text-slate-200">
            <div className="text-xs text-slate-400">
              {new Date(a.timestamp).toLocaleString()}
            </div>
            <div>{a.message}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

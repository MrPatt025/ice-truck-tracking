'use client';

import { useIsFetching } from '@tanstack/react-query';

export default function GlobalFetchIndicator() {
  const fetching = useIsFetching();
  if (fetching === 0) return null;
  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-50 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white shadow"
      title="Syncing"
      aria-live="polite"
    >
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
    </div>
  );
}

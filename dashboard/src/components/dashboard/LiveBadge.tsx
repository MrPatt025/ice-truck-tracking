// dashboard/src/components/dashboard/LiveBadge.tsx
'use client';

import type { JSX } from 'react';
import clsx from 'clsx';

export function LiveBadge({ on }: { on: boolean }): JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        on ? 'bg-red-600 text-red-50' : 'bg-zinc-500 text-zinc-100',
      )}
      aria-live="polite"
      aria-label={on ? 'Live updates on' : 'Live updates off'}
      title={on ? 'Live updates on' : 'Live updates off'}
    >
      <span
        className={clsx(
          'block h-2 w-2 rounded-full',
          on ? 'bg-red-200 animate-pulse' : 'bg-zinc-300',
        )}
      />
    </span>
  );
}

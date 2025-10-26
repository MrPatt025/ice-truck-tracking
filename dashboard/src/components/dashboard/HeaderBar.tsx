// dashboard/src/components/dashboard/HeaderBar.tsx
'use client';

import type { JSX } from 'react';
import { Button } from '@/ui/components/Button';
import { LiveBadge } from './LiveBadge';
import { useRealtimeTelemetry } from '@/shared/hooks/useRealtimeTelemetry';
import { useAuth } from '@/shared/auth/AuthContext';

export function HeaderBar(): JSX.Element {
  const { connected } = useRealtimeTelemetry();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex items-center gap-3">
        <LiveBadge on={connected} />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Operations Console
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Toggle theme"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span className="sr-only">Toggle theme</span>
          {/* Simple icon dot */}
          <span className="block h-3 w-3 rounded-full bg-zinc-700 dark:bg-zinc-200" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600"
            aria-label={user?.username ?? 'User'}
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">
            {user?.username}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          aria-label="Logout"
        >
          Logout
        </Button>
      </div>
    </header>
  );
}

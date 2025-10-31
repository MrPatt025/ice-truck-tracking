'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type RefreshSpeedKey = 'fast' | 'normal' | 'slow';

const REFRESH_INTERVALS: Record<RefreshSpeedKey, number> = {
  fast: 5_000,
  normal: 10_000,
  slow: 60_000,
};

type RefreshSettingsState = {
  autoRefresh: boolean;
  refreshSpeed: RefreshSpeedKey;
  /** true when document.hidden */
  paused: boolean;
  /** computed current interval ms based on speed; 0 when autoRefresh is off or paused */
  intervalMs: number;
  setAutoRefresh: (v: boolean) => void;
  setRefreshSpeed: (k: RefreshSpeedKey) => void;
};

const RefreshSettingsContext = createContext<RefreshSettingsState | null>(null);

export function RefreshSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshSpeed, setRefreshSpeed] = useState<RefreshSpeedKey>('normal');
  const [paused, setPaused] = useState<boolean>(false);

  // Pause when tab is hidden to reduce CPU/network
  useEffect(() => {
    const handle = () =>
      setPaused(typeof document !== 'undefined' && document.hidden);
    handle();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handle);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handle);
      }
    };
  }, []);

  const intervalMs = useMemo(() => {
    if (!autoRefresh || paused) return 0;
    switch (refreshSpeed) {
      case 'fast':
        return REFRESH_INTERVALS.fast;
      case 'normal':
        return REFRESH_INTERVALS.normal;
      case 'slow':
        return REFRESH_INTERVALS.slow;
      default:
        return REFRESH_INTERVALS.normal;
    }
  }, [autoRefresh, paused, refreshSpeed]);

  const value = useMemo<RefreshSettingsState>(
    () => ({
      autoRefresh,
      refreshSpeed,
      paused,
      intervalMs,
      setAutoRefresh,
      setRefreshSpeed,
    }),
    [autoRefresh, refreshSpeed, paused, intervalMs],
  );

  return (
    <RefreshSettingsContext.Provider value={value}>
      {children}
    </RefreshSettingsContext.Provider>
  );
}

export function useRefreshSettings(): RefreshSettingsState {
  const ctx = useContext(RefreshSettingsContext);
  if (!ctx)
    throw new Error(
      'useRefreshSettings must be used within RefreshSettingsProvider',
    );
  return ctx;
}

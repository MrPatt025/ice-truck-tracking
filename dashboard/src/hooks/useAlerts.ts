// Compatibility wrapper around the canonical shared hook
import { useAlerts as useSharedAlerts } from '@/shared/hooks/useAlerts';

export type UseAlertsOptions = {
  intervalMs?: number;
  enabled?: boolean;
  sort?: 'newest' | 'oldest' | null;
  dedupe?: boolean;
};

export type UseAlertsReturn = {
  alerts: ReadonlyArray<unknown>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useAlerts(_options?: UseAlertsOptions): UseAlertsReturn {
  // Delegate to shared hook (uses axios client with auth and base URL)
  const q = useSharedAlerts();
  return {
    alerts: (q.data as ReadonlyArray<unknown>) ?? [],
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    error: (q.error as Error) ?? null,
    refetch: async () => {
      await q.refetch();
    },
  };
}

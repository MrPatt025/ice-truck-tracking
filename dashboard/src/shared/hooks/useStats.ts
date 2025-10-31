// dashboard/src/shared/hooks/useStats.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import { useRefreshSettings } from '@/shared/refresh/RefreshSettings';
import { QueryKeys } from '@/shared/queryKeys';
import type { StatsRange, StatsResponse } from '@/shared/types/api';
import { useAuth } from '@/shared/auth/AuthContext';

export function useStats(range: StatsRange = '1h') {
  const { token, bootstrapped } = useAuth();
  const { intervalMs } = useRefreshSettings();
  return useQuery<StatsResponse>({
    queryKey: QueryKeys.stats(range),
    queryFn: async () => {
      const { data } = await api.get<StatsResponse>('/stats', {
        params: { range },
      } as const);
      return data;
    },
    enabled: !!token && bootstrapped,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchInterval: intervalMs || false,
    refetchIntervalInBackground: false,
  });
}

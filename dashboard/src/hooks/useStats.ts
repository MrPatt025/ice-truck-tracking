// dashboard/src/hooks/useStats.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import { useRefreshSettings } from '@/shared/refresh/RefreshSettings';
import { QueryKeys } from '@/shared/queryKeys';
import type { GetApiV1Stats200 } from '@/types/api/getApiV1Stats200';
import type { GetApiV1StatsRange } from '@/types/api/getApiV1StatsRange';
import { useAuth } from '@/shared/auth/AuthContext';

export function useStats(range?: GetApiV1StatsRange) {
  const { token, bootstrapped } = useAuth();

  const { intervalMs } = useRefreshSettings();
  return useQuery({
    queryKey: QueryKeys.stats(range ?? '1h'),
    queryFn: async () => {
      const { data } = await api.get<GetApiV1Stats200>('/stats', {
        params: range ? { range } : undefined,
      } as const);
      return data;
    },
    enabled: !!token && bootstrapped,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchInterval: intervalMs || false,
    refetchIntervalInBackground: false,
  });
}

// dashboard/src/shared/hooks/useInsights.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import type { InsightsResponse, StatsRange } from '@/shared/types/api';
import { useAuth } from '@/shared/auth/AuthContext';

export function useInsights(range: StatsRange = '1h') {
  const { token, bootstrapped } = useAuth();
  return useQuery<InsightsResponse>({
    queryKey: ['insights', range],
    queryFn: async () => {
      const { data } = await api.get<InsightsResponse>('stats/risk', {
        params: { range },
      } as const);
      return data;
    },
    enabled: !!token && bootstrapped,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

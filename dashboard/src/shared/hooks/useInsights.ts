// dashboard/src/shared/hooks/useInsights.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import type { InsightsResponse, StatsRange } from '@/shared/types/api';

export function useInsights(range: StatsRange = '1h') {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
  ).replace(/\/+$/, '');
  return useQuery<InsightsResponse>({
    queryKey: ['insights', range],
    queryFn: async () => {
      const { data } = await api.get<InsightsResponse>(
        `${base}/api/v1/stats/risk`,
        {
          params: { range },
        } as const,
      );
      return data;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

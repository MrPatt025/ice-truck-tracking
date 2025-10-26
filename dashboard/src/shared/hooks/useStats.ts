// dashboard/src/shared/hooks/useStats.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import type { StatsRange, StatsResponse } from '@/shared/types/api';

export function useStats(range: StatsRange = '1h') {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
  ).replace(/\/+$/, '');
  return useQuery<StatsResponse>({
    queryKey: ['stats', range],
    queryFn: async () => {
      const { data } = await api.get<StatsResponse>(`${base}/api/v1/stats`, {
        params: { range },
      } as const);
      return data;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

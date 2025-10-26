// dashboard/src/hooks/useStats.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import type { GetApiV1Stats200 } from '@/types/api/getApiV1Stats200';
import type { GetApiV1StatsRange } from '@/types/api/getApiV1StatsRange';

export function useStats(range?: GetApiV1StatsRange) {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
  ).replace(/\/+$/, '');

  return useQuery({
    queryKey: ['/api/v1/stats', { range }],
    queryFn: async () => {
      const { data } = await api.get<GetApiV1Stats200>(`${base}/api/v1/stats`, {
        params: range ? { range } : undefined,
      } as const);
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

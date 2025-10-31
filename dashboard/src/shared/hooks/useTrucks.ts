// dashboard/src/shared/hooks/useTrucks.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import { useAuth } from '@/shared/auth/AuthContext';
import { useRefreshSettings } from '@/shared/refresh/RefreshSettings';
import { QueryKeys } from '@/shared/queryKeys';
import type { TruckDto } from '@/shared/types/api';

export type TrucksQuery = Readonly<{
  page?: number;
  limit?: number;
  sort?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}>;

export function useTrucks(
  params: TrucksQuery = { page: 1, limit: 200, sort: 'name', order: 'asc' },
) {
  const { token, bootstrapped } = useAuth();
  const { intervalMs } = useRefreshSettings();
  return useQuery<TruckDto[]>({
    queryKey: QueryKeys.trucks(params),
    queryFn: async () => {
      const { data } = await api.get<TruckDto[]>('/trucks', {
        params,
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

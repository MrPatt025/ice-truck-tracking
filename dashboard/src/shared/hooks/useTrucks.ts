// dashboard/src/shared/hooks/useTrucks.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
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
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
  ).replace(/\/+$/, '');
  return useQuery<TruckDto[]>({
    queryKey: ['trucks', params],
    queryFn: async () => {
      const { data } = await api.get<TruckDto[]>(`${base}/api/v1/trucks`, {
        params,
      } as const);
      return data;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

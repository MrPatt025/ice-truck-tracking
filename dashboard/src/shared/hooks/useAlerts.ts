// dashboard/src/shared/hooks/useAlerts.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import type { AlertDto } from '@/shared/types/api';

export function useAlerts() {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
  ).replace(/\/+$/, '');
  return useQuery<AlertDto[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get<AlertDto[]>(`${base}/api/v1/alerts`);
      return data;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

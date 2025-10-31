// dashboard/src/shared/hooks/useAlerts.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';
import { useRefreshSettings } from '@/shared/refresh/RefreshSettings';
import { QueryKeys } from '@/shared/queryKeys';
import type { AlertDto } from '@/shared/types/api';
import { useAuth } from '@/shared/auth/AuthContext';

export function useAlerts() {
  const { token, bootstrapped } = useAuth();
  const { intervalMs } = useRefreshSettings();
  return useQuery<AlertDto[]>({
    queryKey: QueryKeys.alerts,
    queryFn: async () => {
      const { data } = await api.get<AlertDto[]>('/alerts');
      return data;
    },
    enabled: !!token && bootstrapped,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    // Dynamically controlled polling
    refetchInterval: intervalMs || false,
    refetchIntervalInBackground: false,
  });
}

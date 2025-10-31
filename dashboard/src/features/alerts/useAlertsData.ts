import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';

export type AlertItem = {
  id: string;
  title: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  truckId?: string | undefined;
  location?: { lat: number; lon: number } | null | undefined;
};

export function useAlertsData() {
  return useQuery<AlertItem[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get('alerts');
      const raw = (res.data ?? []) as any[];
      return raw.map((r) => ({
        id: String(r.id),
        title: String(r.title ?? r.message ?? 'Alert'),
        timestamp: String(r.timestamp ?? new Date().toISOString()),
        severity: (r.severity as any) || 'low',
        truckId: r.truckId ? String(r.truckId) : undefined,
        location: r.location || null,
      }));
    },
  });
}

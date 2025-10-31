import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';

export type ActivityItem = {
  id: string;
  type: string;
  message: string;
  timestamp: string;
};

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ['activity', 'recent'],
    queryFn: async () => {
      const res = await api.get('activity/recent');
      const raw = (res.data ?? []) as any[];
      return raw.map((r) => ({
        id: String(r.id),
        type: String(r.type ?? 'event'),
        message: String(r.message ?? r.title ?? ''),
        timestamp: String(r.timestamp ?? new Date().toISOString()),
      }));
    },
  });
}

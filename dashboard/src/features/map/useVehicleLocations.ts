import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/apiClient';

export type VehiclePoint = {
  id: string;
  latitude: number;
  longitude: number;
  temp?: number;
  speed?: number;
};

export function useVehicleLocations() {
  return useQuery<VehiclePoint[]>({
    queryKey: ['vehicles', 'locations'],
    queryFn: async () => {
      const res = await api.get('trucks/locations');
      const raw = (res.data ?? []) as any[];
      return raw.map((r) => ({
        id: String(r.id),
        latitude: Number(r.latitude ?? r.lat ?? 0),
        longitude: Number(r.longitude ?? r.lon ?? 0),
        temp: typeof r.temp === 'number' ? r.temp : undefined,
        speed: typeof r.speed === 'number' ? r.speed : undefined,
      }));
    },
  });
}

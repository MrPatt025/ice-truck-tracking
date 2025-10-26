// dashboard/src/components/dashboard/FleetMapPanel.tsx
'use client';

import dynamic from 'next/dynamic';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeTelemetry } from '@/shared/hooks/useRealtimeTelemetry';
import type { TelemetryPoint } from '@/shared/types/api';

const TomTomMap = dynamic(() => import('@/components/TomTomMap'), {
  ssr: false,
  loading: () => <Skeleton />,
});

function Skeleton(): JSX.Element {
  return (
    <div
      className="h-[420px] w-full animate-pulse rounded-lg bg-linear-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700"
      aria-hidden
    />
  );
}

export function FleetMapPanel(): JSX.Element {
  const { connected: _connected } = useRealtimeTelemetry();
  const { data: telemetry, isLoading } = useQuery<TelemetryPoint[]>({
    queryKey: ['telemetry'],
    queryFn: async () => [], // initial empty; will be filled by realtime hook
    initialData: [],
    staleTime: Infinity,
  });

  const trucks = useMemo(() => {
    // transform to TomTomMap TruckPoint shape
    return (telemetry ?? []).map((t) => ({
      id: t.truckId,
      latitude: t.lat,
      longitude: t.lng,
      speed: t.speedKmh,
      temp: t.cargoTempC,
    }));
  }, [telemetry]);

  if (isLoading) return <Skeleton />;

  return (
    <div className="relative">
      <TomTomMap trucks={trucks} autoFit cluster />
      <div className="pointer-events-none absolute left-3 top-3 z-10">
        {/* LIVE badge handled by header globally; optional local indicator */}
      </div>
    </div>
  );
}

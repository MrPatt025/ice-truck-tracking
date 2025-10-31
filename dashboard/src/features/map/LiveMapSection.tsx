'use client';

import React, { useMemo } from 'react';
import TomTomMap, { type TruckPoint } from '@/components/TomTomMap';
import { useVehicleLocations, type VehiclePoint } from './useVehicleLocations';

function toTruckPoints(items: VehiclePoint[]): TruckPoint[] {
  return items
    .filter(
      (it) => Number.isFinite(it.latitude) && Number.isFinite(it.longitude),
    )
    .map((it) => ({
      id: it.id,
      lat: it.latitude,
      lon: it.longitude,
      ...(it.temp !== undefined ? { temp: it.temp } : {}),
    }));
}

export default function LiveMapSection(): React.JSX.Element {
  const { data, isLoading, isError } = useVehicleLocations();

  const trucks = useMemo(() => (data ? toTruckPoints(data) : []), [data]);

  if (isLoading) {
    return (
      <div className="rounded-md bg-[#071127] p-4">
        <div className="text-sm text-slate-400">Loading map data…</div>
        <div className="mt-3 h-[420px] bg-slate-800 animate-pulse rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-[#071127] p-4">
        <div className="text-sm text-red-400">Map data unavailable</div>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-[#071127] p-2">
      <TomTomMap trucks={trucks} />
    </div>
  );
}

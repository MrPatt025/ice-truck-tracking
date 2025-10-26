// Deprecated Leaflet-based map — kept as a harmless stub to avoid TS errors
'use client';
import React from 'react';

export type TruckPoint = {
  id: number | string;
  name: string;
  lat: number;
  lon: number;
  driver_name?: string;
  speed?: number;
  temp?: number;
};

type Props = {
  trucks: ReadonlyArray<TruckPoint>;
  height?: number | string;
  className?: string;
};

export default function LeafletFleetMap({ height = 420, className }: Props) {
  return (
    <div
      role="img"
      aria-label="Deprecated Leaflet map placeholder"
      className={className ?? ''}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
      }}
    />
  );
}

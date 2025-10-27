// Deprecated Leaflet-based map — kept as a harmless stub to avoid TS errors
'use client';
import React from 'react';

// Accept any truck shape; this is a stub and shouldn't constrain callers
type Props = {
  trucks?: ReadonlyArray<any>;
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

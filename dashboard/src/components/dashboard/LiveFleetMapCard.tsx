// dashboard/src/components/dashboard/LiveFleetMapCard.tsx
'use client';

import * as React from 'react';
import type { UiTruck } from '../../types/truck';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';
import TomTomMap from '../TomTomMap';

type Props = {
  trucks?: readonly UiTruck[];
  onSelectTruck?: (id: number) => void;
  className?: string;
};

function LiveFleetMapCard({
  trucks = [],
  onSelectTruck: _onSelectTruck,
  className,
}: Props) {
  return (
    <div
      className={twMerge(
        'relative h-96 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900',
        clsx(className),
      )}
      data-testid="live-fleet-map"
      role="region"
      aria-label="Live fleet map"
      aria-live="polite"
    >
      {/* Reuse the unified TomTom map component */}
      <TomTomMap
        trucks={trucks}
        autoFit
        center={[100.5018, 13.7563]}
        zoom={6}
      />

      {/* Optional overlay when no points */}
      {(!trucks || trucks.length === 0) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-md bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
            No live locations
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(LiveFleetMapCard);

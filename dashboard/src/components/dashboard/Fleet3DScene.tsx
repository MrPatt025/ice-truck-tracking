'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TelemetryPoint } from '@/shared/types/api';
import Fleet3DFallback from './Fleet3DFallback';

const Fleet3DCanvas = dynamic(() => import('./Fleet3DCanvas'), {
  ssr: false,
  loading: () => <Fleet3DFallback />,
});

function canUseWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      c.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export default function Fleet3DScene() {
  const [webgl, setWebgl] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    setWebgl(canUseWebGL());
  }, []);

  const threeEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const disabledByEnv = (process.env.NEXT_PUBLIC_THREE_HERO ?? '1') === '0';
    const prefersReduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    return !disabledByEnv && !prefersReduced && webgl;
  }, [webgl]);

  const telemetry = useQuery<TelemetryPoint[]>({
    queryKey: ['telemetry'],
    queryFn: async () => qc.getQueryData<TelemetryPoint[]>(['telemetry']) ?? [],
    initialData: () => qc.getQueryData<TelemetryPoint[]>(['telemetry']) ?? [],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  if (!threeEnabled) {
    return <Fleet3DFallback />;
  }

  return (
    <section
      aria-label="3D fleet visualization"
      className="rounded-map card-glass overflow-hidden"
    >
      <Fleet3DCanvas points={telemetry.data ?? []} />
      <div className="sr-only" aria-live="polite" aria-atomic>
        3D fleet visualization active
      </div>
    </section>
  );
}

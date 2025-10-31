// dashboard/src/components/StaticHero.tsx
'use client';

import type { JSX } from 'react';

export default function StaticHero(): JSX.Element {
  return (
    <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ring-1 ring-white/10">
      <div className="absolute inset-0 opacity-40 hero-gradient-bg" />
      <div className="relative h-full w-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-sm text-slate-400">Loading 3D preview…</div>
        </div>
      </div>
    </div>
  );
}

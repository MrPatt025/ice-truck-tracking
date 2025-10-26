'use client';

import React from 'react';

/*****
 * Fleet3DFallback
 * Lightweight, accessible hero fallback when WebGL or 3D is disabled.
 *****/
export default function Fleet3DFallback() {
  return (
    <section
      aria-label="Fleet visualization"
      className="rounded-map card-glass noise-bg holographic-grid shadow-glow overflow-hidden relative min-h-[260px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--glow-dim),transparent_60%)]" />
      <div className="relative p-5 md:p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-brand-gradient">
            Fleet Overview
          </h2>
          <p className="text-sm text-white/70 mt-1">
            3D hero disabled — using low-impact visualization
          </p>
        </div>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs bg-white/5 border border-white/10">
            <i className="h-2.5 w-2.5 rounded-full bg-(--glow-ok)" />
            OK
          </span>
          <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs bg-white/5 border border-white/10">
            <i className="h-2.5 w-2.5 rounded-full bg-(--glow-warning)" />
            Warn
          </span>
          <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs bg-white/5 border border-white/10">
            <i className="h-2.5 w-2.5 rounded-full bg-(--glow-critical)" />
            Critical
          </span>
        </div>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic>
        3D fleet visualization unavailable or disabled. Showing fallback.
      </div>
    </section>
  );
}

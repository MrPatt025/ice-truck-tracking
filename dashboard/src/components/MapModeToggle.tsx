'use client'

import React, { memo, useEffect, useRef, useState } from 'react'

interface MapModeToggleProps {
  isLiveMode: boolean
  onModeChange: (mode: 'live' | 'historical') => void
  className?: string
}

const baseButtonClass =
  'relative z-10 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none ring-offset-2 ring-offset-slate-950 transition-colors motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300/70'

const MapModeToggle = memo(function MapModeToggle({
  isLiveMode,
  onModeChange,
  className = '',
}: Readonly<MapModeToggleProps>) {
  const derivedMode = isLiveMode ? 'live' : 'historical'
  const [optimisticMode, setOptimisticMode] = useState<'live' | 'historical'>(
    derivedMode
  )
  const pendingModeRef = useRef<'live' | 'historical' | null>(null)

  useEffect(() => {
    if (pendingModeRef.current === derivedMode) {
      pendingModeRef.current = null
    }

    if (pendingModeRef.current === null) {
      setOptimisticMode(derivedMode)
    }
  }, [derivedMode])

  const isHistoricalMode = optimisticMode === 'historical'
  const isLive = optimisticMode === 'live'

  const switchMode = (mode: 'live' | 'historical') => {
    if (optimisticMode === mode && pendingModeRef.current === null) return

    pendingModeRef.current = mode
    setOptimisticMode(mode)

    if (derivedMode !== mode) {
      onModeChange(mode)
    }
  }

  return (
    <fieldset
      className={`glass-panel mb-4 inline-flex items-center rounded-xl bg-white/5 p-1 ring-1 ring-cyan-200/20 ${className}`}
      aria-label='Map visualization mode toggle'
      data-testid='map-mode-toggle'
    >
      <legend className='sr-only'>Map visualization mode</legend>

      <div className='relative'>
        {isLive && (
          <span
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg motion-safe:animate-pulse'
          />
        )}
        <button
          type='button'
          tabIndex={0}
          onClick={() => switchMode('live')}
          aria-label='Switch to live fleet mode'
          aria-pressed={isLive}
          data-testid='map-mode-live'
          className={`${baseButtonClass} ${isLive ? 'text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          Live Fleet
        </button>
      </div>

      <div className='relative'>
        {isHistoricalMode && (
          <span
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 shadow-lg motion-safe:animate-pulse'
          />
        )}
        <button
          type='button'
          tabIndex={0}
          onClick={() => switchMode('historical')}
          aria-label='Switch to historical heatmap mode'
          aria-pressed={isHistoricalMode}
          data-testid='map-mode-historical'
          className={`${baseButtonClass} ${isHistoricalMode ? 'text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          Historical Heatmap
        </button>
      </div>
    </fieldset>
  )
})

MapModeToggle.displayName = 'MapModeToggle'

export default MapModeToggle

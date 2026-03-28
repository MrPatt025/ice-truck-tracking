'use client'

import React, { memo, useState } from 'react'

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
  const [activeMode, setActiveMode] = useState<'live' | 'historical'>(
    isLiveMode ? 'live' : 'historical'
  )

  const isLive = activeMode === 'live'
  const isHistoricalMode = activeMode === 'historical'

  const activateMode = (mode: 'live' | 'historical') => {
    setActiveMode(mode)
    try {
      onModeChange(mode)
    } catch {
      // Keep local toggle responsive even if upstream handlers fail.
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
          onMouseDown={() => activateMode('live')}
          onClick={() => activateMode('live')}
          aria-label='Live Fleet'
          aria-pressed={isLive}
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
          onMouseDown={() => activateMode('historical')}
          onClick={() => activateMode('historical')}
          aria-label='Historical Heatmap'
          aria-pressed={isHistoricalMode}
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

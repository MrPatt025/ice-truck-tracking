'use client'

import React, { memo, useRef, useEffect } from 'react'
import { useIoTStore } from '@/engine/store'

interface MapModeToggleProps {
  isLiveMode?: boolean
  onModeChange?: (mode: 'live' | 'historical') => void
  className?: string
}

const baseButtonClass =
  'relative z-10 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none ring-offset-2 ring-offset-slate-950 transition-colors motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300/70'

function setPressedState(
  button: HTMLButtonElement | null,
  pressed: boolean
): void {
  button?.setAttribute('aria-pressed', String(pressed))
}

function syncTogglePressedState(
  liveBtn: HTMLButtonElement | null,
  historicalBtn: HTMLButtonElement | null,
  activeMode: 'live' | 'historical'
): void {
  setPressedState(liveBtn, activeMode === 'live')
  setPressedState(historicalBtn, activeMode === 'historical')
}

function getToggleModeFromTarget(
  target: EventTarget | null
): 'live' | 'historical' | null {
  const element = target instanceof HTMLElement ? target : null
  const trigger = element?.closest('[data-testid]') as HTMLElement | null
  const testId = trigger?.dataset.testid
  if (testId === 'map-mode-live') return 'live'
  if (testId === 'map-mode-historical') return 'historical'
  return null
}

const MapModeToggle = memo(function MapModeToggle({
  isLiveMode,
  onModeChange,
  className = '',
}: Readonly<MapModeToggleProps>) {
  // Fallback to the global IoT store when parent doesn't provide control props.
  const storeShowHeatmap = useIoTStore(s => s.showHeatmap)

  const liveBtnRef = useRef<HTMLButtonElement | null>(null)
  const historicalBtnRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLFieldSetElement | null>(null)

  const setStoreMode = (mode: 'live' | 'historical') => {
    const shouldShowHeatmap = mode === 'historical'
    if (useIoTStore.getState().showHeatmap === shouldShowHeatmap) return
    useIoTStore.setState({ showHeatmap: shouldShowHeatmap })
  }

  // Keep DOM attributes in sync with the store for deterministic E2E checks
  useEffect(() => {
    const setAttrs = (showHeatmap: boolean) => {
      syncTogglePressedState(
        liveBtnRef.current,
        historicalBtnRef.current,
        showHeatmap ? 'historical' : 'live'
      )
    }

    // initialize immediately
    setAttrs(useIoTStore.getState().showHeatmap)

    // subscribe to store changes
    const unsubscribe = useIoTStore.subscribe(
      s => s.showHeatmap,
      next => {
        setAttrs(next)
      }
    )

    return () => unsubscribe()
  }, [])

  // Native pointer listener as a fallback to ensure toggles work even when
  // synthetic/react events are not delivered (helps E2E stability).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const handler = (e: PointerEvent) => {
      const mode = getToggleModeFromTarget(e.target)
      if (mode === null) return

      setStoreMode(mode)
      syncTogglePressedState(
        liveBtnRef.current,
        historicalBtnRef.current,
        mode
      )
    }

    const onMouseDown = (event: MouseEvent) => {
      const mode = getToggleModeFromTarget(event.target)
      if (mode === null) return
      syncTogglePressedState(
        liveBtnRef.current,
        historicalBtnRef.current,
        mode
      )
    }

    const onClick = (event: MouseEvent) => {
      const mode = getToggleModeFromTarget(event.target)
      if (mode === null) return
      setStoreMode(mode)
      syncTogglePressedState(
        liveBtnRef.current,
        historicalBtnRef.current,
        mode
      )
    }

    root.addEventListener('pointerdown', handler, true)
    root.addEventListener('mousedown', onMouseDown, true)
    root.addEventListener('click', onClick, true)

    return () => {
      root.removeEventListener('pointerdown', handler, true)
      root.removeEventListener('mousedown', onMouseDown, true)
      root.removeEventListener('click', onClick, true)
    }
  }, [])

  const effectiveIsLiveMode =
    typeof isLiveMode === 'boolean' ? isLiveMode : storeShowHeatmap === false
  const effectiveOnModeChange = onModeChange ?? setStoreMode

  const isHistoricalMode = !effectiveIsLiveMode

  // Ensure clicks update the global store immediately as a fallback
  const handleModeChange = (mode: 'live' | 'historical') => {
    syncTogglePressedState(liveBtnRef.current, historicalBtnRef.current, mode)
    effectiveOnModeChange(mode)
    setStoreMode(mode)
  }

  return (
    <fieldset
      className={`glass-panel relative z-50 pointer-events-auto mb-4 inline-flex items-center rounded-xl bg-white/5 p-1 ring-1 ring-cyan-200/20 ${className}`}
      aria-label='Map visualization mode toggle'
      data-testid='map-mode-toggle'
      ref={rootRef}
    >
      <legend className='sr-only'>Map visualization mode</legend>
      <div className='relative'>
        <button
          type='button'
          tabIndex={0}
          onMouseDown={() => {
            if (liveBtnRef.current)
              liveBtnRef.current.setAttribute('aria-pressed', 'true')
            if (historicalBtnRef.current)
              historicalBtnRef.current.setAttribute('aria-pressed', 'false')
          }}
          onClick={() => handleModeChange('live')}
          ref={liveBtnRef}
          aria-label='Switch to live fleet mode'
          aria-pressed={effectiveIsLiveMode}
          data-testid='map-mode-live'
          className={`relative z-20 ${baseButtonClass} ${effectiveIsLiveMode ? 'text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          Live Fleet
        </button>
        {effectiveIsLiveMode && (
          <span
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 z-10 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg motion-safe:animate-pulse'
          />
        )}
      </div>
      <div className='relative'>
        <button
          type='button'
          tabIndex={0}
          onMouseDown={() => {
            if (liveBtnRef.current)
              liveBtnRef.current.setAttribute('aria-pressed', 'false')
            if (historicalBtnRef.current)
              historicalBtnRef.current.setAttribute('aria-pressed', 'true')
          }}
          onClick={() => handleModeChange('historical')}
          ref={historicalBtnRef}
          aria-label='Switch to historical heatmap mode'
          aria-pressed={isHistoricalMode}
          data-testid='map-mode-historical'
          className={`relative z-20 ${baseButtonClass} ${isHistoricalMode ? 'text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          Historical Heatmap
        </button>
        {isHistoricalMode && (
          <span
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 z-10 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 shadow-lg motion-safe:animate-pulse'
          />
        )}
      </div>
    </fieldset>
  )
})

MapModeToggle.displayName = 'MapModeToggle'

export default MapModeToggle

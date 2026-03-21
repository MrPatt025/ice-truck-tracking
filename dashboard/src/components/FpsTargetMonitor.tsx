'use client'

import { useEffect, useRef } from 'react'

const TARGET_FPS = 60
const UPDATE_INTERVAL_MS = 300

function resolveTextClass(fps: number): string {
  if (fps >= 58) return 'text-emerald-300'
  if (fps >= 45) return 'text-amber-300'
  return 'text-rose-300'
}

function resolveDotClass(fps: number): string {
  if (fps >= 58) return 'bg-emerald-400'
  if (fps >= 45) return 'bg-amber-400'
  return 'bg-rose-400'
}

export default function FpsTargetMonitor() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const valueRef = useRef<HTMLSpanElement | null>(null)
  const targetRef = useRef<HTMLSpanElement | null>(null)
  const dotRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let frameId = 0
    let frameCount = 0
    let lastTime = performance.now()
    let fps = TARGET_FPS

    const updateUi = () => {
      if (!rootRef.current || !valueRef.current || !targetRef.current || !dotRef.current) {
        return
      }

      valueRef.current.textContent = `${fps.toFixed(0)} FPS`
      targetRef.current.textContent = fps >= 58 ? 'Target 60 FPS: Stable' : 'Target 60 FPS: Degraded'

      valueRef.current.className = `font-semibold ${resolveTextClass(fps)}`
      targetRef.current.className = `hidden sm:inline text-[11px] ${resolveTextClass(fps)}`
      dotRef.current.className = `h-2 w-2 rounded-full animate-pulse ${resolveDotClass(fps)}`
    }

    const tick = (now: number) => {
      frameCount += 1
      const elapsed = now - lastTime

      if (elapsed >= UPDATE_INTERVAL_MS) {
        fps = (frameCount * 1000) / elapsed
        frameCount = 0
        lastTime = now
        updateUi()
      }

      frameId = globalThis.requestAnimationFrame(tick)
    }

    updateUi()
    frameId = globalThis.requestAnimationFrame(tick)

    return () => {
      globalThis.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className='flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100'
      aria-live='polite'
      aria-label='Real-time FPS monitor'
      title='Animation loop FPS monitor'
    >
      <span ref={dotRef} className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
      <span ref={valueRef} className='font-semibold text-emerald-300'>60 FPS</span>
      <span ref={targetRef} className='hidden sm:inline text-[11px] text-emerald-300'>Target 60 FPS: Stable</span>
    </div>
  )
}

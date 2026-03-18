'use client'

import { useEffect } from 'react'
import { SharedCanvasPool } from '@/engine/gpu/sharedCanvas'
import { useTransitionStore } from '@/stores/transitionStore'
import { useCinematicCamera } from '@/hooks/useCinematicCamera'

const SHARED_CANVAS_ID = 'fleet-shared-webgl-root'

export default function SharedCanvasHost() {
  const isTransitioning = useTransitionStore(s => s.isTransitioning)
  const phase = useTransitionStore(s => s.phase)

  const pool = SharedCanvasPool.getInstance()
  const { canvas } = pool.acquire(
    SHARED_CANVAS_ID,
    {
      width: Math.max(globalThis.innerWidth, 2),
      height: Math.max(globalThis.innerHeight, 2),
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    },
    true
  )

  useCinematicCamera(canvas, isTransitioning, phase)

  useEffect(() => {
    canvas.id = SHARED_CANVAS_ID
    canvas.style.position = 'fixed'
    canvas.style.inset = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.zIndex = '-1'
    canvas.style.opacity = '0.32'
    canvas.style.willChange = 'transform, opacity, filter'
    canvas.style.pointerEvents = 'none'
    canvas.style.background =
      'radial-gradient(1200px 500px at 10% -10%, rgba(56,189,248,0.32), transparent 60%), radial-gradient(1000px 600px at 100% 20%, rgba(59,130,246,0.26), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.98) 100%)'

    const mountNode =
      document.getElementById('webgl-background-layer') ?? document.body

    if (!mountNode.contains(canvas)) {
      mountNode.appendChild(canvas)
    }

    const onResize = () => {
      canvas.width = Math.max(globalThis.innerWidth, 2)
      canvas.height = Math.max(globalThis.innerHeight, 2)
    }

    globalThis.addEventListener('resize', onResize)

    return () => {
      globalThis.removeEventListener('resize', onResize)
      pool.release(SHARED_CANVAS_ID)
    }
  }, [canvas, pool])

  return null
}

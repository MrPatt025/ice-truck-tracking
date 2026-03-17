'use client'

import { useEffect } from 'react'
import { SharedCanvasPool } from '@/engine/gpu/sharedCanvas'

const SHARED_CANVAS_ID = 'fleet-shared-webgl-root'

export default function SharedCanvasHost() {
  useEffect(() => {
    const pool = SharedCanvasPool.getInstance()
    const { canvas } = pool.acquire(
      SHARED_CANVAS_ID,
      {
        width: 2,
        height: 2,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      },
      true
    )

    canvas.id = SHARED_CANVAS_ID
    canvas.style.position = 'fixed'
    canvas.style.width = '1px'
    canvas.style.height = '1px'
    canvas.style.left = '-9999px'
    canvas.style.top = '-9999px'
    canvas.style.pointerEvents = 'none'

    if (!document.body.contains(canvas)) {
      document.body.appendChild(canvas)
    }

    return () => {
      pool.release(SHARED_CANVAS_ID)
    }
  }, [])

  return null
}

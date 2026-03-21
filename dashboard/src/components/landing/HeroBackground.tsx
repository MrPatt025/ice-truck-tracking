'use client'

import React from 'react'
import { Canvas as OffscreenCanvas } from '@react-three/offscreen'
import { useMotionValueEvent, useScroll, type MotionValue } from 'framer-motion'
import {
  startLandingTelemetrySimulation,
  useLandingTelemetryStore,
} from '@/stores/landingTelemetryStore'
import type { CinematicWorkerMessage } from '@/workers/cinematicMessages'

type HeroBackgroundProps = {
  scrollProgress?: MotionValue<number>
}

export default function HeroBackground({
  scrollProgress,
}: Readonly<HeroBackgroundProps>) {
  const [worker, setWorker] = React.useState<Worker | null>(null)
  const workerRef = React.useRef<Worker | null>(null)
  const latestScrollRef = React.useRef(0)
  const { scrollYProgress: localScrollProgress } = useScroll()
  const activeScrollProgress = scrollProgress ?? localScrollProgress

  React.useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/cinematicScene.worker.ts', import.meta.url),
      { type: 'module', name: 'cinematic-scene-worker' }
    )

    workerRef.current = worker
    setWorker(worker)

    const sendViewport = () => {
      const msg: CinematicWorkerMessage = {
        type: 'cinematic:viewport',
        payload: {
          width: Math.max(1, globalThis.innerWidth),
          height: Math.max(1, globalThis.innerHeight),
          dpr: Math.min(2, globalThis.devicePixelRatio || 1),
        },
      }
      worker.postMessage(msg)
    }

    sendViewport()
    globalThis.addEventListener('resize', sendViewport, { passive: true })

    return () => {
      globalThis.removeEventListener('resize', sendViewport)
      worker.terminate()
      workerRef.current = null
      setWorker(null)
    }
  }, [])

  React.useEffect(() => {
    const stopSimulation = startLandingTelemetrySimulation()

    const pushTelemetry = (
      values: readonly [number, number, number]
    ) => {
      if (!workerRef.current) return

      const [temperatureC, fogDensity, fogTint] = values
      const msg: CinematicWorkerMessage = {
        type: 'cinematic:telemetry',
        payload: {
          temperatureC,
          fogDensity,
          fogTint,
        },
      }

      workerRef.current.postMessage(msg)
    }

    const unsubscribe = useLandingTelemetryStore.subscribe(
      s => [s.temperatureC, s.fogDensity, s.fogTint] as const,
      pushTelemetry
    )

    const initial = useLandingTelemetryStore.getState()
    pushTelemetry([initial.temperatureC, initial.fogDensity, initial.fogTint])

    return () => {
      unsubscribe()
      stopSimulation()
    }
  }, [])

  useMotionValueEvent(activeScrollProgress, 'change', latest => {
    const normalized = Math.min(1, Math.max(0, latest))
    if (!workerRef.current) return
    if (Math.abs(normalized - latestScrollRef.current) < 0.002) return

    latestScrollRef.current = normalized
    const msg: CinematicWorkerMessage = {
      type: 'cinematic:scroll',
      payload: { progress: normalized },
    }
    workerRef.current.postMessage(msg)
  })

  return (
    <div className='absolute inset-0 -z-20 overflow-hidden rounded-3xl'>
      {worker ? (
        <OffscreenCanvas
          worker={worker}
          camera={{ position: [0.8, 1.7, 7.4], fov: 48, near: 0.1, far: 100 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          className='h-full w-full opacity-90'
          fallback={
            <div className='h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.28),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(56,189,248,0.22),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.85)_0%,rgba(2,6,23,0.98)_100%)]' />
          }
        />
      ) : null}

      <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(14,165,233,0.25),transparent_45%),linear-gradient(to_bottom,rgba(2,6,23,0.68),rgba(2,6,23,0.95))]' />
    </div>
  )
}

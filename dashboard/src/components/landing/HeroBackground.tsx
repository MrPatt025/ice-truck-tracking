'use client'

import React from 'react'
import { Canvas as OffscreenCanvas } from '@react-three/offscreen'
import {
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  type MotionValue,
} from 'framer-motion'
import {
  startFleetTelemetrySimulation,
  useFleetTelemetryStore,
  type FleetTruck,
} from '@/stores/fleetTelemetryStore'
import type {
  CinematicTransitionPhase,
  CinematicWorkerMessage,
} from '@/workers/cinematicMessages'

type HeroBackgroundProps = {
  scrollProgress?: MotionValue<number>
  transitionProgress?: MotionValue<number>
  transitionPhase?: CinematicTransitionPhase
  isTransitioning?: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function summarizeFleetTelemetry(trucks: readonly FleetTruck[]): {
  temperatureC: number
  fogDensity: number
  fogTint: number
} {
  if (trucks.length === 0) {
    return { temperatureC: -12, fogDensity: 0.4, fogTint: 0.3 }
  }

  const totalTemp = trucks.reduce((sum, truck) => sum + truck.tempC, 0)
  const warningRatio =
    trucks.filter(truck => truck.status === 'warning').length / trucks.length

  const temperatureC = Number((totalTemp / trucks.length).toFixed(2))
  const fogDensity = clamp(0.26 + warningRatio * 0.55, 0.22, 0.9)
  const fogTint = clamp((temperatureC + 24) / 26, 0, 1)

  return { temperatureC, fogDensity, fogTint }
}

export default function HeroBackground({
  scrollProgress,
  transitionProgress,
  transitionPhase = 'idle',
  isTransitioning = false,
}: Readonly<HeroBackgroundProps>) {
  const [worker, setWorker] = React.useState<Worker | null>(null)
  const workerRef = React.useRef<Worker | null>(null)
  const latestScrollRef = React.useRef(0)
  const { scrollYProgress: localScrollProgress } = useScroll()
  const activeScrollProgress = scrollProgress ?? localScrollProgress
  const fallbackTransitionProgress = useMotionValue(0)
  const activeTransitionProgress =
    transitionProgress ?? fallbackTransitionProgress

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
    const stopSimulation = startFleetTelemetrySimulation()

    const pushTelemetry = (trucks: readonly FleetTruck[]) => {
      if (!workerRef.current) return

      const { temperatureC, fogDensity, fogTint } =
        summarizeFleetTelemetry(trucks)
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

    const unsubscribe = useFleetTelemetryStore.subscribe(
      s => s.trucks,
      pushTelemetry
    )

    const initial = useFleetTelemetryStore.getState()
    pushTelemetry(initial.trucks)

    return () => {
      unsubscribe()
      stopSimulation()
    }
  }, [])

  useMotionValueEvent(activeScrollProgress, 'change', latest => {
    const normalized = clamp(latest, 0, 1)
    if (!workerRef.current) return
    if (Math.abs(normalized - latestScrollRef.current) < 0.002) return

    latestScrollRef.current = normalized
    const msg: CinematicWorkerMessage = {
      type: 'cinematic:scroll',
      payload: { progress: normalized },
    }
    workerRef.current.postMessage(msg)
  })

  useMotionValueEvent(activeTransitionProgress, 'change', latest => {
    if (!workerRef.current) return

    const msg: CinematicWorkerMessage = {
      type: 'cinematic:transition',
      payload: {
        phase: transitionPhase,
        progress: clamp(latest, 0, 1),
        isActive: isTransitioning,
      },
    }

    workerRef.current.postMessage(msg)
  })

  React.useEffect(() => {
    if (!workerRef.current) return

    const msg: CinematicWorkerMessage = {
      type: 'cinematic:transition',
      payload: {
        phase: transitionPhase,
        progress: 0,
        isActive: isTransitioning,
      },
    }

    workerRef.current.postMessage(msg)
  }, [isTransitioning, transitionPhase])

  return (
    <div className='absolute inset-0 -z-20 overflow-hidden'>
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
          className='h-full w-full opacity-95'
          fallback={
            <div className='h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.38),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(56,189,248,0.32),transparent_45%),radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.2),transparent_50%),linear-gradient(180deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,0.98)_100%)]' />
          }
        />
      ) : null}

      <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.28),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(14,165,233,0.3),transparent_45%),radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.15),transparent_52%),linear-gradient(to_bottom,rgba(2,6,23,0.66),rgba(2,6,23,0.96))]' />
      <div className='absolute inset-0 condensation-layer opacity-45' />
    </div>
  )
}

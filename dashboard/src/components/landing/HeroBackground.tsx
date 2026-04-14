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
  useFleetTelemetryStore,
  type FleetTruck,
} from '@/stores/fleetTelemetryStore'
import { useCameraSelectionStore } from '@/stores/cameraSelectionStore'
import { dispatchWsHealthEvent } from '@/lib/healthEvents'
import { parseFleetLivePacket } from '@/lib/schemas/telemetry'
import { registerCinematicWorkerWithMap } from '@/engine/orchestrator'
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

const E2E_LIGHT_MODE = process.env.NEXT_PUBLIC_E2E_LIGHT === 'true'

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

function resolveWebSocketUrl(): string {
  const configuredWs = process.env.NEXT_PUBLIC_WS_URL?.trim()
  if (configuredWs) {
    return configuredWs.replace(/^http/i, 'ws')
  }

  const apiRoot = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (apiRoot) {
    return apiRoot.replace(/^http/i, 'ws').replace(/\/+$/, '')
  }

  if (globalThis.window === undefined) {
    return 'ws://localhost:5000'
  }

  const protocol = globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${globalThis.window.location.host}`
}

function HeroBackground({
  scrollProgress,
  transitionProgress,
  transitionPhase = 'idle',
  isTransitioning = false,
}: Readonly<HeroBackgroundProps>) {
  const [worker, setWorker] = React.useState<Worker | null>(null)
  const workerRef = React.useRef<Worker | null>(null)
  const socketRef = React.useRef<WebSocket | null>(null)
  const reconnectTimerRef = React.useRef<ReturnType<
    typeof globalThis.setTimeout
  > | null>(null)
  const reconnectAttemptRef = React.useRef(0)
  const latestScrollRef = React.useRef(0)
  const { scrollYProgress: localScrollProgress } = useScroll()
  const activeScrollProgress = scrollProgress ?? localScrollProgress
  const fallbackTransitionProgress = useMotionValue(0)
  const activeTransitionProgress =
    transitionProgress ?? fallbackTransitionProgress

  React.useEffect(() => {
    if (E2E_LIGHT_MODE) return

    const worker = new Worker(
      new URL(
        '../../workers/cinematicScene.worker.bootstrap.ts',
        import.meta.url
      ),
      { type: 'module', name: 'cinematic-scene-worker' }
    )

    workerRef.current = worker
    setWorker(worker)

    // Register worker with map layer for interactive camera tracking
    registerCinematicWorkerWithMap(worker)

    const sendViewport = () => {
      const msg: CinematicWorkerMessage = {
        type: 'cinematic:viewport',
        payload: {
          width: Math.max(1, globalThis.innerWidth),
          height: Math.max(1, globalThis.innerHeight),
          dpr: Math.min(1.75, globalThis.devicePixelRatio || 1),
        },
      }
      worker.postMessage(msg)
    }

    sendViewport()
    globalThis.addEventListener('resize', sendViewport, { passive: true })

    return () => {
      globalThis.removeEventListener('resize', sendViewport)
      // Send cleanup message to worker to dispose GPU resources
      try {
        worker.postMessage('cinematic:cleanup')
      } catch {
        // Ignore if worker is already terminating
      }
      worker.terminate()
      workerRef.current = null
      setWorker(null)
      registerCinematicWorkerWithMap(null)
    }
  }, [])

  React.useEffect(() => {
    if (E2E_LIGHT_MODE) return

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
          fleet: trucks.map(truck => ({
            id: truck.id,
            latitude: truck.lat,
            longitude: truck.lon,
            heading: truck.heading,
            tempC: truck.tempC,
            status: truck.status,
          })),
        },
      }

      workerRef.current.postMessage(msg)

      // Update camera target if a truck is selected
      const selectedTruckId = useCameraSelectionStore.getState().selectedTruckId
      if (selectedTruckId) {
        const selectedTruck = trucks.find(t => t.id === selectedTruckId)
        if (selectedTruck) {
          useCameraSelectionStore.getState().updateCameraTarget(selectedTruck.lat, selectedTruck.lon)
        }
      }
    }

    const unsubscribe = useFleetTelemetryStore.subscribe(
      s => s.trucks,
      pushTelemetry
    )

    const initial = useFleetTelemetryStore.getState()
    pushTelemetry(initial.trucks)

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle camera fly-to when truck selection changes
  React.useEffect(() => {
    if (E2E_LIGHT_MODE) return

    const sendCameraFlyTo = (target: ReturnType<typeof useCameraSelectionStore.getState>['cameraTarget']) => {
      if (!workerRef.current) return

      const msg: CinematicWorkerMessage = {
        type: 'cinematic:camera-flyto',
        payload: {
          truckId: target.truckId,
          targetLatitude: target.latitude,
          targetLongitude: target.longitude,
          durationMs: target.truckId === null ? 800 : 1200,
        },
      }
      workerRef.current.postMessage(msg)
    }

    const unsubscribe = useCameraSelectionStore.subscribe(
      s => s.cameraTarget,
      sendCameraFlyTo
    )

    return () => {
      unsubscribe()
    }
  }, [])

  React.useEffect(() => {
    if (E2E_LIGHT_MODE) return

    if (globalThis.window === undefined) return

    const MAX_RECONNECT_ATTEMPTS = 8
    let closedByCleanup = false

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        globalThis.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (closedByCleanup) return

      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        dispatchWsHealthEvent({
          status: 'offline',
          source: 'landing-hero-websocket',
          attempt: reconnectAttemptRef.current,
          reason: 'retry-limit-reached',
        })
        return
      }

      clearReconnectTimer()

      const backoff = Math.min(10000, 1000 * 2 ** reconnectAttemptRef.current)
      const jitter = Math.floor(Math.random() * 250)
      const nextAttempt = reconnectAttemptRef.current + 1
      reconnectAttemptRef.current = nextAttempt

      dispatchWsHealthEvent({
        status: 'reconnecting',
        source: 'landing-hero-websocket',
        attempt: nextAttempt,
        reason: 'socket-closed',
      })

      reconnectTimerRef.current = globalThis.setTimeout(() => {
        connect()
      }, backoff + jitter)
    }

    const connect = () => {
      if (closedByCleanup) return

      try {
        socketRef.current?.close()
        const ws = new WebSocket(resolveWebSocketUrl())
        socketRef.current = ws

        ws.onopen = () => {
          reconnectAttemptRef.current = 0
          dispatchWsHealthEvent({
            status: 'connected',
            source: 'landing-hero-websocket',
          })
        }

        ws.onmessage = event => {
          let rawPayload: unknown = event.data

          if (typeof rawPayload === 'string') {
            try {
              rawPayload = JSON.parse(rawPayload)
            } catch {
              return
            }
          }

          const parsed = parseFleetLivePacket(rawPayload)
          if (!parsed) return

          useFleetTelemetryStore
            .getState()
            .applyLivePatches(parsed.trucks, parsed.mode)
        }

        ws.onerror = () => {
          dispatchWsHealthEvent({
            status: 'offline',
            source: 'landing-hero-websocket',
            reason: 'socket-error',
          })
          ws.close()
        }

        ws.onclose = () => {
          dispatchWsHealthEvent({
            status: 'offline',
            source: 'landing-hero-websocket',
            reason: 'socket-closed',
          })
          scheduleReconnect()
        }
      } catch {
        dispatchWsHealthEvent({
          status: 'offline',
          source: 'landing-hero-websocket',
          reason: 'socket-create-failed',
        })
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      closedByCleanup = true
      clearReconnectTimer()
      socketRef.current?.close()
      socketRef.current = null
      dispatchWsHealthEvent({
        status: 'offline',
        source: 'landing-hero-websocket',
        reason: 'cleanup',
      })
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
          fallback={null}
        />
      ) : null}

      {worker ? null : (
        <div className='h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.38),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(56,189,248,0.32),transparent_45%),radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.2),transparent_50%),linear-gradient(180deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,0.98)_100%)]' />
      )}

      <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.28),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(14,165,233,0.3),transparent_45%),radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.15),transparent_52%),linear-gradient(to_bottom,rgba(2,6,23,0.66),rgba(2,6,23,0.96))]' />
      <div className='absolute inset-0 condensation-layer opacity-45' />
    </div>
  )
}

export default React.memo(HeroBackground)

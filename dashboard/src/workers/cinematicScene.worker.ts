import React from 'react'
import { Deck } from '@deck.gl/core'
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers'
import { render } from '@react-three/offscreen'
import {
  isCinematicWorkerMessage,
  type CinematicWorkerMessage,
} from './cinematicMessages'
import {
    applyCameraFov,
    applyDeckViewState,
    applyScrollProgress,
    applyTelemetry,
    applyTransition,
    applyViewport,
    applyCameraFlyTo,
    applyMapMode,
    runtimeState,
} from './cinematicRuntimeState'
import { easeInOutCubic, lerp, clampUnit } from './easingFunctions'

type FleetNode = {
  id: string
  renderLongitude: number
  renderLatitude: number
  startLongitude: number
  startLatitude: number
  targetLongitude: number
  targetLatitude: number
  lerpStartAt: number
  lerpDurationMs: number
  lastPacketAt: number
  heading: number
  tempC: number
  hotspot: boolean
}

type OffscreenInitPayload = {
    drawingSurface?: OffscreenCanvas
    width?: number
    height?: number
    pixelRatio?: number
}

const TRUCK_ICON_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="22" width="34" height="18" rx="6" fill="#38bdf8"/><rect x="40" y="26" width="14" height="14" rx="3" fill="#60a5fa"/><circle cx="20" cy="44" r="6" fill="#0f172a"/><circle cx="46" cy="44" r="6" fill="#0f172a"/></svg>'
)}`

const TRUCK_ICON = {
  url: TRUCK_ICON_URI,
  width: 64,
  height: 64,
  anchorY: 56,
  mask: false,
} as const

let deckInstance: Deck | null = null
let deckUpdateQueued = false
let lastDeckRenderAt = 0
const TARGET_FRAME_MS = 1000 / 60
const FPS_DROP_THRESHOLD = 55
const FPS_RECOVER_THRESHOLD = 58
const MIN_ADAPTIVE_DPR = 0.75
const DPR_ADJUST_STEP = 0.08
const LOW_FPS_SAMPLE_COUNT = 18
const RECOVERY_SAMPLE_COUNT = 48
let fleetNodes: readonly FleetNode[] = []
const mutableFleetNodes: FleetNode[] = []
const fleetNodeById = new Map<string, FleetNode>()
const BASE_LERP_DURATION_MS = 180
const MIN_LERP_DURATION_MS = 90
const MAX_LERP_DURATION_MS = 280
const MIN_MOVEMENT_DELTA = 0.000001
const STALE_PACKET_THRESHOLD_MS = 5 * 60 * 1000
const STALE_FADE_DURATION_MS = 90 * 1000
let interpolationLoopActive = false
let baseViewportDpr = 1
let adaptiveViewportDpr = 1
let smoothedFrameMs = TARGET_FRAME_MS
let lowFpsSampleCount = 0
let recoverySampleCount = 0
let interpolationRafHandle: number | null = null
let interpolationTimeoutHandle: number | null = null
let deckFlushRafHandle: number | null = null
let deckFlushTimeoutHandle: number | null = null
let cinematicRigLoadPromise: Promise<void> | null = null

function ensureCinematicRigMounted(): Promise<void> {
  if (cinematicRigLoadPromise) {
    return cinematicRigLoadPromise
  }

  cinematicRigLoadPromise = (async () => {
    const { default: CinematicRig } = await import('./CinematicRig')
    render(React.createElement(CinematicRig))
  })().catch((error) => {
    console.error('[Cinematic Worker] Failed to load CinematicRig:', error)
  })

  return cinematicRigLoadPromise
}

function resolveStaleFactor(ageMs: number): number {
  if (ageMs <= STALE_PACKET_THRESHOLD_MS) return 0
  return clampUnit((ageMs - STALE_PACKET_THRESHOLD_MS) / STALE_FADE_DURATION_MS)
}

function mixChannel(from: number, to: number, factor: number): number {
  return Math.round(from + (to - from) * factor)
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object'
}

function isOffscreenInitMessage(
    value: unknown
): value is { type: 'init'; payload: OffscreenInitPayload } {
    if (!isRecord(value) || value.type !== 'init' || !isRecord(value.payload)) {
        return false
    }

    const payload = value.payload
    const hasCanvas =
        'drawingSurface' in payload && payload.drawingSurface instanceof OffscreenCanvas

    return hasCanvas
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function updateAdaptiveDpr(nextDpr: number): void {
  const boundedDpr = clamp(nextDpr, MIN_ADAPTIVE_DPR, baseViewportDpr)
  if (Math.abs(boundedDpr - adaptiveViewportDpr) < 0.01) return

  adaptiveViewportDpr = boundedDpr
  applyViewport({
    ...runtimeState.viewport,
    dpr: adaptiveViewportDpr,
  })
}

function observeFramePacing(elapsedMs: number): void {
  smoothedFrameMs = smoothedFrameMs * 0.88 + elapsedMs * 0.12
  const smoothedFps = 1000 / Math.max(1, smoothedFrameMs)

  // Frame profiling: log if FPS drops below 60 (frame > 16.6ms)
  const TARGET_FRAME_MS_THRESHOLD = 16.6;
  if (elapsedMs > TARGET_FRAME_MS_THRESHOLD && typeof console.warn === 'function') {
    console.warn(
      `[🎬 Frame Drop] Frame took ${elapsedMs.toFixed(2)}ms (${(1000 / elapsedMs).toFixed(1)} FPS) | Smoothed: ${smoothedFps.toFixed(1)} FPS | DPR: ${adaptiveViewportDpr.toFixed(2)}`
    );
  }

  if (smoothedFps < FPS_DROP_THRESHOLD) {
    lowFpsSampleCount += 1
    recoverySampleCount = 0
    if (lowFpsSampleCount >= LOW_FPS_SAMPLE_COUNT) {
      updateAdaptiveDpr(adaptiveViewportDpr - DPR_ADJUST_STEP)
      lowFpsSampleCount = 0
    }
    return
  }

  lowFpsSampleCount = 0
  if (smoothedFps > FPS_RECOVER_THRESHOLD && adaptiveViewportDpr < baseViewportDpr) {
    recoverySampleCount += 1
    if (recoverySampleCount >= RECOVERY_SAMPLE_COUNT) {
      updateAdaptiveDpr(adaptiveViewportDpr + DPR_ADJUST_STEP)
      recoverySampleCount = 0
    }
    return
  }

  recoverySampleCount = 0
}

function buildDeckLayers() {
  const now = performance.now()
    const thermalLimit = Math.max(-3, runtimeState.telemetry.temperatureC - 1)

    const iconLayer = new IconLayer<FleetNode>({
        id: 'cinematic-fleet-icons',
      data: fleetNodes,
      pickable: false,
      sizeScale: 10,
      billboard: true,
      alphaCutoff: 0.02,
      getPosition: node => [node.renderLongitude, node.renderLatitude],
      getSize: node => (node.hotspot ? 3.2 : 2.5),
      getAngle: node => node.heading,
      getIcon: () => TRUCK_ICON,
        getColor: node => {
          const staleFactor = resolveStaleFactor(now - node.lastPacketAt)
          const base = node.hotspot
            ? [125, 211, 252, 232]
            : [56, 189, 248, 220]

          return [
            mixChannel(base[0], 148, staleFactor),
            mixChannel(base[1], 163, staleFactor),
            mixChannel(base[2], 184, staleFactor),
            mixChannel(base[3], 132, staleFactor),
          ]
        },
      updateTriggers: {
          getSize: runtimeState.scroll,
          getColor: runtimeState.telemetry.temperatureC,
      },
  })

      const auraLayer = new ScatterplotLayer<FleetNode>({
        id: 'cinematic-fleet-aura',
        data: fleetNodes,
        pickable: false,
        stroked: false,
        radiusUnits: 'meters',
        radiusMinPixels: 1,
        radiusMaxPixels: 12,
        getPosition: node => [node.renderLongitude, node.renderLatitude],
        getRadius: node => (node.hotspot ? 58 : 34),
        getFillColor: node => {
          const staleFactor = resolveStaleFactor(now - node.lastPacketAt)
          const base = node.hotspot
            ? [56, 189, 248, 118]
            : [14, 165, 233, 85]

          return [
            mixChannel(base[0], 148, staleFactor),
            mixChannel(base[1], 163, staleFactor),
            mixChannel(base[2], 184, staleFactor),
            mixChannel(base[3], 54, staleFactor),
          ]
        },
        updateTriggers: {
          getRadius: runtimeState.scroll,
          getFillColor: runtimeState.telemetry.fogDensity,
        },
      })

    const scatterplotLayer = new ScatterplotLayer<FleetNode>({
        id: 'cinematic-thermal-hotspots',
      data: fleetNodes,
      pickable: false,
      stroked: false,
      radiusUnits: 'meters',
      radiusMinPixels: 2,
      radiusMaxPixels: 22,
        getPosition: node => [node.renderLongitude, node.renderLatitude],
      getRadius: node =>
          node.tempC >= thermalLimit
              ? 140 + Math.max(0, node.tempC + 10) * 11
              : 0,
      getFillColor: node => {
          if (node.tempC > 2) return [255, 84, 84, 165]
          if (node.tempC > -1) return [245, 158, 11, 140]
          return [34, 211, 238, 110]
      },
      updateTriggers: {
          getRadius: runtimeState.scroll,
          getFillColor: runtimeState.telemetry.temperatureC,
          getPosition: runtimeState.telemetry.fogDensity,
      },
  })

    return [auraLayer, iconLayer, scatterplotLayer]
}

/**
 * Dispose Deck.gl instance and release GPU resources.
 * Critical for long-running sessions to prevent memory leaks.
 */
function disposeDeck(): void {
  if (!deckInstance) return

  try {
    // Dispose layers first (they may have GPU buffers)
    const layers = deckInstance.props.layers ?? []
    type DisposableLayer = { dispose?: () => void }
    for (const layer of layers) {
      const disposableLayer = layer as DisposableLayer
      disposableLayer.dispose?.()
    }

    // Dispose the Deck instance (finalize WebGL state)
    if (typeof deckInstance.finalize === 'function') {
      deckInstance.finalize()
    }
  } catch {
    // Gracefully ignore disposal errors in edge cases
  }

  deckInstance = null
}

function cancelScheduledWork(): void {
  if (
    interpolationRafHandle !== null &&
    typeof globalThis.cancelAnimationFrame === 'function'
  ) {
    globalThis.cancelAnimationFrame(interpolationRafHandle)
  }
  if (interpolationTimeoutHandle !== null) {
    globalThis.clearTimeout(interpolationTimeoutHandle)
  }
  if (
    deckFlushRafHandle !== null &&
    typeof globalThis.cancelAnimationFrame === 'function'
  ) {
    globalThis.cancelAnimationFrame(deckFlushRafHandle)
  }
  if (deckFlushTimeoutHandle !== null) {
    globalThis.clearTimeout(deckFlushTimeoutHandle)
  }

  interpolationRafHandle = null
  interpolationTimeoutHandle = null
  deckFlushRafHandle = null
  deckFlushTimeoutHandle = null
}

function hasMeaningfulMovement(
  fromLongitude: number,
  fromLatitude: number,
  toLongitude: number,
  toLatitude: number
): boolean {
  return (
    Math.abs(fromLongitude - toLongitude) > MIN_MOVEMENT_DELTA ||
    Math.abs(fromLatitude - toLatitude) > MIN_MOVEMENT_DELTA
  )
}

function getLerpDurationMs(now: number, previousPacketAt: number): number {
  if (!Number.isFinite(previousPacketAt) || previousPacketAt <= 0) {
    return BASE_LERP_DURATION_MS
  }

  const packetGap = Math.max(0, now - previousPacketAt)
  return Math.min(
    MAX_LERP_DURATION_MS,
    Math.max(MIN_LERP_DURATION_MS, packetGap * 0.9)
  )
}

function advanceFleetInterpolation(now: number): boolean {
  let hasActiveInterpolation = false

  for (const node of mutableFleetNodes) {
    const elapsed = now - node.lerpStartAt
    if (elapsed <= 0) {
      hasActiveInterpolation = true
      continue
    }

    if (elapsed >= node.lerpDurationMs) {
      node.renderLongitude = node.targetLongitude
      node.renderLatitude = node.targetLatitude
      continue
    }

    hasActiveInterpolation = true
    const progress = elapsed / node.lerpDurationMs
    node.renderLongitude =
      node.startLongitude + (node.targetLongitude - node.startLongitude) * progress
    node.renderLatitude =
      node.startLatitude + (node.targetLatitude - node.startLatitude) * progress
  }

  return hasActiveInterpolation
}

const OVERVIEW_CAMERA = {
  longitude: 100.5018,
  latitude: 13.7563,
  zoom: 12,
  pitch: 34,
  bearing: 0,
} as const

const TRACKING_CAMERA = {
  zoom: 15.5,
  pitch: 45,
  bearing: 0,
} as const

function hasFlyToTarget(): boolean {
  const flyTo = runtimeState.cameraFlyTo
  return flyTo.targetLatitude !== null && flyTo.targetLongitude !== null
}

function applyTrackingCameraAtTarget(): void {
  const flyTo = runtimeState.cameraFlyTo
  if (!hasFlyToTarget()) return

  applyDeckViewState({
    longitude: flyTo.targetLongitude!,
    latitude: flyTo.targetLatitude!,
    zoom: TRACKING_CAMERA.zoom,
    pitch: TRACKING_CAMERA.pitch,
    bearing: TRACKING_CAMERA.bearing,
  })
}

function applyCompletedFlyToState(): void {
  const flyTo = runtimeState.cameraFlyTo
  flyTo.isAnimating = false

  if (flyTo.truckId === null) {
    applyDeckViewState(OVERVIEW_CAMERA)
    return
  }

  applyTrackingCameraAtTarget()
}

function resolveAnimatedLongitude(eased: number): number | null {
  const flyTo = runtimeState.cameraFlyTo
  if (flyTo.startLongitude === null) return null
  if (flyTo.truckId === null) {
    return lerp(flyTo.startLongitude, OVERVIEW_CAMERA.longitude, eased)
  }
  if (flyTo.targetLongitude === null) return flyTo.startLongitude
  return lerp(flyTo.startLongitude, flyTo.targetLongitude, eased)
}

function resolveAnimatedLatitude(eased: number): number | null {
  const flyTo = runtimeState.cameraFlyTo
  if (flyTo.startLatitude === null) return null
  if (flyTo.truckId === null) {
    return lerp(flyTo.startLatitude, OVERVIEW_CAMERA.latitude, eased)
  }
  if (flyTo.targetLatitude === null) return flyTo.startLatitude
  return lerp(flyTo.startLatitude, flyTo.targetLatitude, eased)
}

function resolveAnimatedZoom(eased: number): number | null {
  const flyTo = runtimeState.cameraFlyTo
  if (flyTo.startZoom === null) return null
  const targetZoom = flyTo.truckId === null ? OVERVIEW_CAMERA.zoom : TRACKING_CAMERA.zoom
  return lerp(flyTo.startZoom, targetZoom, eased)
}

function resolveAnimatedPitch(eased: number): number | null {
  const flyTo = runtimeState.cameraFlyTo
  if (flyTo.startPitch === null) return null
  const targetPitch = flyTo.truckId === null ? OVERVIEW_CAMERA.pitch : TRACKING_CAMERA.pitch
  return lerp(flyTo.startPitch, targetPitch, eased)
}

function applyAnimatedFlyToState(eased: number): void {
  const nextLongitude = resolveAnimatedLongitude(eased)
  const nextLatitude = resolveAnimatedLatitude(eased)
  const nextZoom = resolveAnimatedZoom(eased)
  const nextPitch = resolveAnimatedPitch(eased)

  if (
    nextLongitude === null ||
    nextLatitude === null ||
    nextZoom === null ||
    nextPitch === null
  ) {
    return
  }

  applyDeckViewState({
    longitude: nextLongitude,
    latitude: nextLatitude,
    zoom: nextZoom,
    pitch: nextPitch,
  })
}

/**
 * Advance camera fly-to animation.
 * Returns true if animation is still in progress.
 */
function advanceCameraFlyTo(now: number): boolean {
  const flyTo = runtimeState.cameraFlyTo
  if (!flyTo.isAnimating || !flyTo.startedAt) {
    // If a truck is selected but not animating, track its position
    if (flyTo.truckId !== null && hasFlyToTarget()) {
      applyTrackingCameraAtTarget()
      scheduleDeckSceneUpdate()
    }
    return false
  }

  const elapsed = now - flyTo.startedAt
  if (elapsed >= flyTo.durationMs) {
    applyCompletedFlyToState()
    return false
  }

  // Animation in progress - interpolate camera position
  const progress = clampUnit(elapsed / flyTo.durationMs)
  const eased = easeInOutCubic(progress)
  applyAnimatedFlyToState(eased)

  return true
}

function runInterpolationLoop(): void {
  if (interpolationLoopActive) return
  interpolationLoopActive = true

  const tick = () => {
    if (!deckInstance) {
      interpolationLoopActive = false
      return
    }

    const now = performance.now()
    const hasActiveFleetInterpolation = advanceFleetInterpolation(now)
    const hasActiveCameraAnimation = advanceCameraFlyTo(now)
    updateDeckScene()

    if (!hasActiveFleetInterpolation && !hasActiveCameraAnimation) {
      interpolationLoopActive = false
      return
    }

    if (typeof globalThis.requestAnimationFrame === 'function') {
      interpolationRafHandle = globalThis.requestAnimationFrame(() => {
        interpolationRafHandle = null
        tick()
      })
      return
    }

    interpolationTimeoutHandle = globalThis.setTimeout(() => {
      interpolationTimeoutHandle = null
      tick()
    }, TARGET_FRAME_MS)
  }

  tick()
}

  function updateFleetNodes(
    fleet: ReadonlyArray<{
      id: string
      latitude: number
      longitude: number
      heading: number
      tempC: number
      status: string
    }>
  ): void {
    const now = performance.now()
    const seenIds = new Set<string>()

    for (const truck of fleet) {
      seenIds.add(truck.id)

      const hotspot = truck.status === 'warning' || truck.tempC > -1
      const existingNode = fleetNodeById.get(truck.id)

      if (existingNode) {
        const nextLongitude = truck.longitude
        const nextLatitude = truck.latitude

        if (
          hasMeaningfulMovement(
            existingNode.targetLongitude,
            existingNode.targetLatitude,
            nextLongitude,
            nextLatitude
          )
        ) {
          existingNode.startLongitude = existingNode.renderLongitude
          existingNode.startLatitude = existingNode.renderLatitude
          existingNode.targetLongitude = nextLongitude
          existingNode.targetLatitude = nextLatitude
          existingNode.lerpStartAt = now
          existingNode.lerpDurationMs = getLerpDurationMs(
            now,
            existingNode.lastPacketAt
          )
        }

        existingNode.lastPacketAt = now
        existingNode.heading = truck.heading
        existingNode.tempC = truck.tempC
        existingNode.hotspot = hotspot
        continue
      }

      const nextNode: FleetNode = {
        id: truck.id,
        renderLongitude: truck.longitude,
        renderLatitude: truck.latitude,
        startLongitude: truck.longitude,
        startLatitude: truck.latitude,
        targetLongitude: truck.longitude,
        targetLatitude: truck.latitude,
        lerpStartAt: now,
        lerpDurationMs: BASE_LERP_DURATION_MS,
        lastPacketAt: now,
        heading: truck.heading,
        tempC: truck.tempC,
        hotspot,
      }

      mutableFleetNodes.push(nextNode)
      fleetNodeById.set(nextNode.id, nextNode)
    }

    for (let index = mutableFleetNodes.length - 1; index >= 0; index -= 1) {
      const node = mutableFleetNodes[index]
      if (seenIds.has(node.id)) continue

      mutableFleetNodes.splice(index, 1)
      fleetNodeById.delete(node.id)
    }

    fleetNodes = mutableFleetNodes
  }

function updateDeckScene(): void {
  if (!deckInstance) return

  deckInstance.setProps({
    width: runtimeState.viewport.width,
    height: runtimeState.viewport.height,
    useDevicePixels: adaptiveViewportDpr,
      viewState: runtimeState.deckViewState,
      layers: buildDeckLayers(),
  })
}

function scheduleDeckSceneUpdate(): void {
  if (deckUpdateQueued) return
  deckUpdateQueued = true

  const flush = () => {
    const now = performance.now()
    const elapsed = now - lastDeckRenderAt

    if (elapsed < TARGET_FRAME_MS) {
      deckFlushTimeoutHandle = globalThis.setTimeout(() => {
        deckFlushTimeoutHandle = null
        flush()
      }, Math.max(1, TARGET_FRAME_MS - elapsed))
      return
    }

  observeFramePacing(elapsed)
    lastDeckRenderAt = now
    deckUpdateQueued = false
    updateDeckScene()
  }

  if (typeof globalThis.requestAnimationFrame === 'function') {
    deckFlushRafHandle = globalThis.requestAnimationFrame(() => {
      deckFlushRafHandle = null
      flush()
    })
    return
  }

  deckFlushTimeoutHandle = globalThis.setTimeout(() => {
    deckFlushTimeoutHandle = null
    flush()
  }, TARGET_FRAME_MS)
}

function syncCamera(progress: number): void {
    const clamped = Math.min(1, Math.max(0, progress))
    const fov = 48 + clamped * 8
    const pitch = 34 + clamped * 18
    const zoom = 12 - clamped * 2.1
    const bearing = clamped * 8

    applyCameraFov(fov)
    applyDeckViewState({ pitch, zoom, bearing })
    scheduleDeckSceneUpdate()
}

function initializeDeck(payload: OffscreenInitPayload): void {
    if (deckInstance || !payload.drawingSurface) return

    const gl = payload.drawingSurface.getContext('webgl2', {
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
    })

    if (!gl) return

    applyViewport({
        width: payload.width ?? runtimeState.viewport.width,
        height: payload.height ?? runtimeState.viewport.height,
        dpr: payload.pixelRatio ?? runtimeState.viewport.dpr,
    })
  baseViewportDpr = runtimeState.viewport.dpr
  adaptiveViewportDpr = baseViewportDpr

  deckInstance = new Deck({
      id: 'cinematic-deck-dual-renderer',
      canvas: payload.drawingSurface as unknown as HTMLCanvasElement,
      gl,
      controller: false,
    _animate: false,
    width: runtimeState.viewport.width,
    height: runtimeState.viewport.height,
    useDevicePixels: runtimeState.viewport.dpr,
      viewState: runtimeState.deckViewState,
      layers: buildDeckLayers(),
      onError: () => {
      // Keep worker resilient when GPU drivers are unstable.
    },
  })

  scheduleDeckSceneUpdate()
}

function handleCleanupMessage(): void {
  cancelScheduledWork()
  deckUpdateQueued = false
  interpolationLoopActive = false
  lowFpsSampleCount = 0
  recoverySampleCount = 0
  smoothedFrameMs = TARGET_FRAME_MS
  disposeDeck()
  mutableFleetNodes.length = 0
  fleetNodeById.clear()
  fleetNodes = []
}

function handleWorkerMessage(data: CinematicWorkerMessage): void {
  switch (data.type) {
    case 'cinematic:scroll': {
      applyScrollProgress(data.payload.progress)
      syncCamera(data.payload.progress)
      return
    }

    case 'cinematic:telemetry': {
      applyTelemetry(data.payload)

      if (Array.isArray(data.payload.fleet)) {
        updateFleetNodes(data.payload.fleet)
        runInterpolationLoop()
      }

      scheduleDeckSceneUpdate()
      return
    }

    case 'cinematic:transition': {
      applyTransition(data.payload)
      return
    }

    case 'cinematic:camera-flyto': {
      applyCameraFlyTo(data.payload)
      runInterpolationLoop()
      return
    }

    case 'cinematic:viewport': {
      applyViewport(data.payload)
      baseViewportDpr = runtimeState.viewport.dpr
      adaptiveViewportDpr = Math.min(adaptiveViewportDpr, baseViewportDpr)
      scheduleDeckSceneUpdate()
      return
    }

    case 'cinematic:map-mode': {
      applyMapMode(data.payload)
      scheduleDeckSceneUpdate()
      return
    }

    default: {
      return
    }
  }
}

// OffscreenCanvas communication is same-origin and guarded by origin verification.
self.addEventListener('message', (event: MessageEvent<unknown>) => {
    const messageOrigin = event.origin || self.location.origin
    if (event.origin && messageOrigin !== self.location.origin) {
    return
  }

    if (isOffscreenInitMessage(event.data)) {
        initializeDeck(event.data.payload)
    return
  }

  if (!isCinematicWorkerMessage(event.data)) {
    if (event.data === 'cinematic:cleanup') {
      handleCleanupMessage()
    }
    return
  }

  handleWorkerMessage(event.data)
})

/**
 * Initialize R3F rendering in worker — handles CinematicRig geometry and material lifecycle.
 * Calling render() registers the effect cleanup automatically with the React lifecycle.
 */
void ensureCinematicRigMounted()

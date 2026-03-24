import React from 'react'
import { Deck } from '@deck.gl/core'
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers'
import { render } from '@react-three/offscreen'
import CinematicRig from './CinematicRig'
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
    runtimeState,
} from './cinematicRuntimeState'

type FleetNode = {
  id: string
  longitude: number
  latitude: number
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
let fleetNodes: readonly FleetNode[] = []
const mutableFleetNodes: FleetNode[] = []

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

function buildDeckLayers() {
    const thermalLimit = Math.max(-3, runtimeState.telemetry.temperatureC - 1)

    const iconLayer = new IconLayer<FleetNode>({
        id: 'cinematic-fleet-icons',
      data: fleetNodes,
      pickable: false,
      sizeScale: 10,
      billboard: true,
      alphaCutoff: 0.02,
      getPosition: node => [node.longitude, node.latitude],
      getSize: node => (node.hotspot ? 3.2 : 2.5),
      getAngle: node => node.heading,
      getIcon: () => TRUCK_ICON,
      updateTriggers: {
          getSize: runtimeState.scroll,
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
      getPosition: node => [node.longitude, node.latitude],
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

    return [iconLayer, scatterplotLayer]
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
    const targetSize = fleet.length

    for (let index = 0; index < targetSize; index += 1) {
      const truck = fleet[index]
      const existingNode = mutableFleetNodes[index]
      const hotspot = truck.status === 'warning' || truck.tempC > -1

      if (existingNode) {
        existingNode.id = truck.id
        existingNode.latitude = truck.latitude
        existingNode.longitude = truck.longitude
        existingNode.heading = truck.heading
        existingNode.tempC = truck.tempC
        existingNode.hotspot = hotspot
        continue
      }

      mutableFleetNodes[index] = {
        id: truck.id,
        latitude: truck.latitude,
        longitude: truck.longitude,
        heading: truck.heading,
        tempC: truck.tempC,
        hotspot,
      }
    }

    mutableFleetNodes.length = targetSize
    fleetNodes = mutableFleetNodes
  }

function updateDeckScene(): void {
  if (!deckInstance) return

  deckInstance.setProps({
    width: runtimeState.viewport.width,
    height: runtimeState.viewport.height,
    useDevicePixels: runtimeState.viewport.dpr,
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
      globalThis.setTimeout(flush, Math.max(1, TARGET_FRAME_MS - elapsed))
      return
    }

    lastDeckRenderAt = now
    deckUpdateQueued = false
    updateDeckScene()
  }

  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => flush())
    return
  }

  globalThis.setTimeout(flush, TARGET_FRAME_MS)
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

  if (!isCinematicWorkerMessage(event.data)) return

  const data: CinematicWorkerMessage = event.data

  if (data.type === 'cinematic:scroll') {
      applyScrollProgress(data.payload.progress)
      syncCamera(data.payload.progress)
    return
  }

  if (data.type === 'cinematic:telemetry') {
    applyTelemetry(data.payload)

    if (Array.isArray(data.payload.fleet)) {
      updateFleetNodes(data.payload.fleet)
    }

    scheduleDeckSceneUpdate()
    return
  }

  if (data.type === 'cinematic:transition') {
      applyTransition(data.payload)
    return
  }

    applyViewport(data.payload)
    scheduleDeckSceneUpdate()
})

render(React.createElement(CinematicRig))

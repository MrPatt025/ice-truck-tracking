import type {
  CinematicTelemetryPayload,
  CinematicTransitionPayload,
  CinematicTransitionPhase,
  CinematicViewportPayload,
  CinematicCameraFlyToPayload,
  CinematicMapModePayload,
} from './cinematicMessages'

export interface DeckViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

export interface CinematicTransitionState {
  phase: CinematicTransitionPhase
  progress: number
    isActive: boolean
}

export interface CinematicCameraFlyToState {
  truckId: string | null
  targetLatitude: number | null
  targetLongitude: number | null
  startLatitude: number | null
  startLongitude: number | null
  startZoom: number | null
  startPitch: number | null
  durationMs: number
  startedAt: number | null
  isAnimating: boolean
}

export interface CinematicMapModeState {
  mode: 'live' | 'historical'
  blend: number
}

export type CinematicRuntimeState = {
  scroll: number
    cameraFov: number
  telemetry: CinematicTelemetryPayload
  viewport: CinematicViewportPayload
    deckViewState: DeckViewState
  transition: CinematicTransitionState
  cameraFlyTo: CinematicCameraFlyToState
  mapMode: CinematicMapModeState
}

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value))

const defaultDeckViewState: DeckViewState = {
    longitude: 100.5018,
    latitude: 13.7563,
    zoom: 12,
    pitch: 34,
    bearing: 0,
}

export const runtimeState: CinematicRuntimeState = {
  scroll: 0,
    cameraFov: 48,
  telemetry: {
    temperatureC: -14,
    fogDensity: 0.4,
    fogTint: 0.25,
  },
  viewport: {
    width: 1920,
    height: 1080,
    dpr: 1,
  },
    deckViewState: defaultDeckViewState,
  transition: {
    phase: 'idle',
    progress: 0,
      isActive: false,
  },
  cameraFlyTo: {
    truckId: null,
    targetLatitude: null,
    targetLongitude: null,
    startLatitude: null,
    startLongitude: null,
    startZoom: null,
    startPitch: null,
    durationMs: 0,
    startedAt: null,
    isAnimating: false,
  },
  mapMode: {
    mode: 'live',
    blend: 0,
  },
}

export function applyScrollProgress(progress: number): void {
    runtimeState.scroll = clamp(progress, 0, 1)
}

export function applyCameraFov(fov: number): void {
    runtimeState.cameraFov = clamp(fov, 36, 68)
}

export function applyTelemetry(payload: CinematicTelemetryPayload): void {
    runtimeState.telemetry = {
        temperatureC: payload.temperatureC,
        fogDensity: clamp(payload.fogDensity, 0, 1),
        fogTint: clamp(payload.fogTint, 0, 1),
  }
}

export function applyViewport(payload: CinematicViewportPayload): void {
  runtimeState.viewport = {
      width: Math.max(1, Math.round(payload.width)),
      height: Math.max(1, Math.round(payload.height)),
      dpr: clamp(payload.dpr, 0.5, 2),
  }
}

export function applyTransition(payload: CinematicTransitionPayload): void {
  runtimeState.transition = {
    phase: payload.phase,
        progress: clamp(payload.progress, 0, 1),
        isActive: payload.isActive,
    }
}

export function applyDeckViewState(next: Partial<DeckViewState>): void {
    runtimeState.deckViewState = {
        ...runtimeState.deckViewState,
        ...next,
  }
}

export function applyMapMode(payload: CinematicMapModePayload): void {
  runtimeState.mapMode = {
    mode: payload.mode,
    blend: clamp(payload.blend, 0, 1),
  }
}

export function applyCameraFlyTo(payload: CinematicCameraFlyToPayload): void {
  if (payload.truckId === null) {
    // Deselecting truck - set initial state for return to overview
    runtimeState.cameraFlyTo = {
      truckId: null,
      targetLatitude: null,
      targetLongitude: null,
      startLatitude: runtimeState.deckViewState.latitude,
      startLongitude: runtimeState.deckViewState.longitude,
      startZoom: runtimeState.deckViewState.zoom,
      startPitch: runtimeState.deckViewState.pitch,
      durationMs: 800, // Return to overview takes slightly longer
      startedAt: performance.now(),
      isAnimating: true,
    }
  } else {
    // Selecting truck - set initial state for fly-to
    runtimeState.cameraFlyTo = {
      truckId: payload.truckId,
      targetLatitude: payload.targetLatitude,
      targetLongitude: payload.targetLongitude,
      startLatitude: runtimeState.deckViewState.latitude,
      startLongitude: runtimeState.deckViewState.longitude,
      startZoom: runtimeState.deckViewState.zoom,
      startPitch: runtimeState.deckViewState.pitch,
      durationMs: payload.durationMs,
      startedAt: performance.now(),
      isAnimating: true,
    }
  }
}

/**
 * Update camera fly-to animation progress
 * Called each render frame to animate camera to target truck or back to overview
 * Uses easeInOutCubic for smooth acceleration/deceleration (60 FPS safe)
 *
 * @param now Current timestamp in milliseconds
 */
export function updateCameraFlyToProgress(
  now: number,
  easeFunction: (t: number) => number
): void {
  const { cameraFlyTo } = runtimeState
  if (!cameraFlyTo.isAnimating || cameraFlyTo.startedAt === null) return
  if (
    cameraFlyTo.targetLatitude === null
    || cameraFlyTo.targetLongitude === null
    || cameraFlyTo.startLatitude === null
    || cameraFlyTo.startLongitude === null
    || cameraFlyTo.startZoom === null
    || cameraFlyTo.startPitch === null
  ) {
    cameraFlyTo.isAnimating = false
    cameraFlyTo.startedAt = null
    return
  }

  const elapsed = now - cameraFlyTo.startedAt
  const progress = clamp(elapsed / cameraFlyTo.durationMs, 0, 1)
  const eased = easeFunction(progress)

  // Determine target zoom and pitch based on whether we're tracking a truck or returning to overview
  const isTrackingTruck = cameraFlyTo.truckId !== null
  const targetZoom = isTrackingTruck ? 16 : 12 // Close zoom for truck, wide for overview
  const targetPitch = isTrackingTruck ? 50 : 34 // Higher pitch for truck view

  // Interpolate camera position smoothly
  const nextLatitude =
    cameraFlyTo.startLatitude +
    (cameraFlyTo.targetLatitude - cameraFlyTo.startLatitude) * eased
  const nextLongitude =
    cameraFlyTo.startLongitude +
    (cameraFlyTo.targetLongitude - cameraFlyTo.startLongitude) * eased
  const nextZoom =
    cameraFlyTo.startZoom +
    (targetZoom - cameraFlyTo.startZoom) * eased
  const nextPitch =
    cameraFlyTo.startPitch +
    (targetPitch - cameraFlyTo.startPitch) * eased

  applyDeckViewState({
    latitude: nextLatitude,
    longitude: nextLongitude,
    zoom: nextZoom,
    pitch: nextPitch,
  })

  // Mark animation as complete
  if (progress >= 1) {
    cameraFlyTo.isAnimating = false
    cameraFlyTo.startedAt = null
  }
}

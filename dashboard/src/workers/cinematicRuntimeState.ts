import type {
  CinematicTelemetryPayload,
  CinematicTransitionPayload,
  CinematicTransitionPhase,
  CinematicViewportPayload,
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

export type CinematicRuntimeState = {
  scroll: number
    cameraFov: number
  telemetry: CinematicTelemetryPayload
  viewport: CinematicViewportPayload
    deckViewState: DeckViewState
  transition: CinematicTransitionState
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

import type {
  CinematicTelemetryPayload,
  CinematicViewportPayload,
} from './cinematicMessages'

export type CinematicRuntimeState = {
  scroll: number
  telemetry: CinematicTelemetryPayload
  viewport: CinematicViewportPayload
}

export const runtimeState: CinematicRuntimeState = {
  scroll: 0,
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
}

export interface CinematicTelemetryPayload {
  temperatureC: number
  fogDensity: number
  fogTint: number
}

export interface CinematicViewportPayload {
  width: number
  height: number
  dpr: number
}

export interface CinematicScrollPayload {
  progress: number
}

export type CinematicWorkerMessage =
  | { type: 'cinematic:telemetry'; payload: CinematicTelemetryPayload }
  | { type: 'cinematic:viewport'; payload: CinematicViewportPayload }
  | { type: 'cinematic:scroll'; payload: CinematicScrollPayload }

export function isCinematicWorkerMessage(
  value: unknown
): value is CinematicWorkerMessage {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { type?: unknown }
  return (
    candidate.type === 'cinematic:telemetry' ||
    candidate.type === 'cinematic:viewport' ||
    candidate.type === 'cinematic:scroll'
  )
}

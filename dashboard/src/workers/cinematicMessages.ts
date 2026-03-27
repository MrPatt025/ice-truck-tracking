export interface CinematicFleetTruckPayload {
  id: string
  latitude: number
  longitude: number
  heading: number
  tempC: number
  status: 'active' | 'idle' | 'warning'
}

export interface CinematicTelemetryPayload {
  temperatureC: number
  fogDensity: number
  fogTint: number
  fleet?: readonly CinematicFleetTruckPayload[]
}

export interface CinematicViewportPayload {
  width: number
  height: number
  dpr: number
}

export interface CinematicScrollPayload {
  progress: number
}

export type CinematicTransitionPhase =
  | 'idle'
    | 'intro'
  | 'outro'
    | 'handoff'

export interface CinematicTransitionPayload {
  phase: CinematicTransitionPhase
  progress: number
    isActive: boolean
}

export interface CinematicCameraFlyToPayload {
  truckId: string | null
  targetLatitude: number | null
  targetLongitude: number | null
  durationMs: number
}

export interface CinematicMapModePayload {
  mode: 'live' | 'historical'
  blend: number
}

export type CinematicWorkerMessage =
  | { type: 'cinematic:telemetry'; payload: CinematicTelemetryPayload }
  | { type: 'cinematic:viewport'; payload: CinematicViewportPayload }
  | { type: 'cinematic:scroll'; payload: CinematicScrollPayload }
  | { type: 'cinematic:transition'; payload: CinematicTransitionPayload }
  | { type: 'cinematic:camera-flyto'; payload: CinematicCameraFlyToPayload }
  | { type: 'cinematic:map-mode'; payload: CinematicMapModePayload }

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object'
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

const transitionPhases: ReadonlySet<CinematicTransitionPhase> = new Set([
  'idle',
  'intro',
  'outro',
  'handoff',
])

function isTransitionPhase(value: unknown): value is CinematicTransitionPhase {
  return (
    typeof value === 'string' &&
    transitionPhases.has(value as CinematicTransitionPhase)
  )
}

function isTelemetryPayload(value: unknown): value is CinematicTelemetryPayload {
    if (!isRecord(value)) return false
    const fleet = value.fleet

    if (fleet !== undefined) {
      if (!Array.isArray(fleet)) return false

      const hasInvalidNode = fleet.some(node => {
        if (!isRecord(node)) return true
        if (typeof node.id !== 'string' || node.id.length === 0) return true
        if (!isFiniteNumber(node.latitude) || !isFiniteNumber(node.longitude)) return true
        if (!isFiniteNumber(node.heading) || !isFiniteNumber(node.tempC)) return true
        return (
          node.status !== 'active' && node.status !== 'idle' && node.status !== 'warning'
        )
      })

      if (hasInvalidNode) return false
    }

    return (
        isFiniteNumber(value.temperatureC) &&
        isFiniteNumber(value.fogDensity) &&
        isFiniteNumber(value.fogTint)
    )
}

function isViewportPayload(value: unknown): value is CinematicViewportPayload {
    if (!isRecord(value)) return false
    return (
        isFiniteNumber(value.width) &&
        isFiniteNumber(value.height) &&
        isFiniteNumber(value.dpr)
    )
}

function isScrollPayload(value: unknown): value is CinematicScrollPayload {
    if (!isRecord(value)) return false
    return isFiniteNumber(value.progress)
}

function isTransitionPayload(value: unknown): value is CinematicTransitionPayload {
    if (!isRecord(value)) return false
    return (
        isTransitionPhase(value.phase) &&
        isFiniteNumber(value.progress) &&
        typeof value.isActive === 'boolean'
    )
}

function isCameraFlyToPayload(value: unknown): value is CinematicCameraFlyToPayload {
    if (!isRecord(value)) return false

    const truckId = value.truckId
    const latitude = value.targetLatitude
    const longitude = value.targetLongitude
    const durationMs = value.durationMs

    // If deselecting (truckId is null), latitude, longitude, and durationMs should be null
    if (truckId === null) {
        return latitude === null && longitude === null && durationMs === 0
    }

    // If selecting, all fields must be valid
    return (
        typeof truckId === 'string' &&
        truckId.length > 0 &&
        isFiniteNumber(latitude) &&
        isFiniteNumber(longitude) &&
        isFiniteNumber(durationMs) &&
        durationMs > 0
    )
}

function isMapModePayload(value: unknown): value is CinematicMapModePayload {
  if (!isRecord(value)) return false
  const mode = value.mode
  const blend = value.blend
  return (
    (mode === 'live' || mode === 'historical')
    && isFiniteNumber(blend)
    && blend >= 0
    && blend <= 1
  )
}

export function isCinematicWorkerMessage(
  value: unknown
): value is CinematicWorkerMessage {
    if (!isRecord(value)) return false

    const type = value.type
    const payload = value.payload

    if (type === 'cinematic:telemetry') return isTelemetryPayload(payload)
    if (type === 'cinematic:viewport') return isViewportPayload(payload)
    if (type === 'cinematic:scroll') return isScrollPayload(payload)
    if (type === 'cinematic:transition') return isTransitionPayload(payload)
    if (type === 'cinematic:camera-flyto') return isCameraFlyToPayload(payload)
    if (type === 'cinematic:map-mode') return isMapModePayload(payload)

    return false
}

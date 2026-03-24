import { z } from 'zod'

export const truckStatusSchema = z.enum([
  'active',
  'idle',
  'maintenance',
  'offline',
  'alert',
])

type FiniteNumberSchema = z.ZodEffects<z.ZodNumber, number, number>

const withFiniteConstraint = (schema: z.ZodNumber): FiniteNumberSchema =>
  schema.refine(Number.isFinite, {
    message: 'Expected a finite number',
  })

const finiteNumber = (): FiniteNumberSchema => withFiniteConstraint(z.number())

const finiteRangedNumber = (min: number, max?: number): FiniteNumberSchema => {
  const base = max === undefined ? z.number().min(min) : z.number().min(min).max(max)
  return withFiniteConstraint(base)
}

const isoDateTimeString = z
  .string()
  .refine(value => !Number.isNaN(Date.parse(value)), {
    message: 'Expected a valid ISO date-time string',
  })

export const temperatureTrendSchema = z.array(finiteNumber()).min(12).max(120)

export const fleetTruckRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  plateNumber: z.string().min(1),
  status: truckStatusSchema,
  driver: z.string().min(1),
  temperature: finiteRangedNumber(-80, 40),
  humidity: finiteRangedNumber(0, 100),
  speed: finiteRangedNumber(0, 220),
  fuelLevel: finiteRangedNumber(0, 100),
  batteryLevel: finiteRangedNumber(0, 100),
  lat: finiteRangedNumber(-90, 90),
  lng: finiteRangedNumber(-180, 180),
  lastUpdate: isoDateTimeString,
  totalDistance: finiteRangedNumber(0),
  deliveries: z.number().int().min(0),
  route: z.string().optional(),
  temperatureTrend: temperatureTrendSchema,
})

export const fleetTruckRowsSchema = z.array(fleetTruckRowSchema)

export const analyticsDataSchema = z.object({
  dailyDistance: z.array(
    z.object({
      date: z.string().min(1),
      distance: finiteRangedNumber(0),
    })
  ),
  truckUtilization: z.array(
    z.object({
      truck: z.string().min(1),
      utilization: finiteRangedNumber(0, 100),
    })
  ),
  alertFrequency: z.array(
    z.object({
      type: z.string().min(1),
      count: z.number().int().min(0),
    })
  ),
  performanceMetrics: z.object({
    avgResponseTime: finiteRangedNumber(0),
    successRate: finiteRangedNumber(0, 100),
    activeConnections: z.number().int().min(0),
  }),
})

const liveTruckStatusSchema = z.enum([
  'active',
  'idle',
  'warning',
  'maintenance',
  'offline',
  'alert',
])

const liveFleetFiniteOptional = finiteNumber().optional()

const liveFleetTruckPatchSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(value => String(value).trim()),
    lat: liveFleetFiniteOptional,
    lon: liveFleetFiniteOptional,
    latitude: liveFleetFiniteOptional,
    longitude: liveFleetFiniteOptional,
    tempC: liveFleetFiniteOptional,
    temperature: liveFleetFiniteOptional,
    temp: liveFleetFiniteOptional,
    heading: liveFleetFiniteOptional,
    status: z.string().optional(),
  })
  .passthrough()
  .transform(value => {
    let normalizedStatus: z.infer<typeof liveTruckStatusSchema> | undefined

    if (value.status !== undefined) {
      const loweredStatus = value.status.toLowerCase()
      const parsedStatus = liveTruckStatusSchema.safeParse(loweredStatus)
      if (parsedStatus.success) {
        normalizedStatus = parsedStatus.data
      }
    }

    return {
      id: value.id,
      lat: value.lat ?? value.latitude,
      lon: value.lon ?? value.longitude,
      tempC: value.tempC ?? value.temperature ?? value.temp,
      heading: value.heading,
      status: normalizedStatus,
    }
  })

export type FleetLiveTruckPatch = z.infer<typeof liveFleetTruckPatchSchema>

export interface FleetLivePacket {
  mode: 'upsert' | 'replace'
  trucks: readonly FleetLiveTruckPatch[]
}

const liveFleetTruckPatchesSchema = z.array(liveFleetTruckPatchSchema)

function parsePatchArray(payload: unknown): readonly FleetLiveTruckPatch[] | null {
  const parsed = liveFleetTruckPatchesSchema.safeParse(payload)
  if (!parsed.success) return null
  return parsed.data.filter(patch => patch.id.length > 0)
}

function parseSinglePatch(payload: unknown): FleetLiveTruckPatch | null {
  const parsed = liveFleetTruckPatchSchema.safeParse(payload)
  if (!parsed.success || parsed.data.id.length === 0) return null
  return parsed.data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function parseFleetLivePacket(payload: unknown): FleetLivePacket | null {
  const directArray = parsePatchArray(payload)
  if (directArray) {
    return { mode: 'replace', trucks: directArray }
  }

  if (!isRecord(payload)) {
    return null
  }

  const typeRaw = typeof payload.type === 'string' ? payload.type.toLowerCase() : ''

  const directTrucks = parsePatchArray(payload.trucks)
  if (directTrucks) {
    return { mode: 'replace', trucks: directTrucks }
  }

  const payloadTrucks =
    isRecord(payload.payload) && 'trucks' in payload.payload
      ? parsePatchArray(payload.payload.trucks)
      : parsePatchArray(payload.payload)

  if (payloadTrucks) {
    const mode = typeRaw.includes('snapshot') || typeRaw === 'trucks' ? 'replace' : 'upsert'
    return { mode, trucks: payloadTrucks }
  }

  const singleFromPayload = parseSinglePatch(payload.payload)
  if (singleFromPayload) {
    return { mode: 'upsert', trucks: [singleFromPayload] }
  }

  const singleDirect = parseSinglePatch(payload)
  if (singleDirect) {
    return { mode: 'upsert', trucks: [singleDirect] }
  }

  return null
}

export type FleetTruckRow = z.infer<typeof fleetTruckRowSchema>
export type AnalyticsData = z.infer<typeof analyticsDataSchema>

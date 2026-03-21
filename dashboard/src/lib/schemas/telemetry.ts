import { z } from 'zod'

export const truckStatusSchema = z.enum([
  'active',
  'idle',
  'maintenance',
  'offline',
  'alert',
])

const withFiniteConstraint = (schema: z.ZodNumber): z.ZodNumber =>
  schema.refine(Number.isFinite, {
    message: 'Expected a finite number',
  })

const finiteNumber = (): z.ZodNumber => withFiniteConstraint(z.number())

const finiteRangedNumber = (min: number, max?: number): z.ZodNumber => {
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

export type FleetTruckRow = z.infer<typeof fleetTruckRowSchema>
export type AnalyticsData = z.infer<typeof analyticsDataSchema>

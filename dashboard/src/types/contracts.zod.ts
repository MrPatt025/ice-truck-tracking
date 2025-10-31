import { z } from 'zod';
import type {
  AlertsSummary,
  FleetSummary,
  HealthTier1,
  TelemetryState,
} from '@shared/types/contracts';

export const FleetSummarySchema = z.object({
  activeTrucks: z.number().int().min(0),
  avgCargoTempC: z.number(),
  anomalyIndex: z.number().min(0).max(100),
  onTimeRatePct: z.number().min(0).max(100),
  fuelEfficiencyKmPerL: z.number().min(0),
  activeDrivers: z.number().int().min(0),
  deliveriesCompleted: z.number().int().min(0),
}) satisfies z.ZodType<FleetSummary>;

export const AlertsSummarySchemaBase = z.object({
  total: z.number().int().min(0),
  critical: z.number().int().min(0),
  warning: z.number().int().min(0),
  info: z.number().int().min(0),
});

export const AlertsSummarySchema = AlertsSummarySchemaBase.superRefine(
  (val, ctx) => {
    const sum = val.critical + val.warning + val.info;
    if (val.total !== sum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `alerts total (${val.total}) must equal critical+warning+info (${sum})`,
        path: ['total'],
      });
    }
  },
) as z.ZodType<AlertsSummary>;

export const HealthTier1Schema = z.object({
  service: z.string().min(1),
  status: z.enum(['online', 'offline', 'degraded']),
  latencyMs: z.number().int().min(0).nullable(),
  uptimePct: z.number().min(0).max(100).nullable(),
  lastChange: z.string(), // ISO timestamp, validated elsewhere if needed
}) satisfies z.ZodType<HealthTier1>;

export const TelemetryStateSchema = z.object({
  activeStreams: z.number().int().min(0),
  lastIngestedAt: z.number().int().nullable(),
}) satisfies z.ZodType<TelemetryState>;

// Helpers
export function safeParseFleetSummary(input: unknown): FleetSummary | null {
  const r = FleetSummarySchema.safeParse(input);
  return r.success ? r.data : null;
}

export function safeParseAlertsSummary(input: unknown): AlertsSummary | null {
  const r = AlertsSummarySchema.safeParse(input);
  return r.success ? r.data : null;
}

export function safeParseHealthTier1(input: unknown): HealthTier1 | null {
  const r = HealthTier1Schema.safeParse(input);
  return r.success ? r.data : null;
}

export function safeParseTelemetryState(input: unknown): TelemetryState | null {
  const r = TelemetryStateSchema.safeParse(input);
  return r.success ? r.data : null;
}

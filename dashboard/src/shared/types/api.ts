// dashboard/src/shared/types/api.ts
// Minimal DTOs aligned to backend/src/index.ts Zod schemas

export type TruckDto = Readonly<{
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}>;

export type AlertDto = Readonly<{
  id: number;
  level: string;
  message: string;
  truckId: number | null;
  createdAt: string;
}>;

export type StatsRange = '1h' | '24h' | '7d' | '30d';

export type StatsResponse = Readonly<{
  summary: {
    activeTrucks: number;
    avgCargoTempC: number;
    onTimeRatePct: number;
    fuelEfficiencyKmPerL: number;
    deliveriesCompleted: number;
    anomalyIndex: number;
  };
  revenueSeries: Array<{ t: string; value: number }>;
  fleetSeries: Array<{ t: string; active: number; efficiency: number }>;
  alertsSeries: Array<{
    t: string;
    critical: number;
    warning: number;
    info: number;
  }>;
  tempBuckets: Array<{ label: string; value: number }>;
  performanceRadar: Array<{ key: string; score: number; max: number }>;
  lastCalc: string;
}>;

export type TelemetryPoint = Readonly<{
  truckId: number;
  lat: number;
  lng: number;
  speedKmh: number;
  cargoTempC: number;
  timestamp: string;
}>;

export type TelemetryMessage = Readonly<{
  trucks: TelemetryPoint[];
  alerts?: AlertDto[];
}>;

// --- Insights (AI-ready contract; currently rule-based) ---
export type RiskyTruckDto = Readonly<{
  id: string;
  reason: string;
  temp?: number;
  speed?: number;
}>;

export type AlertTrend = 'up' | 'down' | 'flat';

export type InsightsResponse = Readonly<{
  riskyTrucks: RiskyTruckDto[];

  alertTrend: AlertTrend;
  suggestions: string[];
}>;

/**
 * Aggregation Worker — Offloads heavy data processing to a Web Worker.
 * Handles: time-series aggregation, fleet statistics, report generation,
 * alert threshold evaluation, and CSV export preparation.
 */

// ── Message Types ──────────────────────────────────────────
interface AggregateTimeSeriesMsg {
  type: 'aggregate-timeseries';
  data: TelemetryPoint[];
  interval: 'minute' | 'hour' | 'day' | 'week';
  metrics: string[];
}

interface ComputeFleetStatsMsg {
  type: 'compute-fleet-stats';
  trucks: TruckData[];
}

interface EvaluateAlertsMsg {
  type: 'evaluate-alerts';
  telemetry: TelemetryPoint[];
  rules: AlertRule[];
}

interface PrepareExportMsg {
  type: 'prepare-export';
  data: Record<string, unknown>[];
  format: 'csv' | 'json';
  columns: string[];
}

type WorkerInbound =
  | AggregateTimeSeriesMsg
  | ComputeFleetStatsMsg
  | EvaluateAlertsMsg
  | PrepareExportMsg;

interface TelemetryPoint {
  truckId: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  lat: number;
  lng: number;
  speed: number;
  fuelLevel: number;
  batteryLevel: number;
  doorOpen: boolean;
}

interface TruckData {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'maintenance' | 'offline' | 'alert';
  temperature: number;
  speed: number;
  fuelLevel: number;
  lastUpdate: number;
  totalDistance: number;
  deliveries: number;
}

interface AlertRule {
  id: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  threshold: number;
  thresholdMax?: number;
  severity: 'critical' | 'warning' | 'info';
  duration?: number; // consecutive violations before trigger
}

// ── Worker Handler ─────────────────────────────────────────
globalThis.onmessage = (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'aggregate-timeseries':
      handleTimeSeries(msg);
      break;
    case 'compute-fleet-stats':
      handleFleetStats(msg);
      break;
    case 'evaluate-alerts':
      handleAlertEvaluation(msg);
      break;
    case 'prepare-export':
      handleExport(msg);
      break;
  }
};

// ── Time Series Aggregation ────────────────────────────────
function handleTimeSeries(msg: AggregateTimeSeriesMsg) {
  const { data, interval, metrics } = msg;
  const bucketMs = intervalToMs(interval);

  // Group by time bucket
  const buckets = new Map<number, TelemetryPoint[]>();
  for (const point of data) {
    const bucket = Math.floor(point.timestamp / bucketMs) * bucketMs;
    const existing = buckets.get(bucket) || [];
    existing.push(point);
    buckets.set(bucket, existing);
  }

  // Aggregate each bucket
  const result = Array.from(buckets.entries())
    .map(([timestamp, points]) => {
      const agg: Record<string, unknown> = { timestamp, count: points.length };

      for (const metric of metrics) {
        const values = points.map(p => (p as unknown as Record<string, number>)[metric]).filter(v => typeof v === 'number');
        if (values.length === 0) continue;

        agg[`${metric}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
        agg[`${metric}_min`] = Math.min(...values);
        agg[`${metric}_max`] = Math.max(...values);
        agg[`${metric}_sum`] = values.reduce((a, b) => a + b, 0);
      }

      return agg;
    })
    .sort((a, b) => (a.timestamp as number) - (b.timestamp as number));

  globalThis.postMessage({ type: 'aggregate-timeseries-result', data: result });
}

// ── Fleet Statistics ───────────────────────────────────────
function handleFleetStats(msg: ComputeFleetStatsMsg) {
  const { trucks } = msg;
  const total = trucks.length;
  const byStatus: Record<string, number> = {};
  let totalTemp = 0;
  let totalSpeed = 0;
  let totalFuel = 0;
  let totalDistance = 0;
  let totalDeliveries = 0;

  for (const truck of trucks) {
    byStatus[truck.status] = (byStatus[truck.status] || 0) + 1;
    totalTemp += truck.temperature;
    totalSpeed += truck.speed;
    totalFuel += truck.fuelLevel;
    totalDistance += truck.totalDistance;
    totalDeliveries += truck.deliveries;
  }

  const active = byStatus['active'] || 0;

  self.postMessage({
    type: 'compute-fleet-stats-result',
    data: {
      total,
      active,
      idle: byStatus['idle'] || 0,
      maintenance: byStatus['maintenance'] || 0,
      offline: byStatus['offline'] || 0,
      alertCount: byStatus['alert'] || 0,
      utilization: total > 0 ? (active / total) * 100 : 0,
      avgTemperature: total > 0 ? totalTemp / total : 0,
      avgSpeed: total > 0 ? totalSpeed / total : 0,
      avgFuel: total > 0 ? totalFuel / total : 0,
      totalDistance,
      totalDeliveries,
    },
  });
}

// ── Alert Evaluation ───────────────────────────────────────
function handleAlertEvaluation(msg: EvaluateAlertsMsg) {
  const { telemetry, rules } = msg;
  const triggered: Array<{
    ruleId: string;
    truckId: string;
    metric: string;
    value: number;
    threshold: number;
    severity: string;
    timestamp: number;
  }> = [];

  // Group telemetry by truck
  const byTruck = new Map<string, TelemetryPoint[]>();
  for (const point of telemetry) {
    const existing = byTruck.get(point.truckId) || [];
    existing.push(point);
    byTruck.set(point.truckId, existing);
  }

  // Evaluate each rule against each truck's latest data
  for (const rule of rules) {
    for (const [truckId, points] of byTruck) {
      const latest = points.at(-1);
      if (!latest) continue;
      const value = (latest as unknown as Record<string, number>)[rule.metric];
      if (typeof value !== 'number') continue;

      let violated = false;
      switch (rule.condition) {
        case 'gt': violated = value > rule.threshold; break;
        case 'lt': violated = value < rule.threshold; break;
        case 'eq': violated = value === rule.threshold; break;
        case 'gte': violated = value >= rule.threshold; break;
        case 'lte': violated = value <= rule.threshold; break;
        case 'between': violated = value >= rule.threshold && value <= (rule.thresholdMax ?? rule.threshold); break;
      }

      if (violated) {
        triggered.push({
          ruleId: rule.id,
          truckId,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          severity: rule.severity,
          timestamp: latest.timestamp,
        });
      }
    }
  }

  globalThis.postMessage({ type: 'evaluate-alerts-result', data: triggered });
}

// ── Export Preparation ─────────────────────────────────────
function handleExport(msg: PrepareExportMsg) {
  const { data, format, columns } = msg;

  if (format === 'csv') {
    const header = columns.join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replaceAll('"', '""')}"`;
        }
        return val == null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    globalThis.postMessage({ type: 'prepare-export-result', data: csv, format: 'csv' });
  } else {
    const json = JSON.stringify(data, null, 2);
    globalThis.postMessage({ type: 'prepare-export-result', data: json, format: 'json' });
  }
}

// ── Helpers ────────────────────────────────────────────────
function intervalToMs(interval: string): number {
  switch (interval) {
    case 'minute': return 60_000;
    case 'hour': return 3_600_000;
    case 'day': return 86_400_000;
    case 'week': return 604_800_000;
    default: return 3_600_000;
  }
}

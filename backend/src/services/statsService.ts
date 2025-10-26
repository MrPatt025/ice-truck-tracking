// backend/src/services/statsService.ts
import { prisma } from '../lib/prisma';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bucketFormat(range: Range): string {
  // SQLite strftime format strings
  switch (range) {
    case '1h':
      return '%Y-%m-%d %H:%M'; // minute buckets (we will coarsen to 5-min)
    case '24h':
      return '%Y-%m-%d %H:00'; // hourly
    case '7d':
    case '30d':
      return '%Y-%m-%d'; // daily
    default:
      return '%Y-%m-%d %H:%M';
  }
}

function bucketStepMinutes(range: Range): number {
  switch (range) {
    case '1h':
      return 5;
    case '24h':
      return 60;
    case '7d':
      return 24 * 60;
    case '30d':
      return 24 * 60;
    default:
      return 5;
  }
}

function makeTimeline(since: Date, until: Date, stepMinutes: number): string[] {
  const times: string[] = [];
  const start = new Date(Math.floor(since.getTime() / 60000) * 60000);
  for (
    let t = start.getTime();
    t <= until.getTime();
    t += stepMinutes * 60000
  ) {
    times.push(new Date(t).toISOString());
  }
  return times;
}

export type Range = '1h' | '24h' | '7d' | '30d';

export type StatsSummary = {
  activeTrucks: number;
  avgCargoTempC: number;
  onTimeRatePct: number;
  fuelEfficiencyKmPerL: number;
  deliveriesCompleted: number;
  anomalyIndex: number;
};

export type StatsResponse = {
  summary: StatsSummary;
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
};

/**
 * Aggregate simple KPIs from existing tables.
 * Note: Current Prisma schema does not include Telemetry; values that require telemetry are
 * approximated or set to safe defaults. This endpoint focuses on shape + availability.
 */
// naive in-memory cache (swap to Redis later)
const cache: { key?: string; at?: number; data?: StatsResponse } = {};

function rangeToMs(range: Range): number {
  switch (range) {
    case '1h':
      return 3600_000;
    case '24h':
      return 86_400_000;
    case '7d':
      return 604_800_000;
    case '30d':
      return 2_592_000_000;
    default:
      return 3_600_000;
  }
}

export async function getStats(range: Range = '1h'): Promise<StatsResponse> {
  const key = `stats:${range}`;
  const now = Date.now();
  if (cache.key === key && cache.at && cache.data && now - cache.at < 30_000) {
    return cache.data;
  }

  const since = new Date(now - rangeToMs(range));
  const until = new Date(now);

  // aggregated values
  const [activeTrucksRow, avgCargoRow, alerts] = await Promise.all([
    prisma.$queryRaw<
      { cnt: number }[]
    >`SELECT COUNT(DISTINCT truckId) AS cnt FROM Telemetry WHERE recordedAt >= ${since}`,
    prisma.$queryRaw<
      { avg: number | null }[]
    >`SELECT AVG(cargoTempC) AS avg FROM Telemetry WHERE recordedAt >= ${since}`,
    prisma.alert.findMany({ where: { createdAt: { gte: since } } }),
  ]);

  const [deep, std, chill, risk] = await Promise.all([
    prisma.$queryRaw<
      { c: number }[]
    >`SELECT COUNT(*) as c FROM Telemetry WHERE recordedAt >= ${since} AND cargoTempC < -10`,
    prisma.$queryRaw<
      { c: number }[]
    >`SELECT COUNT(*) as c FROM Telemetry WHERE recordedAt >= ${since} AND cargoTempC >= -10 AND cargoTempC < -5`,
    prisma.$queryRaw<
      { c: number }[]
    >`SELECT COUNT(*) as c FROM Telemetry WHERE recordedAt >= ${since} AND cargoTempC >= -5 AND cargoTempC < 2`,
    prisma.$queryRaw<
      { c: number }[]
    >`SELECT COUNT(*) as c FROM Telemetry WHERE recordedAt >= ${since} AND cargoTempC >= 2`,
  ]);
  const deepNum = Number(deep?.[0]?.c ?? 0);
  const stdNum = Number(std?.[0]?.c ?? 0);
  const chillNum = Number(chill?.[0]?.c ?? 0);
  const riskNum = Number(risk?.[0]?.c ?? 0);
  const tempBuckets: Array<{ label: string; value: number }> = [
    { label: 'Deep Freeze', value: deepNum },
    { label: 'Standard', value: stdNum },
    { label: 'Chilled', value: chillNum },
    { label: 'Risk Zone', value: riskNum },
  ];

  const activeTrucksNum = Number(activeTrucksRow?.[0]?.cnt ?? 0);
  const avgCargoNum = Number(avgCargoRow?.[0]?.avg ?? 0);

  const summary: StatsSummary = {
    activeTrucks: activeTrucksNum,
    avgCargoTempC: avgCargoNum,
    onTimeRatePct: 96.2, // TODO: replace with real SLA metric
    fuelEfficiencyKmPerL: 8.7, // TODO: compute from distance/fuel once available
    deliveriesCompleted: 284, // TODO: wire once deliveries exist
    anomalyIndex: Math.min(
      (alerts.length / Math.max(1, activeTrucksNum)) * 10,
      100,
    ),
  };

  // Build time buckets using SQLite strftime and fill gaps to keep charts stable
  const fmt = bucketFormat(range);
  const step = bucketStepMinutes(range);

  // Fleet/activity per bucket
  const fleetRows = await prisma.$queryRaw<
    { bucket: string; active: number; avgSpeed: number | null }[]
  >`
    SELECT strftime(${fmt}, recordedAt) as bucket,
           COUNT(DISTINCT truckId) as active,
           AVG(speedKmh) as avgSpeed
    FROM Telemetry
    WHERE recordedAt >= ${since} AND recordedAt <= ${until}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  const fleetByBucket = new Map<
    string,
    { active: number; efficiency: number }
  >();
  for (const r of fleetRows) {
    const eff = clamp(((r.avgSpeed ?? 0) / 120) * 100, 0, 100); // scale 0..120km/h → 0..100
    fleetByBucket.set(String(r.bucket), {
      active: Number(r.active ?? 0),
      efficiency: eff,
    });
  }

  // Alerts per bucket
  const alertRows = await prisma.$queryRaw<
    { bucket: string; info: number; warning: number; critical: number }[]
  >`
    SELECT strftime(${fmt}, createdAt) as bucket,
           SUM(CASE WHEN level = 'INFO' THEN 1 ELSE 0 END) as info,
           SUM(CASE WHEN level = 'WARN' THEN 1 ELSE 0 END) as warning,
           SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as critical
    FROM Alert
    WHERE createdAt >= ${since} AND createdAt <= ${until}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  const alertsByBucket = new Map<
    string,
    { info: number; warning: number; critical: number }
  >();
  for (const r of alertRows) {
    alertsByBucket.set(String(r.bucket), {
      info: Number(r.info ?? 0),
      warning: Number(r.warning ?? 0),
      critical: Number(r.critical ?? 0),
    });
  }

  // Revenue series: no real revenue table → derive a proxy from active trucks
  // Value = active * 120 as a stable DB-driven proxy; can be swapped when domain data exists
  const timeline = makeTimeline(since, until, step);
  const fleetSeries: Array<{ t: string; active: number; efficiency: number }> =
    [];
  const alertsSeries: Array<{
    t: string;
    critical: number;
    warning: number;
    info: number;
  }> = [];
  const revenueSeries: Array<{ t: string; value: number }> = [];

  for (const iso of timeline) {
    // normalize bucket key to match SQLite strftime output
    const d = new Date(iso);
    let bucketKey = '';
    // Build bucketKey via UTC components matching fmt selections
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    if (fmt === '%Y-%m-%d') bucketKey = `${y}-${m}-${day}`;
    else if (fmt === '%Y-%m-%d %H:00') bucketKey = `${y}-${m}-${day} ${hh}:00`;
    else bucketKey = `${y}-${m}-${day} ${hh}:${mm}`;

    const f = fleetByBucket.get(bucketKey) ?? { active: 0, efficiency: 0 };
    const a = alertsByBucket.get(bucketKey) ?? {
      info: 0,
      warning: 0,
      critical: 0,
    };
    fleetSeries.push({ t: iso, active: f.active, efficiency: f.efficiency });
    alertsSeries.push({
      t: iso,
      info: a.info,
      warning: a.warning,
      critical: a.critical,
    });
    revenueSeries.push({ t: iso, value: f.active * 120 });
  }

  const data: StatsResponse = {
    summary,
    revenueSeries,
    fleetSeries,
    alertsSeries,
    tempBuckets,
    performanceRadar: [
      { key: 'On-Time', score: 96, max: 100 },
      { key: 'Fuel', score: 88, max: 100 },
      { key: 'Safety', score: 94, max: 100 },
      { key: 'Maintenance', score: 82, max: 100 },
      { key: 'Driver', score: 91, max: 100 },
    ],
    lastCalc: new Date().toISOString(),
  };

  cache.key = key;
  cache.at = now;
  cache.data = data;
  return data;
}

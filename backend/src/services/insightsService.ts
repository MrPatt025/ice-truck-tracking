// backend/src/services/insightsService.ts
import { prisma } from '../lib/prisma';
import type { Range } from './statsService';

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

export type RiskyTruck = {
  id: string;
  reason: string;
  temp?: number;
  speed?: number;
};

export type AlertTrend = 'up' | 'down' | 'flat';

export type InsightsResponse = {
  riskyTrucks: RiskyTruck[];
  alertTrend: AlertTrend;
  suggestions: string[];
};

/**
 * Rule-based insights for initial analytics surface.
 * TODO: replace ruleEngine() with AI risk scoring while preserving the output contract
 */
export async function getInsights(
  range: Range = '1h',
): Promise<InsightsResponse> {
  const now = Date.now();
  const since = new Date(now - rangeToMs(range));
  const until = new Date(now);

  // Compute basic per-truck risk signals within the window
  const rows = await prisma.$queryRaw<
    Array<{ truckId: number; maxTemp: number | null; maxSpeed: number | null }>
  >`
    SELECT truckId,
           MAX(cargoTempC) AS maxTemp,
           MAX(speedKmh)   AS maxSpeed
    FROM Telemetry
    WHERE recordedAt >= ${since} AND recordedAt <= ${until}
    GROUP BY truckId
  `;

  // Deterministic rule engine (thresholds documented and easy to tune)
  const HIGH_TEMP_C = 2; // cargo temperature above this is considered risky
  const OVERSPEED_KMH = 110; // km/h threshold for overspeed

  type Scored = { truckId: number; score: number; item: RiskyTruck };
  const scored: Scored[] = [];
  for (const r of rows) {
    const tid = Number(r.truckId);
    const temp = typeof r.maxTemp === 'number' ? r.maxTemp : null;
    const speed = typeof r.maxSpeed === 'number' ? r.maxSpeed : null;

    let score = 0;
    let reason = '';
    let out: RiskyTruck | null = null;

    if (temp !== null && temp >= HIGH_TEMP_C) {
      // Higher temps weigh more
      score = (temp - HIGH_TEMP_C) * 5 + 10;
      reason = `High cargo temp ${temp.toFixed(1)}°C`;
      out = { id: String(tid), reason, temp };
    }
    if (speed !== null && speed > OVERSPEED_KMH) {
      const s = (speed - OVERSPEED_KMH) * 1.2 + 8;
      if (s > score) {
        score = s;
        reason = `Overspeed ${Math.round(speed)} km/h`;
        out = { id: String(tid), reason, speed };
      }
    }

    if (out && score > 0) scored.push({ truckId: tid, score, item: out });
  }

  // Top 3 risky trucks
  scored.sort((a, b) => b.score - a.score);
  const riskyTrucks = scored.slice(0, 3).map((s) => s.item);

  // Alert trend: compare first half vs second half counts
  const mid = new Date((since.getTime() + until.getTime()) / 2);
  const [firstHalf, secondHalf] = await Promise.all([
    prisma.alert.count({ where: { createdAt: { gte: since, lte: mid } } }),
    prisma.alert.count({ where: { createdAt: { gt: mid, lte: until } } }),
  ]);

  let alertTrend: AlertTrend = 'flat';
  if (firstHalf === 0 && secondHalf === 0) {
    alertTrend = 'flat';
  } else {
    const diff = secondHalf - firstHalf;
    const pct = firstHalf > 0 ? diff / firstHalf : diff > 0 ? 1 : -1;
    if (pct > 0.1) alertTrend = 'up';
    else if (pct < -0.1) alertTrend = 'down';
    else alertTrend = 'flat';
  }

  // Suggestions derived deterministically from risks/trend
  const suggestions: string[] = [];
  for (const t of riskyTrucks) {
    if (t.temp !== undefined) {
      suggestions.push(
        `Inspect cooling unit on Truck ${t.id}; verify door seals and setpoint.`,
      );
    }
    if (t.speed !== undefined) {
      suggestions.push(
        `Coach driver of Truck ${t.id} on speed compliance and route pacing.`,
      );
    }
  }
  if (alertTrend === 'up') {
    suggestions.push(
      'Review alert thresholds and recent routes; prioritize maintenance for frequently flagged assets.',
    );
  }

  // De-duplicate while preserving order
  const seen = new Set<string>();
  const uniqueSuggestions = suggestions.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  return {
    riskyTrucks,
    alertTrend,
    suggestions: uniqueSuggestions.slice(0, 6),
  };
}

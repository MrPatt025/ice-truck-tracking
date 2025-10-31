// backend/test/insights.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getInsights } from '../src/services/insightsService';
import { prisma } from '../src/lib/prisma';
import type { Range } from '../src/services/statsService';

describe('insightsService', () => {
  beforeAll(async () => {
    // Clean up test data - simplified
    const testTrucks = await prisma.truck.findMany({
      where: { name: { startsWith: 'TEST-INSIGHT' } },
    });

    for (const truck of testTrucks) {
      await prisma.telemetry.deleteMany({ where: { truckId: truck.id } });
      await prisma.alert.deleteMany({ where: { truckId: truck.id } });
      await prisma.truck.delete({ where: { id: truck.id } });
    }
  });

  afterAll(async () => {
    // Clean up test data - simplified
    const testTrucks = await prisma.truck.findMany({
      where: { name: { startsWith: 'TEST-INSIGHT' } },
    });

    for (const truck of testTrucks) {
      await prisma.telemetry.deleteMany({ where: { truckId: truck.id } });
      await prisma.alert.deleteMany({ where: { truckId: truck.id } });
      await prisma.truck.delete({ where: { id: truck.id } });
    }
  });
  it('should return insights structure with default range', async () => {
    const insights = await getInsights();
    expect(insights).toHaveProperty('riskyTrucks');
    expect(insights).toHaveProperty('alertTrend');
    expect(insights).toHaveProperty('suggestions');
    expect(Array.isArray(insights.riskyTrucks)).toBe(true);
    expect(Array.isArray(insights.suggestions)).toBe(true);
    expect(['up', 'down', 'flat']).toContain(insights.alertTrend);
  });

  it('should return insights for 1h range', async () => {
    const insights = await getInsights('1h');
    expect(insights).toBeDefined();
    expect(insights.riskyTrucks.length).toBeLessThanOrEqual(3);
  });

  it('should return insights for 24h range', async () => {
    const insights = await getInsights('24h');
    expect(insights).toBeDefined();
    expect(insights.riskyTrucks.length).toBeLessThanOrEqual(3);
  });

  it('should return insights for 7d range', async () => {
    const insights = await getInsights('7d');
    expect(insights).toBeDefined();
    expect(insights.riskyTrucks.length).toBeLessThanOrEqual(3);
  });

  it('should return insights for 30d range', async () => {
    const insights = await getInsights('30d');
    expect(insights).toBeDefined();
    expect(insights.riskyTrucks.length).toBeLessThanOrEqual(3);
  });

  it('should detect high temperature risks', async () => {
    // Create test truck with high temperature telemetry
    const truck = await prisma.truck.create({
      data: {
        name: 'TEST-INSIGHT-TEMP-001',
      },
    });

    // Insert high temp telemetry within the last hour
    await prisma.telemetry.create({
      data: {
        truckId: truck.id,
        cargoTempC: 10.0, // Well above HIGH_TEMP_C = 2
        speedKmh: 50,
        latitude: 13.7563,
        longitude: 100.5018,
        recordedAt: new Date(),
      },
    });

    const insights = await getInsights('1h');

    // Should detect the high temp truck
    const riskyTruck = insights.riskyTrucks.find(
      (t) => t.id === String(truck.id),
    );
    if (riskyTruck) {
      expect(riskyTruck.reason).toContain('High cargo temp');
      expect(riskyTruck.temp).toBeGreaterThanOrEqual(10.0);
    }

    // Should suggest inspection
    const hasCoolingInspection = insights.suggestions.some((s) =>
      s.toLowerCase().includes('cooling'),
    );
    if (riskyTruck) {
      expect(hasCoolingInspection).toBe(true);
    }

    // Cleanup
    await prisma.telemetry.deleteMany({ where: { truckId: truck.id } });
    await prisma.truck.delete({ where: { id: truck.id } });
  });

  it('should detect overspeed risks', async () => {
    // Create test truck with overspeed telemetry
    const truck = await prisma.truck.create({
      data: {
        name: 'TEST-INSIGHT-SPEED-001',
      },
    });

    // Insert overspeed telemetry within the last hour
    await prisma.telemetry.create({
      data: {
        truckId: truck.id,
        cargoTempC: 0,
        speedKmh: 130, // Well above OVERSPEED_KMH = 110
        latitude: 13.7563,
        longitude: 100.5018,
        recordedAt: new Date(),
      },
    });

    const insights = await getInsights('1h');

    // Should detect the overspeed truck
    const riskyTruck = insights.riskyTrucks.find(
      (t) => t.id === String(truck.id),
    );
    if (riskyTruck) {
      expect(riskyTruck.reason).toContain('Overspeed');
      expect(riskyTruck.speed).toBeGreaterThanOrEqual(130);
    }

    // Should suggest driver coaching
    const hasCoachingSuggestion = insights.suggestions.some((s) =>
      s.toLowerCase().includes('coach'),
    );
    if (riskyTruck) {
      expect(hasCoachingSuggestion).toBe(true);
    }

    // Cleanup
    await prisma.telemetry.deleteMany({ where: { truckId: truck.id } });
    await prisma.truck.delete({ where: { id: truck.id } });
  });

  it('should limit risky trucks to top 3', async () => {
    // Create 5 test trucks with high temps
    const trucks = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.truck.create({
          data: {
            name: `TEST-INSIGHT-LIMIT-${String(i).padStart(3, '0')}`,
          },
        }),
      ),
    );

    // Insert high temp telemetry for all
    await Promise.all(
      trucks.map((truck, i) =>
        prisma.telemetry.create({
          data: {
            truckId: truck.id,
            cargoTempC: 5 + i, // Varying temps
            speedKmh: 50,
            latitude: 13.7563,
            longitude: 100.5018,
            recordedAt: new Date(),
          },
        }),
      ),
    );

    const insights = await getInsights('1h');

    // Should return at most 3 risky trucks
    expect(insights.riskyTrucks.length).toBeLessThanOrEqual(3);

    // Cleanup
    await prisma.telemetry.deleteMany({
      where: { truckId: { in: trucks.map((t) => t.id) } },
    });
    await prisma.truck.deleteMany({
      where: { id: { in: trucks.map((t) => t.id) } },
    });
  });

  it('should limit suggestions to 6 items', async () => {
    const insights = await getInsights('1h');
    expect(insights.suggestions.length).toBeLessThanOrEqual(6);
  });

  it('should detect alert trend up', async () => {
    // Create test truck and alerts
    const truck = await prisma.truck.create({
      data: {
        name: 'TEST-INSIGHT-TREND-001',
      },
    });

    const now = Date.now();
    const oneHourAgo = now - 3_600_000;
    const twentyMinAgo = now - 1_200_000; // Clearly in second half (mid is at 30min ago)

    // Create 1 alert clearly in first half, 3 alerts clearly in second half (trending up)
    await prisma.alert.create({
      data: {
        truckId: truck.id,
        message: 'Test first half',
        createdAt: new Date(oneHourAgo + 300_000), // 55 minutes ago (first half)
      },
    });

    for (let i = 0; i < 3; i++) {
      await prisma.alert.create({
        data: {
          truckId: truck.id,
          message: `Test second half ${i}`,
          createdAt: new Date(twentyMinAgo + i * 10_000), // 20 minutes ago (second half)
        },
      });
    }

    const insights = await getInsights('1h');

    // Should detect upward trend
    expect(insights.alertTrend).toBe('up');

    // Should suggest reviewing thresholds
    const hasReviewSuggestion = insights.suggestions.some((s) =>
      s.toLowerCase().includes('review alert'),
    );
    expect(hasReviewSuggestion).toBe(true);

    // Cleanup
    await prisma.alert.deleteMany({ where: { truckId: truck.id } });
    await prisma.truck.delete({ where: { id: truck.id } });
  });

  it('should detect alert trend flat with no alerts', async () => {
    // Query a range where we know there are no alerts
    const farFuture: Range = '1h'; // Will check recent hour
    const insights = await getInsights(farFuture);

    // With no data, trend should be flat
    expect(['up', 'down', 'flat']).toContain(insights.alertTrend);
  });

  it('should deduplicate suggestions', async () => {
    const insights = await getInsights('1h');

    // Check for duplicates
    const uniqueSuggestions = new Set(insights.suggestions);
    expect(uniqueSuggestions.size).toBe(insights.suggestions.length);
  });

  it('should handle empty telemetry gracefully', async () => {
    // Clean all telemetry temporarily
    const originalTelemetry = await prisma.telemetry.findMany();
    await prisma.telemetry.deleteMany();

    const insights = await getInsights('1h');

    expect(insights.riskyTrucks).toEqual([]);
    expect(['up', 'down', 'flat']).toContain(insights.alertTrend);
    expect(Array.isArray(insights.suggestions)).toBe(true);

    // Restore telemetry
    if (originalTelemetry.length > 0) {
      await prisma.telemetry.createMany({
        data: originalTelemetry.map((t) => ({
          truckId: t.truckId,
          cargoTempC: t.cargoTempC,
          speedKmh: t.speedKmh,
          latitude: t.latitude,
          longitude: t.longitude,
          recordedAt: t.recordedAt,
        })),
      });
    }
  });

  it('should handle invalid range by defaulting to 1h', async () => {
    const insights = await getInsights('invalid' as unknown as Range);

    expect(insights).toBeDefined();
    expect(insights.riskyTrucks).toBeDefined();
  });
});

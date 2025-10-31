// backend/test/insights-simple.spec.ts
import { describe, it, expect } from 'vitest';
import { getInsights } from '../src/services/insightsService';

describe('insightsService - simple', () => {
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

  it('should limit risky trucks to top 3', async () => {
    const insights = await getInsights('1h');
    expect(insights.riskyTrucks.length).toBeLessThanOrEqual(3);
  });

  it('should limit suggestions to 6 items', async () => {
    const insights = await getInsights('1h');
    expect(insights.suggestions.length).toBeLessThanOrEqual(6);
  });

  it('should deduplicate suggestions', async () => {
    const insights = await getInsights('1h');
    const uniqueSuggestions = new Set(insights.suggestions);
    expect(uniqueSuggestions.size).toBe(insights.suggestions.length);
  });

  it('should handle alert trends correctly', async () => {
    const insights = await getInsights('1h');
    expect(['up', 'down', 'flat']).toContain(insights.alertTrend);
  });

  it('should return valid risky truck structure', async () => {
    const insights = await getInsights('1h');
    for (const truck of insights.riskyTrucks) {
      expect(truck).toHaveProperty('id');
      expect(truck).toHaveProperty('reason');
      expect(typeof truck.id).toBe('string');
      expect(typeof truck.reason).toBe('string');
    }
  });
});

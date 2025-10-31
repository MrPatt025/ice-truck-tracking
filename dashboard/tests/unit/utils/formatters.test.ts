import { describe, expect, it } from '@jest/globals';
import { formatDistance, formatDuration } from '@/ui/utils';
import { formatSpeed, formatTemp, type UiTruck } from '@/types/truck';
import { calculateStatistics, isStale } from '@/shared/utils/stats';

// Unit tests: formatters (time, numbers), KPI derivations, stale/offline logic

describe('ui/utils formatters', () => {
  it('formatDistance formats meters to km with units', () => {
    expect(formatDistance(0)).toBe('0m');
    expect(formatDistance(12)).toBe('12m');
    expect(formatDistance(999)).toBe('999m');
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(15234)).toBe('15.2km');
  });

  it('formatDuration formats seconds into h/m', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(61)).toBe('1m');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(3665)).toBe('1h 1m');
  });
});

describe('truck formatters', () => {
  const base: UiTruck = { id: 1, name: 't1' } as const;

  it('formatSpeed returns rounded km/h or fallback', () => {
    expect(formatSpeed({ ...base, speed: 12.7 })).toBe('13');
    expect(formatSpeed({ ...base, speed: 0 })).toBe('0');
    // invalid
    expect(formatSpeed(base)).toBe('0');
    expect(formatSpeed({ ...base, speed: Number.NaN })).toBe('0');
    expect(formatSpeed({ ...base, speed: Infinity })).toBe('0');
    expect(formatSpeed(base, '-')).toBe('-');
  });

  it('formatTemp returns fixed digits or fallback', () => {
    expect(formatTemp({ ...base, temp: 1.2345 })).toBe('1.2');
    expect(formatTemp({ ...base, temp: 1.2345 }, 2)).toBe('1.23');
    expect(formatTemp(base)).toBe('0.0');
    expect(formatTemp({ ...base, temp: Number.NaN })).toBe('0.0');
    expect(formatTemp({ ...base, temp: Infinity })).toBe('0.0');
    expect(formatTemp(base, 1, '--')).toBe('--');
  });
});

describe('stats utils (KPI derivations + staleness)', () => {
  it('calculateStatistics handles empty and typical arrays', () => {
    expect(calculateStatistics([])).toEqual({
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      sum: 0,
    });
    const r = calculateStatistics([1, 2, 3, 4]);
    expect(r.sum).toBe(10);
    expect(r.mean).toBe(2.5);
    expect(r.min).toBe(1);
    expect(r.max).toBe(4);
    expect(Math.round(r.stdDev * 1000) / 1000).toBe(1.118); // population std dev ~1.118
  });

  it('isStale compares lastIngestedAt against threshold', () => {
    const now = Date.now();
    // not stale within threshold
    expect(isStale(now - 5000, 10000)).toBe(false);
    // stale beyond threshold
    expect(isStale(now - 15000, 10000)).toBe(true);
    // missing timestamp considered stale
    expect(isStale(undefined as any, 10000)).toBe(true);
  });
});

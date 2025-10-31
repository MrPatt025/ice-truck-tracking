export function calculateStatistics(data: number[]) {
  if (!Array.isArray(data) || data.length === 0)
    return { mean: 0, stdDev: 0, min: 0, max: 0, sum: 0 } as const;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / data.length;
  const variance =
    data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);
  return { mean, stdDev, min, max, sum } as const;
}

export function isStale(
  lastIngestedAt: number | null | undefined,
  thresholdMs: number,
): boolean {
  if (!lastIngestedAt || !Number.isFinite(lastIngestedAt)) return true;
  const now = Date.now();
  return now - lastIngestedAt > thresholdMs;
}

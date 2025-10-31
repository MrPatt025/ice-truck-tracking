export const QueryKeys = {
  alerts: ['alerts'] as const,
  trucks: (params?: unknown) => ['trucks', params ?? {}] as const,
  stats: (range: string) => ['stats', range] as const,
  telemetry: ['telemetry'] as const,
} as const;

export type QueryKeyOf<T extends readonly unknown[]> = T;

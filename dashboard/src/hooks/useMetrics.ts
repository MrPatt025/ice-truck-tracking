// /dashboard/src/hooks/useMetrics.ts
import { useMemo } from 'react';
import useSWR from 'swr';
import {
  Truck as TruckIcon,
  ThermometerSun,
  Bell,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UiTruck } from '../types/truck';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_POLL_MS ?? 5000);

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
};

type AlertData = { level?: string };

export interface Metric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: LucideIcon;
  'data-testid': string;
}

export const useMetrics = (): {
  metrics: Metric[];
  isLoading: boolean;
  error: unknown;
} => {
  const {
    data: trucks,
    error: trucksError,
    isLoading: trucksLoading,
  } = useSWR<UiTruck[]>(
    `${API_URL}/api/v1/trucks`,
    (u) => fetcher<UiTruck[]>(u),
    {
      refreshInterval: REFRESH_MS,
      dedupingInterval: REFRESH_MS,
    },
  );

  const {
    data: alerts,
    error: alertsError,
    isLoading: alertsLoading,
  } = useSWR<AlertData[]>(
    `${API_URL}/api/v1/alerts`,
    (u) => fetcher<AlertData[]>(u),
    {
      refreshInterval: REFRESH_MS,
      dedupingInterval: REFRESH_MS,
    },
  );

  const isLoading = Boolean(trucksLoading || alertsLoading);
  const error = trucksError || alertsError;

  // ทำให้ skeleton metrics คงที่ข้ามเรนเดอร์ เพื่อแก้ missing-deps warning
  const loadingMetrics = useMemo<Metric[]>(
    () => [
      {
        title: 'Active Trucks',
        value: '…',
        change: '',
        trend: 'stable',
        icon: TruckIcon,
        'data-testid': 'active-trucks',
      },
      {
        title: 'Avg Cargo Temp',
        value: '…',
        change: '',
        trend: 'stable',
        icon: ThermometerSun,
        'data-testid': 'avg-cargo-temp',
      },
      {
        title: 'Open Alerts',
        value: '…',
        change: '',
        trend: 'stable',
        icon: Bell,
        'data-testid': 'open-alerts',
      },
      {
        title: 'On-time Rate',
        value: '…',
        change: '',
        trend: 'stable',
        icon: Activity,
        'data-testid': 'on-time-rate',
      },
    ],
    [],
  );

  const metrics = useMemo<Metric[]>(() => {
    if (error || !Array.isArray(trucks) || !Array.isArray(alerts)) {
      return loadingMetrics;
    }

    const activeTrucks = trucks.length;

    const temps = trucks
      .map((t) => t.temp)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const avgTempNum =
      temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const avgTemp = avgTempNum.toFixed(1);

    const openAlerts = alerts.filter((a) =>
      /^(warn|warning|critical|error)$/i.test(String(a.level ?? '')),
    ).length;

    return [
      {
        title: 'Active Trucks',
        value: String(activeTrucks),
        change: '+1',
        trend: 'up',
        icon: TruckIcon,
        'data-testid': 'active-trucks',
      },
      {
        title: 'Avg Cargo Temp',
        value: `${avgTemp}°C`,
        change: '-0.2°C',
        trend: 'down',
        icon: ThermometerSun,
        'data-testid': 'avg-cargo-temp',
      },
      {
        title: 'Open Alerts',
        value: String(openAlerts),
        change: '+0',
        trend: 'stable',
        icon: Bell,
        'data-testid': 'open-alerts',
      },
      {
        title: 'On-time Rate',
        value: '96.8%',
        change: '+1.4%',
        trend: 'up',
        icon: Activity,
        'data-testid': 'on-time-rate',
      },
    ];
  }, [trucks, alerts, error, loadingMetrics]);

  return { metrics, isLoading, error };
};

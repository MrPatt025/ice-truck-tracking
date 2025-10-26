// /dashboard/src/hooks/useMetrics.ts
import React from 'react';
import useSWR from 'swr';
import {
  Truck,
  ThermometerSun,
  Bell,
  Activity,
  LucideIcon,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TruckData {
  temp: number;
}
interface AlertData {
  level: 'info' | 'warn' | 'critical';
}
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
  error: any;
} => {
  const {
    data: trucks,
    error: trucksError,
    isLoading: trucksLoading,
  } = useSWR<TruckData[]>(`${API_URL}/api/v1/trucks`, fetcher, {
    refreshInterval: 5000,
  });
  const {
    data: alerts,
    error: alertsError,
    isLoading: alertsLoading,
  } = useSWR<AlertData[]>(`${API_URL}/api/v1/alerts`, fetcher, {
    refreshInterval: 5000,
  });

  const isLoading = trucksLoading || alertsLoading;
  const error = trucksError || alertsError;

  const metrics = React.useMemo<Metric[]>(() => {
    const loadingMetrics: Metric[] = [
      {
        title: 'Active Trucks',
        value: '...',
        change: '',
        trend: 'stable',
        icon: Truck,
        'data-testid': 'active-trucks',
      },
      {
        title: 'Avg Cargo Temp',
        value: '...',
        change: '',
        trend: 'stable',
        icon: ThermometerSun,
        'data-testid': 'avg-cargo-temp',
      },
      {
        title: 'Open Alerts',
        value: '...',
        change: '',
        trend: 'stable',
        icon: Bell,
        'data-testid': 'open-alerts',
      },
      {
        title: 'On-time Rate',
        value: '...',
        change: '',
        trend: 'stable',
        icon: Activity,
        'data-testid': 'on-time-rate',
      },
    ];

    // **FIXED:** เพิ่ม Guard Clause เพื่อป้องกัน Runtime Error
    if (isLoading || error || !trucks || !alerts) {
      return loadingMetrics;
    }

    // ตรวจสอบให้แน่ใจว่าเป็น Array ก่อนใช้งาน
    if (!Array.isArray(trucks) || !Array.isArray(alerts)) {
      console.error('API did not return an array for trucks or alerts', {
        trucks,
        alerts,
      });
      return loadingMetrics;
    }

    const activeTrucks = trucks.length;
    const totalTemp = trucks.reduce((sum, truck) => sum + truck.temp, 0);
    const avgTemp =
      activeTrucks > 0 ? (totalTemp / activeTrucks).toFixed(1) : '0.0';
    const openAlerts = alerts.filter(
      (alert) => alert.level === 'warn' || alert.level === 'critical',
    ).length;

    return [
      {
        title: 'Active Trucks',
        value: activeTrucks.toString(),
        change: '+1',
        trend: 'up',
        icon: Truck,
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
        value: openAlerts.toString(),
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
  }, [trucks, alerts, isLoading, error]);

  return { metrics, isLoading, error };
};

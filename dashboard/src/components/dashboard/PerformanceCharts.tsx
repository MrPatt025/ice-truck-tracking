// dashboard/src/components/dashboard/PerformanceCharts.tsx
'use client';

import type { JSX } from 'react';
import { useStats } from '@/shared/hooks/useStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/Card';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

function Skeleton(): JSX.Element {
  return (
    <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
  );
}

export function PerformanceCharts(): JSX.Element {
  const { data, isLoading, isError } = useStats('24h');
  const revenue = useMemo(() => data?.revenueSeries ?? [], [data]);
  const alerts = useMemo(() => data?.alertsSeries ?? [], [data]);

  if (isLoading) return <Skeleton />;
  if (isError || !data) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
        Failed to load charts.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenue}
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={alerts}
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="info" stackId="a" fill="#38bdf8" />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

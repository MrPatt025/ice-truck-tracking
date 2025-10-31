// @ts-nocheck
'use client';
import React, { memo, useMemo } from 'react';
import ChartContainer from '@/components/ChartContainer';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  Line,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// Shared tooltip used across charts
const formatLocalTick = (v: string | number): string => {
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const CustomTooltip = memo(
  ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ color?: string; name?: string; value?: number | string }>;
    label?: string | number;
  }) => {
    if (!active || !payload) return null;
    const meta = (payload[0] as any)?.payload ?? {};
    const reqId: string | undefined =
      meta.requestId ?? meta.reqId ?? meta.request_id;
    return (
      <div
        className="rounded-xl bg-slate-950/95 px-4 py-3 ring-1 ring-white/20 backdrop-blur-xl shadow-2xl"
        data-request-id={reqId ?? undefined}
        aria-label={reqId ? `request ${reqId}` : undefined}
        title={reqId ? `request ${reqId}` : undefined}
      >
        <p className="mb-2 text-sm font-semibold text-white">{label}</p>
        {payload.map((p, i) => {
          const raw = (p as any)?.value as any;
          const display: string | null = Number.isFinite(raw)
            ? (raw as number).toFixed(2)
            : raw != null
              ? String(raw)
              : null;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: p.color }}
              />
              <span className="text-slate-300">{p.name}</span>
              <span
                className="inline-block h-1 w-1 rounded-full bg-slate-500/60"
                aria-hidden="true"
              />
              <span className="font-semibold text-white">{display}</span>
            </div>
          );
        })}
        {/* request-id is exposed via data-request-id, aria-label, and title to avoid text lint */}
      </div>
    );
  },
);

export const MetricSparkline = memo(
  ({ data, color }: { data: number[]; color: string }) => {
    const chartData = data.map((v) => ({ value: v }));
    return (
      <div
        className="mt-3 h-12 w-full opacity-90"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      >
        <ChartContainer minHeight={48}>
          {(size) => (
            <ResponsiveContainer width={size.width} height={size.height}>
              <LineChart
                data={chartData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  fill="url(#sparkArea)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{
                    r: 4,
                    stroke: color,
                    strokeWidth: 2,
                    fill: '#fff',
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>
    );
  },
);

export const RevenueChart = memo(
  ({
    data,
  }: {
    data: Array<{ date: string; value: number; previous: number }>;
  }) => {
    const isEmpty = useMemo(
      () =>
        !data?.length ||
        data.every((p) => (p.value || 0) === 0 && (p.previous || 0) === 0),
      [data],
    );
    return (
      <ChartContainer
        empty={isEmpty}
        emptyMessage="No revenue data"
        minHeight={240}
      >
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height}>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="areaA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.2}
              />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatLocalTick}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}K`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="value"
                name="Current Revenue"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#areaA)"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="previous"
                name="Previous Avg"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="8 8"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  },
);

export const FleetChart = memo(
  ({
    data,
  }: {
    data: Array<{ hour: string; trucks: number; efficiency: number }>;
  }) => {
    const isEmpty = useMemo(
      () =>
        !data?.length ||
        data.every((p) => (p.trucks || 0) === 0 && (p.efficiency || 0) === 0),
      [data],
    );
    return (
      <ChartContainer
        empty={isEmpty}
        emptyMessage="No fleet activity"
        minHeight={240}
      >
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height}>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.2}
              />
              <XAxis
                dataKey="hour"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatLocalTick}
              />
              <YAxis
                yAxisId="left"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
              <Bar
                yAxisId="left"
                dataKey="trucks"
                name="Active Trucks"
                fill="#06b6d4"
                radius={[6, 6, 0, 0]}
                minPointSize={3}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiency"
                name="Efficiency %"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  },
);

export const AlertsChart = memo(
  ({
    data,
  }: {
    data: Array<{
      time: string;
      critical: number;
      warning: number;
      info: number;
    }>;
  }) => {
    const isEmpty = useMemo(
      () =>
        !data?.length ||
        data.every(
          (p) =>
            (p.critical || 0) === 0 &&
            (p.warning || 0) === 0 &&
            (p.info || 0) === 0,
        ),
      [data],
    );
    return (
      <ChartContainer
        empty={isEmpty}
        emptyMessage="No alerts in range"
        minHeight={240}
      >
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="critical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="warning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="info" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.2}
              />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatLocalTick}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                name="Critical"
                stroke="#ef4444"
                fill="url(#critical)"
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="warning"
                stackId="1"
                name="Warning"
                stroke="#f59e0b"
                fill="url(#warning)"
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="info"
                stackId="1"
                name="Info"
                stroke="#06b6d4"
                fill="url(#info)"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  },
);

export const TempDistributionPie = memo(
  ({
    data,
    innerRadius,
    outerRadius,
    showLegend,
    showLabels,
  }: {
    data: Array<{ name: string; value: number; color: string }>;
    innerRadius: number;
    outerRadius: number;
    showLegend?: boolean;
    showLabels?: boolean;
  }) => {
    const isEmpty = useMemo(
      () => !data?.length || data.every((b) => (b.value || 0) === 0),
      [data],
    );
    return (
      <ChartContainer
        empty={isEmpty}
        emptyMessage="No temperature data"
        minHeight={240}
      >
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={4}
                dataKey="value"
                label={!!showLabels}
              >
                {data.map((b, i) => (
                  <Cell
                    key={i}
                    fill={b.color}
                    stroke="#0d121c"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend ? <Legend /> : null}
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  },
);

export const PerformanceRadar = memo(
  ({
    data,
    compact = true,
  }: {
    data: Array<{ subject: string; A: number }>;
    compact?: boolean;
  }) => {
    const isEmpty = useMemo(
      () => !data?.length || data.every((p) => (p.A || 0) === 0),
      [data],
    );
    return (
      <ChartContainer
        empty={isEmpty}
        emptyMessage="No performance data"
        minHeight={240}
      >
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height}>
            <RadarChart data={data}>
              <PolarGrid stroke="#334155" opacity={compact ? 0.3 : 1} />
              <PolarAngleAxis
                dataKey="subject"
                stroke="#94a3b8"
                tick={{ fontSize: compact ? 12 : 14 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                stroke="#94a3b8"
                tick={{ fontSize: compact ? 11 : 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Radar
                name="Score"
                dataKey="A"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                animationDuration={compact ? 1500 : undefined}
                strokeWidth={compact ? 2 : 3}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: compact ? 15 : 10,
                  fontSize: compact ? '12px' : '14px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    );
  },
);

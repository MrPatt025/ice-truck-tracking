'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SectionErrorBoundary } from '@/components/common/SectionErrorBoundary'
import {
  analyticsDataSchema,
  type AnalyticsData,
} from '@/lib/schemas/telemetry'

type TimeRange = '24h' | '7d' | '30d'

const MOCK_ANALYTICS: Record<TimeRange, unknown> = {
  '24h': {
    dailyDistance: [
      { date: '00:00', distance: 16 },
      { date: '04:00', distance: 22 },
      { date: '08:00', distance: 18 },
      { date: '12:00', distance: 31 },
      { date: '16:00', distance: 28 },
      { date: '20:00', distance: 19 },
    ],
    truckUtilization: [
      { truck: 'Truck-001', utilization: 81 },
      { truck: 'Truck-002', utilization: 88 },
      { truck: 'Truck-003', utilization: 74 },
      { truck: 'Truck-004', utilization: 79 },
    ],
    alertFrequency: [
      { type: 'Geofence', count: 4 },
      { type: 'Temperature', count: 3 },
      { type: 'Speed', count: 5 },
      { type: 'Offline', count: 1 },
    ],
    performanceMetrics: {
      avgResponseTime: 121,
      successRate: 99.5,
      activeConnections: 31,
    },
  },
  '7d': {
    dailyDistance: [
      { date: 'Mon', distance: 245 },
      { date: 'Tue', distance: 312 },
      { date: 'Wed', distance: 189 },
      { date: 'Thu', distance: 278 },
      { date: 'Fri', distance: 356 },
      { date: 'Sat', distance: 298 },
      { date: 'Sun', distance: 334 },
    ],
    truckUtilization: [
      { truck: 'Truck-001', utilization: 85 },
      { truck: 'Truck-002', utilization: 92 },
      { truck: 'Truck-003', utilization: 78 },
      { truck: 'Truck-004', utilization: 88 },
      { truck: 'Truck-005', utilization: 83 },
    ],
    alertFrequency: [
      { type: 'Geofence', count: 12 },
      { type: 'Temperature', count: 8 },
      { type: 'Speed', count: 15 },
      { type: 'Offline', count: 5 },
    ],
    performanceMetrics: {
      avgResponseTime: 145,
      successRate: 99.2,
      activeConnections: 24,
    },
  },
  '30d': {
    dailyDistance: [
      { date: 'W1', distance: 1260 },
      { date: 'W2', distance: 1330 },
      { date: 'W3', distance: 1194 },
      { date: 'W4', distance: 1412 },
    ],
    truckUtilization: [
      { truck: 'Truck-001', utilization: 87 },
      { truck: 'Truck-002', utilization: 90 },
      { truck: 'Truck-003', utilization: 76 },
      { truck: 'Truck-004', utilization: 84 },
      { truck: 'Truck-005', utilization: 82 },
      { truck: 'Truck-006', utilization: 80 },
    ],
    alertFrequency: [
      { type: 'Geofence', count: 39 },
      { type: 'Temperature', count: 22 },
      { type: 'Speed', count: 47 },
      { type: 'Offline', count: 14 },
    ],
    performanceMetrics: {
      avgResponseTime: 139,
      successRate: 98.9,
      activeConnections: 28,
    },
  },
}

function StatCard({
  title,
  value,
  hint,
}: Readonly<{
  title: string
  value: string
  hint: string
}>): JSX.Element {
  return (
    <div className='rounded-2xl border border-white/15 bg-slate-900/60 p-4'>
      <p className='text-xs uppercase tracking-wider text-slate-400'>{title}</p>
      <p className='mt-2 text-2xl font-semibold text-slate-100'>{value}</p>
      <p className='mt-1 text-xs text-slate-400'>{hint}</p>
    </div>
  )
}

function AnalyticsSkeleton(): JSX.Element {
  return (
    <div className='space-y-6 animate-pulse' aria-hidden='true'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='h-24 rounded-2xl bg-slate-800/70' />
        <div className='h-24 rounded-2xl bg-slate-800/70' />
        <div className='h-24 rounded-2xl bg-slate-800/70' />
      </div>
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <div className='h-80 rounded-2xl bg-slate-800/70' />
        <div className='h-80 rounded-2xl bg-slate-800/70' />
      </div>
      <div className='h-72 rounded-2xl bg-slate-800/70' />
    </div>
  )
}

export function AnalyticsDashboard(): JSX.Element {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadAnalytics = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        // Mocked network delay to exercise loading and fallback states.
        await new Promise(resolve => setTimeout(resolve, 260))
        const parsed = analyticsDataSchema.safeParse(MOCK_ANALYTICS[timeRange])

        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0]
          throw new Error(firstIssue?.message ?? 'Invalid analytics payload')
        }

        if (!cancelled) {
          setData(parsed.data)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Analytics failed to load'
          )
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [timeRange])

  const totalAlerts = useMemo(() => {
    if (!data) return 0
    return data.alertFrequency.reduce((sum, item) => sum + item.count, 0)
  }, [data])

  return (
    <SectionErrorBoundary title='Analytics dashboard'>
      <section className='space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur'>
        <header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight text-slate-100'>
              Fleet Intelligence
            </h2>
            <p className='mt-1 text-sm text-slate-400'>
              Validated telemetry analytics with resilient loading and failure
              handling.
            </p>
          </div>

          <label
            className='flex items-center gap-2 text-sm text-slate-300'
            htmlFor='analytics-time-range'
          >
            <span>Time range</span>
            <select
              id='analytics-time-range'
              value={timeRange}
              onChange={event => {
                setTimeRange(event.target.value as TimeRange)
              }}
              className='rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400'
            >
              <option value='24h'>Last 24 Hours</option>
              <option value='7d'>Last 7 Days</option>
              <option value='30d'>Last 30 Days</option>
            </select>
          </label>
        </header>

        {isLoading ? <AnalyticsSkeleton /> : null}

        {!isLoading && error ? (
          <div className='rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100'>
            Analytics degraded: {error}. Showing no chart data until payload is
            valid.
          </div>
        ) : null}

        {!isLoading && data ? (
          <>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <StatCard
                title='Avg Response Time'
                value={`${Math.round(data.performanceMetrics.avgResponseTime)} ms`}
                hint='Gateway to API roundtrip'
              />
              <StatCard
                title='Success Rate'
                value={`${data.performanceMetrics.successRate.toFixed(1)}%`}
                hint='Successful telemetry ingest'
              />
              <StatCard
                title='Total Alerts'
                value={totalAlerts.toString()}
                hint={`${data.performanceMetrics.activeConnections} active connections`}
              />
            </div>

            <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
              <article className='rounded-2xl border border-white/10 bg-slate-900/60 p-4'>
                <h3 className='text-sm font-medium text-slate-200'>
                  Distance Trend
                </h3>
                <p className='mb-3 text-xs text-slate-400'>
                  Distance per interval
                </p>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={data.dailyDistance}>
                      <CartesianGrid
                        stroke='rgba(148,163,184,0.2)'
                        strokeDasharray='4 4'
                      />
                      <XAxis
                        dataKey='date'
                        stroke='#94a3b8'
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis
                        stroke='#94a3b8'
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: 'rgba(148,163,184,0.35)',
                          color: '#e2e8f0',
                        }}
                      />
                      <Line
                        type='monotone'
                        dataKey='distance'
                        stroke='#22d3ee'
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className='rounded-2xl border border-white/10 bg-slate-900/60 p-4'>
                <h3 className='text-sm font-medium text-slate-200'>
                  Truck Utilization
                </h3>
                <p className='mb-3 text-xs text-slate-400'>
                  Utilization by unit
                </p>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={data.truckUtilization}>
                      <CartesianGrid
                        stroke='rgba(148,163,184,0.2)'
                        strokeDasharray='4 4'
                      />
                      <XAxis
                        dataKey='truck'
                        stroke='#94a3b8'
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis
                        stroke='#94a3b8'
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: 'rgba(148,163,184,0.35)',
                          color: '#e2e8f0',
                        }}
                      />
                      <Bar
                        dataKey='utilization'
                        fill='#38bdf8'
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>

            <article className='rounded-2xl border border-white/10 bg-slate-900/60 p-4'>
              <h3 className='text-sm font-medium text-slate-200'>
                Alert Distribution
              </h3>
              <p className='mb-3 text-xs text-slate-400'>
                Volume by alert type
              </p>
              <div className='h-60'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={data.alertFrequency}>
                    <CartesianGrid
                      stroke='rgba(148,163,184,0.2)'
                      strokeDasharray='4 4'
                    />
                    <XAxis
                      dataKey='type'
                      stroke='#94a3b8'
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis
                      stroke='#94a3b8'
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(148,163,184,0.35)',
                        color: '#e2e8f0',
                      }}
                    />
                    <Bar dataKey='count' fill='#f59e0b' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </>
        ) : null}
      </section>
    </SectionErrorBoundary>
  )
}


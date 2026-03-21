'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, Truck } from 'lucide-react'
import AppSidebar from '@/components/AppSidebar'
import { SectionErrorBoundary } from '@/components/common/SectionErrorBoundary'
import { VirtualizedFleetGrid } from '@/components/fleet/VirtualizedFleetGrid'
import { cn } from '@/lib/utils'
import {
  fleetTruckRowsSchema,
  truckStatusSchema,
  type FleetTruckRow,
} from '@/lib/schemas/telemetry'
import { hasPermission, useAuthStore } from '@/stores/authStore'

type FleetStatusFilter =
  | 'all'
  | 'active'
  | 'idle'
  | 'maintenance'
  | 'offline'
  | 'alert'

const ALL_FILTERS: FleetStatusFilter[] = ['all', ...truckStatusSchema.options]

const API_BASE = (() => {
  const configuredApiRoot = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configuredApiRoot) {
    return `${configuredApiRoot
      .replace(/\/+$/, '')
      .replace(/\/api(?:\/v1)?$/i, '')}/api/v1`
  }

  if (
    globalThis.window !== undefined &&
    /^(localhost|127\.0\.0\.1)$/i.test(globalThis.window.location.hostname)
  ) {
    return '/api/v1'
  }

  return 'http://localhost:5000/api/v1'
})()

function createTrend(seed: number): number[] {
  return Array.from({ length: 24 }, (_, idx) => {
    const wave = Math.sin((idx + seed) / 3.2)
    const drift = (idx / 24) * 0.8
    const noise = ((seed * 13 + idx * 7) % 10) / 15
    return -18 + wave * 2.4 + drift + noise
  })
}

function createMockRows(count: number): FleetTruckRow[] {
  const statuses = truckStatusSchema.options
  const drivers = [
    'Somchai K.',
    'Prasert W.',
    'Nattapong S.',
    'Kittisak P.',
    'Wichai M.',
    'Anong T.',
    'Piyapong C.',
    'Surasak L.',
  ]

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[i % statuses.length]
    return {
      id: `truck-${String(i + 1).padStart(4, '0')}`,
      name: `ICE-${String(i + 1).padStart(4, '0')}`,
      plateNumber: `TH-${1000 + i}`,
      status,
      driver: drivers[i % drivers.length],
      temperature: -18 + (i % 7) * 0.9,
      humidity: 48 + (i % 18),
      speed: status === 'active' ? 38 + (i % 40) : 0,
      fuelLevel: 20 + (i % 80),
      batteryLevel: 55 + (i % 45),
      lat: 13.75 + (i % 11) * 0.11,
      lng: 100.55 + (i % 11) * 0.06,
      lastUpdate: new Date(Date.now() - (i % 3600) * 1000).toISOString(),
      totalDistance: 12000 + i * 47,
      deliveries: i % 420,
      route: i % 2 === 0 ? 'Bangkok → Chiang Mai' : 'Eastern Seaboard',
      temperatureTrend: createTrend(i + 1),
    }
  })
}

function FleetGridSkeleton() {
  return (
    <div className='rounded-2xl border border-white/15 bg-slate-900/40 p-4'>
      <div className='mb-4 h-5 w-56 animate-pulse rounded bg-white/10' />
      <div className='space-y-2'>
        {Array.from({ length: 10 }, (_, idx) => (
          <div
            key={idx}
            className='grid grid-cols-[1.1fr_0.75fr_0.95fr_0.85fr_0.65fr_0.95fr_0.8fr_0.7fr] gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3'
          >
            {Array.from({ length: 8 }, (_, cellIdx) => (
              <div
                key={cellIdx}
                className='h-5 animate-pulse rounded bg-white/10'
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FleetManagementPage() {
  const user = useAuthStore(s => s.user)
  const canEdit = hasPermission(user?.role, 'fleet:edit')
  const canDelete = hasPermission(user?.role, 'fleet:delete')

  const [rows, setRows] = useState<FleetTruckRow[]>([])
  const [statusFilter, setStatusFilter] = useState<FleetStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadRows = async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/trucks`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Fleet API unavailable: ${response.status}`)
        }

        const payload: unknown = await response.json()
        const parsed = fleetTruckRowsSchema.safeParse(payload)

        if (!parsed.success) {
          throw new Error('Telemetry validation failed for fleet payload')
        }

        setRows(parsed.data)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Network interruption'
        setError(message)

        const fallbackRows = createMockRows(2400)
        const parsedFallback = fleetTruckRowsSchema.safeParse(fallbackRows)
        if (parsedFallback.success) {
          setRows(parsedFallback.data)
        }
      } finally {
        setLoading(false)
      }
    }

    loadRows()

    return () => {
      controller.abort()
    }
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter(row => {
      const statusMatch = statusFilter === 'all' || row.status === statusFilter
      const queryMatch =
        query.length === 0 ||
        row.name.toLowerCase().includes(query) ||
        row.driver.toLowerCase().includes(query) ||
        row.plateNumber.toLowerCase().includes(query) ||
        row.route?.toLowerCase().includes(query)

      return statusMatch && queryMatch
    })
  }, [rows, search, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<FleetStatusFilter, number> = {
      all: rows.length,
      active: 0,
      idle: 0,
      maintenance: 0,
      offline: 0,
      alert: 0,
    }

    for (const row of rows) {
      counts[row.status] += 1
    }

    return counts
  }, [rows])

  return (
    <AppSidebar>
      <div className='mx-auto max-w-[1700px] space-y-5 p-4 lg:p-6'>
        <header className='flex flex-col gap-3 rounded-2xl border border-white/15 bg-slate-900/40 p-5 backdrop-blur-2xl md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='flex items-center gap-2 text-2xl font-bold text-slate-100'>
              <Truck className='h-7 w-7 text-cyan-300' />
              Fleet Management
            </h1>
            <p className='mt-1 text-sm text-slate-400'>
              High-density live telemetry grid with virtualization and micro
              trend charts.
            </p>
            {error ? (
              <p className='mt-2 text-xs text-amber-300'>
                Running in graceful degraded mode: {error}
              </p>
            ) : null}
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              className='inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]'
            >
              <Download className='h-4 w-4' />
              Export
            </button>
            {canEdit ? (
              <button
                type='button'
                className='inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400'
              >
                <Plus className='h-4 w-4' />
                Add Vehicle
              </button>
            ) : null}
          </div>
        </header>

        <section className='rounded-2xl border border-white/15 bg-slate-900/40 p-4 backdrop-blur-2xl'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex flex-wrap items-center gap-2'>
              {ALL_FILTERS.map(filter => (
                <button
                  key={filter}
                  type='button'
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition',
                    statusFilter === filter
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  )}
                >
                  {filter === 'all'
                    ? 'All'
                    : `${filter[0].toUpperCase()}${filter.slice(1)}`}
                  <span className='ml-1 opacity-70'>
                    ({statusCounts[filter]})
                  </span>
                </button>
              ))}
            </div>

            <div className='relative w-full lg:w-[440px]'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                type='text'
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder='Search by truck, plate, driver, route...'
                className='w-full rounded-lg border border-white/15 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/35'
                data-testid='fleet-grid-search'
              />
            </div>
          </div>
        </section>

        <SectionErrorBoundary title='Fleet grid'>
          {loading ? (
            <FleetGridSkeleton />
          ) : (
            <VirtualizedFleetGrid
              rows={filteredRows}
              canEdit={canEdit}
              canDelete={canDelete}
              onSelectRow={setSelectedRow}
            />
          )}
        </SectionErrorBoundary>

        <section className='rounded-2xl border border-white/15 bg-slate-900/40 p-4 backdrop-blur-2xl'>
          <p className='text-sm text-slate-300'>
            Showing{' '}
            <span className='font-semibold text-slate-100'>
              {filteredRows.length}
            </span>{' '}
            validated rows
            {selectedRow ? (
              <span>
                {' '}
                • Selected:{' '}
                <span className='font-mono text-cyan-300'>{selectedRow}</span>
              </span>
            ) : null}
          </p>
        </section>
      </div>
    </AppSidebar>
  )
}

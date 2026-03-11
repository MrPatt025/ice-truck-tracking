'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Search, ChevronDown, ChevronUp,
  MapPin, Thermometer, Fuel, Gauge, Battery, ArrowUpDown,
  Eye, Edit, Trash2, Download, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { truckStatusColors } from '@/lib/tokens';
import AppSidebar from '@/components/AppSidebar';
import { useAuthStore, hasPermission } from '@/stores/authStore';
import type { TruckResponse } from '@/services/api';

// ── Mock Data Generator ────────────────────────────────────
function generateMockTrucks(count: number): TruckResponse[] {
  const statuses: TruckResponse['status'][] = [
    'active',
    'idle',
    'maintenance',
    'offline',
    'alert',
  ]
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
  const routes = [
    'Bangkok → Chiang Mai',
    'Phuket → Surat Thani',
    'Nonthaburi Loop',
    'Eastern Seaboard',
    'Isaan Ring',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `truck-${String(i + 1).padStart(3, '0')}`,
    name: `ICE-${String(i + 1).padStart(3, '0')}`,
    plateNumber: `${String.fromCodePoint(65 + (i % 26))}${String.fromCodePoint(65 + ((i * 7) % 26))}-${1000 + i}`,
    status: statuses[i % statuses.length],
    driver: drivers[i % drivers.length],
    temperature: -18 + Math.random() * 10,
    humidity: 30 + Math.random() * 40,
    speed:
      statuses[i % statuses.length] === 'active' ? 40 + Math.random() * 60 : 0,
    fuelLevel: 20 + Math.random() * 80,
    batteryLevel: 50 + Math.random() * 50,
    lat: 13.7 + Math.random() * 5,
    lng: 100.5 + Math.random() * 3,
    lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    totalDistance: 1000 + Math.random() * 50000,
    deliveries: Math.floor(Math.random() * 500),
    route: routes[i % routes.length],
  }))
}

type SortKey =
  | 'name'
  | 'status'
  | 'temperature'
  | 'speed'
  | 'fuelLevel'
  | 'driver'
  | 'lastUpdate'
type SortDir = 'asc' | 'desc'

function SortIcon({
  col,
  sortKey,
  sortDir,
}: Readonly<{ col: SortKey; sortKey: SortKey; sortDir: SortDir }>) {
  if (sortKey !== col) return <ArrowUpDown className='w-3 h-3 opacity-40' />
  return sortDir === 'asc' ? (
    <ChevronUp className='w-3 h-3' />
  ) : (
    <ChevronDown className='w-3 h-3' />
  )
}

export default function FleetManagementPage() {
  const user = useAuthStore(s => s.user)
  const canEdit = hasPermission(user?.role, 'fleet:edit')
  const canDelete = hasPermission(user?.role, 'fleet:delete')

  const [trucks] = useState<TruckResponse[]>(() => generateMockTrucks(50))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null)
  const pageSize = 12

  // ── Derived Data ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = trucks

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.plateNumber.toLowerCase().includes(q) ||
          t.driver.toLowerCase().includes(q) ||
          t.route?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

    return result
  }, [trucks, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: trucks.length }
    for (const t of trucks) counts[t.status] = (counts[t.status] || 0) + 1
    return counts
  }, [trucks])

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
    },
    [sortKey]
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  return (
    <AppSidebar>
      <div className='p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold flex items-center gap-2'>
              <Truck className='w-7 h-7 text-primary' />
              Fleet Management
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>
              Monitor and manage {trucks.length} vehicles in real-time
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button className='px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2 transition-colors'>
              <Download className='w-4 h-4' />
              <span className='hidden sm:inline'>Export</span>
            </button>
            {canEdit && (
              <button className='px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors'>
                <Plus className='w-4 h-4' />
                <span className='hidden sm:inline'>Add Vehicle</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className='flex items-center gap-2 overflow-x-auto pb-1'>
          {(
            [
              'all',
              'active',
              'idle',
              'maintenance',
              'offline',
              'alert',
            ] as const
          ).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {status === 'all'
                ? 'All'
                : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className='ml-1 opacity-70'>
                ({statusCounts[status] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search by name, plate, driver, or route...'
            className='w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
          />
        </div>

        {/* Table */}
        <div className='bg-card rounded-xl border border-border overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50 border-b border-border'>
                <tr>
                  {(
                    [
                      ['name', 'Vehicle'],
                      ['status', 'Status'],
                      ['driver', 'Driver'],
                      ['temperature', 'Temp'],
                      ['speed', 'Speed'],
                      ['fuelLevel', 'Fuel'],
                      ['lastUpdate', 'Last Update'],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className='px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap'
                    >
                      <span className='inline-flex items-center gap-1'>
                        {label}
                        <SortIcon
                          col={key}
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                  ))}
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground w-20'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {paged.map(truck => {
                  const statusStyle =
                    truckStatusColors[truck.status] || truckStatusColors.offline
                  return (
                    <motion.tr
                      key={truck.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        'hover:bg-muted/30 transition-colors cursor-pointer',
                        selectedTruck === truck.id && 'bg-primary/5'
                      )}
                      onClick={() =>
                        setSelectedTruck(
                          selectedTruck === truck.id ? null : truck.id
                        )
                      }
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              statusStyle.dot
                            )}
                          />
                          <div>
                            <p className='font-medium'>{truck.name}</p>
                            <p className='text-xs text-muted-foreground'>
                              {truck.plateNumber}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            statusStyle.bg,
                            statusStyle.text
                          )}
                        >
                          {truck.status}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {truck.driver}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={cn(
                            'font-mono',
                            truck.temperature > -10
                              ? 'text-amber-500'
                              : 'text-blue-500'
                          )}
                        >
                          {truck.temperature.toFixed(1)}°C
                        </span>
                      </td>
                      <td className='px-4 py-3 font-mono'>
                        {truck.speed.toFixed(0)} km/h
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <div className='w-16 h-1.5 rounded-full bg-muted overflow-hidden'>
                            <div
                              className={cn(
                                'h-full rounded-full',
                                truck.fuelLevel > 30
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${truck.fuelLevel}%` }} // NOSONAR — dynamic percentage
                            />
                          </div>
                          <span className='text-xs text-muted-foreground'>
                            {truck.fuelLevel.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-xs text-muted-foreground whitespace-nowrap'>
                        {new Date(truck.lastUpdate).toLocaleTimeString()}
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <button
                            className='p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                            title='View details'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          {canEdit && (
                            <button
                              className='p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                              title='Edit'
                            >
                              <Edit className='w-4 h-4' />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className='p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors'
                              title='Delete'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/30'>
            <p className='text-sm text-muted-foreground'>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}{' '}
              vehicles
            </p>
            <div className='flex items-center gap-1'>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className='px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-md text-sm transition-colors',
                      p === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className='px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Selected Truck Detail Panel */}
        <AnimatePresence>
          {selectedTruck && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='overflow-hidden'
            >
              {(() => {
                const t = trucks.find(tr => tr.id === selectedTruck)
                if (!t) return null
                return (
                  <div className='bg-card rounded-xl border border-border p-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className='text-lg font-semibold'>
                        {t.name} — {t.plateNumber}
                      </h3>
                      <button
                        onClick={() => setSelectedTruck(null)}
                        className='text-muted-foreground hover:text-foreground'
                      >
                        ✕
                      </button>
                    </div>
                    <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                      {[
                        {
                          icon: MapPin,
                          label: 'Route',
                          value: t.route || '—',
                          color: 'text-blue-500',
                        },
                        {
                          icon: Thermometer,
                          label: 'Temperature',
                          value: `${t.temperature.toFixed(1)}°C`,
                          color: 'text-cyan-500',
                        },
                        {
                          icon: Gauge,
                          label: 'Speed',
                          value: `${t.speed.toFixed(0)} km/h`,
                          color: 'text-amber-500',
                        },
                        {
                          icon: Fuel,
                          label: 'Fuel',
                          value: `${t.fuelLevel.toFixed(0)}%`,
                          color: 'text-green-500',
                        },
                        {
                          icon: Battery,
                          label: 'Battery',
                          value: `${t.batteryLevel.toFixed(0)}%`,
                          color: 'text-purple-500',
                        },
                        {
                          icon: Truck,
                          label: 'Deliveries',
                          value: String(t.deliveries),
                          color: 'text-primary',
                        },
                      ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className='space-y-1'>
                          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                            <Icon className={cn('w-3 h-3', color)} />
                            {label}
                          </div>
                          <p className='font-medium'>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppSidebar>
  )
}

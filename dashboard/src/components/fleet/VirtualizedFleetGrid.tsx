'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { truckStatusColors } from '@/lib/tokens'
import type { FleetTruckRow } from '@/lib/schemas/telemetry'
import { TemperatureSparkline } from '@/components/fleet/TemperatureSparkline'

interface VirtualizedFleetGridProps {
  rows: FleetTruckRow[]
  canEdit: boolean
  canDelete: boolean
  onSelectRow?: (rowId: string) => void
}

const ROW_HEIGHT = 66
const OVERSCAN = 8

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString()
}

export function VirtualizedFleetGrid({
  rows,
  canEdit,
  canDelete,
  onSelectRow,
}: Readonly<VirtualizedFleetGridProps>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(640)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onScroll = (): void => {
      setScrollTop(viewport.scrollTop)
    }

    const updateHeight = (): void => {
      setViewportHeight(Math.max(viewport.clientHeight, 320))
    }

    viewport.addEventListener('scroll', onScroll, { passive: true })
    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(viewport)

    return () => {
      viewport.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  const totalHeight = rows.length * ROW_HEIGHT

  const windowed = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN
    )
    const count = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2
    const endIndex = Math.min(rows.length, startIndex + count)
    return {
      startIndex,
      endIndex,
      visibleRows: rows.slice(startIndex, endIndex),
    }
  }, [rows, scrollTop, viewportHeight])

  return (
    <div className='rounded-2xl border border-white/15 bg-slate-900/40 backdrop-blur-2xl'>
      <div className='grid grid-cols-[1.1fr_0.75fr_0.95fr_0.85fr_0.65fr_0.95fr_0.8fr_0.7fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300'>
        <span>Vehicle</span>
        <span>Status</span>
        <span>Driver</span>
        <span>Temp</span>
        <span>Speed</span>
        <span>Trend</span>
        <span>Last Update</span>
        <span className='text-right'>Actions</span>
      </div>

      <div
        ref={viewportRef}
        className='relative h-[68vh] min-h-[460px] overflow-auto'
        data-testid='fleet-grid-viewport'
      >
        <div style={{ height: `${totalHeight}px` }} className='relative'>
          {windowed.visibleRows.map((row, index) => {
            const rowIndex = windowed.startIndex + index
            const top = rowIndex * ROW_HEIGHT
            const statusStyle =
              truckStatusColors[row.status] ?? truckStatusColors.offline

            return (
              <div
                key={row.id}
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: 0,
                  right: 0,
                  height: `${ROW_HEIGHT}px`,
                }}
                className='grid grid-cols-[1.1fr_0.75fr_0.95fr_0.85fr_0.65fr_0.95fr_0.8fr_0.7fr] items-center gap-3 border-b border-white/10 px-4 text-left text-sm text-slate-100 transition hover:bg-white/5'
                data-testid='fleet-grid-row'
              >
                <button
                  type='button'
                  onClick={() => {
                    onSelectRow?.(row.id)
                  }}
                  className='min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60'
                  aria-label={`Select ${row.name}`}
                >
                  <p className='truncate font-medium'>{row.name}</p>
                  <p className='truncate text-xs text-slate-400'>
                    {row.plateNumber}
                  </p>
                </button>

                <span
                  className={cn(
                    'inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium',
                    statusStyle.bg,
                    statusStyle.text
                  )}
                >
                  {row.status}
                </span>

                <span className='truncate text-slate-300'>{row.driver}</span>

                <span
                  className={cn(
                    'font-mono',
                    row.temperature > -10 ? 'text-amber-300' : 'text-cyan-300'
                  )}
                >
                  {row.temperature.toFixed(1)}°C
                </span>

                <span className='font-mono text-slate-300'>
                  {row.speed.toFixed(0)}
                </span>

                <div className='flex items-center'>
                  <TemperatureSparkline values={row.temperatureTrend} />
                </div>

                <span className='text-xs text-slate-400'>
                  {formatTime(row.lastUpdate)}
                </span>

                <div className='flex items-center justify-end gap-1'>
                  <button
                    type='button'
                    className='rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100'
                    title='View details'
                    aria-label='View details'
                  >
                    <Eye className='h-4 w-4' />
                  </button>

                  {canEdit ? (
                    <button
                      type='button'
                      className='rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100'
                      title='Edit truck'
                      aria-label='Edit truck'
                    >
                      <Edit className='h-4 w-4' />
                    </button>
                  ) : null}

                  {canDelete ? (
                    <button
                      type='button'
                      className='rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/20 hover:text-red-300'
                      title='Delete truck'
                      aria-label='Delete truck'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client'

import React from 'react'

/**
 * Skeleton Loading Components — WCAG 2.1 AA compliant
 * Provides visual feedback during async data loading.
 */

const cn = (...classes: (string | undefined | false)[]) =>
  classes.filter(Boolean).join(' ')

interface SkeletonProps {
  readonly className?: string
  readonly width?: string | number
  readonly height?: string | number
}

/** Base skeleton pulse */
export function Skeleton({
  className,
  width,
  height,
}: Readonly<SkeletonProps>) {
  return (
    <output aria-label='Loading'>
      <div
        className={cn('animate-pulse rounded-md bg-muted', className)}
        style={{ width, height }} /* NOSONAR — dynamic sizing, cannot be static CSS */
      />
    </output>
  )
}

/** Skeleton card for dashboard panels */
export function SkeletonCard() {
  return (
    <output aria-label='Loading card'>
      <div className='rounded-xl border bg-card p-6 shadow-sm'>
        <div className='space-y-4'>
          <Skeleton className='h-4 w-1/3' />
          <Skeleton className='h-8 w-2/3' />
          <div className='flex gap-2'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-3 w-20' />
          </div>
        </div>
      </div>
    </output>
  )
}

/** Skeleton row for table/list views */
export function SkeletonRow() {
  return (
    <output aria-label='Loading row'>
      <div className='flex items-center gap-4 py-3'>
        <Skeleton className='h-10 w-10 rounded-full' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
        </div>
        <Skeleton className='h-6 w-16 rounded-full' />
      </div>
    </output>
  )
}

/** Skeleton for the map component */
export function SkeletonMap() {
  return (
    <output aria-label='Loading map'>
      <div className='relative h-[500px] w-full rounded-xl bg-muted'>
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <div className='h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary' />
            <span className='text-sm text-muted-foreground'>
              Loading map...
            </span>
          </div>
        </div>
      </div>
    </output>
  )
}

/** Stable keys for skeleton stat cards */
const STAT_KEYS = ['revenue', 'trips', 'alerts', 'trucks'] as const
/** Stable keys for skeleton table rows */
const ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] as const

/** Skeleton for the full dashboard page */
export function DashboardSkeleton() {
  return (
    <output aria-label='Loading dashboard'>
      <div className='space-y-6 p-6'>
        {/* Stats row */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {STAT_KEYS.map(key => (
            <SkeletonCard key={key} />
          ))}
        </div>
        {/* Map */}
        <SkeletonMap />
        {/* Table */}
        <div className='rounded-xl border bg-card p-6'>
          <Skeleton className='mb-4 h-6 w-40' />
          {ROW_KEYS.map(key => (
            <SkeletonRow key={key} />
          ))}
        </div>
      </div>
    </output>
  )
}

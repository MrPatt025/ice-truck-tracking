'use client'

import React from 'react'

/**
 * Skeleton Loading Components — WCAG 2.1 AA compliant
 * Provides visual feedback during async data loading.
 */

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

/** Base skeleton pulse */
export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      role='status'
      aria-label='Loading'
      className={cn('animate-pulse rounded-md bg-muted', className)}
      style={{ width, height }}
    />
  )
}

/** Skeleton card for dashboard panels */
export function SkeletonCard() {
  return (
    <div
      className='rounded-xl border bg-card p-6 shadow-sm'
      role='status'
      aria-label='Loading card'
    >
      <div className='space-y-4'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-8 w-2/3' />
        <div className='flex gap-2'>
          <Skeleton className='h-3 w-16' />
          <Skeleton className='h-3 w-20' />
        </div>
      </div>
    </div>
  )
}

/** Skeleton row for table/list views */
export function SkeletonRow() {
  return (
    <div
      className='flex items-center gap-4 py-3'
      role='status'
      aria-label='Loading row'
    >
      <Skeleton className='h-10 w-10 rounded-full' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
      </div>
      <Skeleton className='h-6 w-16 rounded-full' />
    </div>
  )
}

/** Skeleton for the map component */
export function SkeletonMap() {
  return (
    <div
      className='relative h-[500px] w-full rounded-xl bg-muted'
      role='status'
      aria-label='Loading map'
    >
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary' />
          <span className='text-sm text-muted-foreground'>Loading map...</span>
        </div>
      </div>
    </div>
  )
}

/** Skeleton for the full dashboard page */
export function DashboardSkeleton() {
  return (
    <div className='space-y-6 p-6' role='status' aria-label='Loading dashboard'>
      {/* Stats row */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Map */}
      <SkeletonMap />
      {/* Table */}
      <div className='rounded-xl border bg-card p-6'>
        <Skeleton className='mb-4 h-6 w-40' />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}

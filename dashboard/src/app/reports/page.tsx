'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  BarChart3, Download, Truck, Thermometer,
  TrendingUp, TrendingDown, Package, Fuel,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppSidebar from '@/components/AppSidebar';
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper';
import type { ReportsTab } from '@/components/reports/ReportsCharts';

const MOCK_BASE_DATE = new Date('2026-01-01T00:00:00.000Z')

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const ReportsCharts = dynamic(
  () => import('@/components/reports/ReportsCharts').then(mod => mod.ReportsCharts),
  {
    ssr: false,
    loading: () => (
      <div className='rounded-xl border border-white/20 bg-white/5 p-6 backdrop-blur-xl shadow-[0_24px_60px_-30px_rgba(14,165,233,0.55)]'>
        <div className='mb-4 h-6 w-52 animate-pulse rounded-md bg-white/20' />
        <div className='h-80 animate-pulse rounded-xl bg-gradient-to-br from-cyan-400/20 via-sky-300/10 to-white/5' />
        <div className='mt-4 flex gap-3'>
          <div className='h-3 w-20 animate-pulse rounded bg-white/15' />
          <div className='h-3 w-24 animate-pulse rounded bg-white/10' />
          <div className='h-3 w-16 animate-pulse rounded bg-white/20' />
        </div>
      </div>
    ),
  }
)

// ── Mock Data ──────────────────────────────────────────────
const temperatureData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  avg: -18 + Math.sin(i / 3) * 3 + seededNoise(i + 1) * 2,
  min: -22 + Math.sin(i / 3) * 2,
  max: -14 + Math.sin(i / 3) * 3 + seededNoise(i + 101) * 2,
}))

const deliveryData = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(MOCK_BASE_DATE)
  d.setDate(MOCK_BASE_DATE.getDate() - 6 + i)
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short' }),
    completed: 40 + Math.floor(seededNoise(i + 201) * 30),
    failed: Math.floor(seededNoise(i + 301) * 5),
    pending: 10 + Math.floor(seededNoise(i + 401) * 15),
  }
});

const fuelData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(MOCK_BASE_DATE)
  d.setDate(MOCK_BASE_DATE.getDate() - 29 + i)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    consumption: 200 + seededNoise(i + 501) * 100,
    cost: 8000 + seededNoise(i + 601) * 4000,
  }
});

const fleetDistribution = [
  { name: 'Active', value: 35, color: '#10b981' },
  { name: 'Idle', value: 8, color: '#f59e0b' },
  { name: 'Maintenance', value: 4, color: '#f97316' },
  { name: 'Offline', value: 3, color: '#6b7280' },
];

type TimeRange = '24h' | '7d' | '30d' | '90d';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeTab, setActiveTab] = useState<ReportsTab>('overview');

  const summaryCards = [
    {
      icon: Truck,
      label: 'Fleet Utilization',
      value: '70%',
      change: '+5.2%',
      trend: 'up' as const,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      icon: Package,
      label: 'Total Deliveries',
      value: '1,248',
      change: '+12.3%',
      trend: 'up' as const,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      icon: Thermometer,
      label: 'Avg Temperature',
      value: '-17.8°C',
      change: '-0.5°C',
      trend: 'down' as const,
      color: 'text-cyan-500',
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    },
    {
      icon: Fuel,
      label: 'Fuel Consumed',
      value: '8,420 L',
      change: '-3.1%',
      trend: 'down' as const,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'temperature', label: 'Temperature' },
    { key: 'delivery', label: 'Deliveries' },
    { key: 'fuel', label: 'Fuel & Costs' },
  ] as const;

  return (
    <AppSidebar>
      <PremiumPageWrapper
        mode='glass'
        denseNoise
        contentClassName='border-white/25 bg-slate-950/42 shadow-[0_36px_130px_-72px_rgba(14,165,233,0.95)]'
      >
        <div className='mx-auto max-w-[1600px] space-y-6 p-4 lg:p-6'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div>
              <h1 className='flex items-center gap-2 text-2xl font-bold leading-tight'>
                <BarChart3 className='w-7 h-7 text-primary' />
                Reports & Analytics
              </h1>
              <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                Fleet performance insights and historical analysis
              </p>
            </div>
            <div className='flex items-center gap-2'>
              {/* Time Range Picker */}
              <div className='flex items-center rounded-lg border border-border overflow-hidden'>
                {(['24h', '7d', '30d', '90d'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium leading-5 transition-colors',
                      timeRange === range
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <button className='px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2 transition-colors'>
                <Download className='w-4 h-4' />
                <span className='hidden sm:inline'>Export</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {summaryCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className='bg-card rounded-xl border border-border p-4'
              >
                <div className='flex items-center justify-between mb-3'>
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      card.bg
                    )}
                  >
                    <card.icon className={cn('w-5 h-5', card.color)} />
                  </div>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      card.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {card.trend === 'up' ? (
                      <TrendingUp className='w-3 h-3' />
                    ) : (
                      <TrendingDown className='w-3 h-3' />
                    )}
                    {card.change}
                  </span>
                </div>
                <p className='text-2xl font-bold tabular-nums'>{card.value}</p>
                <p className='text-xs text-muted-foreground mt-1'>
                  {card.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className='flex items-center gap-1 border-b border-border'>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart Content */}
          <ReportsCharts
            activeTab={activeTab}
            deliveryData={deliveryData}
            fleetDistribution={fleetDistribution}
            fuelData={fuelData}
            temperatureData={temperatureData}
          />
        </div>
      </PremiumPageWrapper>
    </AppSidebar>
  )
}

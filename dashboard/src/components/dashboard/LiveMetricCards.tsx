'use client'

import React, { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  DollarSign,
  Fuel,
  Package,
  ThermometerSun,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useIoTStore, type FleetMetrics } from '@/engine'
import GlassCard from '@/components/common/GlassCard'
import Tilt from '@/components/common/Tilt'

type Trend = 'up' | 'down' | 'stable'

export type MetricItem = Readonly<{
  title: string
  value: string
  change: string
  trend: Trend
  icon: LucideIcon
  accent: string
  detail: string
}>

const PANEL_SPRING = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 210,
      damping: 24,
      mass: 0.76,
    },
  },
} as const

const METRIC_CARD_VARIANT = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.2, 0.88, 0.25, 1] },
  },
} as const

function resolveTrendColor(trend: Trend): string {
  if (trend === 'up') return 'text-emerald-400'
  if (trend === 'down') return 'text-rose-400'
  return 'text-slate-400'
}

function resolveTrendIcon(trend: Trend): React.ReactNode {
  if (trend === 'up') return <ArrowUpRight className='h-4 w-4' />
  if (trend === 'down') return <ArrowDownRight className='h-4 w-4' />
  return <TrendingUp className='h-4 w-4' />
}

export function buildMetrics(m: FleetMetrics, unack: number): MetricItem[] {
  return [
    {
      title: 'Active Trucks',
      value: String(m.activeTrucks || 55),
      change: '+6.1%',
      trend: 'up',
      icon: Truck,
      accent: 'from-cyan-400 via-blue-400 to-indigo-500',
      detail: `Fleet Utilization: ${m.activeTrucks ? Math.round((m.activeTrucks / 55) * 100) : 87}%`,
    },
    {
      title: 'Avg Cargo Temp',
      value: `${(m.avgTemperature || -4.2).toFixed(1)}°C`,
      change: `${m.avgTemperature > 0 ? '+' : ''}${(m.avgTemperature || -4.2).toFixed(1)}°C`,
      trend: 'up',
      icon: ThermometerSun,
      accent: 'from-fuchsia-400 via-violet-400 to-purple-500',
      detail: 'Within target range',
    },
    {
      title: 'Open Alerts',
      value: String(unack),
      change: `-${m.warningAlerts || 0}`,
      trend: 'down',
      icon: Bell,
      accent: 'from-amber-400 via-orange-400 to-rose-500',
      detail: `${m.criticalAlerts || 0} Critical, ${m.warningAlerts || 0} Warning`,
    },
    {
      title: 'On-time Rate',
      value: `${(m.onTimeRate || 96.8).toFixed(1)}%`,
      change: '+1.4%',
      trend: 'up',
      icon: Activity,
      accent: 'from-emerald-400 via-teal-400 to-green-500',
      detail: 'Industry leading',
    },
    {
      title: 'Fuel Efficiency',
      value: `${(m.fuelEfficiency || 8.2).toFixed(1)} MPG`,
      change: '+0.4',
      trend: 'up',
      icon: Fuel,
      accent: 'from-lime-400 via-green-400 to-emerald-500',
      detail: 'Above target',
    },
    {
      title: 'Active Drivers',
      value: String(m.activeDrivers || 48),
      change: '+3',
      trend: 'up',
      icon: Users,
      accent: 'from-pink-400 via-rose-400 to-red-500',
      detail: `${m.activeDrivers ? Math.round((m.activeDrivers / 55) * 100) : 87}% of fleet`,
    },
    {
      title: 'Revenue Today',
      value: `$${((m.revenueToday || 48200) / 1000).toFixed(1)}K`,
      change: '+12.3%',
      trend: 'up',
      icon: DollarSign,
      accent: 'from-yellow-400 via-amber-400 to-orange-500',
      detail: `Projected: $${(((m.revenueToday || 48200) * 1.08) / 1000).toFixed(0)}K`,
    },
    {
      title: 'Deliveries',
      value: String(m.totalDeliveries || 234),
      change: '+18',
      trend: 'up',
      icon: Package,
      accent: 'from-indigo-400 via-purple-400 to-pink-500',
      detail: '96% success rate',
    },
  ]
}

const LiveMetricCards = memo(function LiveMetricCards() {
  const metrics = useIoTStore(s => s.metrics)
  const unacknowledgedAlerts = useIoTStore(s => s.unacknowledgedAlerts)
  const metricCards = buildMetrics(metrics, unacknowledgedAlerts)

  return (
    <motion.section
      variants={PANEL_SPRING}
      className='grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8'
    >
      {metricCards.map(metric => (
        <motion.div
          key={metric.title}
          variants={METRIC_CARD_VARIANT}
          className='h-full'
        >
          <Tilt>
            <GlassCard accent={metric.accent}>
              <div className='h-full min-h-[11.5rem] p-4 sm:p-5'>
                <div className='mb-3 flex items-center justify-between'>
                  <span className='text-xs font-bold uppercase tracking-widest text-slate-400'>
                    {metric.title}
                  </span>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${metric.accent} shadow-lg`}
                  >
                    <metric.icon className='h-5 w-5 text-white' />
                  </div>
                </div>
                <p className='text-3xl font-black leading-none tracking-tighter tabular-nums sm:text-4xl'>
                  {metric.value}
                </p>
                <div className='mt-3 flex items-center gap-2'>
                  <span
                    className={`flex items-center gap-1 text-xs font-bold ${resolveTrendColor(metric.trend)}`}
                  >
                    {resolveTrendIcon(metric.trend)}
                    {metric.change}
                  </span>
                  <span className='text-[11px] text-slate-500'>
                    {metric.detail}
                  </span>
                </div>
              </div>
            </GlassCard>
          </Tilt>
        </motion.div>
      ))}
    </motion.section>
  )
})

LiveMetricCards.displayName = 'LiveMetricCards'

export default LiveMetricCards
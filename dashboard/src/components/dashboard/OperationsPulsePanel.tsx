'use client'

import React, { memo } from 'react'
import { TrendingUp } from 'lucide-react'
import { useIoTStore } from '@/engine'
import { useShallow } from 'zustand/shallow'
import GlassCard from '@/components/common/GlassCard'

function resolveConnectionLabel(status: string): string {
  if (status === 'connected') return 'Connected'
  if (status === 'reconnecting') return 'Reconnecting'
  if (status === 'offline') return 'Offline'
  return 'Disconnected'
}

const OperationsPulsePanel = memo(function OperationsPulsePanel() {
  const metrics = useIoTStore(useShallow(s => ({
    totalDeliveries: s.metrics.totalDeliveries,
    avgTemperature: s.metrics.avgTemperature,
    activeTrucks: s.metrics.activeTrucks,
  })))
  const connectionStatus = useIoTStore(s => s.connectionStatus)
  const unacknowledgedAlerts = useIoTStore(s => s.unacknowledgedAlerts)

  const throughput = metrics.totalDeliveries || 234
  const coldChain = metrics.avgTemperature || -4.2
  const fleetUtilization = metrics.activeTrucks
    ? Math.round((metrics.activeTrucks / 55) * 100)
    : 87

  return (
    <GlassCard accent='from-cyan-400/25 via-violet-400/15 to-emerald-400/20'>
      <div className='rounded-3xl p-5 xl:p-6'>
        <h3 className='mb-5 flex items-center gap-2 text-lg font-bold'>
          <TrendingUp className='h-5 w-5 text-cyan-300' />
          Operations Pulse
        </h3>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-xl border border-cyan-200/25 bg-cyan-500/10 p-3 backdrop-blur-md'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-cyan-200/75'>
              Throughput
            </p>
            <p className='mt-1 text-[clamp(1.35rem,0.55vw+1.2rem,2rem)] font-black leading-none tabular-nums'>
              {throughput}
            </p>
          </div>
          <div className='rounded-xl border border-violet-200/25 bg-violet-500/10 p-3 backdrop-blur-md'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-violet-200/75'>
              Fleet Utilization
            </p>
            <p className='mt-1 text-[clamp(1.35rem,0.55vw+1.2rem,2rem)] font-black leading-none tabular-nums'>
              {fleetUtilization}%
            </p>
          </div>
          <div className='rounded-xl border border-emerald-200/25 bg-emerald-500/10 p-3 backdrop-blur-md'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-emerald-200/75'>
              Cold Chain Avg
            </p>
            <p className='mt-1 text-[clamp(1.35rem,0.55vw+1.2rem,2rem)] font-black leading-none tabular-nums'>
              {coldChain.toFixed(1)}°C
            </p>
          </div>
          <div className='rounded-xl border border-rose-200/25 bg-rose-500/10 p-3 backdrop-blur-md'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-rose-200/75'>
              Unack Alerts
            </p>
            <p className='mt-1 text-[clamp(1.35rem,0.55vw+1.2rem,2rem)] font-black leading-none tabular-nums'>
              {unacknowledgedAlerts}
            </p>
          </div>
        </div>
        <div className='mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 backdrop-blur-md'>
          Data stream status:{' '}
          <span className='font-semibold text-cyan-200'>
            {resolveConnectionLabel(connectionStatus)}
          </span>
        </div>
      </div>
    </GlassCard>
  )
})

OperationsPulsePanel.displayName = 'OperationsPulsePanel'

export default OperationsPulsePanel

'use client'

import React, { memo, useEffect, useState } from 'react'
import { Clock, Zap } from 'lucide-react'
import { getAdaptiveController, useIoTStore } from '@/engine'

type ConnectionStatus = 'connected' | 'reconnecting' | 'offline' | 'disconnected'

type StatusPillIntent = 'ok' | 'warn' | 'info'

function resolveConnectionIntent(status: ConnectionStatus): StatusPillIntent {
  if (status === 'connected') return 'ok'
  if (status === 'reconnecting') return 'warn'
  return 'info'
}

function resolveConnectionDot(status: ConnectionStatus): string {
  if (status === 'connected') return 'bg-emerald-400 animate-pulse'
  if (status === 'reconnecting') return 'bg-amber-400 animate-pulse'
  return 'bg-slate-400'
}

function resolveConnectionLabel(status: ConnectionStatus): string {
  if (status === 'connected') return 'Connected'
  if (status === 'reconnecting') return 'Reconnecting'
  if (status === 'offline') return 'Offline'
  return 'Disconnected'
}

function resolveStatusText(paused: boolean, lastUpdate: Date | null): string {
  if (paused) return 'Simulation paused'
  if (lastUpdate) return `Last updated ${lastUpdate.toLocaleTimeString()}`
  return 'All systems operational'
}

function resolvePillClass(intent: StatusPillIntent): string {
  if (intent === 'ok') return 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
  if (intent === 'warn') return 'border-amber-300/30 bg-amber-500/10 text-amber-100'
  return 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100'
}

const StatusPill = memo(function StatusPill({
  intent,
  children,
}: Readonly<{
  intent: StatusPillIntent
  children: React.ReactNode
}>) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-xl ${resolvePillClass(intent)}`}
    >
      {children}
    </span>
  )
})

const SystemStatus = memo(function SystemStatus() {
  const paused = useIoTStore(s => s.paused)
  const connectionStatus = useIoTStore(s => s.connectionStatus)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (paused) return undefined

    setLastUpdate(new Date())
    const interval = globalThis.setInterval(() => {
      setLastUpdate(new Date())
    }, 5000)

    return () => globalThis.clearInterval(interval)
  }, [paused])

  const deviceTier = getAdaptiveController()?.getDeviceTier()

  return (
    <div
      className='flex flex-wrap items-center gap-3'
      data-testid='dashboard-system-status'
    >
      <StatusPill intent={resolveConnectionIntent(connectionStatus)}>
        <span className={`h-2 w-2 rounded-full ${resolveConnectionDot(connectionStatus)}`} />
        {resolveConnectionLabel(connectionStatus)}
      </StatusPill>
      <StatusPill intent='info'>
        <Clock className='h-3 w-3' />
        {resolveStatusText(paused, lastUpdate)}
      </StatusPill>
      {!paused && deviceTier && (
        <StatusPill intent='ok'>
          <Zap className='h-3 w-3' />
          GPU: {deviceTier}
        </StatusPill>
      )}
    </div>
  )
})

SystemStatus.displayName = 'SystemStatus'

export default SystemStatus
'use client'

import { memo, useCallback } from 'react'
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import {
  useIoTStore,
  getAlerts,
  acknowledgeAlert as ackAlert,
  type TelemetryAlert,
} from '@/engine'

// ── Helpers ────────────────────────────────────────────────────

const INTENT_CLS: Record<string, string> = {
  ok: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50 shadow-[0_0_24px_-6px_rgba(16,185,129,.7)]',
  info: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 shadow-[0_0_24px_-6px_rgba(6,182,212,.7)]',
}

function resolveAlertBg(level: string): string {
  if (level === 'critical') return 'bg-red-500/10 ring-red-500/30'
  if (level === 'warning') return 'bg-amber-500/10 ring-amber-500/30'
  return 'bg-cyan-500/10 ring-cyan-500/30'
}

function resolveAlertIconColor(level: string): string {
  if (level === 'critical') return 'text-red-400'
  if (level === 'warning') return 'text-amber-400'
  return 'text-cyan-400'
}

function acknowledgePendingAlerts(
  alerts: ReadonlyArray<{ id: string; acknowledged: boolean }>
) {
  alerts.forEach(a => {
    if (!a.acknowledged) {
      ackAlert(a.id)
      useIoTStore.getState().decrementUnacknowledgedAlerts()
    }
  })
}

// ── Sub-components ─────────────────────────────────────────────

const UnacknowledgedAlertsText = memo(function UnacknowledgedAlertsText() {
  const unacknowledgedAlerts = useIoTStore(s => s.unacknowledgedAlerts)
  return <>{unacknowledgedAlerts} unacknowledged</>
})

// ── Main Component ─────────────────────────────────────────────

type AlertsSidePanelProps = Readonly<{
  onClose: () => void
}>

const AlertsSidePanel = memo(function AlertsSidePanel({
  onClose,
}: AlertsSidePanelProps) {
  const alertList = getAlerts() as TelemetryAlert[]

  const handleAckAlert = useCallback((id: string) => {
    ackAlert(id)
    useIoTStore.getState().decrementUnacknowledgedAlerts()
  }, [])

  const clearAllAlerts = useCallback(() => {
    acknowledgePendingAlerts(getAlerts())
  }, [])

  return (
    <div className='fixed right-0 top-0 bottom-0 w-[min(24rem,100vw)] bg-slate-900/95 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl z-[60] animate-slideInRight overflow-hidden flex flex-col'>
      <div className='p-6 border-b border-white/10'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-xl font-bold flex items-center gap-2'>
            <Bell className='h-5 w-5 text-rose-400' />
            Alert Center
          </h3>
          <button
            onClick={onClose}
            className='rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors'
            aria-label='Close alerts panel'
          >
            <X className='h-5 w-5' />
          </button>
        </div>
        <div className='flex items-center justify-between'>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-xl ${INTENT_CLS.info}`}
          >
            <UnacknowledgedAlertsText />
          </span>
          <button
            onClick={clearAllAlerts}
            className='text-xs text-cyan-400 hover:text-cyan-300 transition-colors'
          >
            Clear All
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-6 space-y-3'>
        {alertList.length === 0 ? (
          <div className='text-center py-12 text-slate-400'>
            <CheckCircle2 className='h-12 w-12 mx-auto mb-3 opacity-50' />
            <p>No alerts at this time</p>
          </div>
        ) : (
          alertList.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl ring-1 transition-colors ${resolveAlertBg(alert.level)} ${alert.acknowledged ? 'opacity-50' : ''}`}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-2'>
                    <AlertTriangle
                      className={`h-4 w-4 ${resolveAlertIconColor(alert.level)}`}
                    />
                    <span className='text-xs uppercase tracking-wider font-semibold'>
                      {alert.level}
                    </span>
                    {alert.truckId && (
                      <span className='text-xs text-slate-400'>
                        • {alert.truckId}
                      </span>
                    )}
                  </div>
                  <p className='text-sm mb-2'>{alert.message}</p>
                  <p className='text-xs text-slate-500'>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAckAlert(alert.id)}
                    className='rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors'
                  >
                    Ack
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

export default AlertsSidePanel

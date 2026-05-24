'use client'

import React, { useCallback, memo } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import {
  Grid3X3,
  Layers,
  ThermometerSun,
  Play,
  Pause,
  Bell,
  Download,
  Zap,
  Clock,
  Wifi,
  WifiOff,
  Server,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useIoTStore } from '@/engine'

import SearchToolbar from '@/components/dashboard/SearchToolbar'

const GlassPulseFallback = () => (
  <div className='h-9 min-h-[2.25rem] w-28 min-w-[7rem] animate-pulse rounded-xl border border-white/10 bg-white/10 shadow-[0_16px_38px_-20px_rgba(56,189,248,0.85)]' />
)

const FpsTargetMonitor = dynamic(
  () => import('@/components/FpsTargetMonitor'),
  {
    ssr: false,
    loading: GlassPulseFallback,
  }
)

type MagneticButtonProps = Readonly<{
  children: React.ReactNode
  className?: string
  onClick?: () => void
  title?: string
  ariaLabel?: string
  ariaPressed?: boolean
  tabIndex?: number
  type?: 'button' | 'submit' | 'reset'
}>

const MagneticButton = memo(function MagneticButton({
  children,
  className = '',
  onClick,
  title,
  ariaLabel,
  ariaPressed,
  tabIndex,
  type = 'button',
}: MagneticButtonProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const onMove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const offsetX = event.clientX - (rect.left + rect.width / 2)
      const offsetY = event.clientY - (rect.top + rect.height / 2)
      x.set(offsetX * 0.12)
      y.set(offsetY * 0.12)
    },
    [x, y]
  )

  const reset = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.button
      type={type}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      tabIndex={tabIndex}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x, y, willChange: 'transform' }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.42 }}
      className={className}
    >
      {children}
    </motion.button>
  )
})

const INTENT_CLS: Record<string, string> = {
  ok: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50 shadow-[0_0_24px_-6px_rgba(16,185,129,.7)]',
  warn: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_24px_-6px_rgba(245,158,11,.7)]',
  error:
    'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/50 shadow-[0_0_24px_-6px_rgba(244,63,94,.7)]',
  info: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 shadow-[0_0_24px_-6px_rgba(6,182,212,.7)]',
  neutral: 'bg-white/10 text-slate-200 ring-1 ring-white/20',
}

const Pill = memo(
  ({
    children,
    intent = 'neutral',
    onClick,
  }: Readonly<{
    children: React.ReactNode
    intent?: 'neutral' | 'ok' | 'warn' | 'info' | 'error'
    onClick?: () => void
  }>) => {
    const cls = INTENT_CLS[intent] ?? INTENT_CLS.neutral
    const base = `inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-xl transition-all ${cls}`
    if (onClick) {
      return (
        <button
          type='button'
          className={`${base} cursor-pointer hover:scale-105 border-0 bg-transparent`}
          onClick={onClick}
        >
          {children}
        </button>
      )
    }
    return <span className={base}>{children}</span>
  }
)

const UnacknowledgedAlertsBadge = memo(function UnacknowledgedAlertsBadge() {
  const unacknowledgedAlerts = useIoTStore(s => s.unacknowledgedAlerts)
  if (unacknowledgedAlerts <= 0) return null

  return (
    <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold animate-pulse'>
      {unacknowledgedAlerts > 9 ? '9+' : unacknowledgedAlerts}
    </span>
  )
})

const REFRESH_SPEED_VALUES = ['fast', 'normal', 'slow'] as const
const REFRESH_SPEED_SET = new Set<string>(REFRESH_SPEED_VALUES)

function isRefreshSpeed(
  value: string
): value is (typeof REFRESH_SPEED_VALUES)[number] {
  return REFRESH_SPEED_SET.has(value)
}

function resolveApiHealthIntent(
  apiHealthy: boolean | null
): 'ok' | 'error' | 'neutral' {
  if (apiHealthy === true) return 'ok'
  if (apiHealthy === false) return 'error'
  return 'neutral'
}

function resolveApiHealthIcon(apiHealthy: boolean | null) {
  if (apiHealthy === true) return <Wifi className='h-3 w-3' />
  if (apiHealthy === false) return <WifiOff className='h-3 w-3' />
  return <Server className='h-3 w-3 animate-pulse' />
}

function resolveApiHealthLabel(apiHealthy: boolean | null): string {
  if (apiHealthy === true) return 'API Online'
  if (apiHealthy === false) return 'API Offline'
  return 'API Checking'
}

type DashboardToolbarProps = Readonly<{
  apiHealthy: boolean | null
  canInstallApp: boolean
  installingApp: boolean
  installApp: () => Promise<void>
  downloadReport: () => void
  togglePerf: () => void
}>

export const DashboardToolbar = memo(function DashboardToolbar({
  apiHealthy,
  canInstallApp,
  installingApp,
  installApp,
  downloadReport,
  togglePerf,
}: DashboardToolbarProps) {
  const theme = useIoTStore(s => s.theme)
  const setTheme = useIoTStore(s => s.setTheme)
  const paused = useIoTStore(s => s.paused)
  const togglePause = useIoTStore(s => s.togglePause)
  const showGrid = useIoTStore(s => s.showGrid)
  const toggleGrid = useIoTStore(s => s.toggleGrid)
  const show3D = useIoTStore(s => s.show3D)
  const toggle3D = useIoTStore(s => s.toggle3D)
  const showHeatmap = useIoTStore(s => s.showHeatmap)
  const toggleHeatmap = useIoTStore(s => s.toggleHeatmap)
  const showAlerts = useIoTStore(s => s.showAlerts)
  const toggleAlerts = useIoTStore(s => s.toggleAlerts)
  const timeRange = useIoTStore(s => s.timeRange)
  const setTimeRange = useIoTStore(s => s.setTimeRange)
  const refreshSpeed = useIoTStore(s => s.refreshSpeed)
  const setRefreshSpeed = useIoTStore(s => s.setRefreshSpeed)

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2 sm:gap-3 justify-end'>
        <SearchToolbar />
        {/* Quick actions */}
        <div className='flex items-center gap-1.5'>
          <MagneticButton
            onClick={toggleGrid}
            tabIndex={0}
            title='Toggle Grid'
            ariaLabel='Toggle dashboard grid overlay'
            ariaPressed={showGrid}
            className={`rounded-xl p-2.5 ring-1 transition-all ${
              showGrid
                ? 'bg-violet-500/20 ring-violet-500/50 text-violet-300'
                : 'ring-white/10 hover:bg-white/10 text-slate-400'
            }`}
          >
            <Grid3X3 className='h-4 w-4' />
          </MagneticButton>
          <MagneticButton
            onClick={toggle3D}
            title='Toggle 3D Background'
            ariaLabel='Toggle cinematic 3D background'
            ariaPressed={show3D}
            className={`rounded-xl p-2.5 ring-1 transition-all ${
              show3D
                ? 'bg-cyan-500/20 ring-cyan-500/50 text-cyan-300'
                : 'ring-white/10 hover:bg-white/10 text-slate-400'
            }`}
          >
            <Layers className='h-4 w-4' />
          </MagneticButton>
          <MagneticButton
            onClick={toggleHeatmap}
            title='Toggle Fleet Heatmap'
            ariaLabel='Toggle fleet heatmap overlay'
            ariaPressed={showHeatmap}
            className={`rounded-xl p-2.5 ring-1 transition-all ${
              showHeatmap
                ? 'bg-rose-500/20 ring-rose-500/50 text-rose-300'
                : 'ring-white/10 hover:bg-white/10 text-slate-400'
            }`}
          >
            <ThermometerSun className='h-4 w-4' />
          </MagneticButton>
          <MagneticButton
            onClick={togglePause}
            title={paused ? 'Resume' : 'Pause'}
            ariaLabel={
              paused
                ? 'Resume telemetry updates'
                : 'Pause telemetry updates'
            }
            ariaPressed={paused}
            className={`rounded-xl p-2.5 ring-1 transition-all ${
              paused
                ? 'bg-amber-500/20 ring-amber-500/50 text-amber-300'
                : 'ring-white/10 hover:bg-white/10 text-slate-400'
            }`}
          >
            {paused ? (
              <Play className='h-4 w-4' />
            ) : (
              <Pause className='h-4 w-4' />
            )}
          </MagneticButton>
          <MagneticButton
            onClick={toggleAlerts}
            title='Toggle Alerts Panel'
            ariaLabel='Toggle alerts panel'
            ariaPressed={showAlerts}
            className='relative rounded-xl p-2.5 ring-1 ring-white/10 hover:bg-white/10 text-slate-400 transition-all'
          >
            <Bell className='h-4 w-4' />
            <UnacknowledgedAlertsBadge />
          </MagneticButton>
          <MagneticButton
            onClick={downloadReport}
            title='Download Report'
            ariaLabel='Download JSON fleet report'
            className='rounded-xl p-2.5 ring-1 ring-white/10 hover:bg-white/10 text-slate-400 transition-all'
          >
            <Download className='h-4 w-4' />
          </MagneticButton>
          <MagneticButton
            onClick={togglePerf}
            title='Toggle Performance Overlay'
            ariaLabel='Toggle performance overlay'
            className='rounded-xl p-2.5 ring-1 ring-white/10 hover:bg-white/10 text-slate-400 transition-all'
          >
            <Zap className='h-4 w-4' />
          </MagneticButton>
          {canInstallApp && (
            <MagneticButton
              onClick={installApp}
              title='Install App'
              ariaLabel='Install dashboard app'
              className='hidden md:inline-flex rounded-xl px-3 py-2 ring-1 ring-cyan-300/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 transition-all'
            >
              <Download className='h-4 w-4' />
              <span className='text-xs font-semibold tracking-wide uppercase ml-1.5'>
                {installingApp ? 'Installing...' : 'Install App'}
              </span>
            </MagneticButton>
          )}
        </div>

        {/* API Status */}
        <FpsTargetMonitor />

        <div
          data-testid='api-status-indicator'
          className='inline-flex'
        >
          <Pill intent={resolveApiHealthIntent(apiHealthy)}>
            {resolveApiHealthIcon(apiHealthy)}
            <span className='hidden sm:inline'>
              {resolveApiHealthLabel(apiHealthy)}
            </span>
          </Pill>
        </div>
      </div>

      {/* Control bar */}
      <div className='flex flex-wrap items-center justify-between gap-3 pb-4 border-t border-white/5 pt-3'>
        {/* Time range */}
        <div className='flex items-center gap-1.5'>
          <Clock className='h-4 w-4 text-slate-500 mr-1' />
          {(['1h', '24h', '7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                timeRange === r
                  ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Theme selector + controls */}
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-1 rounded-xl p-1 bg-white/5 ring-1 ring-white/10'>
            {(['dark', 'neon', 'ocean', 'forest'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition-all ${
                  theme === t
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t[0]}
              </button>
            ))}
          </div>

          <div className='flex items-center gap-2 text-xs text-slate-500'>
            <span>Refresh:</span>
            <select
              value={refreshSpeed}
              onChange={e => {
                const nextSpeed = e.currentTarget.value
                if (isRefreshSpeed(nextSpeed)) {
                  setRefreshSpeed(nextSpeed)
                }
              }}
              className='bg-white/5 rounded-lg px-2 py-1 text-xs ring-1 ring-white/10 outline-none text-slate-300'
              aria-label='Refresh speed'
            >
              <option value='fast'>Fast</option>
              <option value='normal'>Normal</option>
              <option value='slow'>Slow</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
})

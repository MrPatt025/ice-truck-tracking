'use client'

import { memo, useEffect, useRef, useCallback, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  Truck,
  ThermometerSun,
  Activity,
  Maximize2,
  Minimize2,
  X,
  DollarSign,
  AlertTriangle,
  MapPin,
} from 'lucide-react'
import { useIoTStore, mountChart, unmountChart, mountMap, unmountMap } from '@/engine'
import GlassCard from '@/components/common/GlassCard'
import AnimatedPings from '@/components/AnimatedPings'

// ── Chart Configs ──────────────────────────────────────────────

export const CHART_CONFIGS = {
  revenue: {
    series: [{ id: 'revenue', label: 'Revenue', color: '#8b5cf6' }],
    title: 'Revenue Trend Analysis',
    unit: '$',
  },
  fleet: {
    series: [
      { id: 'active-trucks', label: 'Active Trucks', color: '#06b6d4' },
      { id: 'speed', label: 'Avg Speed', color: '#10b981' },
    ],
    title: 'Fleet Activity & Efficiency',
  },
  temperature: {
    series: [{ id: 'temperature', label: 'Avg Temp', color: '#a78bfa' }],
    title: 'Cargo Temperature Distribution',
    unit: '°C',
  },
  alerts: {
    series: [{ id: 'alerts', label: 'Total Alerts', color: '#ef4444' }],
    title: 'Alert Timeline',
  },
  fuel: {
    series: [{ id: 'fuel', label: 'Fuel Level', color: '#10b981' }],
    title: 'Performance Metrics',
    unit: '%',
  },
} as const

const FULLSCREEN_CONFIGS: Record<
  string,
  (typeof CHART_CONFIGS)[keyof typeof CHART_CONFIGS]
> = {
  revenue: CHART_CONFIGS.revenue,
  fleet: CHART_CONFIGS.fleet,
  temp: CHART_CONFIGS.temperature,
  alerts: CHART_CONFIGS.alerts,
  performance: CHART_CONFIGS.fuel,
}

const FULLSCREEN_TITLES: Record<string, string> = {
  revenue: 'Revenue Trend Analysis',
  fleet: 'Fleet Activity & Efficiency',
  temp: 'Cargo Temperature Distribution',
  alerts: 'Alert Timeline & History',
  performance: 'Performance Metrics',
}

// ── Animation Variants ─────────────────────────────────────────

const PANEL_SPRING: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
}

// ── Imperative Canvas Chart ────────────────────────────────────

const CanvasChart = memo(
  ({
    id,
    config,
    className = '',
  }: {
    id: string
    config: {
      series: readonly { id: string; label: string; color: string }[]
      title?: string
      unit?: string
    }
    className?: string
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      const c = canvasRef.current
      if (!c) return
      mountChart(id, c, {
        series: config.series as { id: string; label: string; color: string }[],
        title: config.title,
        unit: config.unit,
        maxPoints: 360,
      })
      return () => {
        unmountChart(id)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    return (
      <canvas
        ref={canvasRef}
        className={`w-full rounded-xl h-[220px] ${className}`}
      />
    )
  }
)

// ── Sub-components ─────────────────────────────────────────────

const ActiveTrucksHeadline = memo(function ActiveTrucksHeadline() {
  const activeTrucks = useIoTStore(s => s.metrics.activeTrucks)
  return <>{activeTrucks || 55} Active Trucks</>
})

// ── Types ──────────────────────────────────────────────────────

type Fullscreen = null | 'revenue' | 'fleet' | 'temp' | 'alerts' | 'performance'

type MagneticButtonInlineProps = Readonly<{
  children: React.ReactNode
  className?: string
  onClick?: () => void
}>

const InlineButton = memo(function InlineButton({
  children,
  className = '',
  onClick,
}: MagneticButtonInlineProps) {
  return (
    <button type='button' onClick={onClick} className={className}>
      {children}
    </button>
  )
})

// ── Main Component ─────────────────────────────────────────────

type ChartGridControllerProps = Readonly<{
  showMap: boolean
  isLiveMode: boolean
  mounted: boolean
}>

const ChartGridController = memo(function ChartGridController({
  showMap,
  isLiveMode,
  mounted,
}: ChartGridControllerProps) {
  const [fullscreen, setFullscreen] = useState<Fullscreen>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Mount imperative Map layer
  useEffect(() => {
    if (!mounted || !showMap || !mapContainerRef.current) return
    mountMap(mapContainerRef.current)
    return () => {
      unmountMap()
    }
  }, [mounted, showMap])

  // Escape key to close fullscreen
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(null)
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const openFullMap = useCallback(() => {
    useIoTStore.getState().toggleMap()
  }, [])

  return (
    <>
      {/* ── Chart Row 1: 2-column ── */}
      <motion.section
        variants={PANEL_SPRING}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, amount: 0.22 }}
        className='grid grid-cols-1 gap-6 lg:grid-cols-2'
      >
        {/* Revenue Trend Analysis */}
        <GlassCard layoutId='panel-system-health'>
          <div className='rounded-3xl p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-bold flex items-center gap-2'>
                <DollarSign className='h-5 w-5 text-violet-400' />
                Revenue Trend Analysis
              </h3>
              <button
                onClick={() => setFullscreen('revenue')}
                className='rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors'
                title='Fullscreen'
              >
                <Maximize2 className='h-4 w-4 text-slate-400' />
              </button>
            </div>
            <div className='aspect-[16/9]'>
              <CanvasChart id='revenue' config={CHART_CONFIGS.revenue} className='h-full' />
            </div>
          </div>
        </GlassCard>

        {/* Fleet Activity & Efficiency */}
        <GlassCard accent='from-cyan-400/30 via-blue-400/20 to-indigo-400/30'>
          <div className='rounded-3xl p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-bold flex items-center gap-2'>
                <Truck className='h-5 w-5 text-cyan-400' />
                Fleet Activity &amp; Efficiency
              </h3>
              <button
                onClick={() => setFullscreen('fleet')}
                className='rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors'
                title='Fullscreen'
              >
                <Maximize2 className='h-4 w-4 text-slate-400' />
              </button>
            </div>
            <div className='aspect-[16/9]'>
              <CanvasChart id='fleet' config={CHART_CONFIGS.fleet} className='h-full' />
            </div>
          </div>
        </GlassCard>
      </motion.section>

      {/* ── Chart Row 2: 3-column ── */}
      <motion.section
        variants={PANEL_SPRING}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, amount: 0.22 }}
        className='grid grid-cols-1 gap-6 xl:grid-cols-12'
      >
        {/* Cargo Temperature Distribution */}
        <div className='min-w-0 xl:col-span-4'>
          <GlassCard accent='from-blue-400/30 via-sky-400/20 to-cyan-400/30'>
            <div className='rounded-3xl p-6'>
              <h3 className='mb-4 text-lg font-bold flex items-center gap-2'>
                <ThermometerSun className='h-5 w-5 text-sky-400' />
                Cargo Temperature Distribution
              </h3>
              <div className='aspect-[4/3]'>
                <CanvasChart
                  id='temperature'
                  config={CHART_CONFIGS.temperature}
                  className='h-full'
                />
              </div>
              <div className='mt-4 grid grid-cols-2 gap-2'>
                {[
                  { label: '≤ -10°C', color: 'bg-sky-400', pct: '20%' },
                  { label: '-10 ~ -5°C', color: 'bg-emerald-400', pct: '30%' },
                  { label: '-5 ~ 2°C', color: 'bg-violet-400', pct: '40%' },
                  { label: '> 2°C', color: 'bg-rose-400', pct: '10%' },
                ].map(b => (
                  <div
                    key={b.label}
                    className='flex items-center gap-2 text-xs text-slate-400'
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${b.color}`} />
                    {b.label}: {b.pct}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Alert Timeline */}
        <div className='min-w-0 xl:col-span-4'>
          <GlassCard accent='from-rose-400/30 via-orange-400/20 to-amber-400/30'>
            <div className='rounded-3xl p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h3 className='text-lg font-bold flex items-center gap-2'>
                  <AlertTriangle className='h-5 w-5 text-rose-400' />
                  Alert Timeline
                </h3>
                <button
                  onClick={() => setFullscreen('alerts')}
                  className='rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors'
                  title='Fullscreen'
                >
                  <Maximize2 className='h-4 w-4 text-slate-400' />
                </button>
              </div>
              <div className='aspect-[4/3]'>
                <CanvasChart id='alerts' config={CHART_CONFIGS.alerts} className='h-full' />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Performance Metrics */}
        <div className='min-w-0 xl:col-span-4'>
          <GlassCard accent='from-emerald-400/30 via-teal-400/20 to-green-400/30'>
            <div className='rounded-3xl p-6'>
              <h3 className='mb-4 text-lg font-bold flex items-center gap-2'>
                <Activity className='h-5 w-5 text-emerald-400' />
                Performance Metrics
              </h3>
              <div className='aspect-[4/3]'>
                <CanvasChart id='fuel' config={CHART_CONFIGS.fuel} className='h-full' />
              </div>
              <div className='mt-6 grid grid-cols-2 gap-3'>
                <div className='text-center p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30'>
                  <p className='text-xs text-slate-400'>Avg Score</p>
                  <p className='text-4xl font-extrabold tracking-tight text-emerald-400'>
                    90.2
                  </p>
                </div>
                <div className='text-center p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30'>
                  <p className='text-xs text-slate-400'>Rank</p>
                  <p className='text-4xl font-extrabold tracking-tight text-cyan-400'>
                    #1
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.section>

      {/* ── Map Section ── */}
      <motion.section
        variants={PANEL_SPRING}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, amount: 0.22 }}
        className='grid grid-cols-1 gap-6 xl:grid-cols-12'
      >
        <div className='min-w-0 xl:col-span-12'>
          <GlassCard
            layoutId='panel-live-map'
            accent='from-indigo-400/30 via-blue-400/20 to-cyan-400/30'
          >
            <div className='rounded-3xl p-6'>
              <h3 className='mb-6 text-lg font-bold flex items-center gap-2'>
                <MapPin className='h-5 w-5 text-indigo-400' />
                Live Fleet Map
              </h3>
              <motion.div
                layout
                layoutId='map-viewport-shell'
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                animate={{ height: isLiveMode ? 400 : 430 }}
                className='bloom-edge vignette-strong aspect-[16/10] rounded-2xl bg-slate-950/50 ring-1 ring-cyan-200/20 overflow-hidden relative'
              >
                {showMap ? (
                  <div
                    ref={mapContainerRef}
                    className='absolute inset-0'
                  />
                ) : (
                  <>
                    <AnimatedPings count={12} />
                    <div className='absolute inset-0 flex items-center justify-center backdrop-blur-sm'>
                      <div className='text-center space-y-4'>
                        <MapPin className='h-16 w-16 mx-auto text-cyan-400 animate-bounce' />
                        <p className='text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-100 to-slate-400'>
                          <ActiveTrucksHeadline />
                        </p>
                        <p className='text-sm text-slate-400'>
                          Real-time GPS tracking
                        </p>
                        <InlineButton
                          onClick={openFullMap}
                          className='mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 font-semibold shadow-lg transition-colors'
                        >
                          Open Full Map
                        </InlineButton>
                      </div>
                    </div>
                  </>
                )}

                <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(34,211,238,0.18),transparent_55%)] mix-blend-screen' />
                <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(34,211,238,0.12)_48%,rgba(255,255,255,0)_100%)] animate-[pulse_3.8s_ease-in-out_infinite]' />
                <div className='pointer-events-none absolute inset-0 scanline-overlay opacity-30' />
              </motion.div>
            </div>
          </GlassCard>
        </div>
      </motion.section>

      {/* ── Fullscreen Modal ── */}
      {fullscreen && (
        <div className='fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl animate-fadeIn'>
          <div className='absolute inset-4 lg:inset-10 rounded-3xl ring-1 ring-white/20 bg-slate-900/80 backdrop-blur-xl p-4 lg:p-8 shadow-2xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-100 to-slate-400'>
                {FULLSCREEN_TITLES[fullscreen]}
              </h3>
              <div className='flex items-center gap-3'>
                <button
                  onClick={() => setFullscreen(null)}
                  className='rounded-xl p-2 ring-1 ring-white/20 hover:bg-white/10 transition-colors'
                  title='Minimize'
                >
                  <Minimize2 className='h-5 w-5' />
                </button>
                <button
                  onClick={() => setFullscreen(null)}
                  className='rounded-xl p-3 ring-1 ring-white/20 hover:bg-white/10 transition-colors'
                  aria-label='Close fullscreen'
                >
                  <X className='h-6 w-6' />
                </button>
              </div>
            </div>
            <div className='h-[calc(100%-80px)]'>
              <CanvasChart
                id={`fullscreen-${fullscreen}`}
                config={
                  FULLSCREEN_CONFIGS[fullscreen] ?? CHART_CONFIGS.fuel
                }
                className='h-full'
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
})

export default ChartGridController

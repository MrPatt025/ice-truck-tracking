'use client'

import { motion } from 'framer-motion'
import { Route, Thermometer, Gauge, MapPinned } from 'lucide-react'
import AppSidebar from '@/components/AppSidebar'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

const TRACKING_LANES = [
  { zone: 'Northern Spine', active: 12, temp: '-17.4 C', eta: '18 min' },
  { zone: 'Eastern Arc', active: 9, temp: '-18.2 C', eta: '26 min' },
  { zone: 'Metro Core', active: 15, temp: '-16.9 C', eta: '11 min' },
  { zone: 'Harbor Ring', active: 6, temp: '-19.1 C', eta: '32 min' },
]

export default function TrackingPage() {
  return (
    <AppSidebar>
      <PremiumPageWrapper
        mode='glass'
        denseNoise
        contentClassName='border-white/25 bg-slate-950/42 shadow-[0_36px_130px_-68px_rgba(59,130,246,0.95)]'
      >
        <main className='mx-auto max-w-[1500px] space-y-6 p-4 lg:p-6'>
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className='relative overflow-hidden rounded-2xl border border-white/20 bg-slate-900/45 p-6 backdrop-blur-2xl'
          >
            <div className='pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl' />
            <div className='pointer-events-none absolute -left-12 -bottom-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl' />
            <h1 className='flex items-center gap-3 text-2xl font-semibold text-slate-50'>
              <Route className='h-7 w-7 text-cyan-300' />
              Live Corridor Tracking
            </h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-300'>
              Mission-grade route command view with deterministic layout sizing
              for zero CLS, glass depth layers, and lane-by-lane thermal
              reliability indicators.
            </p>
          </motion.header>

          <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {TRACKING_LANES.map((lane, index) => (
              <motion.article
                key={lane.zone}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * index }}
                className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'
              >
                <p className='text-xs uppercase tracking-[0.12em] text-cyan-200/85'>
                  {lane.zone}
                </p>
                <p className='mt-3 text-3xl font-semibold text-slate-100 tabular-nums'>
                  {lane.active}
                </p>
                <p className='text-xs text-slate-400'>active vehicles</p>
                <div className='mt-4 space-y-2 text-sm text-slate-200'>
                  <p className='flex items-center gap-2'>
                    <Thermometer className='h-4 w-4 text-cyan-300' /> Avg cargo{' '}
                    {lane.temp}
                  </p>
                  <p className='flex items-center gap-2'>
                    <Gauge className='h-4 w-4 text-sky-300' /> Next ETA{' '}
                    {lane.eta}
                  </p>
                </div>
              </motion.article>
            ))}
          </section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className='min-h-[340px] rounded-2xl border border-white/20 bg-slate-900/45 p-6 backdrop-blur-2xl'
          >
            <h2 className='flex items-center gap-2 text-lg font-semibold text-slate-100'>
              <MapPinned className='h-5 w-5 text-cyan-300' />
              Route Theater
            </h2>
            <p className='mt-2 text-sm text-slate-300'>
              Shared-canvas map scene remains mounted behind this panel while
              corridor overlays update via transient telemetry subscriptions.
            </p>
            <div className='mt-5 h-[220px] rounded-xl border border-dashed border-cyan-200/30 bg-gradient-to-br from-cyan-500/10 via-slate-900/10 to-blue-500/10' />
          </motion.section>
        </main>
      </PremiumPageWrapper>
    </AppSidebar>
  )
}

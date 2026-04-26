'use client'

import { motion } from 'framer-motion'
import { RadioTower, Waves, Clock3, CircleGauge } from 'lucide-react'
import AppSidebar from '@/components/AppSidebar'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

const OPS_STREAMS = [
  { id: 'MQTT', value: '2.1k/min', status: 'Healthy' },
  { id: 'WebSocket', value: '940/s', status: 'Healthy' },
  { id: 'Kafka Bridge', value: '310/s', status: 'Degraded' },
  { id: 'Alert Bus', value: '82/s', status: 'Healthy' },
]

export default function OperationsPage() {
  return (
    <AppSidebar>
      <PremiumPageWrapper
        mode='glass'
        denseNoise
        contentClassName='border-white/25 bg-slate-950/42 shadow-[0_36px_130px_-70px_rgba(45,212,191,0.95)]'
      >
        <main className='mx-auto max-w-[1500px] space-y-6 p-4 lg:p-6'>
          <motion.header
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className='relative overflow-hidden rounded-2xl border border-white/20 bg-slate-900/45 p-6 backdrop-blur-2xl'
          >
            <div className='pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl' />
            <h1 className='flex items-center gap-3 text-2xl font-semibold text-slate-50'>
              <RadioTower className='h-7 w-7 text-teal-300' />
              Operations Pulse
            </h1>
            <p className='mt-2 text-sm leading-6 text-slate-300'>
              Unified ingestion and transport signal wall built for incident
              triage, render-stable at all breakpoints, and tuned for immediate
              operator decisions.
            </p>
          </motion.header>

          <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {OPS_STREAMS.map((stream, idx) => (
              <motion.article
                key={stream.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'
              >
                <p className='text-xs uppercase tracking-[0.12em] text-teal-200/90'>
                  {stream.id}
                </p>
                <p className='mt-3 text-3xl font-semibold text-slate-100 tabular-nums'>
                  {stream.value}
                </p>
                <p className='mt-2 inline-flex rounded-full border border-white/20 px-2 py-1 text-xs text-slate-200'>
                  {stream.status}
                </p>
              </motion.article>
            ))}
          </section>

          <section className='grid gap-4 xl:grid-cols-3'>
            <article className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'>
              <h2 className='flex items-center gap-2 text-lg font-semibold text-slate-100'>
                <Waves className='h-5 w-5 text-teal-300' /> Throughput Drift
              </h2>
              <div className='mt-4 h-40 rounded-xl border border-dashed border-teal-200/30 bg-gradient-to-br from-teal-500/10 to-slate-900/10' />
            </article>
            <article className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'>
              <h2 className='flex items-center gap-2 text-lg font-semibold text-slate-100'>
                <Clock3 className='h-5 w-5 text-cyan-300' /> Queue Latency
              </h2>
              <p className='mt-3 text-3xl font-semibold tabular-nums text-slate-100'>
                124 ms
              </p>
            </article>
            <article className='rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-2xl'>
              <h2 className='flex items-center gap-2 text-lg font-semibold text-slate-100'>
                <CircleGauge className='h-5 w-5 text-emerald-300' /> Runtime
                Budget
              </h2>
              <p className='mt-3 text-3xl font-semibold tabular-nums text-slate-100'>
                16.1 ms/frame
              </p>
            </article>
          </section>
        </main>
      </PremiumPageWrapper>
    </AppSidebar>
  )
}

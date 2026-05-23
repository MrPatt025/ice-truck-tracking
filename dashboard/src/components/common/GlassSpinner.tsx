'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { glassPanel } from '@/ui/tokens/glass'

export default function GlassSpinner({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-live='polite'
      aria-label='Loading premium 3D experience'
      className={cn(
        'flex h-full min-h-[18rem] w-full items-center justify-center',
        glassPanel,
        className
      )}
    >
      <div className='relative grid place-items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/35 px-8 py-7 shadow-[0_24px_80px_-34px_rgba(0,0,0,0.8)] backdrop-blur-2xl'>
        <motion.div
          aria-hidden='true'
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
          className='h-12 w-12 rounded-full border-2 border-cyan-300/25 border-t-cyan-300 shadow-[0_0_40px_rgba(56,189,248,0.25)]'
        />
        <p className='text-sm font-semibold tracking-[0.22em] text-slate-200 uppercase'>
          Initializing canvas
        </p>
      </div>
    </div>
  )
}

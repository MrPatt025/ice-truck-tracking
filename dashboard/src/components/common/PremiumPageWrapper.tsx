'use client'

import { memo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { glassPanel } from '@/ui/tokens/glass'
import { cn } from '@/lib/utils'

type PremiumPageWrapperProps = Readonly<{
  children: ReactNode
  className?: string
  contentClassName?: string
  mode?: 'glass' | 'none'
  denseNoise?: boolean
  testId?: string
}>

const SVG_XMLNS = 'http' + '://www.w3.org/2000/svg'
const BG_NOISE_IMAGE = `url("data:image/svg+xml,%3Csvg xmlns='${encodeURIComponent(SVG_XMLNS)}' width='180' height='180'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23noise)'/%3E%3C/svg%3E")`
const SURFACE_NOISE_IMAGE = `url("data:image/svg+xml,%3Csvg xmlns='${encodeURIComponent(SVG_XMLNS)}' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")`
const PREMIUM_GLASS_CLASS =
  'bg-slate-900/30 backdrop-blur-[40px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] saturate-150 relative z-40 overflow-hidden text-slate-100'

const PremiumPageWrapper = memo(function PremiumPageWrapper({
  children,
  className,
  contentClassName,
  mode = 'glass',
  denseNoise = false,
  testId = 'premium-wrapper',
}: PremiumPageWrapperProps) {
  return (
    <section
      data-testid={testId}
      suppressHydrationWarning
      aria-label='Primary content'
      className={cn(
        'relative isolate min-h-[100svh] text-slate-100 antialiased',
        className
      )}
    >
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='relative isolate h-full min-h-[100svh] w-full transform-gpu'
      >
        <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120rem_58rem_at_50%_-25%,rgba(56,189,248,.12),transparent_56%),radial-gradient(104rem_44rem_at_12%_108%,rgba(45,212,191,.13),transparent_62%)]' />
        <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(66rem_36rem_at_18%_-12%,rgba(56,189,248,.16),transparent),radial-gradient(78rem_40rem_at_90%_108%,rgba(16,185,129,.14),transparent)]' />
        <div className='pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_40%)]' />
        <div className='premium-visual premium-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:40px_40px]' />
        <div
          aria-hidden='true'
          className='premium-visual premium-shimmer pointer-events-none absolute inset-0 -z-10 bg-[conic-gradient(from_210deg_at_50%_50%,rgba(56,189,248,.06),transparent_26%,rgba(16,185,129,.05)_56%,transparent_78%,rgba(56,189,248,.06))]'
        />
        <div
          aria-hidden='true'
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 mix-blend-overlay',
            denseNoise ? 'opacity-[0.04]' : 'opacity-[0.025]'
          )}
          style={{
            backgroundImage: BG_NOISE_IMAGE,
            backgroundSize: '90px 90px',
          }}
        />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -top-28 left-1/2 -z-10 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[120px]'
        />
        <div
          className={cn(
            mode === 'glass' ? `${glassPanel} ${PREMIUM_GLASS_CLASS}` : '',
            contentClassName
          )}
        >
          {mode === 'glass' ? (
            <>
              <div className='premium-visual premium-ornament pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(74rem_30rem_at_10%_-24%,rgba(56,189,248,.26),transparent),radial-gradient(84rem_34rem_at_96%_115%,rgba(16,185,129,.18),transparent)]' />
              <div className='premium-visual premium-surface-grid pointer-events-none absolute inset-0 rounded-3xl opacity-[0.16] [background-image:linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:24px_24px]' />
              <div className='premium-visual premium-topline pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-80' />
              <div className='premium-visual premium-left-line pointer-events-none absolute inset-y-6 left-0 w-px bg-gradient-to-b from-transparent via-cyan-200/25 to-transparent opacity-70' />
              <div className='premium-visual premium-right-line pointer-events-none absolute inset-y-6 right-0 w-px bg-gradient-to-b from-transparent via-emerald-200/20 to-transparent opacity-70' />
              <div
                aria-hidden='true'
                className='premium-visual premium-noise pointer-events-none absolute inset-0 rounded-3xl opacity-[0.035] mix-blend-overlay'
                style={{
                  backgroundImage: SURFACE_NOISE_IMAGE,
                  backgroundSize: '70px 70px',
                }}
              />
              <div className='premium-visual premium-glow-a pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl' />
              <div className='premium-visual premium-glow-b pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-emerald-300/15 blur-3xl' />
              <div
                aria-hidden='true'
                className='premium-visual premium-highlight pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(105deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_28%,rgba(255,255,255,0)_44%)]'
              />
              <div className='premium-visual premium-frame pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-cyan-200/20 shadow-[inset_0_0_35px_-20px_rgba(56,189,248,.95)]' />
            </>
          ) : null}
          <div className='relative z-50 antialiased'>{children}</div>
        </div>
      </motion.main>
    </section>
  )
})

export default PremiumPageWrapper

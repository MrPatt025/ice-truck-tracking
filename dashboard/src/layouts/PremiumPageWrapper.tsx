'use client'

import { memo, type ReactNode, useEffect, useRef } from 'react'
import { useMotionValueEvent, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'

type PremiumPageWrapperProps = Readonly<{
  children: ReactNode
  className?: string
  contentClassName?: string
  mode?: 'glass' | 'none'
  denseNoise?: boolean
  testId?: string
}>

const PremiumPageWrapper = memo(function PremiumPageWrapper({
  children,
  className,
  contentClassName,
  mode = 'glass',
  denseNoise = false,
  testId = 'premium-wrapper',
}: PremiumPageWrapperProps) {
  const { scrollYProgress } = useScroll()
  const shellRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    shell.style.opacity = '1'
    shell.style.transform = 'translate3d(0, 0px, 0)'
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', latest => {
    const shell = shellRef.current
    if (!shell) return

    const progress = Math.min(1, Math.max(0, latest))
    shell.style.opacity = `${1 - progress * 0.02}`
    shell.style.transform = `translate3d(0, ${-14 * progress}px, 0)`
  })

  return (
    <section
      data-testid={testId}
      aria-label='Primary content'
      className={cn(
        'page-shell relative isolate text-slate-100 antialiased',
        className
      )}
    >
      <main
        data-testid='page-wrapper'
        className='page-wrapper-main relative isolate h-full transform-gpu opacity-100 transition-opacity duration-300'
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
            'premium-noise-layer pointer-events-none absolute inset-0 -z-10 mix-blend-overlay',
            denseNoise ? 'opacity-[0.04]' : 'opacity-[0.025]'
          )}
        />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -top-28 left-1/2 -z-10 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[120px]'
        />
        <div
          ref={shellRef}
          className={cn(
            'rounded-3xl p-6 bg-slate-900/30 backdrop-blur-[40px] border border-white/10 shadow-2xl saturate-150',
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
                className='premium-surface-noise-layer premium-visual premium-noise pointer-events-none absolute inset-0 rounded-3xl opacity-[0.035] mix-blend-overlay'
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
          <div className='headline-gradient relative z-10 antialiased [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:bg-clip-text [&_h1]:text-transparent [&_h1]:bg-gradient-to-r [&_h1]:from-cyan-100 [&_h1]:to-slate-400 [&_h2]:text-4xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:bg-clip-text [&_h2]:text-transparent [&_h2]:bg-gradient-to-r [&_h2]:from-cyan-100 [&_h2]:to-slate-400'>
            {children}
          </div>
        </div>
      </main>
    </section>
  )
})

export default PremiumPageWrapper

'use client'

import { memo, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type PremiumPageWrapperProps = Readonly<{
  children: ReactNode
  className?: string
  contentClassName?: string
  mode?: 'glass' | 'none'
  animate?: boolean
  denseNoise?: boolean
}>

const ENTRY_TRANSITION = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
}

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      ...ENTRY_TRANSITION,
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
}

const CONTENT_VARIANTS = {
  hidden: { opacity: 0, y: 8, scale: 0.995 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 240,
      damping: 26,
      mass: 0.68,
    },
  },
}

const ORNAMENT_VARIANTS = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const SHIMMER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const CHILDREN_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const SVG_XMLNS = 'http' + '://www.w3.org/2000/svg'
const BG_NOISE_IMAGE = `url("data:image/svg+xml,%3Csvg xmlns='${encodeURIComponent(SVG_XMLNS)}' width='180' height='180'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23noise)'/%3E%3C/svg%3E")`
const SURFACE_NOISE_IMAGE = `url("data:image/svg+xml,%3Csvg xmlns='${encodeURIComponent(SVG_XMLNS)}' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")`

const PremiumPageWrapper = memo(function PremiumPageWrapper({
  children,
  className,
  contentClassName,
  mode = 'glass',
  animate = true,
  denseNoise = false,
}: PremiumPageWrapperProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion

  return (
    <motion.section
      initial={shouldAnimate ? 'hidden' : false}
      animate={shouldAnimate ? 'show' : undefined}
      variants={CONTAINER_VARIANTS}
      className={cn(
        'premium-page-shell relative isolate min-h-[100svh] overflow-visible premium-rhythm motion-safe:transform-gpu [transform:translateZ(0)]',
        className
      )}
      style={{ contain: 'layout style paint' }}
    >
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120rem_58rem_at_50%_-25%,rgba(56,189,248,.12),transparent_56%),radial-gradient(104rem_44rem_at_12%_108%,rgba(45,212,191,.13),transparent_62%)]' />
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(66rem_36rem_at_18%_-12%,rgba(56,189,248,.16),transparent),radial-gradient(78rem_40rem_at_90%_108%,rgba(16,185,129,.14),transparent)]' />
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_40%)]' />
      <div className='pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:40px_40px]' />
      <motion.div
        aria-hidden='true'
        variants={SHIMMER_VARIANTS}
        className='pointer-events-none absolute inset-0 -z-10 bg-[conic-gradient(from_210deg_at_50%_50%,rgba(56,189,248,.06),transparent_26%,rgba(16,185,129,.05)_56%,transparent_78%,rgba(56,189,248,.06))]'
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
      <motion.div
        aria-hidden='true'
        variants={ORNAMENT_VARIANTS}
        className='pointer-events-none absolute -top-28 left-1/2 -z-10 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[120px]'
      />
      <motion.div
        variants={CONTENT_VARIANTS}
        className={cn(
          mode === 'glass' &&
            'premium-surface relative overflow-hidden rounded-3xl border border-white/20 bg-slate-900/35 shadow-[0_30px_90px_-50px_rgba(56,189,248,0.8),0_12px_40px_-28px_rgba(16,185,129,0.75),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150',
          contentClassName
        )}
        style={{ contain: 'layout style paint' }}
      >
        {mode === 'glass' ? (
          <>
            <motion.div
              variants={ORNAMENT_VARIANTS}
              className='pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(74rem_30rem_at_10%_-24%,rgba(56,189,248,.26),transparent),radial-gradient(84rem_34rem_at_96%_115%,rgba(16,185,129,.18),transparent)]'
            />
            <div className='pointer-events-none absolute inset-0 rounded-3xl opacity-[0.16] [background-image:linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:24px_24px]' />
            <div className='pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-80' />
            <div className='pointer-events-none absolute inset-y-6 left-0 w-px bg-gradient-to-b from-transparent via-cyan-200/25 to-transparent opacity-70' />
            <div className='pointer-events-none absolute inset-y-6 right-0 w-px bg-gradient-to-b from-transparent via-emerald-200/20 to-transparent opacity-70' />
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 rounded-3xl opacity-[0.035] mix-blend-overlay'
              style={{
                backgroundImage: SURFACE_NOISE_IMAGE,
                backgroundSize: '70px 70px',
              }}
            />
            <div className='pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl' />
            <div className='pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-emerald-300/15 blur-3xl' />
            <motion.div
              aria-hidden='true'
              variants={SHIMMER_VARIANTS}
              className='pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(105deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_28%,rgba(255,255,255,0)_44%)]'
            />
            <div className='pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-cyan-200/20 shadow-[inset_0_0_35px_-20px_rgba(56,189,248,.95)]' />
          </>
        ) : null}
        <motion.div
          variants={CHILDREN_VARIANTS}
          className='relative z-[1] antialiased [font-kerning:normal] [font-variant-ligatures:common-ligatures] [text-wrap:balance]'
          style={{ contain: 'layout style paint' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.section>
  )
})

export default PremiumPageWrapper

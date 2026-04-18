'use client'

import { memo, type ReactNode, useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type PremiumPageWrapperProps = Readonly<{
  children: ReactNode
  className?: string
  contentClassName?: string
  mode?: 'glass' | 'none'
  animate?: boolean
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

const PremiumPageWrapper = memo(function PremiumPageWrapper({
  children,
  className,
  contentClassName,
  mode = 'glass',
  animate = true,
}: PremiumPageWrapperProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch: only animate after mount on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const shouldAnimate = isMounted && animate && !prefersReducedMotion

  return (
    <motion.section
      initial={shouldAnimate ? 'hidden' : false}
      animate={shouldAnimate ? 'show' : undefined}
      variants={CONTAINER_VARIANTS}
      className={cn(
        'premium-page-shell relative isolate min-h-[100svh] overflow-visible premium-rhythm motion-safe:transform-gpu',
        className
      )}
      style={{ contain: 'layout style paint' }}
    >
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(66rem_36rem_at_18%_-12%,rgba(56,189,248,.16),transparent),radial-gradient(78rem_40rem_at_90%_108%,rgba(16,185,129,.14),transparent)]' />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10 opacity-[0.025] mix-blend-overlay'
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: '90px 90px',
        }}
      />
      <motion.div
        variants={CONTENT_VARIANTS}
        className={cn(
          mode === 'glass' &&
            'premium-surface relative overflow-hidden rounded-2xl border border-white/20 bg-slate-900/35 shadow-[0_32px_85px_-50px_rgba(56,189,248,0.8)] backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150',
          contentClassName
        )}
        style={{ contain: 'layout style paint' }}
      >
        {mode === 'glass' ? (
          <>
            <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(74rem_30rem_at_10%_-24%,rgba(56,189,248,.26),transparent),radial-gradient(84rem_34rem_at_96%_115%,rgba(16,185,129,.18),transparent)]' />
            <div className='pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-80' />
            <div className='pointer-events-none absolute inset-y-6 left-0 w-px bg-gradient-to-b from-transparent via-cyan-200/25 to-transparent opacity-70' />
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 rounded-2xl opacity-[0.035] mix-blend-overlay'
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: '70px 70px',
              }}
            />
            <div className='pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl' />
            <div className='pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-emerald-300/15 blur-3xl' />
            <div className='pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-cyan-200/20 shadow-[inset_0_0_35px_-20px_rgba(56,189,248,.95)]' />
          </>
        ) : null}
        <motion.div
          variants={CHILDREN_VARIANTS}
          className='relative z-[1]'
          style={{ contain: 'layout style paint' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.section>
  )
})

export default PremiumPageWrapper

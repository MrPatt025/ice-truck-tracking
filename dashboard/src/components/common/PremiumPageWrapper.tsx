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
      initial={false}
      animate={shouldAnimate ? 'show' : undefined}
      variants={CONTAINER_VARIANTS}
      className={cn(
        'relative isolate overflow-visible premium-rhythm motion-safe:transform-gpu',
        className
      )}
    >
      <motion.div
        variants={CONTENT_VARIANTS}
        className={cn(
          mode === 'glass' &&
            'premium-surface relative rounded-2xl border border-white/20 bg-slate-900/35 shadow-[0_32px_85px_-50px_rgba(56,189,248,0.8)] backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150',
          contentClassName
        )}
        style={{ contain: 'layout style paint' }}
      >
        {mode === 'glass' ? (
          <>
            <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(70rem_28rem_at_8%_-22%,rgba(56,189,248,.24),transparent),radial-gradient(80rem_32rem_at_105%_120%,rgba(139,92,246,.2),transparent)]' />
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 rounded-2xl opacity-[0.035] mix-blend-overlay'
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.82\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                backgroundSize: '70px 70px',
              }}
            />
            <div className='pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-cyan-200/20 shadow-[inset_0_0_35px_-20px_rgba(56,189,248,.95)]' />
          </>
        ) : null}
        {children}
      </motion.div>
    </motion.section>
  )
})

export default PremiumPageWrapper

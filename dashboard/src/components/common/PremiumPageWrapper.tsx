'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
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

export default function PremiumPageWrapper({
  children,
  className,
  contentClassName,
  mode = 'glass',
  animate = true,
}: PremiumPageWrapperProps) {
  return (
    <motion.section
      initial={animate ? { opacity: 0, y: 18 } : false}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={ENTRY_TRANSITION}
      className={cn('relative', className)}
    >
      <div
        className={cn(
          mode === 'glass' &&
            'rounded-2xl border border-white/15 bg-white/[0.03] shadow-[0_22px_55px_-32px_rgba(56,189,248,0.55)] backdrop-blur-xl',
          contentClassName
        )}
      >
        {children}
      </div>
    </motion.section>
  )
}
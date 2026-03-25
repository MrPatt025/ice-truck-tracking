'use client'

import React, { memo } from 'react'
import {
  motion,
  type MotionValue,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import clsx from 'clsx'

interface GlassmorphismPanelProps {
  readonly className?: string
  readonly children: React.ReactNode
  readonly blur?: 'sm' | 'md' | 'lg'
  readonly opacity?: number
  readonly delay?: number
  readonly scrollProgress?: MotionValue<number>
  readonly parallaxRange?: [number, number]
}

/**
 * GlassmorphismPanel — Memoized glassmorphism panel with parallax effects.
 * Prevents re-renders from parent prop changes using froze MotionValues.
 */
export const GlassmorphismPanel = memo(function GlassmorphismPanel({
  className,
  children,
  blur = 'md',
  opacity = 0.15,
  delay = 0,
  scrollProgress,
  parallaxRange = [0, 0.35],
}: Readonly<GlassmorphismPanelProps>) {
  const blurClass = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-2xl',
  }[blur]

  const fallbackProgress = useMotionValue(0)
  const progress = scrollProgress ?? fallbackProgress
  const panelOpacity = useTransform(progress, parallaxRange, [1, 0.84])
  const panelY = useTransform(progress, parallaxRange, ['0px', '-16px'])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      viewport={{ once: true, amount: 0.2 }}
      style={{
        opacity: panelOpacity,
        y: panelY,
        willChange: 'opacity, transform',
        backgroundColor: `rgba(15, 23, 42, ${opacity})`,
      }}
      className={clsx(
        'relative rounded-2xl border transform-gpu',
        'border-cyan-100/25 bg-white/10 ring-1 ring-cyan-100/15',
        blurClass,
        'saturate-150 shadow-[0_12px_48px_-12px_rgba(34,211,238,0.24)]',
        className
      )}
    >
      <div className='absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_18%_16%,rgba(186,230,253,0.2),transparent_46%)] pointer-events-none' />
      {/* Inner glow effect */}
      <div className='absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/5 via-transparent to-blue-400/5 pointer-events-none' />
      <div className='absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_82%_20%,rgba(224,242,254,0.16),transparent_38%)] pointer-events-none' />
      <div className='absolute inset-x-0 top-0 h-px bg-cyan-100/65 pointer-events-none' />

      {/* Content */}
      <div className='relative z-10'>{children}</div>
    </motion.div>
  )
})

GlassmorphismPanel.displayName = 'GlassmorphismPanel'

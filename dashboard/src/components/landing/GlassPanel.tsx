'use client'

import React from 'react'
import {
  motion,
  type MotionValue,
  useMotionValue,
  useTransform,
} from 'framer-motion'

type GlassPanelProps = {
  children: React.ReactNode
  className?: string
  scrollProgress?: MotionValue<number>
  parallaxRange?: [number, number]
}

export default function GlassPanel({
  children,
  className = '',
  scrollProgress,
  parallaxRange = [0, 0.3],
}: Readonly<GlassPanelProps>) {
  const fallbackProgress = useMotionValue(0)
  const progress = scrollProgress ?? fallbackProgress
  const panelOpacity = useTransform(
    progress,
    parallaxRange,
    [1, 0.88]
  )
  const panelLift = useTransform(progress, parallaxRange, ['0px', '-22px'])

  return (
    <motion.div
      style={{ opacity: panelOpacity, y: panelLift, willChange: 'opacity, transform' }}
      className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md shadow-[0_24px_80px_-42px_rgba(56,189,248,0.72)] ${className}`}
    >
      <div className='condensation-layer pointer-events-none absolute inset-0' />
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),rgba(255,255,255,0.01)_38%,rgba(14,165,233,0.1)_100%)]' />
      <div className='relative z-10'>{children}</div>
    </motion.div>
  )
}

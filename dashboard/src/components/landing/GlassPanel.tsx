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
      style={{
        opacity: panelOpacity,
        y: panelLift,
        willChange: 'opacity, transform',
      }}
      className={`relative overflow-hidden rounded-3xl border border-cyan-100/30 bg-white/10 backdrop-blur-xl saturate-150 shadow-[0_24px_80px_-42px_rgba(56,189,248,0.72)] ring-1 ring-cyan-200/25 transform-gpu ${className}`}
    >
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(186,230,253,0.22),transparent_48%)]' />
      <div className='condensation-layer pointer-events-none absolute inset-0' />
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),rgba(255,255,255,0.01)_38%,rgba(14,165,233,0.1)_100%)]' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(224,242,254,0.16),transparent_42%)]' />
      <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-cyan-100/70' />
      <div className='relative z-10'>{children}</div>
    </motion.div>
  )
}

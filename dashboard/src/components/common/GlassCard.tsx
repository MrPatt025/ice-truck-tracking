'use client'

import React, { memo } from 'react'
import { motion } from 'framer-motion'

type GlassCardProps = Readonly<{
  children: React.ReactNode
  accent?: string
  className?: string
  onClick?: () => void
  layoutId?: string
}>

const GlassCard = memo(function GlassCard({
  children,
  accent = 'from-violet-400/30 via-purple-400/20 to-cyan-400/30',
  className = '',
  onClick,
  layoutId,
}: GlassCardProps) {
  const inner = (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{ type: 'spring', damping: 30, stiffness: 230 }}
      className='h-full'
    >
      <div
        className={`group glass-panel relative h-full overflow-hidden rounded-3xl p-[2px] bg-gradient-to-br ${accent} transition-transform duration-500 hover:scale-[1.02] will-change-transform`}
      >
        <div
          className={`relative h-full rounded-[calc(1.5rem-2px)] backdrop-blur-[var(--glass-blur)] backdrop-saturate-[1.8] backdrop-brightness-110 ring-1 ring-white/20 transition-[box-shadow] duration-500 group-hover:ring-white/30 ${className}`}
        >
          <div className='pointer-events-none absolute -inset-10 rounded-[2.5rem] bg-[radial-gradient(100rem_35rem_at_50%_-15%,rgba(139,92,246,.25),transparent),radial-gradient(60rem_25rem_at_-15%_125%,rgba(34,211,238,.2),transparent),radial-gradient(70rem_28rem_at_115%_125%,rgba(16,185,129,.18),transparent)]' />

          <div
            className='glass-noise-layer pointer-events-none absolute inset-0 rounded-[calc(1.5rem-2px)] opacity-[0.03] mix-blend-overlay'
          />

          <div className='pointer-events-none absolute inset-0 rounded-[calc(1.5rem-2px)] opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.15),transparent)] bg-[length:200%_100%] animate-shimmer' />

          <div className='pointer-events-none absolute inset-0 rounded-[calc(1.5rem-2px)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[linear-gradient(135deg,rgba(139,92,246,.1),transparent,rgba(34,211,238,.1))]' />

          <div className='relative h-full'>{children}</div>
        </div>
      </div>
    </motion.div>
  )
  if (onClick) {
    return (
      <button
        type='button'
        className='cursor-pointer text-left w-full h-full border-0 bg-transparent p-0'
        onClick={onClick}
      >
        {inner}
      </button>
    )
  }
  return inner
})

export default GlassCard

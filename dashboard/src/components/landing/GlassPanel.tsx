'use client'

import React from 'react'

type GlassPanelProps = {
  children: React.ReactNode
  className?: string
}

export default function GlassPanel({
  children,
  className = '',
}: Readonly<GlassPanelProps>) {
  return (
    <div className={`glass-panel relative overflow-hidden ${className}`}>
      <div className='condensation-layer pointer-events-none absolute inset-0' />
      <div className='relative z-10'>{children}</div>
    </div>
  )
}

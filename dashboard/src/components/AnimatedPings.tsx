'use client'
import React, { memo } from 'react'
import { secureRandomRange } from '@/lib/secureRandom'

type Item = {
  id: number
  left: number
  top: number
  delay: number
  duration: number
}

/**
 * AnimatedPings — Memoized animated ping elements for visual feedback.
 * Prevents re-renders from parent prop changes.
 */
const AnimatedPings = memo(function AnimatedPings({
  count = 12,
}: {
  count?: number
}) {
  // Generate once on client to avoid SSR mismatch
  const [items] = React.useState<Item[]>(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: secureRandomRange(20, 80),
      top: secureRandomRange(20, 80),
      delay: i * 0.3 + secureRandomRange(0, 0.5),
      duration: secureRandomRange(3, 4),
    }))
  )

  return (
    <div className='absolute inset-0 opacity-60' suppressHydrationWarning>
      {items.map(it => (
        <React.Fragment key={it.id}>
          <div id={`ping-${it.id}`} className='absolute animate-ping'>
            <div className='h-3 w-3 rounded-full bg-cyan-400' />
          </div>
          <style jsx>{`
            #ping-${it.id} {
              left: ${it.left}%;
              top: ${it.top}%;
              animation-delay: ${it.delay}s;
              animation-duration: ${it.duration}s;
            }
          `}</style>
        </React.Fragment>
      ))}
    </div>
  )
})

AnimatedPings.displayName = 'AnimatedPings'

export default AnimatedPings



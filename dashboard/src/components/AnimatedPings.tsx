'use client'
import React from 'react'

type Item = { id: number; left: number; top: number; delay: number; duration: number }

export default function AnimatedPings({ count = 12 }: { count?: number }) {
  // Generate once on client to avoid SSR mismatch
  const [items] = React.useState<Item[]>(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: 20 + Math.random() * 60,
      top: 20 + Math.random() * 60,
      delay: i * 0.3 + Math.random() * 0.5,
      duration: 3 + Math.random() * 1,
    }))
  )

  return (
    <div className="absolute inset-0 opacity-60" suppressHydrationWarning>
      {items.map((it) => (
        <React.Fragment key={it.id}>
          <div id={`ping-${it.id}`} className="absolute animate-ping">
            <div className="h-3 w-3 rounded-full bg-cyan-400" />
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
}



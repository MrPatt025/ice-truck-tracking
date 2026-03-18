'use client'

import React from 'react'

export default function ScrollTruckStory() {
  const targetRef = React.useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const update = () => {
      if (!targetRef.current) return
      const rect = targetRef.current.getBoundingClientRect()
      const viewport = globalThis.innerHeight || 1
      const raw = 1 - rect.bottom / (viewport + rect.height)
      const clamped = Math.max(0, Math.min(1, raw))
      setProgress(clamped)
    }

    update()
    globalThis.addEventListener('scroll', update, { passive: true })
    globalThis.addEventListener('resize', update)

    return () => {
      globalThis.removeEventListener('scroll', update)
      globalThis.removeEventListener('resize', update)
    }
  }, [])

  const rotateY = -15 + progress * 375
  const explodeLeft = progress * -70
  const explodeRight = progress * 70
  const pulse = 0.3 + Math.sin(progress * Math.PI) * 0.7

  return (
    <section ref={targetRef} className='mx-auto max-w-7xl px-6 py-24'>
      <div className='mb-8 text-center'>
        <h2 className='text-3xl font-bold sm:text-4xl'>
          Scroll-Driven 3D Story
        </h2>
        <p className='mt-3 text-slate-400'>
          Truck body rotates and splits to reveal IoT sensor positions as you
          scroll.
        </p>
      </div>

      <div className='relative mx-auto h-[300px] max-w-4xl rounded-2xl border border-cyan-300/20 bg-slate-900/40 p-8 backdrop-blur-xl'>
        <div
          style={{ transform: `translate(-50%, -50%) rotateY(${rotateY}deg)` }}
          className='absolute left-1/2 top-1/2 h-36 w-64 -translate-x-1/2 -translate-y-1/2'
        >
          <div
            style={{ transform: `translateX(${explodeLeft}px)` }}
            className='absolute left-0 top-0 h-full w-1/2 rounded-l-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/30 to-blue-500/20'
          />
          <div
            style={{ transform: `translateX(${explodeRight}px)` }}
            className='absolute right-0 top-0 h-full w-1/2 rounded-r-xl border border-blue-300/30 bg-gradient-to-br from-blue-500/25 to-indigo-500/20'
          />

          <div
            style={{ opacity: pulse }}
            className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/20 p-3 ring-1 ring-cyan-300/40'
          >
            <span className='text-xs font-semibold text-cyan-200'>TEMP</span>
          </div>

          <div className='absolute -left-5 top-6 rounded-full bg-slate-950/90 p-2 ring-1 ring-blue-300/40'>
            <span className='text-[10px] font-semibold text-blue-300'>GPS</span>
          </div>
          <div className='absolute -right-5 bottom-6 rounded-full bg-slate-950/90 p-2 ring-1 ring-cyan-300/40'>
            <span className='text-[10px] font-semibold text-cyan-300'>
              COOL
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

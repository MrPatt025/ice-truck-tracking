'use client'

import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
// FCP optimization: removed AnimatePresence/motion overhead
import GlassSpinner from '@/shared/ui/GlassSpinner'

const SharedCanvasHost = dynamic(
  () => import('@/components/SharedCanvasHost'),
  {
    ssr: false,
  }
)

const ScrollytellingCanvas = dynamic(
  () =>
    import('@/components/ScrollytellingCanvas').then(
      m => m.ScrollytellingCanvas
    ),
  { ssr: false }
)

function SharedCanvasHostReady({ onReady }: Readonly<{ onReady: () => void }>) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return <SharedCanvasHost />
}

export default function ClientSharedCanvasHost() {
  const [canvasReady, setCanvasReady] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(true)

  useEffect(() => {
    let cancelled = false
    const handle = globalThis.requestAnimationFrame(() => {
      if (!cancelled) setCanvasReady(true)
    })

    return () => {
      cancelled = true
      globalThis.cancelAnimationFrame(handle)
    }
  }, [])

  useEffect(() => {
    if (canvasReady && showSkeleton) {
      setShowSkeleton(false)
    }
  }, [canvasReady, showSkeleton])

  return (
    <>
      {canvasReady ? (
        <Suspense fallback={<GlassSpinner className='absolute inset-0' />}>
          <ScrollytellingCanvas />
        </Suspense>
      ) : null}
      {showSkeleton ? (
        <div className='pointer-events-none fixed inset-0 -z-30 bg-gradient-to-br from-cyan-400/10 via-slate-900/60 to-blue-500/10 backdrop-blur-2xl'>
          <div className='absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-slate-900/60 to-blue-500/10' />
          <div className='absolute left-6 top-6 h-24 w-72 animate-pulse rounded-2xl border border-white/20 bg-white/10 shadow-[0_20px_55px_-30px_rgba(14,165,233,0.7)]' />
          <div className='absolute bottom-10 right-8 h-16 w-48 animate-pulse rounded-xl border border-cyan-200/25 bg-cyan-300/10' />
        </div>
      ) : null}
      <SharedCanvasHostReady onReady={() => undefined} />
    </>
  )
}

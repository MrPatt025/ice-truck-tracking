'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'

const SharedCanvasHost = dynamic(
  () => import('@/components/SharedCanvasHost'),
  {
    ssr: false,
  }
)

function SharedCanvasHostReady({
  onReady,
}: Readonly<{ onReady: () => void }>) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return <SharedCanvasHost />
}

export default function ClientSharedCanvasHost() {
  const [showSkeleton, setShowSkeleton] = useState(true)

  return (
    <>
      <AnimatePresence>
        {showSkeleton ? (
          <motion.div
            key='shared-canvas-loader'
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.015,
              transition: {
                duration: 0.38,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            className='pointer-events-none fixed inset-0 -z-30'
          >
            <div className='absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-slate-900/60 to-blue-500/10 backdrop-blur-2xl' />
            <div className='absolute left-6 top-6 h-24 w-72 animate-pulse rounded-2xl border border-white/20 bg-white/10 shadow-[0_20px_55px_-30px_rgba(14,165,233,0.7)]' />
            <div className='absolute bottom-10 right-8 h-16 w-48 animate-pulse rounded-xl border border-cyan-200/25 bg-cyan-300/10' />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <SharedCanvasHostReady
        onReady={() => {
          if (showSkeleton) {
            setShowSkeleton(false)
          }
        }}
      />
    </>
  )
}

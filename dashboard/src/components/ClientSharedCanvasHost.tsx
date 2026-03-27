'use client'

import dynamic from 'next/dynamic'

const SharedCanvasHost = dynamic(
  () => import('@/components/SharedCanvasHost'),
  {
    ssr: false,
    loading: () => (
      <div className='pointer-events-none fixed inset-0 -z-30'>
        <div className='absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-slate-900/60 to-blue-500/10 backdrop-blur-2xl' />
        <div className='absolute left-6 top-6 h-24 w-72 animate-pulse rounded-2xl border border-white/20 bg-white/10 shadow-[0_20px_55px_-30px_rgba(14,165,233,0.7)]' />
        <div className='absolute bottom-10 right-8 h-16 w-48 animate-pulse rounded-xl border border-cyan-200/25 bg-cyan-300/10' />
      </div>
    ),
  }
)

export default function ClientSharedCanvasHost() {
  return <SharedCanvasHost />
}

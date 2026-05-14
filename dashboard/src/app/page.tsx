'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const LandingPage = dynamic(() => import('@/components/LandingPage'), {
  ssr: false,
})

const ScrollytellingCanvas = dynamic(
  () =>
    import('@/components/ScrollytellingCanvas').then(
      m => m.ScrollytellingCanvas
    ),
  { ssr: false }
)
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

export default function Home() {
  return (
    <>
      <ScrollytellingCanvas />
      <PremiumPageWrapper
        mode='glass'
        denseNoise
        contentClassName='border-white/30 bg-slate-950/40 shadow-[0_44px_155px_-82px_rgba(34,211,238,0.95)]'
      >
        <LandingPage />
      </PremiumPageWrapper>
    </>
  )
}

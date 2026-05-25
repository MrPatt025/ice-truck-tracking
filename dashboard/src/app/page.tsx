'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const LandingPage = dynamic(() => import('@/components/LandingPage'), {
  ssr: false,
})

import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

export default function Home() {
  return (
    <PremiumPageWrapper mode='glass' denseNoise testId='dashboard-page-wrapper'>
      <LandingPage />
    </PremiumPageWrapper>
  )
}

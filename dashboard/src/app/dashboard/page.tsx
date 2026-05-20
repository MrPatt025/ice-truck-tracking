'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper'

// ScrollytellingCanvas is mounted once at the ClientSharedCanvasHost

const DashboardView = dynamic(
  () => import('@/components/dashboard/DashboardView'),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-screen w-full items-center justify-center bg-slate-950'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-10 w-10 animate-spin text-cyan-500' />
          <p className='text-sm font-medium text-slate-400'>
            Initializing IoT Engine...
          </p>
        </div>
      </div>
    ),
  }
)

export default function DashboardPage() {
  return (
    <PremiumPageWrapper
        mode='glass'
        denseNoise
        testId='dashboard-page-wrapper'
      >
        <DashboardView />
      </PremiumPageWrapper>
  )
}

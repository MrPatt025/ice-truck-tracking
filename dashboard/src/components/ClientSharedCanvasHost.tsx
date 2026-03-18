'use client'

import dynamic from 'next/dynamic'

const SharedCanvasHost = dynamic(
  () => import('@/components/SharedCanvasHost'),
  {
    ssr: false,
  }
)

export default function ClientSharedCanvasHost() {
  return <SharedCanvasHost />
}

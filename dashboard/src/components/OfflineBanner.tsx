'use client'

import React, { memo, useEffect, useState } from 'react'

interface OfflineBannerProps {
  className?: string
}

const OfflineBanner = memo(function OfflineBanner({ className = '' }: Readonly<OfflineBannerProps>) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (globalThis.window === undefined) return true
    return globalThis.navigator.onLine
  })

  useEffect(() => {
    if (globalThis.window === undefined) {
      return undefined
    }

    const updateStatus = () => {
      setIsOnline(globalThis.navigator.onLine)
    }

    updateStatus()

    globalThis.window.addEventListener('online', updateStatus)
    globalThis.window.addEventListener('offline', updateStatus)
    const statusPoll = globalThis.window.setInterval(updateStatus, 400)

    return () => {
      globalThis.window.removeEventListener('online', updateStatus)
      globalThis.window.removeEventListener('offline', updateStatus)
      globalThis.window.clearInterval(statusPoll)
    }
  }, [])

  return (
    <div
      role='status'
      aria-live='polite'
      aria-hidden={isOnline}
      data-testid='offline-indicator'
      className={`glass-panel rounded-xl border border-amber-200/30 bg-amber-100/10 p-3 text-amber-100 shadow-xl transition-opacity duration-200 ${isOnline ? 'pointer-events-none invisible opacity-0' : 'visible opacity-100'} ${className}`}
    >
      <p className='text-sm font-semibold tracking-wide'>
        Offline mode enabled
      </p>
      <p className='text-xs opacity-90'>graceful fallback mode</p>
    </div>
  )
})

OfflineBanner.displayName = 'OfflineBanner'

export default OfflineBanner

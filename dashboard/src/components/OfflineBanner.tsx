'use client'

import React, { memo, useEffect, useState } from 'react'

interface OfflineBannerProps {
  className?: string
}

const OfflineBanner = memo(function OfflineBanner({ className = '' }: Readonly<OfflineBannerProps>) {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (globalThis.window === undefined) return true
    return globalThis.navigator.onLine === false
  })

  useEffect(() => {
    if (globalThis.window === undefined) {
      return undefined
    }

    const updateStatus = () => {
      setIsOffline(globalThis.navigator.onLine === false)
    }

    updateStatus()

    globalThis.window.addEventListener('online', updateStatus)
    globalThis.window.addEventListener('offline', updateStatus)
    const statusPoll = globalThis.window.setInterval(updateStatus, 120)
    const hydrationSync = globalThis.window.setTimeout(updateStatus, 50)

    return () => {
      globalThis.window.removeEventListener('online', updateStatus)
      globalThis.window.removeEventListener('offline', updateStatus)
      globalThis.window.clearInterval(statusPoll)
      globalThis.window.clearTimeout(hydrationSync)
    }
  }, [])

  return (
    <div
      role='status'
      aria-live='polite'
      aria-hidden={!isOffline}
      data-testid='offline-indicator'
      className={`glass-panel rounded-xl border border-amber-200/30 bg-amber-100/10 p-3 text-amber-100 shadow-xl transition-opacity duration-200 ${isOffline ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'} ${className}`}
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

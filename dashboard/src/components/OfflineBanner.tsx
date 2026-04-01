'use client'

import React, { memo, useEffect, useState } from 'react'

interface OfflineBannerProps {
  className?: string
  isOffline?: boolean
}

const OfflineBanner = memo(function OfflineBanner({
  className = '',
  isOffline: externalIsOffline,
}: Readonly<OfflineBannerProps>) {
  const [detectedOffline, setDetectedOffline] = useState<boolean>(() => {
    if (globalThis.window === undefined) return true
    return globalThis.navigator.onLine === false
  })

  useEffect(() => {
    if (globalThis.window === undefined) {
      return undefined
    }

    let cancelled = false

    const updateStatus = async () => {
      if (globalThis.navigator.onLine === false) {
        if (!cancelled) setDetectedOffline(true)
        return
      }

      try {
        const controller = new AbortController()
        const timeoutId = globalThis.window.setTimeout(() => {
          controller.abort()
        }, 1500)
        const response = await fetch('/api/v1/health/livez', {
          cache: 'no-store',
          method: 'HEAD',
          signal: controller.signal,
        })
        globalThis.window.clearTimeout(timeoutId)
        if (!cancelled) setDetectedOffline(!response.ok)
      } catch {
        if (!cancelled) setDetectedOffline(true)
      }
    }

    updateStatus()

    globalThis.window.addEventListener('online', updateStatus)
    globalThis.window.addEventListener('offline', updateStatus)
    const statusPoll = globalThis.window.setInterval(() => {
      void updateStatus()
    }, 250)
    const hydrationSync = globalThis.window.setTimeout(() => {
      void updateStatus()
    }, 50)

    return () => {
      cancelled = true
      globalThis.window.removeEventListener('online', updateStatus)
      globalThis.window.removeEventListener('offline', updateStatus)
      globalThis.window.clearInterval(statusPoll)
      globalThis.window.clearTimeout(hydrationSync)
    }
  }, [])

  const isOffline = externalIsOffline ?? detectedOffline

  return (
    <div
      role='status'
      aria-live='polite'
      data-testid='offline-indicator'
      className={`glass-panel relative z-50 min-h-[4.5rem] rounded-xl border border-amber-200/30 bg-amber-100/10 p-3 text-amber-100 shadow-xl transition-[opacity,transform,max-height] duration-200 ${isOffline ? 'max-h-24 opacity-100 translate-y-0' : 'pointer-events-none max-h-0 overflow-hidden opacity-0 -translate-y-2'} ${className}`}
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

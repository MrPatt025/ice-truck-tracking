'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { resolveBackendHealthUrl } from '@/lib/backendUrl'

interface OfflineBannerProps {
  className?: string
  isOffline?: boolean
}

const HEALTH_BASE_INTERVAL_MS = 5_000
const HEALTH_MAX_INTERVAL_MS = 30_000

const OfflineBanner = memo(function OfflineBanner({
  className = '',
  isOffline: externalIsOffline,
}: Readonly<OfflineBannerProps>) {
  const [detectedOffline, setDetectedOffline] = useState<boolean>(() => {
    if (globalThis.window === undefined) return true
    return globalThis.navigator.onLine === false
  })
  const timerRef = useRef<number | null>(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    if (globalThis.window === undefined) {
      return undefined
    }

    let cancelled = false

    const clearTimer = () => {
      if (timerRef.current !== null) {
        globalThis.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const scheduleProbe = (delayMs: number) => {
      clearTimer()
      if (cancelled) return

      timerRef.current = globalThis.window.setTimeout(() => {
        timerRef.current = null
        void probeHealth()
      }, delayMs) as unknown as number
    }

    const probeHealth = async () => {
      if (cancelled) return

      if (globalThis.navigator.onLine === false) {
        retryCountRef.current = 0
        setDetectedOffline(true)
        clearTimer()
        return
      }

      const controller = new AbortController()
      const timeoutId: number = globalThis.window.setTimeout(() => {
        controller.abort()
      }, 1500) as unknown as number

      try {
        const response = await fetch(resolveBackendHealthUrl(), {
          cache: 'no-store',
          method: 'HEAD',
          signal: controller.signal,
        })

        setDetectedOffline(!response.ok)

        if (response.ok) {
          retryCountRef.current = 0
          scheduleProbe(HEALTH_BASE_INTERVAL_MS)
          return
        }

        retryCountRef.current = Math.min(retryCountRef.current + 1, 5)
        scheduleProbe(
          Math.min(
            HEALTH_MAX_INTERVAL_MS,
            HEALTH_BASE_INTERVAL_MS * 2 ** retryCountRef.current
          )
        )
      } catch {
        retryCountRef.current = Math.min(retryCountRef.current + 1, 5)
        setDetectedOffline(true)
        scheduleProbe(
          Math.min(
            HEALTH_MAX_INTERVAL_MS,
            HEALTH_BASE_INTERVAL_MS * 2 ** retryCountRef.current
          )
        )
      } finally {
        globalThis.window.clearTimeout(timeoutId)
      }
    }

    const handleOnline = () => {
      void probeHealth()
    }

    const handleOffline = () => {
      retryCountRef.current = 0
      setDetectedOffline(true)
      clearTimer()
    }

    void probeHealth()

    globalThis.window.addEventListener('online', handleOnline)
    globalThis.window.addEventListener('offline', handleOffline)

    return () => {
      cancelled = true
      clearTimer()
      globalThis.window.removeEventListener('online', handleOnline)
      globalThis.window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isOffline = externalIsOffline ?? detectedOffline

  return (
    <div
      role='status'
      aria-live='polite'
      data-testid='offline-indicator'
      className={`glass-panel isolate z-[90] min-h-[4.5rem] rounded-xl border border-amber-200/30 bg-amber-100/10 p-3 text-amber-100 shadow-xl transition-[opacity,transform] duration-200 ${isOffline ? 'relative block opacity-100 translate-y-0' : 'pointer-events-none invisible absolute opacity-0 -translate-y-2'} ${className}`}
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

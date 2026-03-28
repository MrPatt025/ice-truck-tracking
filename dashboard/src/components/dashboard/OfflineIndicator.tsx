'use client'

import React, { memo, useEffect, useState } from 'react'

interface OfflineIndicatorProps {
  className?: string
}

const OfflineIndicator = memo(function OfflineIndicator({ className = '' }: Readonly<OfflineIndicatorProps>) {
  const [isOnline, setIsOnline] = useState(true)

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

    return () => {
      globalThis.window.removeEventListener('online', updateStatus)
      globalThis.window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div
      role='status'
      aria-live='polite'
      data-testid='offline-indicator'
      className={`glass-panel rounded-xl border border-amber-200/30 bg-amber-100/10 p-3 text-amber-100 shadow-xl ${className}`}
    >
      <p className='text-sm font-semibold tracking-wide'>Offline mode enabled</p>
      <p className='text-xs opacity-90'>graceful fallback mode</p>
    </div>
  )
})

OfflineIndicator.displayName = 'OfflineIndicator'

export default OfflineIndicator

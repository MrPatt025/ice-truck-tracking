'use client'

import { memo, useState, useEffect } from 'react'
import { cn } from '../utils'
import { secureRandomInt } from '@/lib/secureRandom'

interface ConnectionStatusProps {
  className?: string
  showQueueCount?: boolean
}

/**
 * ConnectionStatus — Memoized to prevent re-renders from parent prop changes.
 * Component manages its own online/offline state independently.
 */
export const ConnectionStatus = memo(function ConnectionStatus({
  className,
  showQueueCount = true,
}: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [queuedActions, setQueuedActions] = useState(0)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Simulate syncing queued actions
      if (queuedActions > 0) {
        setTimeout(() => {
          setQueuedActions(0)
          setLastSync(new Date())
        }, 1000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Check initial status
    setIsOnline(navigator.onLine)

    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('offline', handleOffline)

    return () => {
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('offline', handleOffline)
    }
  }, [queuedActions])

  // Simulate queuing actions when offline
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setQueuedActions(prev => prev + secureRandomInt(2))
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isOnline])

  const formatLastSync = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'just now'
    if (minutes === 1) return '1 minute ago'
    return `${minutes} minutes ago`
  }

  const offlineAnnouncement =
    queuedActions > 0
      ? `Application is offline with ${queuedActions} actions queued`
      : 'Application is offline'

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        isOnline
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200',
        className
      )}
      role='status'
      aria-live='polite'
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isOnline ? 'bg-green-500' : 'bg-red-500'
        )}
        aria-hidden='true'
      />

      <span className='font-medium'>{isOnline ? 'Online' : 'Offline'}</span>

      {!isOnline && showQueueCount && queuedActions > 0 && (
        <span className='text-xs bg-red-100 px-2 py-1 rounded-full'>
          {queuedActions} queued
        </span>
      )}

      {isOnline && lastSync && (
        <span className='text-xs text-green-600'>
          Synced {formatLastSync(lastSync)}
        </span>
      )}

      <span className='sr-only'>
        {isOnline ? 'Application is online and connected' : offlineAnnouncement}
      </span>
    </div>
  )
})

ConnectionStatus.displayName = 'ConnectionStatus'



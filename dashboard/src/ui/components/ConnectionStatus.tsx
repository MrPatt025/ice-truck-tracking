'use client';

import type { JSX } from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '../utils';

interface ConnectionStatusProps {
  className?: string;
  showQueueCount?: boolean;
  /** จำลองการคิวงานตอนออฟไลน์สำหรับ dev/test */
  simulateQueue?: boolean;
}

export function ConnectionStatus({
  className,
  showQueueCount = true,
  simulateQueue = true,
}: ConnectionStatusProps): JSX.Element {
  const isBrowser =
    typeof window !== 'undefined' && typeof navigator !== 'undefined';

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    isBrowser ? navigator.onLine : true,
  );
  const [queuedActions, setQueuedActions] = useState<number>(0);
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(null);

  // refs เพื่อใช้ใน event listeners โดยไม่ต้อง re-bind
  const queuedRef = useRef<number>(queuedActions);
  queuedRef.current = queuedActions;

  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // จัดการ online/offline และซิงก์งานคิว
  useEffect(() => {
    if (!isBrowser) return;

    const handleOnline = () => {
      setIsOnline(true);

      // จำลองการ flush งานคิวเมื่อกลับมาออนไลน์
      if (queuedRef.current > 0) {
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = setTimeout(() => {
          setQueuedActions(0);
          setLastSyncMs(Date.now());
        }, 750);
      } else {
        setLastSyncMs(Date.now());
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // initial
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    };
  }, [isBrowser]);

  // จำลองการคิวงานเมื่อออฟไลน์
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (!isOnline && simulateQueue && process.env.NODE_ENV !== 'production') {
      interval = setInterval(() => {
        setQueuedActions((prev) => prev + Math.floor(Math.random() * 2)); // 0-1 งานใหม่
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, simulateQueue]);

  // คำนวณข้อความ time-ago
  const lastSyncText = useMemo(() => {
    if (lastSyncMs == null) return null;
    const diffMs = Date.now() - lastSyncMs;
    const minutes = Math.floor(diffMs / 60000);

    if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
      if (minutes < 1) return rtf.format(0, 'minute');
      return rtf.format(-minutes, 'minute');
    }

    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  }, [lastSyncMs]);

  return (
    <div
      data-testid="connection-status"
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border',
        isOnline
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-red-50 text-red-700 border-red-200',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={!isOnline && queuedActions > 0}
    >
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full',
          isOnline ? 'bg-green-500' : 'bg-red-500',
        )}
        aria-hidden="true"
      />

      <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>

      {!isOnline && showQueueCount && queuedActions > 0 && (
        <span className="text-xs bg-red-100 px-2 py-1 rounded-full">
          {queuedActions} queued
        </span>
      )}

      {isOnline && lastSyncText && (
        <span className="text-xs text-gray-500">Last sync: {lastSyncText}</span>
      )}
    </div>
  );
}

export default ConnectionStatus;

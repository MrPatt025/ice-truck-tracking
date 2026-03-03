'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

/* ─────────────────── Types ─────────────────── */
type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration: number
  createdAt: number
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (opts: Omit<Toast, 'id' | 'createdAt'> & { id?: string }) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let counter = 0

/* ─────────────────── Provider ─────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => setToasts([]), [])

  const toast = useCallback(
    (opts: Omit<Toast, 'id' | 'createdAt'> & { id?: string }) => {
      const id = opts.id ?? `toast-${++counter}`
      const t: Toast = { ...opts, id, createdAt: Date.now() }
      setToasts(prev => [...prev.slice(-4), t]) // keep max 5
      return id
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

/* ─────────────────── Viewport ─────────────────── */
const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success:
    'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100',
  error:
    'border-red-500/50 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100',
  warning:
    'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-100',
  info: 'border-blue-500/50 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100',
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[]
  dismiss: (id: string) => void
}) {
  return (
    <div
      role='region'
      aria-label='Notifications'
      aria-live='polite'
      className='pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-md flex-col gap-2'
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  )
}

function ToastItem({
  toast: t,
  dismiss,
}: {
  toast: Toast
  dismiss: (id: string) => void
}) {
  useEffect(() => {
    if (t.duration <= 0) return
    const timer = setTimeout(() => dismiss(t.id), t.duration)
    return () => clearTimeout(timer)
  }, [t.id, t.duration, dismiss])

  return (
    <div
      role='status'
      className={`pointer-events-auto animate-in slide-in-from-right-full fade-in-0 rounded-lg border p-4 shadow-lg transition-all duration-300 ${variantStyles[t.variant]}`}
    >
      <div className='flex items-start gap-3'>
        <div className='flex-1'>
          <p className='text-sm font-semibold'>{t.title}</p>
          {t.description && (
            <p className='mt-1 text-xs opacity-80'>{t.description}</p>
          )}
        </div>
        <button
          onClick={() => dismiss(t.id)}
          className='shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring'
          aria-label='Dismiss notification'
        >
          <svg
            className='h-4 w-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

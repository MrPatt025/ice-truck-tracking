'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface GlobalErrorBoundaryProps {
  children: React.ReactNode
}

interface GlobalErrorBoundaryState {
  hasError: boolean
}

export class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('GlobalErrorBoundary caught error:', error)
    }
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false })
    globalThis.location.reload()
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className='fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-6 backdrop-blur-xl'>
        <div className='w-full max-w-lg rounded-3xl border border-cyan-200/25 bg-slate-900/75 p-6 text-slate-100 shadow-[0_30px_80px_-40px_rgba(34,211,238,0.8)]'>
          <div className='mb-3 flex items-center gap-2 text-cyan-200'>
            <AlertTriangle className='h-5 w-5' />
            <h2 className='text-lg font-semibold'>Interface recovered in safe mode</h2>
          </div>
          <p className='text-sm text-slate-300'>
            A rendering fault occurred. Live telemetry is protected, and you can
            rehydrate the UI without losing backend state.
          </p>
          <button
            type='button'
            onClick={this.handleRetry}
            className='mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-200/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20'
          >
            <RefreshCw className='h-4 w-4' />
            Reload interface
          </button>
        </div>
      </div>
    )
  }
}

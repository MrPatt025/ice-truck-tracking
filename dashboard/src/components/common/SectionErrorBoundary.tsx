'use client'

import React from 'react'

interface SectionErrorBoundaryProps {
  children: React.ReactNode
  title: string
}

interface SectionErrorBoundaryState {
  hasError: boolean
  message: string
}

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: unknown): SectionErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('SectionErrorBoundary caught error:', error)
    }
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false, message: '' })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className='rounded-3xl border border-rose-300/35 bg-slate-900/70 p-6 text-rose-100 backdrop-blur-2xl shadow-[0_22px_60px_-35px_rgba(244,63,94,0.95)]'>
        <h3 className='text-lg font-semibold'>
          {this.props.title} temporarily unavailable
        </h3>
        <p className='mt-2 text-sm text-rose-100/80'>{this.state.message}</p>
        <button
          type='button'
          onClick={this.handleRetry}
          className='mt-4 rounded-xl border border-rose-300/45 bg-rose-500/10 px-3.5 py-2 text-sm font-medium transition hover:bg-rose-500/20'
        >
          Retry section
        </button>
      </div>
    )
  }
}

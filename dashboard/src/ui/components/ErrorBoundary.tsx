'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Log to external service (Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className='flex flex-col items-center justify-center min-h-64 p-8 text-center'>
          <div className='mb-4'>
            <svg
              className='w-16 h-16 text-red-500 mx-auto'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>

          <h2 className='text-xl font-semibold text-gray-900 mb-2'>
            Something went wrong
          </h2>

          <p className='text-gray-600 mb-6 max-w-md'>
            We encountered an unexpected error. Please try refreshing the page
            or contact support if the problem persists.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className='mb-4 p-4 bg-red-50 rounded-lg text-left max-w-2xl'>
              <summary className='cursor-pointer font-medium text-red-800'>
                Error Details (Development)
              </summary>
              <pre className='mt-2 text-sm text-red-700 whitespace-pre-wrap'>
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className='flex gap-3'>
            <Button onClick={this.handleRetry}>Try Again</Button>
            <Button variant='outline' onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}



'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to Sentry (client)
    try {
      Sentry.captureException(error, { extra: { errorInfo } });
    } catch {}
    // Optional consumer hook
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    try {
      if (typeof window !== 'undefined') window.location.reload();
    } catch {}
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <section
          role="alert"
          aria-live="assertive"
          className="glass-surface mx-auto my-8 max-w-2xl rounded-xl p-6 text-white text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-3">
            <div
              className="h-2.5 w-2.5 rounded-full bg-(--status-critical) shadow-[0_0_12px_var(--status-critical)]"
              aria-hidden
            />
            <h2 className="text-lg font-semibold text-brand-gradient">
              Something went wrong
            </h2>
          </div>
          <p className="mx-auto max-w-md text-sm text-white/80">
            An unexpected error occurred. It has been reported. Try reloading
            the page or return to your dashboard.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mx-auto mt-4 max-w-2xl rounded-lg bg-red-950/30 p-4 text-left ring-1 ring-red-400/30">
              <summary className="cursor-pointer font-medium text-red-200">
                Error Details (Development)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-red-200/90">
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={this.handleRetry}>Reload</Button>
            <a
              href="/dashboard"
              className="rounded-md border border-(--card-border) px-4 py-2 text-sm focus-ring-theme"
            >
              Go to dashboard
            </a>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

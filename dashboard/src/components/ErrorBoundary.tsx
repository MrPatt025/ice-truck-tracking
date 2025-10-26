'use client';
import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any): State {
    return { hasError: true, message: err?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: any, info: any) {
    // log if needed
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3"
        >
          <div
            data-testid="error-message"
            className="px-2 py-1 rounded bg-red-500/20 border border-red-400/40 my-2"
          >
            {this.state.message ?? 'Something went wrong'}
          </div>
          <button
            data-testid="retry-button"
            className="px-2 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/15"
            onClick={() =>
              this.setState({ hasError: false, message: undefined })
            }
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

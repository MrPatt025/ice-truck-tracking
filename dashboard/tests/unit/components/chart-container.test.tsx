import React from 'react';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import ChartContainer from '@/components/ChartContainer';

// Mock ResizeObserver to immediately set a non-zero size
class MockResizeObserver {
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(_target: Element) {
    // simulate a usable size
    const entry = [
      { contentRect: { width: 300, height: 200 } } as any,
    ] as ResizeObserverEntry[];
    this.cb(entry, this as any);
  }
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  (global as any).ResizeObserver = MockResizeObserver as any;
  (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0 as any);
    return 0 as any;
  };
  (global as any).cancelAnimationFrame = () => {};
});

describe('ChartContainer', () => {
  it('shows empty state overlay when empty=true', async () => {
    render(
      <ChartContainer empty emptyMessage="Nothing here" readyThreshold={-1}>
        <div data-testid="child" />
      </ChartContainer>,
    );

    // Once ready, it should show the empty overlay
    const empty = await screen.findByLabelText('Nothing here');
    expect(empty).toBeInTheDocument();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('renders children when not empty and ready', async () => {
    render(
      <ChartContainer readyThreshold={-1}>
        <div data-testid="content" />
      </ChartContainer>,
    );
    const child = await screen.findByTestId('content');
    expect(child).toBeInTheDocument();
  });
});

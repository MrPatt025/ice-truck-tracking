/**
 * WebSocket Failure Recovery Tests
 * ──────────────────────────────────
 * Tests the WebSocket reconnection logic, exponential backoff,
 * fallback polling, and data consistency after disconnection.
 *
 * Run: npx jest dashboard/src/hooks/__tests__/ws-failure-recovery.test.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mock WebSocket ────────────────────────────────────────────

type WSListener = (event: unknown) => void;

class MockWebSocket {
  static readonly instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

    url: string;
    readyState: number = MockWebSocket.CONNECTING;
    onopen: WSListener | null = null;
    onmessage: WSListener | null = null;
    onclose: WSListener | null = null;
    onerror: WSListener | null = null;

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    close() {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code: 1000, reason: '' });
    }

    simulateOpen() {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.({});
    }

    simulateMessage(data: unknown) {
        this.onmessage?.({ data: JSON.stringify(data) });
    }

    simulateClose(code = 1006) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code, reason: '' });
    }

    simulateError() {
        this.onerror?.({ type: 'error' });
    }

    send() { /* noop for tests */ }
}

// ─── Mock fetch for fallback polling ───────────────────────────

const mockFetch = jest.fn();

// ─── Setup ─────────────────────────────────────────────────────

beforeAll(() => {
    // @ts-expect-error - mock WebSocket globally
    globalThis.WebSocket = MockWebSocket;
    globalThis.fetch = mockFetch;
});

beforeEach(() => {
    MockWebSocket.instances = [];
    mockFetch.mockReset();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── Tests ─────────────────────────────────────────────────────

describe('WebSocket Failure Recovery', () => {
    // Dynamic import to pick up mocks
    let useRealTimeData: () => {
        trucks: unknown[];
        alerts: unknown[];
        isConnected: boolean;
    };

    beforeAll(async () => {
        const mod = await import('../useRealTimeData');
        useRealTimeData = mod.useRealTimeData;
    });

    test('establishes initial WebSocket connection', async () => {
        const { result } = renderHook(() => useRealTimeData());

        // A WebSocket should have been created
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
        const ws = MockWebSocket.instances[0];

        act(() => { ws.simulateOpen(); });

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        });
    });

    test('reconnects with exponential backoff after disconnection', async () => {
        const { result } = renderHook(() => useRealTimeData());
      const ws1 = MockWebSocket.instances.at(-1)!;

        // Connect then disconnect
        act(() => { ws1.simulateOpen(); });
        await waitFor(() => expect(result.current.isConnected).toBe(true));

        act(() => { ws1.simulateClose(1006); });
        await waitFor(() => expect(result.current.isConnected).toBe(false));

        // First retry after ~1s
        act(() => { jest.advanceTimersByTime(1200); });
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);

        // Second retry after ~2s
      const ws2 = MockWebSocket.instances.at(-1)!;
        act(() => { ws2.simulateClose(1006); });
        act(() => { jest.advanceTimersByTime(2500); });
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(3);
    });

    test('processes truck data after reconnection', async () => {
        const { result } = renderHook(() => useRealTimeData());
      const ws1 = MockWebSocket.instances.at(-1)!;

        // First connection
        act(() => { ws1.simulateOpen(); });
        act(() => {
            ws1.simulateMessage({
                trucks: [{ id: 'T1', latitude: 13.7, longitude: 100.5, driver_name: 'A' }],
            });
        });

        await waitFor(() => expect(result.current.trucks).toHaveLength(1));

        // Disconnect
        act(() => { ws1.simulateClose(1006); });

        // Reconnect
        act(() => { jest.advanceTimersByTime(1500); });
      const ws2 = MockWebSocket.instances.at(-1)!;
        act(() => { ws2.simulateOpen(); });

        // New data on reconnected socket
        act(() => {
            ws2.simulateMessage({
                trucks: [
                    { id: 'T1', latitude: 13.8, longitude: 100.6, driver_name: 'A' },
                { id: 'T2', latitude: 14, longitude: 101, driver_name: 'B' },
                ],
            });
        });

        await waitFor(() => expect(result.current.trucks).toHaveLength(2));
    });

    test('processes alert data over WebSocket', async () => {
        const { result } = renderHook(() => useRealTimeData());
      const ws = MockWebSocket.instances.at(-1)!;

        act(() => { ws.simulateOpen(); });
        act(() => {
            ws.simulateMessage({
                type: 'alert',
                payload: { id: 'a1', level: 'critical', message: 'Engine overheat' },
            });
        });

        await waitFor(() => expect(result.current.alerts).toHaveLength(1));
        expect(result.current.alerts[0]).toMatchObject({ id: 'a1', level: 'critical' });
    });

    test('stops retrying after max retry limit', async () => {
        const { result } = renderHook(() => useRealTimeData());
        // Simulate 5 failures (maxRetry = 5)
        for (let i = 0; i < 6; i++) {
          const ws = MockWebSocket.instances.at(-1)!;
            act(() => { ws.simulateOpen(); });
            act(() => { ws.simulateClose(1006); });
            act(() => { jest.advanceTimersByTime(15_000); }); // well past any backoff
        }

        const totalCreated = MockWebSocket.instances.length;
        // Should stop creating new connections after max retries
        act(() => { jest.advanceTimersByTime(60_000); });
        expect(MockWebSocket.instances.length).toBeLessThanOrEqual(totalCreated + 1);

        expect(result.current.isConnected).toBe(false);
    });

    test('closes WebSocket on unmount', () => {
        const { unmount } = renderHook(() => useRealTimeData());
      const ws = MockWebSocket.instances.at(-1)!;
        act(() => { ws.simulateOpen(); });

        unmount();
        expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });

    test('handles malformed messages gracefully', async () => {
        const { result } = renderHook(() => useRealTimeData());
      const ws = MockWebSocket.instances.at(-1)!;

        act(() => { ws.simulateOpen(); });

        // Send invalid JSON — should not crash
        act(() => { ws.onmessage?.({ data: 'not-json' }); });

        // Send valid data after
        act(() => {
            ws.simulateMessage({ trucks: [{ id: 'T1', latitude: 13.7, longitude: 100.5 }] });
        });

        await waitFor(() => expect(result.current.trucks).toHaveLength(1));
    });

    test('resets retry counter on successful connection', async () => {
        const { result } = renderHook(() => useRealTimeData());

        // First connection → disconnect
      let ws = MockWebSocket.instances.at(-1)!;
        act(() => { ws.simulateOpen(); });
        act(() => { ws.simulateClose(1006); });

        // Retry → success
        act(() => { jest.advanceTimersByTime(1500); });
      ws = MockWebSocket.instances.at(-1)!;
        act(() => { ws.simulateOpen(); });
        await waitFor(() => expect(result.current.isConnected).toBe(true));

        // Disconnect again → retry counter should be reset, so first retry is fast
        act(() => { ws.simulateClose(1006); });

        const countBefore = MockWebSocket.instances.length;
        act(() => { jest.advanceTimersByTime(1500); });
        expect(MockWebSocket.instances.length).toBeGreaterThan(countBefore);
    });
});

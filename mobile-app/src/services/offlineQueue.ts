import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { secureStorage } from './secureStorage';

/**
 * Offline Queue — stores failed API requests for retry when connectivity returns.
 * Provides offline-first capability for the mobile app.
 */

interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: string;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 5;
const MAX_QUEUE_SIZE = 100;

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private unsubscribe: (() => void) | null = null;

  async init(): Promise<void> {
    // Load persisted queue
    const raw = await secureStorage.get(QUEUE_KEY);
    if (raw) {
      try {
        this.queue = JSON.parse(raw);
      } catch {
        this.queue = [];
      }
    }

    // Listen for connectivity changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  async enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest item to make room
      this.queue.shift();
    }

    this.queue.push({
      ...request,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      retryCount: 0,
    });

    await this.persist();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    const remaining: QueuedRequest[] = [];

    for (const req of this.queue) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });

        if (!response.ok && response.status >= 500) {
          // Server error — retry later
          if (req.retryCount < MAX_RETRIES) {
            remaining.push({ ...req, retryCount: req.retryCount + 1 });
          }
          // else: max retries exceeded, drop the request
        }
        // 2xx or 4xx (client error) — consider it processed
      } catch {
        // Network error — keep in queue
        if (req.retryCount < MAX_RETRIES) {
          remaining.push({ ...req, retryCount: req.retryCount + 1 });
        }
      }
    }

    this.queue = remaining;
    await this.persist();
    this.isProcessing = false;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }

  destroy(): void {
    this.unsubscribe?.();
  }

  private async persist(): Promise<void> {
    await secureStorage.set(QUEUE_KEY, JSON.stringify(this.queue));
  }
}

export const offlineQueue = new OfflineQueue();

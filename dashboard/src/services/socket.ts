// dashboard/src/services/socket.ts
'use client';

import {
  io,
  type Socket,
  type ManagerOptions,
  type SocketOptions,
} from 'socket.io-client';
import { buildWsUrl } from '@/shared/lib/wsUrl';

// ===== Domain types =====
export interface TruckLocation {
  id: string;
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  temperature: number;
  status: 'active' | 'idle' | 'offline';
}

export interface GeofenceAlert {
  id: string;
  truckId: string;
  type: 'entry' | 'exit' | 'violation';
  geofenceId: string;
  timestamp: string;
  location: { lat: number; lng: number };
}

// ===== Strongly-typed Socket.IO event maps =====
type ServerToClientEvents = {
  'truck:location': (data: TruckLocation) => void;
  'geofence:alert': (data: GeofenceAlert) => void;
  'truck:status': (data: {
    truckId: string;
    status: 'active' | 'idle' | 'offline';
  }) => void;
};

type ClientToServerEvents = {
  'truck:subscribe': (truckId: string) => void;
  'truck:unsubscribe': (truckId: string) => void;
  'geofence:ack': (alertId: string) => void;
};

// ===== Service =====
class SocketService {
  private socket:
    | Socket<ServerToClientEvents, ClientToServerEvents>
    | undefined;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private wiredCoreEvents = false;

  /**
   * สร้าง/คืน socket เดียว (singleton) เฉพาะฝั่ง client
   * ใส่ type annotation ชัดเจนเพื่อเลี่ยง TS2742
   */
  connect(
    url: string = process.env.NEXT_PUBLIC_WS_URL ?? buildWsUrl(),
    opts?: Partial<ManagerOptions & SocketOptions>,
  ): Socket<ServerToClientEvents, ClientToServerEvents> {
    // ป้องกันถูกเรียกตอน SSR
    if (typeof window === 'undefined') {
      throw new Error('SocketService.connect() must be called in the browser');
    }

    // คืนของเดิมถ้ามีอยู่แล้ว
    if (this.socket) return this.socket;

    // *** สำคัญ: ห้ามใส่ generic ที่ io(); ให้ cast/annotate ที่ตัวแปรแทน ***
    const s = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      ...opts,
    }) as Socket<ServerToClientEvents, ClientToServerEvents>;

    this.socket = s;

    // ผูก core lifecycle events ครั้งเดียว
    if (!this.wiredCoreEvents) {
      this.wireCoreEvents(s);
      this.wiredCoreEvents = true;
    }

    return this.socket;
  }

  private wireCoreEvents(
    s: Socket<ServerToClientEvents, ClientToServerEvents>,
  ) {
    s.on('connect', () => {
      // ใช้ console.* ระวัง log noise ในโปรดักชัน
      if (process.env.NODE_ENV === 'development') {
        console.warn('[socket] connected', s.id);
      }
      this.reconnectAttempts = 0;
    });

    s.on('disconnect', (reason) => {
      console.warn('[socket] disconnected:', reason);
    });

    // manager-level events
    s.io.on('reconnect_attempt', (attempt: number) => {
      this.reconnectAttempts = attempt;
      if (process.env.NODE_ENV === 'development') {
        console.warn('[socket] reconnect attempt', attempt);
      }
    });

    s.io.on('reconnect_error', (error: unknown) => {
      console.error('[socket] reconnect error:', error);
    });

    s.on('connect_error', (error: unknown) => {
      console.error('[socket] connect error:', error);
      this.reconnectAttempts++;
    });
  }

  // ===== Typed subscriptions: คืนฟังก์ชัน unbind สำหรับ cleanup =====
  onTruckLocationUpdate(
    callback: ServerToClientEvents['truck:location'],
  ): () => void {
    if (!this.socket) return () => {};
    this.socket.on('truck:location', callback);
    return () => this.socket?.off('truck:location', callback);
    // หมายเหตุ: เรียกใช้หลัง connect() เสมอ
  }

  onGeofenceAlert(
    callback: ServerToClientEvents['geofence:alert'],
  ): () => void {
    if (!this.socket) return () => {};
    this.socket.on('geofence:alert', callback);
    return () => this.socket?.off('geofence:alert', callback);
  }

  onTruckStatusChange(
    callback: ServerToClientEvents['truck:status'],
  ): () => void {
    if (!this.socket) return () => {};
    this.socket.on('truck:status', callback);
    return () => this.socket?.off('truck:status', callback);
  }

  // ===== Typed emit =====
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void {
    this.socket?.emit(event, ...(args as Parameters<ClientToServerEvents[E]>));
  }

  // ===== Common helpers =====
  subscribeTruck(truckId: string) {
    this.emit('truck:subscribe', truckId);
  }
  unsubscribeTruck(truckId: string) {
    this.emit('truck:unsubscribe', truckId);
  }
  ackGeofence(alertId: string) {
    this.emit('geofence:ack', alertId);
  }

  waitForConnect(timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('socket is not initialized'));
      if (this.socket.connected) return resolve();

      const onConnect = () => {
        clearTimeout(tid);
        this.socket?.off('connect_error', onError);
        resolve();
      };
      const onError = (err: unknown) => {
        clearTimeout(tid);
        this.socket?.off('connect', onConnect);
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      const tid = setTimeout(() => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        reject(new Error('socket connect timeout'));
      }, timeoutMs);

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);
    });
  }

  // ===== lifecycle =====
  disconnect(): void {
    if (!this.socket) return;
    try {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    } finally {
      this.socket = undefined;
      this.wiredCoreEvents = false;
      this.reconnectAttempts = 0;
    }
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export const socketService = new SocketService();
export default socketService;

// dashboard/src/lib/ws.ts
export type WSOptions<T> = {
  urlCandidates: string[]; // ลำดับ endpoint ที่จะลองต่อ
  onMessage: (data: T) => void; // caller แปลง/ตรวจสอบ payload เอง
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  heartbeatMs?: number; // default 25s
};

export function openSocket<T>(opt: WSOptions<T>) {
  let ws: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let i = 0,
    backoff = 1000;

  const connect = () => {
    if (i >= opt.urlCandidates.length) {
      // หมดทุกทางเลือกแล้ว: ไม่ใช้ WS
      return;
    }
    const url = opt.urlCandidates[i++];
    try {
      ws = new WebSocket(url);
    } catch {
      connect();
      return;
    }

    ws.addEventListener('open', () => {
      backoff = 1000;
      opt.onOpen?.();
      const hb = opt.heartbeatMs ?? 25000;
      pingTimer && clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try {
          ws?.send('ping');
        } catch {}
      }, hb);
    });

    ws.addEventListener('message', (ev) => {
      try {
        const raw = JSON.parse(ev.data);
        opt.onMessage(raw as T);
      } catch {
        // ผ่านข้อความที่ไม่ใช่ JSON
      }
    });

    const onEnd = (ev: any) => {
      opt.onClose?.(ev);
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      // ลอง endpoint ถัดไปก่อน ถ้าหมดค่อย backoff แล้ววนใหม่ทั้งหมด
      if (i < opt.urlCandidates.length) {
        connect();
        return;
      }
      setTimeout(() => {
        i = 0;
        backoff = Math.min(backoff * 2, 30000);
        connect();
      }, backoff);
    };

    ws.addEventListener('close', onEnd);
    ws.addEventListener('error', (ev) => {
      opt.onError?.(ev);
      try {
        ws?.close();
      } catch {}
    });
  };

  connect();

  return {
    close() {
      if (pingTimer) clearInterval(pingTimer);
      try {
        ws?.close();
      } catch {}
    },
  };
}

// สร้างลิสต์ ws:// จาก NEXT_PUBLIC_API_URL โดยอัตโนมัติ
export function deriveWsCandidates(httpBase: string | undefined) {
  const base = httpBase ?? 'http://localhost:5000';
  const wsBase = base.replace(/^http/, 'ws').replace(/\/$/, '');
  // ลองเส้นทางยอดนิยมเผื่อ backend ต่างกัน
  return [`${wsBase}/ws`, `${wsBase}/socket`, `${wsBase}`];
}

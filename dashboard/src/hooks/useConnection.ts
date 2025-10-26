import { useEffect, useState } from 'react';

export function useConnection(wsUrl: string) {
  const [online, setOnline] = useState(true);
  const [wsReady, setWsReady] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null,
      t: any;
    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsReady(true);
      ws.onclose = () => {
        setWsReady(false);
        t = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      if (t) clearTimeout(t);
      ws?.close();
    };
  }, [wsUrl]);

  return { online, wsReady };
}

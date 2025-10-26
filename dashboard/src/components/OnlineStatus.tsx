'use client';
import { useEffect } from 'react';

export default function OnlineStatus() {
  useEffect(() => {
    const ann = document.getElementById('sr-announcer');
    const set = (t: string) => {
      if (ann) {
        ann.textContent = t;
        (ann as any).dataset.state = t.toLowerCase();
      }
    };
    const onOnline = () => set('Connected');
    const onOffline = () => set('Offline');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    navigator.onLine ? onOnline() : onOffline();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return null;
}

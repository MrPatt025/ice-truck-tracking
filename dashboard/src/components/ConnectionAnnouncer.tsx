'use client';
import { useEffect, useState } from 'react';

export default function ConnectionAnnouncer() {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    const el = document.getElementById('sr-announcer');
    const set = (t: string) => {
      if (!el) return;
      el.textContent = t;
      el.setAttribute('data-state', t.toLowerCase());
    };
    const onOnline = () => {
      setOnline(true);
      set('Connected');
    };
    const onOffline = () => {
      setOnline(false);
      set('Offline');
    };

    set(navigator.onLine ? 'Connected' : 'Offline');
    setOnline(navigator.onLine);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return null;
}

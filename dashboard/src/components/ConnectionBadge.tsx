'use client';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';

export default function ConnectionBadge(): JSX.Element {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const h1 = () => setOnline(true);
    const h0 = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', h1);
    window.addEventListener('offline', h0);
    return () => {
      window.removeEventListener('online', h1);
      window.removeEventListener('offline', h0);
    };
  }, []);

  return (
    <div
      data-testid="offline-indicator"
      className={`fixed top-4 right-4 px-2 py-1 rounded border text-sm z-[9999] ${
        online
          ? 'bg-emerald-500/20 border-emerald-400/40'
          : 'bg-orange-500/20 border-orange-400/40'
      }`}
      aria-live="polite"
    >
      {online ? 'Connected' : 'Offline'}
    </div>
  );
}

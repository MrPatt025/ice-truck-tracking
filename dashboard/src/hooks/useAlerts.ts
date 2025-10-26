import { useEffect, useRef, useState } from 'react';
import { getAlerts, type AlertItem } from '@/lib/api';

export function useAlerts(
  intervalMs: number = Number(process.env.NEXT_PUBLIC_POLL_MS ?? 5000),
) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      try {
        const data = await getAlerts();
        if (mounted) {
          setAlerts(data);
          setError(null);
        }
      } catch (e) {
        if (mounted) setError('Failed to load alerts');
      }
    };

    tick();
    timer.current = window.setInterval(tick, intervalMs);
    return () => {
      mounted = false;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [intervalMs]);

  return { alerts, error };
}

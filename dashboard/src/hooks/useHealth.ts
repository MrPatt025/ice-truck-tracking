// /dashboard/src/hooks/useHealth.ts (FIXED & FINAL VERSION)
import useSWR from 'swr';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const POLLING_INTERVAL = Number(process.env.NEXT_PUBLIC_POLL_MS || 5000);

// The fetcher function now only cares about the response being "ok" (status 200-299)
const healthFetcher = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (error) {
    // If the fetch itself fails (e.g., network error), it's not healthy
    return false;
  }
};

export const useHealth = () => {
  // Use a local state to manage the health status
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  // Use SWR for polling in the background
  const { data, error } = useSWR(`${API_URL}/api/v1/health`, healthFetcher, {
    refreshInterval: POLLING_INTERVAL,
    dedupingInterval: POLLING_INTERVAL, // Prevent duplicate requests
  });

  useEffect(() => {
    if (error) {
      setApiHealthy(false);
      return;
    }
    // SWR's 'data' can be undefined on the first load
    if (typeof data === 'boolean') {
      setApiHealthy(data);
    }
  }, [data, error]);

  return { apiHealthy };
};

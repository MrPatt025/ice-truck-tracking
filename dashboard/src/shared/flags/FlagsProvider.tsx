'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// Optional Unleash proxy client; only loaded if configured
// no-op placeholder retained for potential future factory swap

export type Flags = {
  mapEngine: 'tomtom' | 'leaflet';
  threeHeroEnabled: boolean;
  anomalyModelEnabled: boolean;
};

export type FlagsContextValue = Flags & {
  ready: boolean;
  setMapEngine: (v: 'tomtom' | 'leaflet') => void;
  setThreeHeroEnabled: (v: boolean) => void;
  setAnomalyModelEnabled: (v: boolean) => void;
};

const FlagsContext = createContext<FlagsContextValue | undefined>(undefined);

const LS_KEY = 'flags.v1';

function readLocal(): Flags | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    return {
      mapEngine: j.mapEngine === 'leaflet' ? 'leaflet' : 'tomtom',
      threeHeroEnabled: Boolean(j.threeHeroEnabled ?? true),
      anomalyModelEnabled: Boolean(j.anomalyModelEnabled ?? true),
    } satisfies Flags;
  } catch {
    return null;
  }
}

function writeLocal(v: Flags) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch {}
}

export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Flags>(
    () =>
      readLocal() ?? {
        mapEngine: 'tomtom',
        threeHeroEnabled: true,
        anomalyModelEnabled: true,
      },
  );
  const [ready, setReady] = useState(false);
  const unsubRef = useRef<(() => void) | undefined>(undefined);

  // Persist local fallback flags
  useEffect(() => {
    writeLocal(flags);
  }, [flags]);

  // Optionally connect to Unleash proxy for runtime kill-switch
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_UNLEASH_PROXY_URL;
    const clientKey = process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY;
    if (!url || !clientKey) {
      setReady(true);
      return;
    }
    let stopped = false;
    (async () => {
      try {
        const mod = await import('unleash-proxy-client');
        const UnleashClient =
          (mod as any).UnleashClient ?? (mod as any).default?.UnleashClient;
        if (!UnleashClient) throw new Error('UnleashClient not available');
        const client = new UnleashClient({
          url,
          clientKey,
          appName: process.env.NEXT_PUBLIC_UNLEASH_APP_NAME || 'dashboard',
          refreshInterval: 15,
        });
        client.start();
        const onUpdate = () => {
          if (stopped) return;
          // Map flags
          const mapEngineLeaflet = client.isEnabled('map-engine-leaflet');
          const threeOff = client.isEnabled('three-hero-off');
          const anomalyOn = client.isEnabled('anomaly-model-on');
          setFlags((prev) => ({
            ...prev,
            mapEngine: mapEngineLeaflet ? 'leaflet' : prev.mapEngine,
            threeHeroEnabled: threeOff ? false : prev.threeHeroEnabled,
            anomalyModelEnabled: anomalyOn ?? prev.anomalyModelEnabled,
          }));
          setReady(true);
        };
        client.on('ready', onUpdate);
        client.on('update', onUpdate);
        unsubRef.current = () => client.stop?.();
      } catch {
        setReady(true);
      }
    })();
    return () => {
      stopped = true;
      try {
        unsubRef.current?.();
      } catch {}
    };
  }, []);

  const setMapEngine = useCallback(
    (v: 'tomtom' | 'leaflet') => setFlags((p) => ({ ...p, mapEngine: v })),
    [],
  );
  const setThreeHeroEnabled = useCallback(
    (v: boolean) => setFlags((p) => ({ ...p, threeHeroEnabled: v })),
    [],
  );
  const setAnomalyModelEnabled = useCallback(
    (v: boolean) => setFlags((p) => ({ ...p, anomalyModelEnabled: v })),
    [],
  );

  const value = useMemo<FlagsContextValue>(
    () => ({
      ...flags,
      ready,
      setMapEngine,
      setThreeHeroEnabled,
      setAnomalyModelEnabled,
    }),
    [flags, ready, setMapEngine, setThreeHeroEnabled, setAnomalyModelEnabled],
  );

  return (
    <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>
  );
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used within FlagsProvider');
  return ctx;
}

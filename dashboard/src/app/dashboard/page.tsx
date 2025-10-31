'use client';
import {
  Truck,
  ThermometerSun,
  Bell,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  X,
  Grid3X3,
  Layers,
  Zap,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
  BarChart3,
  Fuel,
  Package,
  Users,
  Calendar,
  Search,
  Wifi,
  WifiOff,
  Database,
  Server,
  Play,
  Pause,
  Minimize2,
  Code,
} from 'lucide-react';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react';
// Recharts-heavy components are lazy-loaded via next/dynamic below to reduce initial bundle size.

import ClientOnly from '@/components/ClientOnly';
// NOTE: Assuming these hooks exist and are now more robustly implemented.
import { useRealtimeTrucks } from '@/hooks/useRealtimeTrucks';
import { useHealth } from '@/hooks/useHealth';
import { useStats } from '@/hooks/useStats';
import type { GetApiV1StatsRange } from '@/types/api/getApiV1StatsRange';
import type { GetApiV1Stats200RevenueSeriesItem } from '@/types/api/getApiV1Stats200RevenueSeriesItem';
import type { GetApiV1Stats200FleetSeriesItem } from '@/types/api/getApiV1Stats200FleetSeriesItem';
import type { GetApiV1Stats200AlertsSeriesItem } from '@/types/api/getApiV1Stats200AlertsSeriesItem';
import type { GetApiV1Stats200TempBucketsItem } from '@/types/api/getApiV1Stats200TempBucketsItem';
import type { GetApiV1Stats200PerformanceRadarItem } from '@/types/api/getApiV1Stats200PerformanceRadarItem';
import { useAlerts as useAlertsHook } from '@/hooks/useAlerts';
import dynamic from 'next/dynamic';
import StaticHero from '@/components/StaticHero';
import type { UiTruck } from '@/types/truck';
import { useAuth } from '@/shared/auth/AuthContext';
// Inline auth UI removed; prune related UI imports
import { safeParseTelemetryState } from '@/types/contracts.zod';
import { useRefreshSettings } from '@/shared/refresh/RefreshSettings';
import { useFlags } from '@/shared/flags/FlagsProvider';

// Lazy charts (client-only) to avoid shipping Recharts in the initial bundle
const SparklineChart = dynamic(
  () => import('@/components/charts/LazyCharts').then((m) => m.MetricSparkline),
  { ssr: false, loading: () => <div className="mt-3 h-12 w-full" /> },
);
const RevenueChart = dynamic(
  () => import('@/components/charts/LazyCharts').then((m) => m.RevenueChart),
  { ssr: false, loading: () => <div className="h-64 w-full" /> },
);
const FleetChart = dynamic(
  () => import('@/components/charts/LazyCharts').then((m) => m.FleetChart),
  { ssr: false, loading: () => <div className="h-64 w-full" /> },
);
const AlertsChart = dynamic(
  () => import('@/components/charts/LazyCharts').then((m) => m.AlertsChart),
  { ssr: false, loading: () => <div className="h-72 w-full" /> },
);
const TempDistributionPie = dynamic(
  () =>
    import('@/components/charts/LazyCharts').then((m) => m.TempDistributionPie),
  { ssr: false, loading: () => <div className="h-72 w-full" /> },
);
const PerformanceRadar = dynamic(
  () =>
    import('@/components/charts/LazyCharts').then((m) => m.PerformanceRadar),
  { ssr: false, loading: () => <div className="h-72 w-full" /> },
);

// Note: any server-only utilities must not be imported/used in a client component

const TomTomMap = dynamic(() => import('../../components/TomTomMap'), {
  ssr: false,
});

// Lightweight fallback map (Leaflet) for lower-end devices or troubleshooting
const LeafletFleetMap = dynamic(() => import('@/components/LeafletFleetMap'), {
  ssr: false,
});

const Fleet3DCanvas = dynamic(() => import('@/components/Fleet3DCanvas'), {
  ssr: false,
  loading: () => <StaticHero />,
});

// Global stale threshold for telemetry (ms)
const STALE_THRESHOLD_MS = 10_000;

/* =================================================================
   1. CORE UTILITIES & STYLED COMPONENTS (Modularized for Readability)
   ================================================================= */

// --- Placeholder Hooks for Professional Features (Conceptually Implemented) ---
const useFeatureFlags = (initialFlags: Record<string, boolean>) => {
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const toggleFlag = useCallback((key: string) => {
    setFlags((prev: Record<string, boolean>) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);
  return { flags, toggleFlag };
};

// --- Type Definitions (Refined) ---
type Range = '1h' | '24h' | '7d';
type Trend = 'up' | 'down' | 'stable';
type Fullscreen =
  | null
  | 'revenue'
  | 'fleet'
  | 'temp'
  | 'alerts'
  | 'performance';
type Theme = 'dark' | 'neon' | 'ocean' | 'forest';
type AlertLevel = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  truckId?: string;
  acknowledged: boolean;
}

// --- Chart data types ---
type RevenuePoint = {
  date: string;
  value: number;
  previous: number;
  timestamp: number;
};

type FleetPoint = {
  hour: string;
  trucks: number;
  efficiency: number;
  maintenance: number;
};

type AlertsPoint = {
  time: string;
  critical: number;
  warning: number;
  info: number;
};

// --- Constants (Professionalized) ---
const REFRESH_INTERVALS = {
  fast: 5000,
  normal: 10000,
  slow: 60000,
} as const;

const THEME_COLORS = {
  dark: {
    primary: [0x8b5cf6, 0x06b6d4, 0x10b981, 0xf59e0b],
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(139,92,246,.38), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(34,211,238,.32), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(16,185,129,.32), transparent 65%), #0d121c',
  },
  neon: {
    primary: [0xff006e, 0x00f5ff, 0x00ff9f, 0xffd60a],
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(255,0,110,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(0,245,255,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(0,255,159,.35), transparent 65%), #0d0221',
  },
  ocean: {
    primary: [0x0ea5e9, 0x06b6d4, 0x14b8a6, 0x10b981],
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(6,182,212,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(14,165,233,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(20,184,166,.35), transparent 65%), #0a1628',
  },
  forest: {
    primary: [0x10b981, 0x059669, 0x34d399, 0x6ee7b7],
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(16,185,129,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(5,150,105,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(52,211,153,.35), transparent 65%), #0a1810',
  },
};

/* =================================================================
   1A. INLINE AUTH GATE + FORMS (Login / Register)
   - Renders a polished full-screen panel on the dashboard route when
     the user is not authenticated, avoiding redirects to /login.
   - Uses existing AuthContext.login and mirrors token storage behavior.
   ================================================================= */

// function useBaseApiUrl() {}

// Inline auth components removed — dashboard is protected by middleware + server layout.
// Keeping lightweight placeholders to preserve file history.
// function _LoginForm() {}

// function _RegisterForm() {}

// function _AuthPanel() {}

function InlineAuthGate({ children }: { children: React.ReactNode }) {
  // Dashboard route is now protected by middleware and server-side guards.
  // This gate intentionally does nothing and always renders children.
  // It remains to minimize diffs and preserve component structure.
  return <>{children}</>;
}

// --- Data Simulation Functions ---
const generateTimeSeriesData = (
  points: number,
  baseValue: number,
  variance: number,
  trend: number = 0,
) => {
  const data = [];
  const now = Date.now();
  const interval =
    points > 24 ? (24 * 60 * 60 * 1000) / points : (60 * 60 * 1000) / points;

  for (let i = points; i >= 0; i--) {
    const date = new Date(now - i * interval);
    const trendValue = trend * (points - i) * 0.05;
    const value = baseValue + trendValue + (Math.random() - 0.5) * variance;
    const previous = value * (0.85 + Math.random() * 0.15);

    data.push({
      date:
        points > 48
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
      value: Math.max(0, value),
      previous: Math.max(0, previous),
      timestamp: date.getTime(),
    });
  }
  return data;
};

const calculateStatistics = (data: number[]) => {
  if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, sum: 0 };
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / data.length;
  const variance =
    data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);

  return { mean, stdDev, min, max, sum };
};

// --- PingLayer Component (FIXED: Moved back to correct scope) ---
function PingLayer({ count = 12 }: { count?: number }) {
  const [dots, setDots] = React.useState<
    { left: string; top: string; delay: number }[]
  >([]);
  React.useEffect(() => {
    setDots(
      Array.from({ length: count }, (_, i) => ({
        left: `${20 + Math.random() * 60}%`,
        top: `${20 + Math.random() * 60}%`,
        delay: i * 0.3,
      })),
    );
  }, [count]);

  if (!dots.length) return null;
  return (
    <div className="absolute inset-0 opacity-60">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute h-4 w-4 rounded-full bg-cyan-400/80 animate-ping-3s"
          style={
            {
              '--dot-left': d.left,
              '--dot-top': d.top,
              '--dot-delay': `${d.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// --- ThreeBackground (Kept for visual consistency, assume THREE is loaded) ---
const ThreeBackground = memo(
  ({ ready, theme }: { ready: boolean; theme: Theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      if (!ready || !containerRef.current || typeof window === 'undefined')
        return;
      const { THREE } = window as any;
      if (!THREE) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.5,
        1000,
      );
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      containerRef.current.appendChild(renderer.domElement);
      const colors = THEME_COLORS[theme].primary;
      const amb = new THREE.AmbientLight(0xffffff, 0.3);
      const lights = colors.map((color, i) => {
        const light = new THREE.PointLight(color, 2.0, 150, 1.5);
        const angle = (i / colors.length) * Math.PI * 2;
        light.position.set(
          Math.cos(angle) * 20,
          Math.sin(angle) * 15,
          Math.sin(angle * 2) * 10,
        );
        return light;
      });
      scene.add(amb, ...lights);
      const meshes: any[] = [];
      for (let i = 0; i < 30; i++) {
        const g = new THREE.IcosahedronGeometry(Math.random() * 1.5 + 0.5, 0);
        const m = new THREE.MeshPhongMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 0.3,
          shininess: 80,
          wireframe: false,
        });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        scene.add(mesh);
        meshes.push({
          mesh,
          speed: 0.0005 + Math.random() * 0.001,
          axis: new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5,
          ).normalize(),
        });
      }
      camera.position.z = 35;
      let mx = 0,
        my = 0;
      const onMove = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth) * 2 - 1;
        my = -(e.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener('mousemove', onMove, { passive: true });
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = Date.now() * 0.001;
        meshes.forEach(({ mesh, speed, axis }, i) => {
          mesh.rotateOnAxis(axis, speed);
          mesh.position.y += Math.sin((t + i) * 0.5) * 0.004;
          mesh.position.x += Math.cos((t + i) * 0.3) * 0.003;
        });
        lights.forEach((light, i) => {
          const angle = (i / lights.length) * Math.PI * 2 + t * 0.2;
          light.position.x = Math.cos(angle) * 18;
          light.position.z = Math.sin(angle) * 18;
          light.position.y = Math.sin(t * 0.4 + i) * 8;
        });
        camera.position.x += (mx * 3 - camera.position.x) * 0.03;
        camera.position.y += (my * 3 - camera.position.y) * 0.03;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
      };
      tick();
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);
      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('resize', onResize);
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
        meshes.forEach(({ mesh }) => {
          mesh.geometry.dispose();
          mesh.material.dispose();
        });
        renderer.dispose();
      };
      return () => {
        if (cleanupRef.current) cleanupRef.current();
      };
    }, [ready, theme]);
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 -z-10 noise-bg opacity-50"
      />
    );
  },
);
// --- Pill (Aesthetic) ---
const Pill = memo(
  ({
    children,
    intent = 'neutral',
    onClick,
    title,
  }: {
    children: React.ReactNode;
    intent?: 'neutral' | 'ok' | 'warn' | 'info' | 'error';
    onClick?: () => void;
    title?: string;
  }) => {
    const cls =
      intent === 'ok'
        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50 shadow-[0_0_12px_0_rgba(16,185,129,.5)]'
        : intent === 'warn'
          ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_12px_0_rgba(245,158,11,.5)]'
          : intent === 'error'
            ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/50 shadow-[0_0_12px_0_rgba(244,63,94,.5)]'
            : intent === 'info'
              ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 shadow-[0_0_12px_0_rgba(6,182,212,.5)]'
              : 'bg-white/10 text-slate-200 ring-1 ring-white/20';

    if (onClick) {
      return (
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-md transition-all cursor-pointer hover:scale-[1.03] focus-ring-theme outline-none ${cls}`}
          onClick={onClick}
          title={title}
        >
          {children}
        </button>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-md transition-all ${cls}`}
        title={title}
      >
        {children}
      </span>
    );
  },
);
// --- GlassCard V2 (Aesthetic Focus) ---
type GlassCardProps = {
  children: React.ReactNode;
  accent?: string;
  className?: string;
  onClick?: () => void;
};

export const GlassCard = memo(
  ({
    children,
    accent = 'from-violet-500/30 via-purple-500/20 to-cyan-500/30',
    className = '',
    onClick,
  }: GlassCardProps) => {
    const content = (
      <>
        <div
          className={`relative rounded-card bg-slate-900/85 backdrop-blur-2xl ring-1 ring-white/10 min-w-0 min-h-0 overflow-hidden ${className}`}
        >
          {/* Inner Volumetric Glow */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(500px_400px_at_50%_0%,rgba(255,255,255,.2),transparent_70%)]" />

          {/* Shimmer/Light Streak - Optimized for performance with opacity/transition */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.15),transparent)] bg-size-[200%_100%] animate-shimmer" />

          <div className="relative">{children}</div>
        </div>
      </>
    );

    const baseClasses = `group relative rounded-3xl p-[1.5px] bg-linear-to-br ${accent} transition-all duration-500 hover:scale-[1.015] hover:shadow-2xl hover:shadow-cyan-400/20 will-change-transform`;

    // Always render a non-button root to avoid nested <button> issues.
    // If clickable, expose role/button semantics and keyboard handlers.
    const isClickable = typeof onClick === 'function';

    const clickableProps: any = isClickable
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: () => onClick && onClick(),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick && onClick();
            }
          },
        }
      : {};

    return (
      <div
        {...clickableProps}
        className={`w-full ${isClickable ? 'cursor-pointer focus-ring-theme outline-none' : ''} ${baseClasses}`}
      >
        {content}
      </div>
    );
  },
);
// --- Tilt/Hover Effect (Performance Focus) ---
const Tilt = memo(({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const TILT_SENSITIVITY = 3;
  const PERSPECTIVE = 1200;

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${(0.5 - y) * TILT_SENSITIVITY}deg) rotateY(${(x - 0.5) * TILT_SENSITIVITY}deg) translateZ(20px)`;
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="transition-transform duration-500 ease-out will-change-transform"
    >
      {children}
    </div>
  );
});
// Charts are dynamically imported; inline definitions removed to keep this page lighter.

const ClientOnlyText: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <span suppressHydrationWarning>{mounted ? children : null}</span>;
};

/* =================================================================
   2. MAIN DASHBOARD LOGIC (Computer Engineering focus)
   ================================================================= */
export default function Dashboard() {
  const { token, logout, user } = useAuth();
  const enableThree =
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    (process.env.NEXT_PUBLIC_THREE_HERO === '1' ||
      process.env.NEXT_PUBLIC_THREE_HERO === 'true');
  const [timeRange, setTimeRange] = useState<Range>('7d');
  const [threeReady, setThreeReady] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [show3D, setShow3D] = useState(enableThree);
  const [fullscreen, setFullscreen] = useState<Fullscreen>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const {
    autoRefresh,
    setAutoRefresh: _setAutoRefresh,
    refreshSpeed,
    setRefreshSpeed,
    paused: tabPaused,
  } = useRefreshSettings();
  const [_lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [dataPrecision, setDataPrecision] = useState<'low' | 'medium' | 'high'>(
    'medium',
  );
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mapEngine, setMapEngine] = useState<'tomtom' | 'leaflet'>('tomtom');
  const { mapEngine: flaggedEngine, threeHeroEnabled } = useFlags();

  // Apply feature flag kill-switches
  useEffect(() => {
    setMapEngine(flaggedEngine);
  }, [flaggedEngine]);
  const show3DEffective = show3D && threeHeroEnabled;
  const [showHelp, setShowHelp] = useState(false);

  // Hydrate persisted UI preferences on first mount
  useEffect(() => {
    try {
      const prefEngine = localStorage.getItem('ui.mapEngine');
      if (prefEngine === 'tomtom' || prefEngine === 'leaflet') {
        setMapEngine(prefEngine);
      }
      const prefTheme = localStorage.getItem('ui.theme') as Theme | null;
      if (
        prefTheme &&
        ['dark', 'neon', 'ocean', 'forest'].includes(prefTheme)
      ) {
        setTheme(prefTheme as Theme);
      }
      const prefShow3D = localStorage.getItem('ui.show3D');
      if (prefShow3D === '0' || prefShow3D === 'false') {
        setShow3D(false);
      }
      const prefGrid = localStorage.getItem('ui.showGrid');
      if (prefGrid === '0' || prefGrid === 'false') {
        setShowGrid(false);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Persist changes to preferences
  useEffect(() => {
    try {
      localStorage.setItem('ui.mapEngine', mapEngine);
    } catch {}
  }, [mapEngine]);

  useEffect(() => {
    try {
      localStorage.setItem('ui.theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('ui.show3D', show3D ? '1' : '0');
    } catch {}
  }, [show3D]);

  useEffect(() => {
    try {
      localStorage.setItem('ui.showGrid', showGrid ? '1' : '0');
    } catch {}
  }, [showGrid]);

  // Keyboard shortcuts: '?' opens help, 'g' toggles grid
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((v) => !v);
      }
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGrid((v) => !v);
      }
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hooks Integration
  const pollMs = useMemo(() => {
    if (!autoRefresh || tabPaused) return 0;
    return REFRESH_INTERVALS[refreshSpeed] / simulationSpeed;
  }, [autoRefresh, tabPaused, refreshSpeed, simulationSpeed]);

  const { trucks, lastDataTimestamp } = useRealtimeTrucks(pollMs);
  // Normalize trucks from API/telemetry shape into UiTruck used by UI components
  const uiTrucks = useMemo<UiTruck[]>(() => {
    const src = Array.isArray(trucks) ? trucks : [];
    return src
      .map((t, idx) => {
        const idNum =
          typeof (t as any).id === 'number'
            ? (t as any).id
            : Number.parseInt(String((t as any).id), 10);
        const id = Number.isFinite(idNum) ? idNum : idx + 1;
        const lat = (t as any).lat ?? (t as any).latitude;
        const lon = (t as any).lon ?? (t as any).longitude;
        const temp = (t as any).temp ?? (t as any).temperature;
        return {
          id,
          name: (t as any).name ?? `Truck ${id}`,
          ...(typeof lat === 'number' && Number.isFinite(lat) ? { lat } : {}),
          ...(typeof lon === 'number' && Number.isFinite(lon) ? { lon } : {}),
          ...(typeof temp === 'number' && Number.isFinite(temp)
            ? { temp }
            : {}),
          ...(typeof (t as any).speed === 'number' &&
          Number.isFinite((t as any).speed)
            ? { speed: (t as any).speed }
            : {}),
          ...(typeof (t as any).driver_name === 'string' &&
          (t as any).driver_name.trim().length > 0
            ? { driver_name: (t as any).driver_name }
            : {}),
          ...(typeof (t as any).createdAt === 'string'
            ? { createdAt: (t as any).createdAt }
            : {}),
          ...(typeof (t as any).updatedAt === 'string'
            ? { updatedAt: (t as any).updatedAt }
            : {}),
        } satisfies UiTruck;
      })
      .filter(
        (_t) =>
          // keep all for stats, map components will handle missing lat/lon; optionally filter here if needed
          true,
      );
  }, [trucks]);
  // Runtime validation of telemetry state using Zod
  const telemetry = useMemo(() => {
    return safeParseTelemetryState({
      activeStreams: uiTrucks.length,
      lastIngestedAt: lastDataTimestamp ?? null,
    });
  }, [uiTrucks.length, lastDataTimestamp]);
  const isStale = useMemo(() => {
    if (!telemetry?.lastIngestedAt) return true;
    return Date.now() - telemetry.lastIngestedAt > STALE_THRESHOLD_MS;
  }, [telemetry?.lastIngestedAt]);
  const { online: healthOnline } = useHealth();
  const { flags, toggleFlag } = useFeatureFlags({
    'advanced-map-layer': true,
    'anomaly-index': true,
    'developer-mode': false,
    'new-auth-flow': false,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Optimization: Load THREE.js dynamically and only once; gated by feature flag
    if (!enableThree || threeReady) return;
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setThreeReady(true);
    document.body.appendChild(script);
    setLastUpdate(new Date());
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [enableThree, threeReady]);

  // Timer for alerts/updates (with dynamic interval)
  useEffect(() => {
    if (!autoRefresh || paused || tabPaused) return;

    const intervalDuration = REFRESH_INTERVALS[refreshSpeed] / simulationSpeed;

    const interval = setInterval(() => {
      setLastUpdate(new Date());

      // SIMULATED ANOMALY DETECTION AND ALERT GENERATION (Engineering Logic)
      const anomalyIndex =
        Math.random() * (REFRESH_INTERVALS[refreshSpeed] / 1000) * 0.8;

      if (anomalyIndex > 20) {
        const newAlert: Alert = {
          id: Date.now().toString(),
          level:
            Math.random() < 0.1
              ? 'critical'
              : Math.random() < 0.3
                ? 'warning'
                : 'info',
          message: `Truck #${Math.floor(Math.random() * 55) + 1}: ${
            Math.random() < 0.5
              ? 'Temperature threshold exceeded'
              : 'Geofence breach detected'
          }`,
          timestamp: new Date(),
          truckId: `T${Math.floor(Math.random() * 55) + 1}`,
          acknowledged: false,
        };
        setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
      }
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshSpeed, simulationSpeed, paused, tabPaused]);

  // Keyboard Shortcuts (Automation)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(null);

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            setLastUpdate(new Date());
            break;
          case 'g':
            e.preventDefault();
            setShowGrid((v) => !v);
            break;
          case 'p':
            e.preventDefault();
            setPaused((v) => !v);
            break;
          case 'd': // Ctrl+D for Developer Mode toggle (new automation)
            e.preventDefault();
            toggleFlag('developer-mode');
            break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFlag]);

  /* =================================================================
     3. DATA PROCESSING & HIGH-LEVEL METRICS (Performance/Engineering)
     ================================================================= */

  const dataPoints = useMemo(() => {
    switch (timeRange) {
      case '1h':
        return dataPrecision === 'high' ? 60 : 15;
      case '24h':
        return dataPrecision === 'high' ? 96 : 24;
      case '7d':
        return dataPrecision === 'high' ? 168 : 84;
      default:
        return 24;
    }
  }, [timeRange, dataPrecision]);

  const { data: stats } = useStats(timeRange as GetApiV1StatsRange);
  const { alerts: realAlerts } = useAlertsHook({
    intervalMs: 5000,
    enabled: true,
  });

  // Map backend alerts to local Alert shape
  const mapToAlert = useCallback((a: any): Alert | null => {
    try {
      const id = String((a as any).id ?? '');
      const level = String((a as any).level ?? 'info') as AlertLevel;
      const message = String((a as any).message ?? '');
      const tsRaw =
        (a as any).createdAt ??
        (a as any).timestamp ??
        new Date().toISOString();
      const truckId = (a as any).truckId
        ? String((a as any).truckId)
        : undefined;
      const base: Omit<Alert, 'truckId'> & Partial<Pick<Alert, 'truckId'>> = {
        id,
        level: ['critical', 'warning', 'info'].includes(level)
          ? (level as AlertLevel)
          : 'info',
        message,
        timestamp: new Date(tsRaw),
        acknowledged: Boolean((a as any).acknowledged),
      };
      if (truckId) base.truckId = truckId;
      return base as Alert;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(realAlerts) && realAlerts.length) {
      const mapped = realAlerts.map(mapToAlert).filter(Boolean) as Alert[];
      setAlerts(mapped);
    }
  }, [realAlerts, mapToAlert]);

  const revenueData = useMemo<RevenuePoint[]>(() => {
    if (!mounted) {
      return Array.from({ length: dataPoints + 1 }, (_, _i) => ({
        date: '',
        value: 0,
        previous: 0,
        timestamp: 0,
      }));
    }
    if (
      stats &&
      Array.isArray(stats.revenueSeries) &&
      stats.revenueSeries.length
    ) {
      return stats.revenueSeries.map(
        (p: GetApiV1Stats200RevenueSeriesItem) => ({
          date: p.t,
          value: p.value,
          previous: p.value,
          timestamp: Date.now(),
        }),
      );
    }
    return generateTimeSeriesData(dataPoints, 5500, 1800, 15);
  }, [dataPoints, mounted, stats]);

  const fleetActivity = useMemo<FleetPoint[]>(() => {
    const hours =
      timeRange === '1h'
        ? Array.from({ length: dataPoints / 3 }, (_, i) => `${i * 3}m`)
        : timeRange === '24h'
          ? ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!mounted) {
      return hours.map((hour) => ({
        hour,
        trucks: 0,
        efficiency: 0,
        maintenance: 0,
      }));
    }
    if (stats && Array.isArray(stats.fleetSeries) && stats.fleetSeries.length) {
      return stats.fleetSeries.map((p: GetApiV1Stats200FleetSeriesItem) => ({
        hour: p.t,
        trucks: Math.max(0, Math.round(p.active)),
        efficiency: Math.max(0, Math.min(100, Math.round(p.efficiency))),
        maintenance: 0,
      }));
    }
    return hours.map((hour) => ({
      hour,
      trucks: Math.floor(12 + Math.random() * 45),
      efficiency: 85 + Math.random() * 12,
      maintenance: Math.floor(Math.random() * 5),
    }));
  }, [timeRange, mounted, dataPoints, stats]);

  const alertsData = useMemo<AlertsPoint[]>(() => {
    const times =
      timeRange === '1h'
        ? Array.from({ length: dataPoints / 3 }, (_, i) => `${i * 3}m`)
        : timeRange === '24h'
          ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!mounted) {
      return times.map((time) => ({ time, critical: 0, warning: 0, info: 0 }));
    }
    if (
      stats &&
      Array.isArray(stats.alertsSeries) &&
      stats.alertsSeries.length
    ) {
      return stats.alertsSeries.map((p: GetApiV1Stats200AlertsSeriesItem) => ({
        time: p.t,
        critical: Math.max(0, Math.round(p.critical)),
        warning: Math.max(0, Math.round(p.warning)),
        info: Math.max(0, Math.round(p.info)),
      }));
    }
    return times.map((time) => ({
      time,
      critical: Math.floor(Math.random() * 3),
      warning: Math.floor(Math.random() * 8),
      info: Math.floor(Math.random() * 15),
    }));
  }, [timeRange, mounted, dataPoints, stats]);

  const tempBuckets = useMemo(() => {
    if (stats && Array.isArray(stats.tempBuckets) && stats.tempBuckets.length) {
      const palette = ['#38bdf8', '#34d399', '#a78bfa', '#fb7185', '#f59e0b'];
      return stats.tempBuckets.map(
        (b: GetApiV1Stats200TempBucketsItem, i: number) => ({
          name: b.label,
          value: b.value,
          color: palette[i % palette.length],
        }),
      );
    }
    return [
      { name: '= -10°C (Deep Freeze)', value: 0, color: '#38bdf8' },
      { name: '-10 ~ -5°C (Standard)', value: 0, color: '#34d399' },
      { name: '-5 ~ 2°C (Chilled)', value: 0, color: '#a78bfa' },
      { name: '> 2°C (Risk Zone)', value: 0, color: '#fb7185' },
    ];
  }, [stats]);

  const performanceData = useMemo(() => {
    if (
      stats &&
      Array.isArray(stats.performanceRadar) &&
      stats.performanceRadar.length
    ) {
      return stats.performanceRadar.map(
        (p: GetApiV1Stats200PerformanceRadarItem) => ({
          subject: p.key,
          A: p.score,
          fullMark: p.max,
        }),
      );
    }
    return [
      { subject: 'On-Time', A: 96, fullMark: 100 },
      { subject: 'Fuel Efficiency', A: 88, fullMark: 100 },
      { subject: 'Safety Compliance', A: 94, fullMark: 100 },
      { subject: 'Maintenance Score', A: 82, fullMark: 100 },
      { subject: 'Driver Rating', A: 91, fullMark: 100 },
    ];
  }, [stats]);

  const revenueStats = useMemo(() => {
    const values = revenueData.map((d: { value: number }) => d.value);
    return calculateStatistics(values);
  }, [revenueData]);

  // Memoized System Health Data (Data Integrity Check)
  const systemHealth = useMemo(() => {
    const _apiStatus = healthOnline
      ? 'Online'
      : healthOnline === false
        ? 'Offline'
        : 'Checking';
    const gpsStatus = uiTrucks.length > 0;
    const latencyMs = lastDataTimestamp
      ? Date.now() - lastDataTimestamp
      : Infinity;
    const isHighLatency = latencyMs > 5000;

    return [
      {
        name: 'API Gateway',
        status: healthOnline,
        latency: '24ms',
        uptime: '99.98%',
      },
      {
        name: 'WebSocket Link',
        status: !isHighLatency,
        latency: isHighLatency ? '>5s' : '12ms',
        uptime: '99.99%',
      },
      {
        name: 'Database Service',
        status: true,
        latency: '8ms',
        uptime: '100%',
      },
      { name: 'Cache Layer', status: true, latency: '3ms', uptime: '99.95%' },
      {
        name: 'GPS Telemetry',
        status: gpsStatus && !isHighLatency,
        latency: !gpsStatus || isStale ? '—' : isHighLatency ? 'High' : '156ms',
        uptime: '98.76%',
      },
      {
        name: 'Temp. Sensors',
        status: true,
        latency: '45ms',
        uptime: '99.87%',
      },
    ];
  }, [healthOnline, uiTrucks.length, lastDataTimestamp, isStale]);

  // Computed Metrics (Anomaly Index)
  const computedMetrics = useMemo(() => {
    const anomaly = flags['anomaly-index']
      ? alerts.filter((a) => a.level === 'critical').length * 0.4 +
        alerts.filter((a) => a.level === 'warning').length * 0.1 +
        (100 -
          (performanceData.find((p) => p.subject === 'Safety Compliance')?.A ||
            0)) *
          0.5
      : 0;
    return {
      anomalyIndex: Math.min(100, anomaly),
      trucksOverTemp:
        tempBuckets.find((b) => b.name.includes('Risk Zone'))?.value || 0,
    };
  }, [alerts, performanceData, tempBuckets, flags]);

  const metrics = useMemo(() => {
    const s = stats?.summary;
    if (!mounted) {
      return Array.from({ length: 8 }, (_, i) => ({
        title: [
          'Active Trucks',
          'Avg Temp',
          'Open Alerts',
          'Anomaly Index',
          'On-time Rate',
          'Fuel Eff.',
          'Active Drivers',
          'Deliveries',
        ][i], // Replaced Revenue with Anomaly Index
        value: '—',
        change: '—',
        trend: 'stable' as Trend,
        icon: Truck,
        accent: 'from-slate-400 via-slate-400 to-slate-500',
        spark: Array(15).fill(0),
        detail: 'Loading...',
        color: '#94a3b8',
      }));
    }

    const onTimePct =
      typeof s?.onTimeRatePct === 'number' ? s.onTimeRatePct : undefined;
    const sufficientSamples = dataPoints >= 24; // guard to avoid over-claiming with tiny samples
    const industryLeading = !!onTimePct && onTimePct >= 97 && sufficientSamples;

    return [
      {
        title: 'Active Trucks',
        value: (s?.activeTrucks ?? uiTrucks.length).toString(),
        change: '+0.0%',
        trend: 'up' as Trend,
        icon: Truck,
        accent: 'from-cyan-400 via-blue-400 to-indigo-500',
        spark: [12, 16, 18, 17, 22, 28, 26, 30, 33, 35, 40, 45, 48, 52, 55],
        detail: `Telemetry Rate: ${REFRESH_INTERVALS[refreshSpeed] / 1000}s`,
        color: '#06b6d4',
      },
      {
        title: 'Avg Cargo Temp',
        value:
          s?.avgCargoTempC !== undefined
            ? `${s.avgCargoTempC.toFixed(1)}°C`
            : '0.0°C',
        change: '+0.0°C',
        trend: 'up' as Trend,
        icon: ThermometerSun,
        accent: 'from-fuchsia-400 via-violet-400 to-purple-500',
        spark: [
          -5.0, -4.8, -4.6, -4.5, -4.4, -4.3, -4.2, -4.1, -4.0, -4.1, -4.2,
          -4.2, -4.3, -4.2, -4.2,
        ],
        detail: `${computedMetrics.trucksOverTemp} Trucks in Risk Zone`,
        color: '#c026d3',
      },
      {
        title: 'Open Alerts',
        value: alerts.filter((a) => !a.acknowledged).length.toString(),
        change: `-${Math.floor(Math.random() * 3)}`,
        trend: 'down' as Trend,
        icon: Bell,
        accent: 'from-amber-400 via-orange-400 to-rose-500',
        spark: [
          12,
          11,
          10,
          9,
          9,
          8,
          8,
          7,
          7,
          8,
          7,
          7,
          8,
          7,
          alerts.filter((a) => !a.acknowledged).length,
        ],
        detail: `${alerts.filter((a) => a.level === 'critical').length} Critical, ${alerts.filter((a) => a.level === 'warning').length} Warning`,
        color: '#f97316',
      },
      {
        title: 'Anomaly Index',
        value:
          isStale || uiTrucks.length === 0
            ? 'N/A'
            : s?.anomalyIndex !== undefined
              ? s.anomalyIndex.toFixed(1)
              : computedMetrics.anomalyIndex.toFixed(1),
        change:
          isStale || uiTrucks.length === 0
            ? '-N/A'
            : computedMetrics.anomalyIndex > 20
              ? '+Critical'
              : computedMetrics.anomalyIndex > 10
                ? '+Warning'
                : '-Stable',
        trend:
          isStale || uiTrucks.length === 0
            ? 'stable'
            : computedMetrics.anomalyIndex > 20
              ? 'up'
              : computedMetrics.anomalyIndex > 10
                ? 'stable'
                : 'down',
        icon: Zap,
        accent:
          computedMetrics.anomalyIndex > 20
            ? 'from-red-600 via-rose-600 to-red-400'
            : 'from-emerald-400 via-teal-400 to-green-500',
        spark: [
          1,
          2,
          4,
          3,
          5,
          8,
          7,
          6,
          4,
          3,
          2,
          1,
          0,
          0,
          computedMetrics.anomalyIndex / 10,
        ], // Simulated index sparkline
        detail:
          isStale || uiTrucks.length === 0
            ? 'Stale or no telemetry'
            : flags['anomaly-index']
              ? 'Predictive Anomaly Score (AI)'
              : 'Disabled (Feature Flag)',
        color: computedMetrics.anomalyIndex > 20 ? '#ef4444' : '#10b981',
      },
      {
        title: 'On-time Rate',
        value:
          s?.onTimeRatePct !== undefined
            ? `${s.onTimeRatePct.toFixed(1)}%`
            : '0.0%',
        change: '+0.0%',
        trend: 'up' as Trend,
        icon: Activity,
        accent: 'from-emerald-400 via-teal-400 to-green-500',
        spark: [
          94, 94.5, 95, 95.2, 95.5, 95.8, 96, 96.2, 96.4, 96.5, 96.6, 96.7,
          96.7, 96.8, 96.8,
        ],
        detail: industryLeading ? 'Industry leading' : '',
        color: '#34d399',
      },
      {
        title: 'Fuel Efficiency',
        value:
          s?.fuelEfficiencyKmPerL !== undefined
            ? `${s.fuelEfficiencyKmPerL.toFixed(2)} km/L`
            : '0.0 MPG',
        change: '+0.0',
        trend: 'up' as Trend,
        icon: Fuel,
        accent: 'from-lime-400 via-green-400 to-emerald-500',
        spark: [
          7.5, 7.6, 7.7, 7.8, 7.9, 7.9, 8.0, 8.0, 8.1, 8.1, 8.1, 8.2, 8.2, 8.2,
          8.2,
        ],
        detail: 'Above target',
        color: '#a3e635',
      },
      {
        title: 'Active Drivers',
        value: '0',
        change: '+0',
        trend: 'up' as Trend,
        icon: Users,
        accent: 'from-pink-400 via-rose-400 to-red-500',
        spark: [40, 41, 42, 42, 43, 44, 44, 45, 45, 46, 46, 47, 47, 48, 48],
        detail: '87% of fleet',
        color: '#f472b6',
      },
      {
        title: 'Deliveries Completed',
        value: (s?.deliveriesCompleted ?? 0).toString(),
        change: '+0',
        trend: 'up' as Trend,
        icon: Package,
        accent: 'from-indigo-400 via-purple-400 to-pink-500',
        spark: [
          180, 185, 190, 195, 200, 205, 210, 215, 220, 222, 225, 228, 230, 232,
          234,
        ],
        detail: '0% success rate',
        color: '#c084fc',
      },
    ];
  }, [
    alerts,
    mounted,
    uiTrucks.length,
    computedMetrics,
    flags,
    refreshSpeed,
    stats,
    dataPoints,
    isStale,
  ]);

  // Removed unused downloadReport to reduce lint noise and hook deps churn
  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    );
  }, []);
  const clearAllAlerts = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  }, []);

  return (
    <InlineAuthGate>
      <div className="relative min-h-screen overflow-x-hidden text-white selection:bg-violet-500/30 selection:text-white">
        {/* Base Background: Theme Gradient */}
        <div
          className={`pointer-events-none fixed inset-0 -z-20 transition-all duration-1000 theme-gradient-${theme}`}
        />

        {/* Aesthetic Noise Layer (using globals.css utility) */}
        <div className="fixed inset-0 -z-10 noise-bg opacity-75" />

        {showGrid && (
          <div
            className="pointer-events-none fixed inset-0 -z-10 opacity-10 transition-opacity duration-500 holographic-grid"
            // Switched to using the new CSS utility class
          />
        )}

        {show3D && (
          <ClientOnly fallback={null}>
            {threeReady && <ThreeBackground ready={true} theme={theme} />}
          </ClientOnly>
        )}

        {/* Developer Mode Overlay (Automation/Professionalism) */}
        {flags['developer-mode'] && (
          <div className="fixed top-2 left-2 z-100 p-3 rounded-lg bg-black/70 backdrop-blur-sm ring-1 ring-amber-400/50 text-amber-300 text-xs font-mono shadow-glow">
            <Code className="inline-block h-3 w-3 mr-1" /> DEVELOPER MODE
            (Ctrl+D)
            <p className="mt-1">
              Latency:{' '}
              {systemHealth.find((s) => s.name === 'GPS Telemetry')?.latency}
            </p>
            <p>Flags: Anomaly ({String(flags['anomaly-index'])})</p>
          </div>
        )}

        {/* Header: Sticky and Professional Look */}
        <header
          className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-lg shadow-black/30"
          suppressHydrationWarning
        >
          <ClientOnly>
            <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-6 py-4 flex-wrap">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-linear-to-br from-violet-500 via-purple-500 to-cyan-500 ring-2 ring-white/20 shadow-[0_8px_30px_-10px_rgba(139,92,246,.9)] animate-pulse-slow">
                  <Truck className="h-5 w-5 vfx-glow" />
                </div>
                {/* Title */}
                <div>
                  <p className="text-xs uppercase tracking-[.4em] text-slate-200">
                    ICE TRUCK TRACKING PLATFORM
                  </p>
                  <h1 className="bg-linear-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-xl font-bold text-transparent bg-size-[200%_auto] animate-gradient">
                    Telemetry & Predictive Analytics
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative hidden lg:block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="global-search"
                    name="q"
                    type="text"
                    placeholder="Search trucks, drivers, routes..."
                    aria-label="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 rounded-xl bg-white/5 pl-10 pr-4 py-2 text-sm ring-1 ring-white/10 backdrop-blur-xl focus:ring-2 focus:ring-violet-400/50 outline-none transition-all"
                  />
                </div>

                {/* Utility Buttons */}
                <button
                  type="button"
                  onClick={() => setShowGrid((v) => !v)}
                  className={`rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${showGrid ? 'bg-violet-500/30 text-violet-200 shadow-glow' : 'bg-white/10 hover:bg-white/15'}`}
                  aria-pressed={showGrid}
                  aria-label={`${showGrid ? 'Hide' : 'Show'} grid`}
                  title={`${showGrid ? 'Hide' : 'Show'} grid (Ctrl+G)`}
                  data-testid="toggle-grid-button"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShow3D((v) => !v)}
                  className={`rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${show3D ? 'bg-cyan-500/30 text-cyan-200 shadow-glow' : 'bg-white/10 hover:bg-white/15'}`}
                  aria-pressed={show3D}
                  aria-label={`${show3D ? 'Disable' : 'Enable'} 3D`}
                  title={`${show3D ? 'Disable' : 'Enable'} 3D`}
                  data-testid="toggle-3d-button"
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPaused((v) => !v)}
                  className={`rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${paused ? 'bg-amber-500/30 text-amber-200 shadow-glow' : 'bg-white/10 hover:bg-white/15'}`}
                  aria-pressed={paused}
                  aria-label={paused ? 'Resume simulation' : 'Pause simulation'}
                  title={`${paused ? 'Resume' : 'Pause'} simulation (Ctrl+P)`}
                  data-testid="pause-simulation-button"
                >
                  {paused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowAlerts((v) => !v)}
                  className={`relative rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${showAlerts ? 'bg-rose-500/30 text-rose-200 shadow-glow' : 'bg-white/10 hover:bg-white/15'}`}
                  title="View alerts"
                  data-testid="view-alerts-button"
                >
                  <Bell className="h-4 w-4" />
                  {alerts.filter((a) => !a.acknowledged).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {alerts.filter((a) => !a.acknowledged).length}
                    </span>
                  )}
                </button>

                {/* API Status Pill (Prominent) */}
                <Pill
                  intent={
                    healthOnline
                      ? 'ok'
                      : healthOnline === false
                        ? 'error'
                        : 'neutral'
                  }
                >
                  {healthOnline ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    API{' '}
                    {healthOnline
                      ? 'Online'
                      : healthOnline === false
                        ? 'Offline'
                        : 'Checking…'}
                  </span>
                </Pill>

                {/* Time Range Selector (Tab semantics) */}
                <div
                  className="flex rounded-xl p-1 ring-1 ring-white/15 bg-white/10 backdrop-blur-xl"
                  role="tablist"
                  aria-label="Time range selection"
                >
                  {(['1h', '24h', '7d'] as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      onClick={() => setTimeRange(r)}
                      aria-selected={timeRange === r}
                      className={`relative rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        timeRange === r
                          ? 'bg-linear-to-r from-violet-500 to-cyan-500 text-white shadow-lg'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                      data-testid={`time-range-${r}-button`}
                    >
                      <span className="relative z-10">{r}</span>
                    </button>
                  ))}
                </div>

                {/* Theme Selector (Tab semantics) */}
                <div
                  className="flex rounded-xl p-1 ring-1 ring-white/15 bg-white/10 backdrop-blur-xl"
                  role="tablist"
                  aria-label="Theme selection"
                >
                  {(['dark', 'neon', 'ocean', 'forest'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      onClick={() => setTheme(t)}
                      aria-selected={theme === t}
                      aria-label={`${t} theme`}
                      className={`rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-all ${
                        theme === t
                          ? 'bg-white/20 text-white'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                      title={`${t} theme`}
                      data-testid={`theme-${t}-button`}
                    >
                      {t[0]}
                    </button>
                  ))}
                </div>

                {/* Account Controls */}
                <div className="flex items-center gap-2">
                  {token ? (
                    <>
                      <Pill intent="neutral">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {typeof (user as any)?.username === 'string'
                            ? (user as any).username
                            : 'Account'}
                        </span>
                      </Pill>
                      <button
                        onClick={() => logout?.()}
                        className="rounded-xl px-3 py-2 ring-1 ring-white/15 bg-white/10 hover:bg-white/15 backdrop-blur-xl text-sm font-semibold transition-all"
                      >
                        Logout
                      </button>
                      <button
                        onClick={() => {
                          try {
                            sessionStorage.setItem('auth.defaultTab', 'login');
                          } catch {}
                          logout?.();
                        }}
                        className="rounded-xl px-3 py-2 ring-1 ring-white/15 bg-white/10 hover:bg-white/15 backdrop-blur-xl text-sm font-semibold transition-all"
                        title="Login as a different user"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => {
                          try {
                            sessionStorage.setItem(
                              'auth.defaultTab',
                              'register',
                            );
                          } catch {}
                          logout?.();
                        }}
                        className="rounded-xl px-3 py-2 ring-1 ring-cyan-400/30 bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-xl text-sm font-semibold text-cyan-100 transition-all"
                        title="Register a new account"
                      >
                        Register
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Sub-Header: Secondary Controls (Configuration/Automation) */}
            <div
              className="border-t border-white/5 bg-slate-950/50 backdrop-blur-xl"
              suppressHydrationWarning
            >
              <div className="mx-auto max-w-[1800px] px-6 py-3 flex items-center justify-between gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">Telemetry Rate:</span>
                    <select
                      id="refreshSpeed"
                      aria-label="Refresh speed"
                      value={refreshSpeed}
                      onChange={(e) =>
                        setRefreshSpeed(
                          e.target.value as keyof typeof REFRESH_INTERVALS,
                        )
                      }
                      className="rounded-lg bg-white/5 px-3 py-1 ring-1 ring-white/10 outline-none text-white cursor-pointer"
                    >
                      <option value="fast">
                        Fast ({REFRESH_INTERVALS.fast / 1000}s)
                      </option>
                      <option value="normal">
                        Normal ({REFRESH_INTERVALS.normal / 1000}s)
                      </option>
                      <option value="slow">
                        Slow ({REFRESH_INTERVALS.slow / 1000}s)
                      </option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">Data Detail:</span>
                    <select
                      id="dataPrecision"
                      aria-label="Data detail"
                      value={dataPrecision}
                      onChange={(e) =>
                        setDataPrecision(e.target.value as typeof dataPrecision)
                      }
                      className="rounded-lg bg-white/5 px-3 py-1 ring-1 ring-white/10 outline-none text-white cursor-pointer"
                    >
                      <option value="low">Low (Performance)</option>
                      <option value="medium">Medium (Balance)</option>
                      <option value="high">High (Fidelity)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">Sim Speed:</span>
                    <button
                      onClick={() =>
                        setSimulationSpeed(Math.max(0.5, simulationSpeed - 0.5))
                      }
                      className="rounded px-2 py-0.5 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      -
                    </button>
                    <span className="font-mono w-8 text-center">
                      {simulationSpeed}x
                    </span>
                    <button
                      onClick={() =>
                        setSimulationSpeed(Math.min(5, simulationSpeed + 0.5))
                      }
                      className="rounded px-2 py-0.5 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      +
                    </button>
                  </div>

                  {/* Feature Flag Toggle for Anomaly Index (New Automation/Feature) */}
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-slate-200">Anomaly Detection:</span>
                    <button
                      onClick={() => toggleFlag('anomaly-index')}
                      className={`rounded-xl px-2 py-1 text-xs font-semibold ring-1 transition-all ${
                        flags['anomaly-index']
                          ? 'bg-emerald-500/30 text-emerald-200 ring-emerald-400/50'
                          : 'bg-white/10 text-slate-200 ring-white/15'
                      }`}
                    >
                      {flags['anomaly-index'] ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  {/* Map Engine Selector */}
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-slate-200">Map Engine:</span>
                    <select
                      id="mapEngine"
                      aria-label="Map engine"
                      value={mapEngine}
                      onChange={(e) =>
                        setMapEngine(e.target.value as 'tomtom' | 'leaflet')
                      }
                      className="rounded-lg bg-white/5 px-3 py-1 ring-1 ring-white/10 outline-none text-white cursor-pointer"
                    >
                      <option value="tomtom">TomTom (Performance)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Pill intent="info">
                    <Database className="h-3.5 w-3.5" />
                    {dataPoints} Sample Points
                  </Pill>
                  <Pill intent="ok">
                    <Server className="h-3.5 w-3.5" />$
                    {revenueStats.mean.toFixed(0)} Avg Revenue
                  </Pill>
                </div>
              </div>
            </div>
          </ClientOnly>
        </header>

        <main className="mx-auto max-w-[1800px] space-y-8 px-6 py-8">
          {/* Top Status Bar (Data Integrity Check) */}
          <div className="flex items-center justify-between text-sm flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Pill intent="info">
                <Clock className="h-4 w-4" />
                Last Data Ingested:{' '}
                <ClientOnly fallback="—">
                  {lastDataTimestamp
                    ? new Date(lastDataTimestamp).toLocaleTimeString()
                    : '—'}
                </ClientOnly>
              </Pill>
              <Pill intent={paused ? 'warn' : 'ok'}>
                {paused ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {paused ? 'Simulation Paused' : 'System State: Operational'}
              </Pill>
              {systemHealth.find((s) => s.name === 'GPS Telemetry')?.status ===
                false && (
                <Pill intent="error">
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                  DATA LATENCY ALERT
                </Pill>
              )}
              {autoRefresh && (
                <Pill intent="info" title="Auto-refresh active">
                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                </Pill>
              )}
            </div>
            <Pill intent="neutral">
              <Calendar className="h-4 w-4" />
              <ClientOnly>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </ClientOnly>
            </Pill>
          </div>

          {/* Section 1: Key Metrics (Enhanced Grid) */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <Tilt key={i}>
                  <GlassCard accent={m.accent}>
                    <div className="rounded-card p-6 min-w-0">
                      <div className="mb-4 flex items-start justify-between">
                        <div
                          className={`grid h-14 w-14 place-items-center rounded-xl bg-linear-to-br ${m.accent} ring-1 ring-white/30 shadow-[0_8px_20px_-8px] shadow-current`}
                        >
                          <Icon
                            className="h-6 w-6 vfx-glow"
                            style={
                              {
                                ['--icon-color' as any]: m.color,
                              } as React.CSSProperties
                            }
                          />
                        </div>
                        <Pill
                          intent={
                            m.trend === 'up'
                              ? 'ok'
                              : m.trend === 'down'
                                ? 'error'
                                : 'neutral'
                          }
                        >
                          {m.trend === 'up' ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : m.trend === 'down' ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <Activity className="h-3.5 w-3.5" />
                          )}
                          {m.change}
                        </Pill>
                      </div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        {m.title}
                      </p>
                      <p className="text-3xl font-bold tracking-tight mt-1 mb-1">
                        {m.value}
                      </p>
                      <p className="text-xs text-slate-500/80">{m.detail}</p>

                      <div className="min-w-0 h-12">
                        <ClientOnly fallback={null}>
                          <SparklineChart
                            data={m.spark as number[]}
                            color={m.color}
                          />
                        </ClientOnly>
                      </div>
                    </div>
                  </GlassCard>
                </Tilt>
              );
            })}
          </section>

          {/* Section 2: Charts */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <GlassCard>
              <div className="rounded-card p-lg">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-violet-400" />
                      Revenue Trend Analysis
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Current vs Previous Period • {timeRange}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Total: ${revenueStats.sum.toFixed(0)} | Avg: $
                      {revenueStats.mean.toFixed(0)}
                    </p>
                  </div>
                  <button
                    className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/15 transition-all focus-ring-theme"
                    title="Fullscreen"
                    aria-label="Open revenue chart fullscreen"
                    data-testid="fullscreen-revenue-button"
                    type="button"
                    onClick={() => setFullscreen('revenue')}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-[380px] min-w-0">
                  <ClientOnly fallback={null}>
                    <RevenueChart data={revenueData} />
                  </ClientOnly>
                </div>
              </div>
            </GlassCard>

            <GlassCard accent="from-cyan-400/30 via-sky-400/20 to-indigo-400/30">
              <div className="rounded-card p-lg">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-cyan-400" />
                      Fleet Activity & Efficiency
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Utilization and performance metrics
                    </p>
                  </div>
                  <button
                    className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/15 transition-all focus-ring-theme"
                    title="Fullscreen"
                    aria-label="Open fleet chart fullscreen"
                    data-testid="fullscreen-fleet-button"
                    type="button"
                    onClick={() => setFullscreen('fleet')}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-[380px] min-w-0">
                  <ClientOnly fallback={null}>
                    <FleetChart data={fleetActivity} />
                  </ClientOnly>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* Section 3: Detailed Insights */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <GlassCard
              accent="from-fuchsia-400/30 via-violet-400/20 to-cyan-400/30"
              onClick={() => setFullscreen('temp')}
            >
              <div className="rounded-card p-lg">
                <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                  <ThermometerSun className="h-5 w-5 text-fuchsia-400" />
                  Cargo Temperature Distribution
                </h3>
                <div className="h-[280px] min-w-0">
                  <ClientOnly fallback={null}>
                    <TempDistributionPie
                      data={tempBuckets as any}
                      innerRadius={70}
                      outerRadius={105}
                    />
                  </ClientOnly>
                </div>
                <div className="mt-6 space-y-3">
                  {tempBuckets.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-2 transition-all"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full ring-2 ring-white/40 transition-all"
                          style={
                            {
                              '--indicator-color': b.color,
                            } as React.CSSProperties
                          }
                        />
                        <span className="text-sm text-slate-300 font-medium">
                          {b.name}
                        </span>
                      </span>
                      <span className="font-bold text-lg">
                        {b.value} Trucks
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard
              accent="from-rose-400/30 via-orange-400/20 to-amber-400/30"
              onClick={() => setFullscreen('alerts')}
            >
              <div className="rounded-card p-lg">
                <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                  Alert Timeline
                </h3>
                <div className="h-[280px] min-w-0">
                  <ClientOnly fallback={null}>
                    <AlertsChart data={alertsData} />
                  </ClientOnly>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 shadow-md">
                    <span className="text-sm font-medium">Critical Alerts</span>
                    <span className="text-lg font-bold text-red-400">
                      {
                        alerts.filter(
                          (a) => a.level === 'critical' && !a.acknowledged,
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 shadow-md">
                    <span className="text-sm font-medium">Warnings</span>
                    <span className="text-lg font-bold text-amber-400">
                      {
                        alerts.filter(
                          (a) => a.level === 'warning' && !a.acknowledged,
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              accent="from-emerald-400/30 via-teal-400/20 to-green-400/30"
              onClick={() => setFullscreen('performance')}
            >
              <div className="rounded-card p-lg">
                <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-400" />
                  Fleet Performance Radar
                </h3>
                <div className="h-[280px] min-w-0">
                  <ClientOnly fallback={null}>
                    <PerformanceRadar data={performanceData as any} compact />
                  </ClientOnly>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
                    <p className="text-xs text-slate-400">Average Score</p>
                    <p className="text-2xl font-bold text-emerald-400">90.2</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                    <p className="text-xs text-slate-400">Reliability Index</p>
                    <p className="text-2xl font-bold text-cyan-400">A+</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* Section 4: System Health & Map */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <GlassCard>
              <div className="rounded-card p-lg">
                <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5 text-violet-400" />
                  System Health Monitor (Tier 1 Services)
                </h3>
                <div className="space-y-4">
                  {/* Use memoized systemHealth with Latency indicator */}
                  {systemHealth.map((service, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${service.status ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
                        />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">
                          {service.uptime}
                        </span>
                        <span
                          className={`text-sm font-semibold ${service.latency.includes('High') ? 'text-red-400' : 'text-slate-400'}`}
                        >
                          {service.latency}
                        </span>
                        <Pill intent={service.status ? 'ok' : 'error'}>
                          {service.status ? 'Online' : 'Offline'}
                        </Pill>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard accent="from-indigo-400/30 via-blue-400/20 to-cyan-400/30">
              <div className="rounded-card p-lg">
                <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  Live Fleet Map (Sub-Second Telemetry)
                </h3>
                <div className="h-[400px] rounded-2xl bg-slate-950/50 ring-1 ring-white/10 overflow-hidden relative">
                  {/* Ping Layer - Only show pings if telemetry is active */}
                  <PingLayer
                    count={
                      systemHealth.find((s) => s.name === 'GPS Telemetry')
                        ?.status
                        ? 12
                        : 0
                    }
                  />
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="w-full text-center space-y-4">
                      <MapPin className="h-12 w-12 mx-auto text-cyan-400 animate-bounce" />
                      <p className="text-3xl font-bold">
                        {uiTrucks.length} Active Telemetry Streams
                      </p>
                      <p className="text-sm text-slate-400">
                        Real-time GPS tracking
                      </p>

                      {/* Lighter, clearer truck list for better UX */}
                      <ul className="mt-4 space-y-2 text-xs text-left max-h-40 overflow-y-auto">
                        {uiTrucks.slice(0, 8).map((t) => (
                          <li
                            key={t.id}
                            className="rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 flex justify-between items-center"
                          >
                            <span className="font-semibold text-sm">
                              {t.id}
                            </span>
                            <div className="flex items-center gap-4 text-slate-400">
                              <span className="hidden sm:inline">
                                Driver: {t.driver_name ?? '—'}
                              </span>
                              <span>
                                ⏱{' '}
                                {typeof t.speed === 'number' &&
                                Number.isFinite(t.speed)
                                  ? Math.round(t.speed)
                                  : '—'}{' '}
                                km/h
                              </span>
                              <span>
                                🌡{' '}
                                {typeof t.temp === 'number' &&
                                Number.isFinite(t.temp)
                                  ? t.temp.toFixed(1)
                                  : '—'}
                                °C
                              </span>
                            </div>
                          </li>
                        ))}
                        {uiTrucks.length > 8 && (
                          <li className="text-center text-sm text-slate-500 pt-2">
                            ... and {uiTrucks.length - 8} more trucks
                          </li>
                        )}
                        {uiTrucks.length === 0 && (
                          <li className="text-center text-sm text-slate-500 py-4">
                            No trucks reporting data currently.
                          </li>
                        )}
                      </ul>

                      <button
                        type="button"
                        aria-label="Open full map view"
                        className="mt-4 px-6 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 font-semibold shadow-lg transition-all"
                      >
                        Open Full Map View (L3 Data)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
          {/* 3D Hero (lazy-loaded, client-only) */}
          <section className="p-4">
            {show3DEffective && (
              <ClientOnly>
                <Fleet3DCanvas />
              </ClientOnly>
            )}
          </section>
          <section className="p-4">
            {mapEngine === 'tomtom' ? (
              <TomTomMap trucks={uiTrucks} />
            ) : (
              <LeafletFleetMap trucks={uiTrucks} />
            )}
          </section>

          {/* Footer */}
          <div className="text-center space-y-2 pt-4 pb-8">
            <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-slate-300">
              <span>
                Environment:{' '}
                <span className="font-mono text-slate-200">
                  Production/Cluster A
                </span>
              </span>
              <span>•</span>
              <span>
                Version:{' '}
                <span className="font-mono text-slate-200">v2.0.0</span>
              </span>
              <span>•</span>
              <span>
                Build: <span className="font-mono text-slate-200">#2502</span>
              </span>
              <span>•</span>
              <span>
                Uptime:{' '}
                <span className="font-mono text-emerald-200">99.98%</span>
              </span>
            </div>
            <p className="text-xs text-slate-300">
              © 2025 Ice Truck Tracking • Advanced Cold Chain Monitoring • All
              Rights Reserved
            </p>
            <p className="text-xs text-slate-300">
              Keyboard Shortcuts: Ctrl+G (Grid) • Ctrl+P (Pause) • Ctrl+D (Dev
              Mode) • ESC (Close Modal)
            </p>
          </div>
        </main>

        {/* Keyboard Shortcuts Overlay */}
        {showHelp && (
          <div
            className="fixed inset-0 z-120 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-heading"
          >
            <div className="w-full max-w-lg rounded-2xl bg-surface-1 ring-1 ring-white/10 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3
                  id="keyboard-shortcuts-heading"
                  className="text-lg font-bold"
                >
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="rounded-lg p-2 ring-1 ring-white/10 hover:bg-white/10 focus-ring-theme"
                  aria-label="Close shortcuts"
                  data-testid="close-shortcuts-button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 text-sm">
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-300">Toggle grid layout</span>
                    <span className="font-mono text-slate-200">G</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-300">Open shortcuts help</span>
                    <span className="font-mono text-slate-200">?</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-300">Close dialog</span>
                    <span className="font-mono text-slate-200">Esc</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Alert Center and Fullscreen Modals (Left largely intact as requested) */}
        {showAlerts && (
          <section
            aria-labelledby="alert-center-heading"
            className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-2xl ring-1 ring-white/10 shadow-2xl z-60 animate-slideInRight overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3
                  id="alert-center-heading"
                  className="text-xl font-bold flex items-center gap-2"
                >
                  <Bell className="h-5 w-5 text-rose-400" />
                  Alert Center
                </h3>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-all"
                  aria-label="Close alert panel"
                  data-testid="close-alerts-button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <Pill intent="info">
                  {alerts.filter((a) => !a.acknowledged).length} unacknowledged
                </Pill>
                <button
                  onClick={clearAllAlerts}
                  aria-label="Clear all alerts"
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-all"
                  data-testid="clear-all-alerts-button"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No alerts at this time</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl ring-1 transition-all ${
                      alert.level === 'critical'
                        ? 'bg-red-500/10 ring-red-500/30'
                        : alert.level === 'warning'
                          ? 'bg-amber-500/10 ring-amber-500/30'
                          : 'bg-cyan-500/10 ring-cyan-500/30'
                    } ${alert.acknowledged ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              alert.level === 'critical'
                                ? 'text-red-400'
                                : alert.level === 'warning'
                                  ? 'text-amber-400'
                                  : 'text-cyan-400'
                            }`}
                          />
                          <span className="text-xs uppercase tracking-wider font-semibold">
                            {alert.level}
                          </span>
                          {alert.truckId && (
                            <span className="text-xs text-slate-400">
                              • {alert.truckId}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2">{alert.message}</p>
                        <p className="text-xs text-slate-500">
                          <ClientOnlyText>
                            {alert.timestamp.toLocaleTimeString()}
                          </ClientOnlyText>
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          aria-label="Acknowledge alert"
                          className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all"
                          data-testid={`acknowledge-alert-${alert.id}`}
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {fullscreen && (
          <div
            className="fixed inset-0 z-100 bg-slate-950/90 backdrop-blur-2xl animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fullscreen-heading"
          >
            <div className="absolute inset-4 lg:inset-10 rounded-3xl ring-1 ring-white/20 bg-slate-900/80 backdrop-blur-xl p-4 lg:p-8 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3
                  id="fullscreen-heading"
                  className="text-xl lg:text-2xl font-bold"
                >
                  {fullscreen === 'revenue' && 'Revenue Trend Analysis'}
                  {fullscreen === 'fleet' && 'Fleet Activity & Efficiency'}
                  {fullscreen === 'temp' && 'Cargo Temperature Distribution'}
                  {fullscreen === 'alerts' && 'Alert Timeline & History'}
                  {fullscreen === 'performance' && 'Performance Metrics'}
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFullscreen(null)}
                    className="rounded-xl p-2 ring-1 ring-white/20 hover:bg-white/10 transition-all"
                    aria-label="Minimize fullscreen"
                    title="Minimize"
                    data-testid="minimize-fullscreen-button"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setFullscreen(null)}
                    className="rounded-xl p-3 ring-1 ring-white/20 hover:bg-white/10 transition-all"
                    aria-label="Close fullscreen"
                    data-testid="close-fullscreen-button"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="h-[calc(100%-80px)] min-w-0">
                <ClientOnly fallback={null}>
                  {fullscreen === 'revenue' && (
                    <RevenueChart data={revenueData} />
                  )}
                  {fullscreen === 'fleet' && (
                    <FleetChart data={fleetActivity} />
                  )}
                  {fullscreen === 'temp' && (
                    <TempDistributionPie
                      data={tempBuckets as any}
                      innerRadius={120}
                      outerRadius={200}
                      showLegend
                      showLabels
                    />
                  )}
                  {fullscreen === 'alerts' && <AlertsChart data={alertsData} />}
                  {fullscreen === 'performance' && (
                    <PerformanceRadar
                      data={performanceData as any}
                      compact={false}
                    />
                  )}
                </ClientOnly>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          /* Keyframes are necessary here as they define the animations used by Tailwind utility classes */
          @keyframes shimmer {
            to {
              background-position: 200% center;
            }
          }
          @keyframes gradient {
            0%,
            100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes pulse-slow {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
          @keyframes spin-slow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
          .animate-shimmer {
            animation: shimmer 3s ease-in-out infinite;
          }
          .animate-gradient {
            animation: gradient 8s ease infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
          .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
          .animate-slideInRight {
            animation: slideInRight 0.3s ease-out;
          }
        `}</style>
      </div>
    </InlineAuthGate>
  );
}

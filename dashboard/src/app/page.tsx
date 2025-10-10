"use client";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import ClientOnly from '@/components/ClientOnly';
import {
  Truck, ThermometerSun, Bell, Activity, ArrowUpRight, ArrowDownRight,
  TrendingUp, Maximize2, X, Grid3X3, Layers, Zap, MapPin, Clock,
  AlertTriangle, CheckCircle2, Settings, Download, RefreshCw,
  BarChart3, TrendingDown, Fuel, Package, Users, DollarSign, 
  Calendar, Filter, Search, Wifi, WifiOff, Database, Server,
  Play, Pause, Minimize2
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart
} from "recharts";

function PingLayer({ count = 12 }: { count?: number }) {
  const [dots, setDots] = React.useState<{ left: string; top: string; delay: number }[]>([]);
  React.useEffect(() => {
    setDots(Array.from({ length: count }, (_, i) => ({
      left: `${20 + Math.random() * 60}%`,
      top: `${20 + Math.random() * 60}%`,
      delay: i * 0.3,
    })));
  }, [count]);

  if (!dots.length) return null;
  return (
    <div className="absolute inset-0 opacity-60">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute animate-ping"
          style={{ left: d.left, top: d.top, animationDelay: `${d.delay}s`, animationDuration: '3s' }}
        />
      ))}
    </div>
  );
}

/* ============== Types & Interfaces ============== */
type Range = "1h" | "24h" | "7d" | "30d" | "90d";
type Trend = "up" | "down" | "stable";
type Fullscreen = null | "revenue" | "fleet" | "temp" | "alerts" | "performance";
type Theme = "dark" | "neon" | "ocean" | "forest";
type AlertLevel = "critical" | "warning" | "info";

interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  truckId?: string;
  acknowledged: boolean;
}

/* ============== Constants ============== */
const REFRESH_INTERVALS = {
  fast: 5000,
  normal: 30000,
  slow: 60000
};

const THEME_COLORS = {
  dark: {
    primary: [0x8b5cf6, 0x06b6d4, 0x10b981, 0xf59e0b],
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(139,92,246,.38), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(34,211,238,.32), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(16,185,129,.32), transparent 65%), #0b1220"
  },
  neon: {
    primary: [0xff006e, 0x00f5ff, 0x00ff9f, 0xffd60a],
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(255,0,110,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(0,245,255,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(0,255,159,.35), transparent 65%), #0d0221"
  },
  ocean: {
    primary: [0x0ea5e9, 0x06b6d4, 0x14b8a6, 0x10b981],
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(6,182,212,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(14,165,233,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(20,184,166,.35), transparent 65%), #0a1628"
  },
  forest: {
    primary: [0x10b981, 0x059669, 0x34d399, 0x6ee7b7],
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(16,185,129,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(5,150,105,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(52,211,153,.35), transparent 65%), #0a1810"
  }
};

/* ============== Utility Functions ============== */
const generateTimeSeriesData = (points: number, baseValue: number, variance: number, trend: number = 0) => {
  const data = [];
  const now = Date.now();
  const interval = points > 24 ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  
  for (let i = points; i >= 0; i--) {
    const date = new Date(now - i * interval);
    const trendValue = trend * (points - i);
    const value = baseValue + trendValue + (Math.random() - 0.5) * variance;
    const previous = value * (0.85 + Math.random() * 0.15);
    
    data.push({
      date: points > 24 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0, value),
      previous: Math.max(0, previous),
      timestamp: date.getTime()
    });
  }
  return data;
};

const calculateStatistics = (data: number[]) => {
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  return { mean, stdDev, min, max, sum };
};

/* ============== Enhanced 3D Background ============== */
const ThreeBackground = memo(({ ready, theme }: { ready: boolean; theme: Theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!ready || !containerRef.current || typeof window === 'undefined') return;
    const THREE = (window as any).THREE;
    if (!THREE) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const colors = THEME_COLORS[theme].primary;

    const amb = new THREE.AmbientLight(0xffffff, 0.3);
    const lights = colors.map((color, i) => {
      const light = new THREE.PointLight(color, 2.5, 150);
      const angle = (i / colors.length) * Math.PI * 2;
      light.position.set(
        Math.cos(angle) * 20,
        Math.sin(angle) * 15,
        Math.sin(angle * 2) * 10
      );
      return light;
    });
    scene.add(amb, ...lights);

    const meshes: any[] = [];
    
    for (let i = 0; i < 20; i++) {
      const g = new THREE.IcosahedronGeometry(Math.random() * 2.5 + 1, 1);
      const m = new THREE.MeshPhongMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)], 
        transparent: true, 
        opacity: 0.35, 
        shininess: 100,
        wireframe: Math.random() > 0.7
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(mesh);
      meshes.push({ 
        mesh, 
        speed: 0.001 + Math.random() * 0.002,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      });
    }

    for (let i = 0; i < 8; i++) {
      const g = new THREE.TorusGeometry(Math.random() * 4 + 2, 0.15, 16, 100);
      const m = new THREE.MeshPhongMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)], 
        transparent: true, 
        opacity: 0.3, 
        shininess: 120 
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(
        (Math.random() - 0.5) * 45,
        (Math.random() - 0.5) * 45,
        (Math.random() - 0.5) * 45
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(mesh);
      meshes.push({ 
        mesh, 
        speed: 0.0008 + Math.random() * 0.0015,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      });
    }

    camera.position.z = 35;
    let mx = 0, my = 0;
    
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = Date.now() * 0.001;
      
      meshes.forEach(({ mesh, speed, axis }, i) => {
        mesh.rotateOnAxis(axis, speed);
        mesh.position.y += Math.sin((t + i) * 0.5) * 0.008;
        mesh.position.x += Math.cos((t + i) * 0.3) * 0.006;
      });

      lights.forEach((light, i) => {
        const angle = (i / lights.length) * Math.PI * 2 + t * 0.3;
        light.position.x = Math.cos(angle) * 20;
        light.position.z = Math.sin(angle) * 20;
        light.position.y = Math.sin(t * 0.5 + i) * 10;
      });

      camera.position.x += (mx * 6 - camera.position.x) * 0.05;
      camera.position.y += (my * 6 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
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

  return <div ref={containerRef} className="fixed inset-0 -z-10" style={{ opacity: 0.5 }} />;
});

/* ============== UI Components ============== */
const Pill = memo(({ children, intent = "neutral", onClick }: { 
  children: React.ReactNode; 
  intent?: "neutral" | "ok" | "warn" | "info" | "error";
  onClick?: () => void;
}) => {
  const cls = intent === "ok"
    ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50 shadow-[0_0_24px_-6px_rgba(16,185,129,.7)]"
    : intent === "warn"
    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_24px_-6px_rgba(245,158,11,.7)]"
    : intent === "error"
    ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/50 shadow-[0_0_24px_-6px_rgba(244,63,94,.7)]"
    : intent === "info"
    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 shadow-[0_0_24px_-6px_rgba(6,182,212,.7)]"
    : "bg-white/10 text-slate-200 ring-1 ring-white/20";
  
  return (
    <span 
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-xl transition-all ${cls} ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
});

const GlassCard = memo(({ children, accent = "from-violet-400/30 via-purple-400/20 to-cyan-400/30", className = "", onClick }: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
  onClick?: () => void;
}) => (
  <div 
    className={`group relative rounded-3xl p-[1.5px] bg-gradient-to-br ${accent} transition-all duration-500 hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className={`relative rounded-3xl bg-slate-900/70 backdrop-blur-2xl ring-1 ring-white/10 ${className}`}>
      <div className="pointer-events-none absolute -inset-10 rounded-[2.5rem] bg-[radial-gradient(100rem_35rem_at_50%_-15%,rgba(139,92,246,.2),transparent),radial-gradient(60rem_25rem_at_-15%_125%,rgba(34,211,238,.18),transparent),radial-gradient(70rem_28rem_at_115%_125%,rgba(16,185,129,.18),transparent)]" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.1),transparent)] bg-[length:200%_100%] animate-shimmer" />
      <div className="relative">{children}</div>
    </div>
  </div>
));

const Tilt = memo(({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(1200px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 8}deg) translateZ(10px)`;
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="transition-transform duration-300 ease-out will-change-transform"
    >
      {children}
    </div>
  );
});

/* ============== Advanced Charts ============== */
const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-2xl bg-slate-950/95 px-4 py-3 ring-1 ring-white/20 backdrop-blur-xl shadow-2xl">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-semibold text-white">
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
});

const RevenueChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>
      <defs>
        <linearGradient id="areaA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="areaB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="4 4" stroke="#334155" opacity={0.25} />
      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}K`} />
      <Tooltip content={<CustomTooltip />} />
      <Legend wrapperStyle={{ paddingTop: '20px' }} />
      <Area type="monotone" dataKey="value" name="Current" stroke="#8b5cf6" strokeWidth={3} fill="url(#areaA)" />
      <Area type="monotone" dataKey="previous" name="Previous" stroke="#64748b" strokeWidth={2} strokeDasharray="6 6" fill="url(#areaB)" />
    </AreaChart>
  </ResponsiveContainer>
));

const FleetChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="4 4" stroke="#334155" opacity={0.25} />
      <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
      <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 12 }} />
      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fontSize: 12 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend wrapperStyle={{ paddingTop: '20px' }} />
      <Bar yAxisId="left" dataKey="trucks" name="Active Trucks" fill="#06b6d4" radius={[8, 8, 0, 0]} />
      <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Efficiency %" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
    </ComposedChart>
  </ResponsiveContainer>
));

const AlertsChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>
      <defs>
        <linearGradient id="critical" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="warning" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="info" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="4 4" stroke="#334155" opacity={0.25} />
      <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend wrapperStyle={{ paddingTop: '20px' }} />
      <Area type="monotone" dataKey="critical" stackId="1" name="Critical" stroke="#ef4444" fill="url(#critical)" />
      <Area type="monotone" dataKey="warning" stackId="1" name="Warning" stroke="#f59e0b" fill="url(#warning)" />
      <Area type="monotone" dataKey="info" stackId="1" name="Info" stroke="#06b6d4" fill="url(#info)" />
    </AreaChart>
  </ResponsiveContainer>
));

const ClientOnlyText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <span suppressHydrationWarning>{mounted ? children : null}</span>;
};

/* ============== Main Dashboard ============== */
export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<Range>("7d");
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [threeReady, setThreeReady] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [show3D, setShow3D] = useState(true);
  const [fullscreen, setFullscreen] = useState<Fullscreen>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshSpeed, setRefreshSpeed] = useState<keyof typeof REFRESH_INTERVALS>("normal");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [dataPrecision, setDataPrecision] = useState<"low" | "medium" | "high">("medium");
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setThreeReady(true);
    document.body.appendChild(script);
    // set lastUpdate after mount to avoid using new Date() during SSR
    setLastUpdate(new Date());
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const checkHealth = async () => {
      try {
        const response = await fetch(API_URL + '/api/v1/health', {
          signal: AbortSignal.timeout(5000)
        });
        setApiHealthy(response.ok);
        retryCount = 0;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          setApiHealthy(false);
        }
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!autoRefresh || paused) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      
      if (Math.random() < 0.1) {
        const newAlert: Alert = {
          id: Date.now().toString(),
          level: Math.random() < 0.1 ? "critical" : Math.random() < 0.3 ? "warning" : "info",
          message: `Truck #${Math.floor(Math.random() * 55) + 1}: ${
            Math.random() < 0.5 ? "Temperature deviation detected" : "Route optimization available"
          }`,
          timestamp: new Date(),
          truckId: `T${Math.floor(Math.random() * 55) + 1}`,
          acknowledged: false
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 50));
      }
    }, REFRESH_INTERVALS[refreshSpeed] / simulationSpeed);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshSpeed, simulationSpeed, paused]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'r':
            e.preventDefault();
            setLastUpdate(new Date());
            break;
          case 'g':
            e.preventDefault();
            setShowGrid(v => !v);
            break;
          case 'p':
            e.preventDefault();
            setPaused(v => !v);
            break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dataPoints = useMemo(() => {
    switch(timeRange) {
      case "1h": return dataPrecision === "high" ? 60 : 12;
      case "24h": return dataPrecision === "high" ? 48 : 24;
      case "7d": return dataPrecision === "high" ? 168 : 84;
      case "30d": return dataPrecision === "high" ? 120 : 60;
      case "90d": return dataPrecision === "high" ? 180 : 90;
      default: return 24;
    }
  }, [timeRange, dataPrecision]);
  
  const revenueData = useMemo(() => {
    if (!mounted) {
      // return stable placeholder data until we are mounted (avoid Date.now()/toLocale* on first render)
      return Array.from({ length: dataPoints + 1 }, (_, i) => ({
        date: '',
        value: 0,
        previous: 0,
        timestamp: 0
      }));
    }
    return generateTimeSeriesData(dataPoints, 5500, 1800, 15);
  }, [dataPoints, mounted]);
  
  const fleetActivity = useMemo(() => {
    const hours = timeRange === "1h" 
      ? Array.from({length: 12}, (_, i) => `${String(i * 5).padStart(2, '0')}m`)
      : timeRange === "24h"
      ? ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!mounted) {
      // stable placeholders to avoid Math.random() on first render
      return hours.map(hour => ({ hour, trucks: 0, efficiency: 0, maintenance: 0 }));
    }
    return hours.map(hour => ({
      hour,
      trucks: Math.floor(12 + Math.random() * 45),
      efficiency: 85 + Math.random() * 12,
      maintenance: Math.floor(Math.random() * 5)
    }));
  }, [timeRange, mounted]);

  const alertsData = useMemo(() => {
    const times = timeRange === "1h"
      ? Array.from({length: 12}, (_, i) => `${i * 5}m`)
      : timeRange === "24h"
      ? Array.from({length: 24}, (_, i) => `${i}:00`)
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!mounted) {
      return times.map(time => ({ time, critical: 0, warning: 0, info: 0 }));
    }
    return times.map(time => ({
      time,
      critical: Math.floor(Math.random() * 3),
      warning: Math.floor(Math.random() * 8),
      info: Math.floor(Math.random() * 15)
    }));
  }, [timeRange, mounted]);

  const tempBuckets = useMemo(() => [
    { name: "= -10°C", value: 12, color: "#38bdf8" },
    { name: "-10 ~ -5°C", value: 18, color: "#34d399" },
    { name: "-5 ~ 2°C", value: 24, color: "#a78bfa" },
    { name: "> 2°C", value: 6, color: "#fb7185" },
  ], []);

  const performanceData = useMemo(() => [
    { subject: 'On-Time', A: 96, fullMark: 100 },
    { subject: 'Fuel Efficiency', A: 88, fullMark: 100 },
    { subject: 'Safety', A: 94, fullMark: 100 },
    { subject: 'Maintenance', A: 82, fullMark: 100 },
    { subject: 'Driver Rating', A: 91, fullMark: 100 },
  ], []);

  const metrics = useMemo(() => {
    if (!mounted) {
      // Provide stable placeholders until mounted to avoid transient random/time-dependent values
      return [
        {
          title: "Active Trucks",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: Truck,
          accent: "from-cyan-400 via-blue-400 to-indigo-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "Avg Cargo Temp",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: ThermometerSun,
          accent: "from-fuchsia-400 via-violet-400 to-purple-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "Open Alerts",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: Bell,
          accent: "from-amber-400 via-orange-400 to-rose-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "On-time Rate",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: Activity,
          accent: "from-emerald-400 via-teal-400 to-green-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "Fuel Efficiency",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: Fuel,
          accent: "from-lime-400 via-green-400 to-emerald-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "Active Drivers",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: Users,
          accent: "from-pink-400 via-rose-400 to-red-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "Revenue Today",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: DollarSign,
          accent: "from-yellow-400 via-amber-400 to-orange-500",
          spark: Array(15).fill(0),
          detail: ""
        },
        {
          title: "Deliveries",
          value: "—",
          change: "—",
          trend: "stable" as Trend,
          icon: Package,
          accent: "from-indigo-400 via-purple-400 to-pink-500",
          spark: Array(15).fill(0),
          detail: ""
        },
      ];
    }

    return [
    {
      title: "Active Trucks",
      value: "55",
      change: "+6.1%",
      trend: "up" as Trend,
      icon: Truck,
      accent: "from-cyan-400 via-blue-400 to-indigo-500",
      spark: [12, 16, 18, 17, 22, 28, 26, 30, 33, 35, 40, 45, 48, 52, 55],
      detail: "Fleet Utilization: 87%"
    },
    {
      title: "Avg Cargo Temp",
      value: "-4.2°C",
      change: "+0.3°C",
      trend: "up" as Trend,
      icon: ThermometerSun,
      accent: "from-fuchsia-400 via-violet-400 to-purple-500",
      spark: [-5.0, -4.8, -4.6, -4.5, -4.4, -4.3, -4.2, -4.1, -4.0, -4.1, -4.2, -4.2, -4.3, -4.2, -4.2],
      detail: "Within target range"
    },
    {
      title: "Open Alerts",
      value: alerts.filter(a => !a.acknowledged).length.toString(),
      change: `-${Math.floor(Math.random() * 3)}`,
      trend: "down" as Trend,
      icon: Bell,
      accent: "from-amber-400 via-orange-400 to-rose-500",
      spark: [12, 11, 10, 9, 9, 8, 8, 7, 7, 8, 7, 7, 8, 7, alerts.filter(a => !a.acknowledged).length],
      detail: `${alerts.filter(a => a.level === "critical").length} Critical, ${alerts.filter(a => a.level === "warning").length} Warning`
    },
    {
      title: "On-time Rate",
      value: "96.8%",
      change: "+1.4%",
      trend: "up" as Trend,
      icon: Activity,
      accent: "from-emerald-400 via-teal-400 to-green-500",
      spark: [94, 94.5, 95, 95.2, 95.5, 95.8, 96, 96.2, 96.4, 96.5, 96.6, 96.7, 96.7, 96.8, 96.8],
      detail: "Industry leading"
    },
    {
      title: "Fuel Efficiency",
      value: "8.2 MPG",
      change: "+0.4",
      trend: "up" as Trend,
      icon: Fuel,
      accent: "from-lime-400 via-green-400 to-emerald-500",
      spark: [7.5, 7.6, 7.7, 7.8, 7.9, 7.9, 8.0, 8.0, 8.1, 8.1, 8.1, 8.2, 8.2, 8.2, 8.2],
      detail: "Above target"
    },
    {
      title: "Active Drivers",
      value: "48",
      change: "+3",
      trend: "up" as Trend,
      icon: Users,
      accent: "from-pink-400 via-rose-400 to-red-500",
      spark: [40, 41, 42, 42, 43, 44, 44, 45, 45, 46, 46, 47, 47, 48, 48],
      detail: "87% of fleet"
    },
    {
      title: "Revenue Today",
      value: "$48.2K",
      change: "+12.3%",
      trend: "up" as Trend,
      icon: DollarSign,
      accent: "from-yellow-400 via-amber-400 to-orange-500",
      spark: [35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 47.5, 48, 48.2],
      detail: "Projected: $52K"
    },
    {
      title: "Deliveries",
      value: "234",
      change: "+18",
      trend: "up" as Trend,
      icon: Package,
      accent: "from-indigo-400 via-purple-400 to-pink-500",
      spark: [180, 185, 190, 195, 200, 205, 210, 215, 220, 222, 225, 228, 230, 232, 234],
      detail: "96% success rate"
    },
    ];
  }, [alerts, mounted]);

  const revenueStats = useMemo(() => {
    const values = revenueData.map(d => d.value);
    return calculateStatistics(values);
  }, [revenueData]);

  const downloadReport = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics: metrics.map(m => ({ title: m.title, value: m.value, change: m.change })),
      revenue: revenueData,
      fleet: fleetActivity,
      statistics: {
        revenue: revenueStats
      },
      alerts: alerts.slice(0, 10),
      systemHealth: {
        api: apiHealthy,
        refreshRate: refreshSpeed,
        dataPrecision
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, revenueData, fleetActivity, revenueStats, alerts, apiHealthy, refreshSpeed, dataPrecision, timeRange]);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white selection:bg-violet-500/30 selection:text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-20 transition-all duration-1000"
        style={{ background: THEME_COLORS[theme].gradient }}
      />

      {showGrid && (
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.09] transition-opacity duration-500"
          style={{
            backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px),linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(circle at center, black 50%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(circle at center, black 50%, transparent 80%)",
          }}
        />
      )}

      {show3D && (
        <ClientOnly fallback={null}>
          {threeReady && <ThreeBackground ready={true} theme={theme} />}
        </ClientOnly>
      )}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-lg shadow-black/20">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-6 py-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 ring-2 ring-white/20 shadow-[0_12px_40px_-12px_rgba(139,92,246,.9)] animate-pulse-slow">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[.3em] text-slate-400">Professional Fleet Management</p>
              <h1 className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-xl font-bold text-transparent bg-[length:200%_auto] animate-gradient">
                Ultra-Modern Console v2.0
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search trucks, drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 rounded-xl bg-white/5 pl-10 pr-4 py-2 text-sm ring-1 ring-white/10 backdrop-blur-xl focus:ring-2 focus:ring-violet-400/50 outline-none transition-all"
              />
            </div>

            <button
              onClick={() => setShowGrid(v => !v)}
              className={`rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${showGrid ? 'bg-violet-500/30 text-violet-200' : 'bg-white/10 hover:bg-white/15'}`}
              title={`${showGrid ? "Hide" : "Show"} grid (Ctrl+G)`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShow3D(v => !v)}
              className={`rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${show3D ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/10 hover:bg-white/15'}`}
              title={`${show3D ? "Disable" : "Enable"} 3D`}
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPaused(v => !v)}
              className={`rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${paused ? 'bg-amber-500/30 text-amber-200' : 'bg-white/10 hover:bg-white/15'}`}
              title={`${paused ? "Resume" : "Pause"} simulation (Ctrl+P)`}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowAlerts(v => !v)}
              className={`relative rounded-xl p-2.5 ring-1 ring-white/15 backdrop-blur-xl transition-all ${showAlerts ? 'bg-rose-500/30 text-rose-200' : 'bg-white/10 hover:bg-white/15'}`}
              title="View alerts"
            >
              <Bell className="h-4 w-4" />
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {alerts.filter(a => !a.acknowledged).length}
                </span>
              )}
            </button>
            <button
              onClick={downloadReport}
              className="rounded-xl p-2.5 ring-1 ring-white/15 bg-white/10 hover:bg-white/15 backdrop-blur-xl transition-all"
              title="Download report (Ctrl+R)"
            >
              <Download className="h-4 w-4" />
            </button>

            <Pill intent={apiHealthy ? "ok" : apiHealthy === false ? "error" : "neutral"}>
              {apiHealthy ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="hidden sm:inline">API {apiHealthy ? "Online" : apiHealthy === false ? "Offline" : "Checking…"}</span>
            </Pill>

            <div className="flex rounded-2xl p-1 ring-1 ring-white/15 bg-white/10 backdrop-blur-xl">
              {(["1h", "24h", "7d", "30d", "90d"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                    timeRange === r 
                      ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg" 
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {timeRange === r && (
                    <span className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.4),transparent)] bg-[length:200%_100%] animate-shimmer" />
                  )}
                  <span className="relative z-10">{r}</span>
                </button>
              ))}
            </div>

            <div className="flex rounded-2xl p-1 ring-1 ring-white/15 bg-white/10 backdrop-blur-xl">
              {(["dark", "neon", "ocean", "forest"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    theme === t ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10"
                  }`}
                  title={`${t} theme`}
                >
                  {t[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 bg-slate-950/50 backdrop-blur-xl">
          <div className="mx-auto max-w-[1800px] px-6 py-3 flex items-center justify-between gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Refresh:</span>
                <select
                  value={refreshSpeed}
                  onChange={(e) => setRefreshSpeed(e.target.value as keyof typeof REFRESH_INTERVALS)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 ring-1 ring-white/10 outline-none text-white cursor-pointer"
                >
                  <option value="fast">Fast (5s)</option>
                  <option value="normal">Normal (30s)</option>
                  <option value="slow">Slow (60s)</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Precision:</span>
                <select
                  value={dataPrecision}
                  onChange={(e) => setDataPrecision(e.target.value as typeof dataPrecision)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 ring-1 ring-white/10 outline-none text-white cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Speed:</span>
                <button
                  onClick={() => setSimulationSpeed(Math.max(0.5, simulationSpeed - 0.5))}
                  className="rounded px-2 py-1 bg-white/5 hover:bg-white/10 transition-all"
                >
                  -
                </button>
                <span className="font-mono w-12 text-center">{simulationSpeed}x</span>
                <button
                  onClick={() => setSimulationSpeed(Math.min(5, simulationSpeed + 0.5))}
                  className="rounded px-2 py-1 bg-white/5 hover:bg-white/10 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Pill intent="info">
                <Database className="h-3.5 w-3.5" />
                {dataPoints} data points
              </Pill>
              <Pill intent="ok">
                <Server className="h-3.5 w-3.5" />
                ${revenueStats.mean.toFixed(0)} avg revenue
              </Pill>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-8 px-6 py-8">
        <div className="flex items-center justify-between text-sm flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Pill intent="info">
              <Clock className="h-4 w-4" />
              Last updated: <ClientOnly fallback="—">{lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}</ClientOnly>
            </Pill>
            <Pill intent={paused ? "warn" : "ok"}>
              {paused ? <Pause className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {paused ? "Simulation paused" : "All systems operational"}
            </Pill>
            {autoRefresh && (
              <Pill intent="info">
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                Auto-refresh active
              </Pill>
            )}
          </div>
          <Pill>
            <Calendar className="h-4 w-4" />
            <ClientOnly>{new Date().toLocaleDateString("en-US",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}</ClientOnly>
          </Pill>
        </div>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <Tilt key={i}>
                <GlassCard accent={`from-white/10 via-white/8 to-white/10`}>
                  <div className="rounded-3xl p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${m.accent} ring-1 ring-white/30 shadow-[0_12px_35px_-12px] shadow-current`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <Pill intent={m.trend === "up" ? "ok" : m.trend === "down" ? "warn" : "neutral"}>
                        {m.trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : 
                         m.trend === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : 
                         <Activity className="h-3.5 w-3.5" />}
                        {m.change}
                      </Pill>
                    </div>
                    <p className="text-sm text-slate-400 uppercase tracking-wide">{m.title}</p>
                    <p className="text-4xl font-bold tracking-tight mt-1 mb-2">{m.value}</p>
                    <p className="text-xs text-slate-500">{m.detail}</p>

                    <svg className="mt-4 h-14 w-full opacity-90" viewBox="0 0 300 50" preserveAspectRatio="none">
                      {(() => {
                        const min = Math.min(...m.spark);
                        const max = Math.max(...m.spark);
                        const range = max - min || 1;
                        const pts = m.spark.map((v, idx) => {
                          const x = (idx / (m.spark.length - 1)) * 300;
                          const y = 45 - ((v - min) / range) * 35;
                          return `${x},${y}`;
                        });
                        const d = `M ${pts.join(" L ")}`;
                        return (
                          <>
                            <defs>
                              <linearGradient id={`sg-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="white" stopOpacity="0.05" />
                              </linearGradient>
                              <filter id={`glow-${i}`}>
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <path d={`${d} L 300,50 L 0,50 Z`} fill={`url(#sg-${i})`} />
                            <path d={d} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${i})`} />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </GlassCard>
              </Tilt>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlassCard onClick={() => setFullscreen("revenue")}>
            <div className="rounded-3xl p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-violet-400" />
                    Revenue Trend Analysis
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Current vs Previous Period • {timeRange}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg: ${revenueStats.mean.toFixed(0)} | s: ${revenueStats.stdDev.toFixed(0)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill intent="ok">
                    <TrendingUp className="h-4 w-4" /> +15.3%
                  </Pill>
                  <button
                    className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/15 transition-all"
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="h-[380px]">
                <RevenueChart data={revenueData} />
              </div>
            </div>
          </GlassCard>

          <GlassCard accent="from-cyan-400/30 via-sky-400/20 to-indigo-400/30" onClick={() => setFullscreen("fleet")}>
            <div className="rounded-3xl p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    Fleet Activity & Efficiency
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Utilization and performance metrics</p>
                </div>
                <button
                  className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/15 transition-all"
                  title="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[380px]">
                <FleetChart data={fleetActivity} />
              </div>
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassCard accent="from-fuchsia-400/30 via-violet-400/20 to-cyan-400/30" onClick={() => setFullscreen("temp")}>
            <div className="rounded-3xl p-6">
              <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                <ThermometerSun className="h-5 w-5 text-fuchsia-400" />
                Cargo Temperature Distribution
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={tempBuckets} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={70} 
                      outerRadius={105} 
                      paddingAngle={6} 
                      dataKey="value"
                    >
                      {tempBuckets.map((b, i) => (
                        <Cell key={i} fill={b.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {tempBuckets.map((b, i) => (
                  <div key={i} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-2 transition-all">
                    <span className="flex items-center gap-3">
                      <span 
                        className="h-4 w-4 rounded-full ring-2 ring-white/40 group-hover:ring-white/60 transition-all" 
                        style={{ background: b.color }} 
                      />
                      <span className="text-sm text-slate-300 font-medium">{b.name}</span>
                    </span>
                    <span className="font-bold text-lg">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard accent="from-rose-400/30 via-orange-400/20 to-amber-400/30" onClick={() => setFullscreen("alerts")}>
            <div className="rounded-3xl p-6">
              <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                Alert Timeline
              </h3>
              <div className="h-[280px]">
                <AlertsChart data={alertsData} />
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30">
                  <span className="text-sm font-medium">Critical Alerts</span>
                  <span className="text-lg font-bold text-red-400">{alerts.filter(a => a.level === "critical" && !a.acknowledged).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
                  <span className="text-sm font-medium">Warnings</span>
                  <span className="text-lg font-bold text-amber-400">{alerts.filter(a => a.level === "warning" && !a.acknowledged).length}</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard accent="from-emerald-400/30 via-teal-400/20 to-green-400/30" onClick={() => setFullscreen("performance")}>
            <div className="rounded-3xl p-6">
              <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                Performance Metrics
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={performanceData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
                  <p className="text-xs text-slate-400">Avg Score</p>
                  <p className="text-2xl font-bold text-emerald-400">90.2</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                  <p className="text-xs text-slate-400">Rank</p>
                  <p className="text-2xl font-bold text-cyan-400">#1</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlassCard>
            <div className="rounded-3xl p-6">
              <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-violet-400" />
                System Health Monitor
              </h3>
              <div className="space-y-4">
                {[
                  { name: "API Gateway", status: apiHealthy, latency: "24ms", uptime: "99.98%" },
                  { name: "WebSocket", status: true, latency: "12ms", uptime: "99.99%" },
                  { name: "Database", status: true, latency: "8ms", uptime: "100%" },
                  { name: "Cache Layer", status: true, latency: "3ms", uptime: "99.95%" },
                  { name: "GPS Tracking", status: true, latency: "156ms", uptime: "98.76%" },
                  { name: "Temperature Sensors", status: true, latency: "45ms", uptime: "99.87%" },
                ].map((service, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${service.status ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">{service.uptime}</span>
                      <span className="text-sm text-slate-400">{service.latency}</span>
                      <Pill intent={service.status ? "ok" : "error"}>
                        {service.status ? "Online" : "Offline"}
                      </Pill>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid place-items-center">
                <div className="relative grid place-items-center">
                  <svg width="180" height="180" viewBox="0 0 180 180">
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      fill="none"
                      stroke="url(#healthGrad)"
                      strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 75 * 0.968} ${2 * Math.PI * 75}`}
                      strokeLinecap="round"
                      transform="rotate(-90 90 90)"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-5xl font-bold">96.8%</p>
                      <p className="text-sm text-slate-400 mt-1">System Health</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard accent="from-indigo-400/30 via-blue-400/20 to-cyan-400/30">
            <div className="rounded-3xl p-6">
              <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-400" />
                Live Fleet Map
              </h3>
              <div className="h-[400px] rounded-2xl bg-slate-950/50 ring-1 ring-white/10 overflow-hidden relative">
                <PingLayer count={12} />
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <MapPin className="h-16 w-16 mx-auto text-cyan-400 animate-bounce" />
                    <p className="text-2xl font-bold">55 Active Trucks</p>
                    <p className="text-sm text-slate-400">Real-time GPS tracking</p>
                    <button className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 font-semibold shadow-lg transition-all">
                      Open Full Map
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        <div className="text-center space-y-2 pt-4 pb-8">
          <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-slate-500">
            <span>Environment: <span className="font-mono text-slate-400">Production</span></span>
            <span>•</span>
            <span>Version: <span className="font-mono text-slate-400">v2.0.1</span></span>
            <span>•</span>
            <span>Build: <span className="font-mono text-slate-400">#4523</span></span>
            <span>•</span>
            <span>Uptime: <span className="font-mono text-emerald-400">99.98%</span></span>
          </div>
          <p className="text-xs text-slate-600">
            © 2024 Fleet Management Pro • Powered by Real-time Analytics Engine • All Rights Reserved
          </p>
          <p className="text-[10px] text-slate-700">
            Keyboard Shortcuts: Ctrl+G (Grid) • Ctrl+P (Pause) • Ctrl+R (Refresh) • ESC (Close Modal)
          </p>
        </div>
      </main>

      {showAlerts && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-2xl ring-1 ring-white/10 shadow-2xl z-[60] animate-slideInRight overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-rose-400" />
                Alert Center
              </h3>
              <button
                onClick={() => setShowAlerts(false)}
                className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <Pill intent="info">
                {alerts.filter(a => !a.acknowledged).length} unacknowledged
              </Pill>
              <button
                onClick={clearAllAlerts}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-all"
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
                    alert.level === "critical"
                      ? "bg-red-500/10 ring-red-500/30"
                      : alert.level === "warning"
                      ? "bg-amber-500/10 ring-amber-500/30"
                      : "bg-cyan-500/10 ring-cyan-500/30"
                  } ${alert.acknowledged ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.level === "critical" ? "text-red-400" :
                          alert.level === "warning" ? "text-amber-400" :
                          "text-cyan-400"
                        }`} />
                        <span className="text-xs uppercase tracking-wider font-semibold">
                          {alert.level}
                        </span>
                        {alert.truckId && (
                          <span className="text-xs text-slate-400">• {alert.truckId}</span>
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
                        className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all"
                      >
                        Ack
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl animate-fadeIn">
          <div className="absolute inset-4 lg:inset-10 rounded-3xl ring-1 ring-white/20 bg-slate-900/80 backdrop-blur-xl p-4 lg:p-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl lg:text-2xl font-bold">
                {fullscreen === "revenue" && "Revenue Trend Analysis"}
                {fullscreen === "fleet" && "Fleet Activity & Efficiency"}
                {fullscreen === "temp" && "Cargo Temperature Distribution"}
                {fullscreen === "alerts" && "Alert Timeline & History"}
                {fullscreen === "performance" && "Performance Metrics"}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFullscreen(null)}
                  className="rounded-xl p-2 ring-1 ring-white/20 hover:bg-white/10 transition-all"
                  title="Minimize"
                >
                  <Minimize2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setFullscreen(null)}
                  className="rounded-xl p-3 ring-1 ring-white/20 hover:bg-white/10 transition-all"
                  aria-label="Close fullscreen"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-80px)]">
              {fullscreen === "revenue" && <RevenueChart data={revenueData} />}
              {fullscreen === "fleet" && <FleetChart data={fleetActivity} />}
              {fullscreen === "temp" && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={tempBuckets} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={120} 
                      outerRadius={200} 
                      paddingAngle={8} 
                      dataKey="value"
                      label
                    >
                      {tempBuckets.map((b, i) => (
                        <Cell key={i} fill={b.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {fullscreen === "alerts" && <AlertsChart data={alertsData} />}
              {fullscreen === "performance" && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={performanceData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 14 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Radar name="Score" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.6} strokeWidth={3} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          to { background-position: 200% center; }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
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
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #8b5cf6, #06b6d4);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #a78bfa, #22d3ee);
        }

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}






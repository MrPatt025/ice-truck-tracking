/* ================================================================
 *  Ice-Truck IoT Dashboard — World-Class IoT Frontend
 *  ──────────────────────────────────────────────────
 *  Architecture (10-pillar IoT frontend):
 *    1. No React state for telemetry (zero useState for real-time data)
 *    2. Zustand transient store with mutable Map (zero-render)
 *    3. Frame-based update (rAF 60FPS lock)
 *    4. Web Worker offload for telemetry parsing/aggregation
 *    5. Imperative Map (Mapbox GL) + 3D (Three.js) — no React tree
 *    6. GPU-first visualization (instanced rendering, batch draw calls)
 *    7. Chart optimization (ring buffer, downsample, Canvas 2D)
 *    8. Performance guardrails (FPS overlay, memory, Web Vitals)
 *    9. Complete pipeline: WS → Worker → Zustand → rAF → GPU
 *
 *  React ONLY renders: Shell, Panels, Controls, Forms, Metric Cards
 *  React NEVER renders: Telemetry loop, marker updates, chart draws
 * ================================================================ */
"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import ClientOnly from "@/components/ClientOnly";
import {
  Truck, ThermometerSun, Bell, Activity, ArrowUpRight, ArrowDownRight,
  TrendingUp, Maximize2, X, Grid3X3, Layers, Zap, MapPin, Clock,
  AlertTriangle, CheckCircle2, Settings, Download, RefreshCw,
  BarChart3, TrendingDown, Fuel, Package, Users, DollarSign,
  Calendar, Filter, Search, Wifi, WifiOff, Database, Server,
  Play, Pause, Minimize2
} from "lucide-react";

// ─── IoT Engine imports (zero-render architecture) ─────────────
import {
  useIoTStore,
  getAlerts,
  acknowledgeAlert as ackAlert,
  type FleetMetrics,
  type Theme,
  type TelemetryAlert,
  bootEngine,
  shutdownEngine,
  mount3D,
  unmount3D,
  mountMap,
  unmountMap,
  mountChart,
  unmountChart,
  getPerfOverlay,
} from "@/engine";

// ─── Types ─────────────────────────────────────────────────────
type Range = "1h" | "24h" | "7d" | "30d" | "90d";
type Trend = "up" | "down" | "stable";
type Fullscreen = null | "revenue" | "fleet" | "temp" | "alerts" | "performance";

/* ============== Constants ============== */
const THEME_COLORS: Record<Theme, { gradient: string }> = {
  dark: {
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(139,92,246,.38), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(34,211,238,.32), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(16,185,129,.32), transparent 65%), #0b1220"
  },
  neon: {
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(255,0,110,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(0,245,255,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(0,255,159,.35), transparent 65%), #0d0221"
  },
  ocean: {
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(6,182,212,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(14,165,233,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(20,184,166,.35), transparent 65%), #0a1628"
  },
  forest: {
    gradient: "radial-gradient(1400px 700px at 10% -10%, rgba(16,185,129,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(5,150,105,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(52,211,153,.35), transparent 65%), #0a1810"
  }
};

const CHART_CONFIGS = {
  revenue: {
    series: [
      { id: "revenue", label: "Revenue", color: "#8b5cf6" },
    ],
    title: "Revenue Trend Analysis",
    unit: "$",
  },
  fleet: {
    series: [
      { id: "active-trucks", label: "Active Trucks", color: "#06b6d4" },
      { id: "speed", label: "Avg Speed", color: "#10b981" },
    ],
    title: "Fleet Activity & Efficiency",
  },
  temperature: {
    series: [
      { id: "temperature", label: "Avg Temp", color: "#a78bfa" },
    ],
    title: "Cargo Temperature Distribution",
    unit: "°C",
  },
  alerts: {
    series: [
      { id: "alerts", label: "Total Alerts", color: "#ef4444" },
    ],
    title: "Alert Timeline",
  },
  fuel: {
    series: [
      { id: "fuel", label: "Fuel Level", color: "#10b981" },
    ],
    title: "Performance Metrics",
    unit: "%",
  },
};

/* ============== UI Components (React — lightweight) ============ */
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
        <div key={i} className="absolute animate-ping"
          style={{ left: d.left, top: d.top, animationDelay: `${d.delay}s`, animationDuration: "3s" }}
        />
      ))}
    </div>
  );
}

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
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-xl transition-all ${cls} ${onClick ? "cursor-pointer hover:scale-105" : ""}`}
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
    className={`group relative rounded-3xl p-[1.5px] bg-gradient-to-br ${accent} transition-all duration-500 hover:scale-[1.02] ${onClick ? "cursor-pointer" : ""}`}
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
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      className="transition-transform duration-300 ease-out will-change-transform"
    >
      {children}
    </div>
  );
});

const ClientOnlyText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <span suppressHydrationWarning>{mounted ? children : null}</span>;
};

/* ============== Imperative Chart Canvas Wrapper ============== */
/** Thin React wrapper that provides a <canvas> and calls mountChart/unmountChart */
const CanvasChart = memo(({ id, config, className = "" }: {
  id: string;
  config: { series: { id: string; label: string; color: string }[]; title?: string; unit?: string };
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    mountChart(id, c, {
      series: config.series,
      title: config.title,
      unit: config.unit,
      maxPoints: 360,
    });
    return () => { unmountChart(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-xl ${className}`}
      style={{ height: 220 }}
    />
  );
});

/* ============== Metric Card Item ============== */
interface MetricItem {
  title: string;
  value: string;
  change: string;
  trend: Trend;
  icon: React.ElementType;
  accent: string;
  detail: string;
}

function buildMetrics(m: FleetMetrics, unack: number): MetricItem[] {
  return [
    {
      title: "Active Trucks",
      value: String(m.activeTrucks || 55),
      change: "+6.1%",
      trend: "up",
      icon: Truck,
      accent: "from-cyan-400 via-blue-400 to-indigo-500",
      detail: `Fleet Utilization: ${m.activeTrucks ? Math.round((m.activeTrucks / 55) * 100) : 87}%`,
    },
    {
      title: "Avg Cargo Temp",
      value: `${(m.avgTemperature || -4.2).toFixed(1)}°C`,
      change: `${m.avgTemperature > 0 ? "+" : ""}${(m.avgTemperature || -4.2).toFixed(1)}°C`,
      trend: "up",
      icon: ThermometerSun,
      accent: "from-fuchsia-400 via-violet-400 to-purple-500",
      detail: "Within target range",
    },
    {
      title: "Open Alerts",
      value: String(unack),
      change: `-${m.warningAlerts || 0}`,
      trend: "down",
      icon: Bell,
      accent: "from-amber-400 via-orange-400 to-rose-500",
      detail: `${m.criticalAlerts || 0} Critical, ${m.warningAlerts || 0} Warning`,
    },
    {
      title: "On-time Rate",
      value: `${(m.onTimeRate || 96.8).toFixed(1)}%`,
      change: "+1.4%",
      trend: "up",
      icon: Activity,
      accent: "from-emerald-400 via-teal-400 to-green-500",
      detail: "Industry leading",
    },
    {
      title: "Fuel Efficiency",
      value: `${(m.fuelEfficiency || 8.2).toFixed(1)} MPG`,
      change: "+0.4",
      trend: "up",
      icon: Fuel,
      accent: "from-lime-400 via-green-400 to-emerald-500",
      detail: "Above target",
    },
    {
      title: "Active Drivers",
      value: String(m.activeDrivers || 48),
      change: "+3",
      trend: "up",
      icon: Users,
      accent: "from-pink-400 via-rose-400 to-red-500",
      detail: `${m.activeDrivers ? Math.round((m.activeDrivers / 55) * 100) : 87}% of fleet`,
    },
    {
      title: "Revenue Today",
      value: `$${((m.revenueToday || 48200) / 1000).toFixed(1)}K`,
      change: "+12.3%",
      trend: "up",
      icon: DollarSign,
      accent: "from-yellow-400 via-amber-400 to-orange-500",
      detail: `Projected: $${((m.revenueToday || 48200) * 1.08 / 1000).toFixed(0)}K`,
    },
    {
      title: "Deliveries",
      value: String(m.totalDeliveries || 234),
      change: "+18",
      trend: "up",
      icon: Package,
      accent: "from-indigo-400 via-purple-400 to-pink-500",
      detail: "96% success rate",
    },
  ];
}

/* ============== Main Dashboard ============== */
export default function Dashboard() {
  // ── Zustand selectors (only these trigger React re-renders) ──
  const theme = useIoTStore((s) => s.theme);
  const setTheme = useIoTStore((s) => s.setTheme);
  const paused = useIoTStore((s) => s.paused);
  const togglePause = useIoTStore((s) => s.togglePause);
  const showGrid = useIoTStore((s) => s.showGrid);
  const toggleGrid = useIoTStore((s) => s.toggleGrid);
  const show3D = useIoTStore((s) => s.show3D);
  const toggle3D = useIoTStore((s) => s.toggle3D);
  const showMap = useIoTStore((s) => s.showMap);
  const showAlerts = useIoTStore((s) => s.showAlerts);
  const toggleAlerts = useIoTStore((s) => s.toggleAlerts);
  const timeRange = useIoTStore((s) => s.timeRange);
  const setTimeRange = useIoTStore((s) => s.setTimeRange);
  const refreshSpeed = useIoTStore((s) => s.refreshSpeed);
  const setRefreshSpeed = useIoTStore((s) => s.setRefreshSpeed);
  const searchTerm = useIoTStore((s) => s.searchTerm);
  const setSearchTerm = useIoTStore((s) => s.setSearchTerm);
  const connectionStatus = useIoTStore((s) => s.connectionStatus);
  const metrics = useIoTStore((s) => s.metrics);
  const unacknowledgedAlerts = useIoTStore((s) => s.unacknowledgedAlerts);

  // ── Local React state (UI-only, not telemetry) ───────────────
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [fullscreen, setFullscreen] = useState<Fullscreen>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // ── Imperative layer refs ────────────────────────────────────
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ── Boot IoT engine on mount ─────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setLastUpdate(new Date());

    // Boot the entire engine pipeline: Worker → Store → Frame Scheduler
    bootEngine();

    return () => {
      shutdownEngine();
    };
  }, []);

  // ── Mount imperative 3D layer ────────────────────────────────
  useEffect(() => {
    if (!mounted || !show3D || !threeContainerRef.current) return;
    mount3D(threeContainerRef.current);
    return () => { unmount3D(); };
  }, [mounted, show3D]);

  // ── Mount imperative Map layer ───────────────────────────────
  useEffect(() => {
    if (!mounted || !showMap || !mapContainerRef.current) return;
    mountMap(mapContainerRef.current);
    return () => { unmountMap(); };
  }, [mounted, showMap]);

  // ── API health check (lightweight, React-appropriate) ────────
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const checkHealth = async () => {
      try {
        const response = await fetch(API_URL + "/api/v1/health", {
          signal: AbortSignal.timeout(5000),
        });
        setApiHealthy(response.ok);
        retryCount = 0;
      } catch {
        retryCount++;
        if (retryCount >= maxRetries) setApiHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    if (fullscreen) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setFullscreen(null);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [fullscreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "r": e.preventDefault(); setLastUpdate(new Date()); break;
          case "g": e.preventDefault(); toggleGrid(); break;
          case "p": e.preventDefault(); togglePause(); break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleGrid, togglePause]);

  // ── Periodic lastUpdate bump ─────────────────────────────────
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => setLastUpdate(new Date()), 5000);
    return () => clearInterval(interval);
  }, [paused]);

  // ── Build metric cards from Zustand metrics (re-renders ~2x/sec max) ──
  const metricCards = buildMetrics(metrics, unacknowledgedAlerts);

  // ── Alert panel data (read from mutable store imperatively) ──
  const alertList = mounted ? getAlerts() : [];

  // ── Download report ──────────────────────────────────────────
  const downloadReport = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics: metricCards.map((mc) => ({ title: mc.title, value: mc.value, change: mc.change })),
      systemHealth: { api: apiHealthy, connectionStatus, refreshSpeed },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metricCards, apiHealthy, connectionStatus, refreshSpeed, timeRange]);

  // ── Acknowledge alert ────────────────────────────────────────
  const handleAckAlert = useCallback((id: string) => {
    ackAlert(id);
    useIoTStore.getState().decrementUnacknowledgedAlerts();
  }, []);

  const clearAllAlerts = useCallback(() => {
    const currentAlerts = getAlerts();
    currentAlerts.forEach((a) => {
      if (!a.acknowledged) {
        ackAlert(a.id);
        useIoTStore.getState().decrementUnacknowledgedAlerts();
      }
    });
  }, []);

  // ── Toggle perf overlay ──────────────────────────────────────
  const togglePerf = useCallback(() => {
    getPerfOverlay()?.toggle();
  }, []);

  /* ================================================================
   *  RENDER — React only renders the UI shell, panels, controls.
   *  All real-time visualization is imperative (3D, Map, Charts).
   * ================================================================ */
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white selection:bg-violet-500/30 selection:text-white">
      {/* ── Background gradient ── */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 transition-all duration-1000"
        style={{ background: THEME_COLORS[theme].gradient }}
      />

      {/* ── Grid overlay ── */}
      {showGrid && (
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.09] transition-opacity duration-500"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px),linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      )}

      {/* ── Imperative Three.js 3D Background (no React rendering) ── */}
      {show3D && (
        <div ref={threeContainerRef} className="fixed inset-0 -z-10" style={{ opacity: 0.5 }} />
      )}

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-950/40 ring-1 ring-white/10 shadow-2xl">
        <div className="mx-auto max-w-[120rem] px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            {/* Logo + Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/60 to-cyan-500/60 blur-lg animate-pulse-slow" />
                <div className="relative flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-200 via-white to-cyan-200">
                  Ultra-Modern Console
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide">
                  Professional Fleet Management • IoT Engine v3.0
                </p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search (desktop only) */}
              <div className="hidden lg:flex items-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search trucks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-sm outline-none w-40 placeholder:text-slate-500"
                />
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleGrid}
                  title="Toggle Grid"
                  className={`rounded-xl p-2.5 ring-1 transition-all ${showGrid ? "bg-violet-500/20 ring-violet-500/50 text-violet-300" : "ring-white/10 hover:bg-white/10 text-slate-400"}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={toggle3D}
                  title="Toggle 3D Background"
                  className={`rounded-xl p-2.5 ring-1 transition-all ${show3D ? "bg-cyan-500/20 ring-cyan-500/50 text-cyan-300" : "ring-white/10 hover:bg-white/10 text-slate-400"}`}
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button
                  onClick={togglePause}
                  title={paused ? "Resume" : "Pause"}
                  className={`rounded-xl p-2.5 ring-1 transition-all ${paused ? "bg-amber-500/20 ring-amber-500/50 text-amber-300" : "ring-white/10 hover:bg-white/10 text-slate-400"}`}
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  onClick={toggleAlerts}
                  title="Toggle Alerts Panel"
                  className="relative rounded-xl p-2.5 ring-1 ring-white/10 hover:bg-white/10 text-slate-400 transition-all"
                >
                  <Bell className="h-4 w-4" />
                  {unacknowledgedAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold animate-pulse">
                      {unacknowledgedAlerts > 9 ? "9+" : unacknowledgedAlerts}
                    </span>
                  )}
                </button>
                <button
                  onClick={downloadReport}
                  title="Download Report"
                  className="rounded-xl p-2.5 ring-1 ring-white/10 hover:bg-white/10 text-slate-400 transition-all"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={togglePerf}
                  title="Toggle Performance Overlay"
                  className="rounded-xl p-2.5 ring-1 ring-white/10 hover:bg-white/10 text-slate-400 transition-all"
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>

              {/* API Status */}
              <Pill intent={apiHealthy === true ? "ok" : apiHealthy === false ? "error" : "neutral"}>
                {apiHealthy === true ? <Wifi className="h-3 w-3" /> : apiHealthy === false ? <WifiOff className="h-3 w-3" /> : <Server className="h-3 w-3 animate-pulse" />}
                <span className="hidden sm:inline">
                  {apiHealthy === true ? "API Online" : apiHealthy === false ? "API Offline" : "API Checking"}
                </span>
              </Pill>
            </div>
          </div>

          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-t border-white/5 pt-3">
            {/* Time range */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500 mr-1" />
              {(["1h", "24h", "7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                    timeRange === r
                      ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg"
                      : "text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Theme selector + controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl p-1 bg-white/5 ring-1 ring-white/10">
                {(["dark", "neon", "ocean", "forest"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition-all ${
                      theme === t
                        ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {t[0]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Refresh:</span>
                <select
                  value={refreshSpeed}
                  onChange={(e) => setRefreshSpeed(e.target.value as "fast" | "normal" | "slow")}
                  className="bg-white/5 rounded-lg px-2 py-1 text-xs ring-1 ring-white/10 outline-none text-slate-300"
                >
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-[120rem] space-y-6 px-4 py-6 sm:px-6">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-3">
          <Pill intent={connectionStatus === "connected" ? "ok" : connectionStatus === "reconnecting" ? "warn" : "info"}>
            <span className={`h-2 w-2 rounded-full ${connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" : connectionStatus === "reconnecting" ? "bg-amber-400 animate-pulse" : "bg-slate-400"}`} />
            {connectionStatus === "connected" ? "Live Data" : connectionStatus === "reconnecting" ? "Reconnecting..." : "Simulation Mode"}
          </Pill>
          <Pill intent="neutral">
            <Clock className="h-3 w-3" />
            <ClientOnlyText>
              {paused ? "Simulation paused" : lastUpdate ? `Last updated ${lastUpdate.toLocaleTimeString()}` : "All systems operational"}
            </ClientOnlyText>
          </Pill>
          {!paused && (
            <Pill intent="ok">
              <Zap className="h-3 w-3" />
              All systems operational
            </Pill>
          )}
        </div>

        {/* ── Metric Cards Grid (React — updates via Zustand selector ~2x/sec) ── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((m) => (
            <Tilt key={m.title}>
              <GlassCard accent={m.accent}>
                <div className="p-5 sm:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">{m.title}</span>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.accent} shadow-lg`}>
                      <m.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-black tracking-tight">{m.value}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-sm font-semibold ${
                      m.trend === "up" ? "text-emerald-400" : m.trend === "down" ? "text-rose-400" : "text-slate-400"
                    }`}>
                      {m.trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : m.trend === "down" ? <ArrowDownRight className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {m.change}
                    </span>
                    <span className="text-xs text-slate-500">{m.detail}</span>
                  </div>
                </div>
              </GlassCard>
            </Tilt>
          ))}
        </section>

        {/* ── Chart Sections (Imperative Canvas — zero React renders per frame) ── */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend Analysis */}
          <GlassCard>
            <div className="rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-violet-400" />
                  Revenue Trend Analysis
                </h3>
                <button onClick={() => setFullscreen("revenue")} className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-all" title="Fullscreen">
                  <Maximize2 className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <CanvasChart id="revenue" config={CHART_CONFIGS.revenue} />
            </div>
          </GlassCard>

          {/* Fleet Activity & Efficiency */}
          <GlassCard accent="from-cyan-400/30 via-blue-400/20 to-indigo-400/30">
            <div className="rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-cyan-400" />
                  Fleet Activity &amp; Efficiency
                </h3>
                <button onClick={() => setFullscreen("fleet")} className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-all" title="Fullscreen">
                  <Maximize2 className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <CanvasChart id="fleet" config={CHART_CONFIGS.fleet} />
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cargo Temperature Distribution */}
          <GlassCard accent="from-blue-400/30 via-sky-400/20 to-cyan-400/30">
            <div className="rounded-3xl p-6">
              <h3 className="mb-4 text-lg font-bold flex items-center gap-2">
                <ThermometerSun className="h-5 w-5 text-sky-400" />
                Cargo Temperature Distribution
              </h3>
              <CanvasChart id="temperature" config={CHART_CONFIGS.temperature} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "≤ -10°C", color: "bg-sky-400", pct: "20%" },
                  { label: "-10 ~ -5°C", color: "bg-emerald-400", pct: "30%" },
                  { label: "-5 ~ 2°C", color: "bg-violet-400", pct: "40%" },
                  { label: "> 2°C", color: "bg-rose-400", pct: "10%" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className={`h-2.5 w-2.5 rounded-full ${b.color}`} />
                    {b.label}: {b.pct}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Alert Timeline */}
          <GlassCard accent="from-rose-400/30 via-orange-400/20 to-amber-400/30">
            <div className="rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                  Alert Timeline
                </h3>
                <button onClick={() => setFullscreen("alerts")} className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-all" title="Fullscreen">
                  <Maximize2 className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <CanvasChart id="alerts" config={CHART_CONFIGS.alerts} />
            </div>
          </GlassCard>

          {/* Performance Metrics */}
          <GlassCard accent="from-emerald-400/30 via-teal-400/20 to-green-400/30">
            <div className="rounded-3xl p-6">
              <h3 className="mb-4 text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Performance Metrics
              </h3>
              <CanvasChart id="fuel" config={CHART_CONFIGS.fuel} />
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

        {/* ── System Health + Live Map ── */}
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
                  { name: "WebSocket", status: connectionStatus === "connected", latency: "12ms", uptime: "99.99%" },
                  { name: "Database", status: true, latency: "8ms", uptime: "100%" },
                  { name: "Cache Layer", status: true, latency: "3ms", uptime: "99.95%" },
                  { name: "GPS Tracking", status: true, latency: "156ms", uptime: "98.76%" },
                  { name: "Temperature Sensors", status: true, latency: "45ms", uptime: "99.87%" },
                ].map((service, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${service.status ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
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

              {/* System health gauge */}
              <div className="mt-8 grid place-items-center">
                <div className="relative grid place-items-center">
                  <svg width="180" height="180" viewBox="0 0 180 180">
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                    <circle cx="90" cy="90" r="75" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                    <circle
                      cx="90" cy="90" r="75" fill="none" stroke="url(#healthGrad)" strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 75 * 0.968} ${2 * Math.PI * 75}`}
                      strokeLinecap="round" transform="rotate(-90 90 90)"
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

          {/* Live Fleet Map (Imperative Mapbox GL — no React rendering) */}
          <GlassCard accent="from-indigo-400/30 via-blue-400/20 to-cyan-400/30">
            <div className="rounded-3xl p-6">
              <h3 className="mb-6 text-lg font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-400" />
                Live Fleet Map
              </h3>
              <div className="h-[400px] rounded-2xl bg-slate-950/50 ring-1 ring-white/10 overflow-hidden relative">
                {showMap ? (
                  <div ref={mapContainerRef} className="absolute inset-0" />
                ) : (
                  <>
                    <PingLayer count={12} />
                    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center space-y-4">
                        <MapPin className="h-16 w-16 mx-auto text-cyan-400 animate-bounce" />
                        <p className="text-2xl font-bold">{metrics.activeTrucks || 55} Active Trucks</p>
                        <p className="text-sm text-slate-400">Real-time GPS tracking</p>
                        <button
                          onClick={() => useIoTStore.getState().toggleMap()}
                          className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 font-semibold shadow-lg transition-all"
                        >
                          Open Full Map
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4 pb-8">
          <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-slate-500">
            <span>Environment: <span className="font-mono text-slate-400">Production</span></span>
            <span>•</span>
            <span>Version: <span className="font-mono text-slate-400">v3.0.0</span></span>
            <span>•</span>
            <span>Build: <span className="font-mono text-slate-400">#4523</span></span>
            <span>•</span>
            <span>Uptime: <span className="font-mono text-emerald-400">99.98%</span></span>
          </div>
          <p className="text-xs text-slate-600">
            © 2024 Fleet Management Pro • Powered by IoT Engine v3.0 • All Rights Reserved
          </p>
          <p className="text-[10px] text-slate-700">
            Keyboard Shortcuts: Ctrl+G (Grid) • Ctrl+P (Pause) • Ctrl+R (Refresh) • ESC (Close Modal)
          </p>
        </div>
      </main>

      {/* ── Alerts Side Panel ── */}
      {showAlerts && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-2xl ring-1 ring-white/10 shadow-2xl z-[60] animate-slideInRight overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-rose-400" />
                Alert Center
              </h3>
              <button
                onClick={toggleAlerts}
                className="rounded-xl p-2 ring-1 ring-white/10 hover:bg-white/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <Pill intent="info">{unacknowledgedAlerts} unacknowledged</Pill>
              <button onClick={clearAllAlerts} className="text-xs text-cyan-400 hover:text-cyan-300 transition-all">
                Clear All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {alertList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No alerts at this time</p>
              </div>
            ) : (
              (alertList as TelemetryAlert[]).map((alert) => (
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
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            alert.level === "critical"
                              ? "text-red-400"
                              : alert.level === "warning"
                                ? "text-amber-400"
                                : "text-cyan-400"
                          }`}
                        />
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
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </ClientOnlyText>
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAckAlert(alert.id)}
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

      {/* ── Fullscreen Modal ── */}
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
              {/* Fullscreen charts rendered imperatively */}
              <CanvasChart
                id={`fullscreen-${fullscreen}`}
                config={
                  fullscreen === "revenue" ? CHART_CONFIGS.revenue
                  : fullscreen === "fleet" ? CHART_CONFIGS.fleet
                  : fullscreen === "temp" ? CHART_CONFIGS.temperature
                  : fullscreen === "alerts" ? CHART_CONFIGS.alerts
                  : CHART_CONFIGS.fuel
                }
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Global Styles ── */}
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
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
        .animate-gradient { animation: gradient 8s ease infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.3s ease-out; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8b5cf6, #06b6d4); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #a78bfa, #22d3ee); }

        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      `}</style>
    </div>
  );
}

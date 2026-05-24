'use client'
import dynamic from 'next/dynamic'
import ChartGridController from '@/components/dashboard/ChartGridController'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
/* ================================================================
 *  Ice-Truck IoT Dashboard — Masterpiece GPU-First Frontend v4.0
 *  ──────────────────────────────────────────────────────────────
 *  5-Layer Engine Architecture:
 *    1. GPU Rendering Engine (GLSL shaders, demand-based frameloop)
 *    2. Motion Physics Engine (spring dynamics, magnetic buttons)
 *    3. Data Visualization Engine (R-Tree, object pool, heatmap)
 *    4. Perception Engine (contextual tint, noise, typography)
 *    5. Adaptive Performance Intelligence (auto-scaling, FPS guard)
 *
 *  Zero-Render Architecture:
 *    • No React state for telemetry (zero useState for real-time data)
 *    • Zustand transient store with mutable Map
 *    • Frame-based update (rAF 60FPS lock)
 *    • Web Worker offload for telemetry parsing/aggregation
 *    • Imperative Map (Mapbox GL) + 3D (Three.js) — no React tree
 *    • GPU-first visualization (instanced rendering, batch draw calls)
 *    • Adaptive DPR + frustum culling + LOD
 *
 *  React ONLY renders: Shell, Panels, Controls, Forms, Metric Cards
 *  React NEVER renders: Telemetry loop, marker updates, chart draws
 * ================================================================ */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type Variants,
} from 'framer-motion'

// ─── IoT Engine imports (zero-render architecture) ─────────────
import {
  useIoTStore,
  type Theme,
  bootEngine,
  shutdownEngine,
  mount3D,
  unmount3D,
  getPerfOverlay,
} from '@/engine'
import { useTransitionStore } from '@/stores/transitionStore'
import type { StatusIssue } from '@/components/common/PremiumSystemStatusBanner'
import { useAppHealthEvents } from '@/hooks/useAppHealthEvents'
import { dispatchBackendHealthEvent } from '@/lib/healthEvents'
import { resolveApiBaseV1 } from '@/lib/backendUrl'
import { GlobalErrorBoundary } from '@/components/common/GlobalErrorBoundary'
import MapModeToggle from '@/components/MapModeToggle'
import OfflineBanner from '@/components/OfflineBanner'
import SystemStatus from '@/components/dashboard/SystemStatus'
import LiveMetricCards, {
  buildMetrics,
} from '@/components/dashboard/LiveMetricCards'

const API_BASE = resolveApiBaseV1()
const E2E_LIGHT_MODE = process.env.NEXT_PUBLIC_E2E_LIGHT === 'true'


const WebGLCanvasSkeleton = () => (
  <canvas
    data-testid='webgl-canvas-skeleton'
    aria-hidden='true'
    tabIndex={-1}
    className='absolute inset-0 h-full w-full rounded-2xl opacity-30'
  />
)

const PANEL_STAGGER: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
}


const PremiumSystemStatusBanner = dynamic(
  () => import('@/components/common/PremiumSystemStatusBanner'),
  {
    ssr: false,
    loading: () => null,
  }
)


const DASHBOARD_TITLE = 'Ice Truck Tracking Dashboard | Mission Control'



const useMapModeControls = (showHeatmap: boolean) => {
  const setMapMode = useCallback((mode: 'live' | 'historical') => {
    const shouldShowHeatmap = mode === 'historical'
    if (useIoTStore.getState().showHeatmap === shouldShowHeatmap) return
    useIoTStore.setState({ showHeatmap: shouldShowHeatmap })
  }, [])

  return {
    isLiveMode: showHeatmap === false,
    setMapMode,
  }
}

const useIntroTransitionSync = (
  isTransitioning: boolean,
  phase: string,
  startIntro: () => void,
  introProgress: ReturnType<typeof useMotionValue<number>>,
  setTransitionProgress: (progress: number) => void,
  finishTransition: () => void
): void => {
  useEffect(() => {
    if (!isTransitioning) {
      introProgress.set(1)
      return
    }

    if (phase === 'outro') {
      startIntro()
      return
    }

    if (phase !== 'intro') return

    introProgress.set(0)
    setTransitionProgress(0)

    const controls = animate(introProgress, 1, {
      duration: 0.96,
      ease: EASE_CINEMATIC_INTRO,
      onUpdate: latest => {
        setTransitionProgress(latest)
      },
      onComplete: () => {
        finishTransition()
      },
    })

    return () => {
      controls.stop()
    }
  }, [
    finishTransition,
    introProgress,
    isTransitioning,
    phase,
    setTransitionProgress,
    startIntro,
  ])
}

/* ============== Constants ============== */
const THEME_COLORS: Record<Theme, { gradient: string }> = {
  dark: {
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(139,92,246,.38), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(34,211,238,.32), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(16,185,129,.32), transparent 65%), #0b1220',
  },
  neon: {
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(255,0,110,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(0,245,255,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(0,255,159,.35), transparent 65%), #0d0221',
  },
  ocean: {
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(6,182,212,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(14,165,233,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(20,184,166,.35), transparent 65%), #0a1628',
  },
  forest: {
    gradient:
      'radial-gradient(1400px 700px at 10% -10%, rgba(16,185,129,.4), transparent 65%), radial-gradient(1000px 600px at 100% 10%, rgba(5,150,105,.35), transparent 65%), radial-gradient(1000px 600px at 50% 120%, rgba(52,211,153,.35), transparent 65%), #0a1810',
  },
}

const EASE_CINEMATIC_INTRO: [number, number, number, number] = [
  0.2, 0.88, 0.25, 1,
]


function resolveApiHealthy(
  backendStatus: 'healthy' | 'degraded' | 'unknown'
): boolean | null {
  if (backendStatus === 'healthy') {
    return true
  }
  if (backendStatus === 'degraded') {
    return false
  }
  return null
}

function buildStatusIssues({
  backendStatus,
  browserOffline,
  connectionStatus,
  mounted,
}: Readonly<{
  backendStatus: 'healthy' | 'degraded' | 'unknown'
  browserOffline: boolean
  connectionStatus: 'connected' | 'reconnecting' | 'offline' | 'disconnected'
  mounted: boolean
}>): StatusIssue[] {
  if (!mounted) return []

  const issues: StatusIssue[] = []

  if (browserOffline) {
    issues.push({
      id: 'network-offline',
      kind: 'network',
      title: 'Offline mode enabled',
      detail:
        'Network access is unavailable. The dashboard remains in graceful fallback mode until connectivity is restored.',
    })
  }

  if (backendStatus === 'degraded') {
    issues.push({
      id: 'api-5xx',
      kind: 'api',
      title: 'Backend service degraded (5xx)',
      detail:
        'The API health endpoint returned a server fault. Dashboard visuals stay active while retries continue in the background.',
    })
  }

  if (connectionStatus !== 'connected') {
    issues.push({
      id: 'ws-state',
      kind: 'websocket',
      title:
        connectionStatus === 'reconnecting'
          ? 'Realtime stream reconnecting'
          : 'Realtime stream offline',
      detail:
        connectionStatus === 'reconnecting'
          ? 'Live socket is renegotiating. Fresh telemetry may arrive with slight delay.'
          : 'Live socket is not connected. The dashboard remains in graceful fallback mode.',
    })
  }

  return issues
}




/* ============== Metric Card Item ============== */







function useApiHealthProbe() {
  useEffect(() => {
    if (E2E_LIGHT_MODE) return

    let retryCount = 0
    const maxRetries = 3

    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`, {
          signal: AbortSignal.timeout(5000),
        })
        if (response.status >= 500) {
          dispatchBackendHealthEvent({
            status: 'degraded',
            source: 'dashboard-health-probe',
            statusCode: response.status,
            reason: 'probe-5xx',
          })
        } else if (response.ok) {
          dispatchBackendHealthEvent({
            status: 'healthy',
            source: 'dashboard-health-probe',
          })
        }
        retryCount = 0
      } catch {
        retryCount++
        if (retryCount >= maxRetries) {
          dispatchBackendHealthEvent({
            status: 'degraded',
            source: 'dashboard-health-probe',
            reason: 'probe-network-error',
          })
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])
}

/* ============== Main Dashboard ============== */
// NOSONAR - This orchestrator component intentionally composes UI shell and imperative engine wiring.
export default function DashboardView() {
  // NOSONAR - intentional orchestrator component with controlled complexity.
  // NOSONAR
  useEffect(() => {
    document.title = DASHBOARD_TITLE
  }, [])

  // ── Zustand selectors (only these trigger React re-renders) ──
  const theme = useIoTStore(s => s.theme)
  const togglePause = useIoTStore(s => s.togglePause)
  const showGrid = useIoTStore(s => s.showGrid)
  const toggleGrid = useIoTStore(s => s.toggleGrid)
  const show3D = useIoTStore(s => s.show3D)
  const showMap = useIoTStore(s => s.showMap)
  const showHeatmap = useIoTStore(s => s.showHeatmap)
  const timeRange = useIoTStore(s => s.timeRange)
  const refreshSpeed = useIoTStore(s => s.refreshSpeed)
  const connectionStatus = useIoTStore(s => s.connectionStatus)
  const { backendStatus } = useAppHealthEvents()

  // ── Local React state (UI-only, not telemetry) ───────────────
  const [browserOffline, setBrowserOffline] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isTransitioning = useTransitionStore(s => s.isTransitioning)
  const phase = useTransitionStore(s => s.phase)
  const startIntro = useTransitionStore(s => s.startIntro)
  const setTransitionProgress = useTransitionStore(s => s.setProgress)
  const finishTransition = useTransitionStore(s => s.finishTransition)
  const introProgress = useMotionValue(1)
  const introOpacity = useTransform(introProgress, [0, 1], [0, 1])
  const introScale = useTransform(introProgress, [0, 1], [1.03, 1])
  const introLift = useTransform(introProgress, [0, 1], ['14px', '0px'])

  // ── Imperative layer refs ────────────────────────────────────
  const threeContainerRef = useRef<HTMLDivElement>(null)

  const { isLiveMode, setMapMode } = useMapModeControls(showHeatmap)
  useIntroTransitionSync(
    isTransitioning,
    phase,
    startIntro,
    introProgress,
    setTransitionProgress,
    finishTransition
  )

  // ── Boot IoT engine on mount ─────────────────────────────────
  useEffect(() => {
    setMounted(true)

    // Boot the entire engine pipeline: Worker → Store → Frame Scheduler
    bootEngine()

    return () => {
      shutdownEngine()
    }
  }, [])

  // ── Mount imperative 3D layer ────────────────────────────────
  useEffect(() => {
    if (!mounted || !show3D || !threeContainerRef.current) return
    mount3D(threeContainerRef.current)
    return () => {
      unmount3D()
    }
  }, [mounted, show3D])

  // ── API health check (lightweight, React-appropriate) ────────
  useApiHealthProbe()

  useEffect(() => {
    if (globalThis.window === undefined) return

    const syncOnlineState = () => {
      setBrowserOffline(!globalThis.navigator.onLine)
    }

    syncOnlineState()
    globalThis.addEventListener('online', syncOnlineState)
    globalThis.addEventListener('offline', syncOnlineState)

    return () => {
      globalThis.removeEventListener('online', syncOnlineState)
      globalThis.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  // ── Keyboard shortcuts ───────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'g':
            e.preventDefault()
            toggleGrid()
            break
          case 'p':
            e.preventDefault()
            togglePause()
            break
        }
      }
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [toggleGrid, togglePause])

  const apiHealthy = resolveApiHealthy(backendStatus)

  // ── Download report ──────────────────────────────────────────
  const downloadReport = useCallback(() => {
    const store = useIoTStore.getState()
    const runtimeMetricCards = buildMetrics(
      store.metrics,
      store.unacknowledgedAlerts
    )
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics: runtimeMetricCards.map(mc => ({
        title: mc.title,
        value: mc.value,
        change: mc.change,
      })),
      systemHealth: {
        api: apiHealthy,
        connectionStatus: store.connectionStatus,
        refreshSpeed,
      },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fleet-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [apiHealthy, refreshSpeed, timeRange])

  // ── Toggle perf overlay ──────────────────────────────────────
  const togglePerf = useCallback(() => {
    getPerfOverlay()?.toggle()
  }, [])

  const statusIssues = useMemo<StatusIssue[]>(
    () =>
      buildStatusIssues({
        backendStatus,
        browserOffline,
        connectionStatus,
        mounted,
      }),
    [backendStatus, browserOffline, connectionStatus, mounted]
  )

  const missionControlBackgroundStyle: React.CSSProperties &
    Record<'--mission-control-background', string> = {
    '--mission-control-background': THEME_COLORS[theme].gradient,
  }

  /* ================================================================
   *  RENDER — React only renders the UI shell, panels, controls.
   *  All real-time visualization is imperative (3D, Map, Charts).
   * ================================================================ */
  return (
    <GlobalErrorBoundary>
      <React.Suspense
        fallback={
          <div
            data-testid='dashboard-suspense-fallback'
            className='mission-control-shell grid min-h-screen place-items-center bg-slate-950/90 text-cyan-100'
          >
            <div className='space-y-3 text-center'>
              <div className='mx-auto h-28 w-44 rounded-2xl border border-cyan-300/25 bg-cyan-500/5 p-2'>
                <canvas
                  data-testid='dashboard-fallback-canvas'
                  aria-hidden='true'
                  tabIndex={-1}
                  className='h-full w-full rounded-xl opacity-60'
                />
              </div>
              <div className='mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/35 border-t-cyan-200' />
              <p className='text-sm tracking-wide'>
                Restoring mission control pipeline...
              </p>
            </div>
          </div>
        }
      >
        <motion.div
          data-testid='dashboard-main'
          style={{ opacity: introOpacity, scale: introScale, y: introLift }}
          className='dashboard-motion-shell mission-control-shell relative min-h-screen overflow-x-clip text-white selection:bg-cyan-500/30 selection:text-white'
        >
          <h1 className='sr-only'>Ice Truck Mission Control Dashboard</h1>
          <div className='pointer-events-none fixed inset-0 -z-20 hud-grid-overlay opacity-45' />
          <div className='pointer-events-none fixed inset-0 -z-10 scanline-overlay opacity-40' />
          <div className='pointer-events-none fixed inset-0 -z-10 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.65)_0.7px,transparent_0.7px)] [background-size:3px_3px]' />

          {/* ── Background gradient ── */}
          <div
            className='mission-control-background-layer pointer-events-none fixed inset-0 -z-20 transition-all duration-1000 mix-blend-screen'
            style={missionControlBackgroundStyle}
          />

          {/* ── Grid overlay ── */}
          {showGrid && (
            <div
              className='mission-control-grid-overlay pointer-events-none fixed inset-0 -z-10 opacity-[0.09] transition-opacity duration-500'
            />
          )}

          <PremiumSystemStatusBanner issues={statusIssues} />

          {show3D && (
            <div
              ref={threeContainerRef}
              className='fixed inset-0 -z-10 opacity-50'
            >
              <WebGLCanvasSkeleton />
            </div>
          )}

          <DashboardHeader
            apiHealthy={apiHealthy}
            downloadReport={downloadReport}
            togglePerf={togglePerf}
          />

          {/* ── Main Content ── */}
          <main
            data-testid='dashboard-content'
            className='page-content-reserved mx-auto max-w-[128rem] space-y-6 overflow-x-clip px-4 py-6 sm:px-6'
          >
            {/* ── Mission Control Surface (always-present E2E anchors) ── */}
            <motion.section
              initial={false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className='mission-control-surface-shell group relative isolate overflow-hidden rounded-[1.75rem] border border-cyan-200/25 bg-[linear-gradient(135deg,rgba(15,23,42,.82),rgba(15,23,42,.56))] p-5 backdrop-blur-[32px] shadow-[0_34px_120px_-64px_rgba(34,211,238,0.95)] supports-[backdrop-filter]:backdrop-saturate-150'
              data-testid='mission-control-surface'
            >
              <div
                aria-hidden='true'
                className='mission-control-surface-noise pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light'
              />
              <div className='pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10' />
              <div className='pointer-events-none absolute -inset-20 bg-[radial-gradient(80rem_30rem_at_20%_-20%,rgba(34,211,238,.28),transparent),radial-gradient(90rem_34rem_at_80%_140%,rgba(139,92,246,.24),transparent)] opacity-85 transition-opacity duration-700 group-hover:opacity-100' />
              <div className='relative z-50 pointer-events-auto flex min-h-[4.75rem] flex-wrap items-center justify-between gap-4'>
                <MapModeToggle
                  isLiveMode={isLiveMode}
                  onModeChange={setMapMode}
                  className='mb-0'
                />
                <OfflineBanner
                  isOffline={browserOffline}
                  className='static w-[min(92vw,26rem)]'
                />
              </div>
            </motion.section>

            {/* Status pills */}
            <SystemStatus />

            {/* ── Metric Cards Grid (isolated telemetry subscriptions) ── */}
            <motion.div
              initial='hidden'
              animate='show'
              variants={PANEL_STAGGER}
            >
              <LiveMetricCards />
            </motion.div>
            {/* ── Charts, Map, System Health (delegated to ChartGridController) ── */}
            <ChartGridController
              showMap={showMap}
              isLiveMode={isLiveMode}
              mounted={mounted}
            />

            {/* Footer */}
            <div className='text-center space-y-2 pt-4 pb-8'>
              <div className='flex items-center justify-center gap-4 flex-wrap text-xs text-slate-500'>
                <span>
                  Environment:{' '}
                  <span className='font-mono text-slate-400'>Production</span>
                </span>
                <span>•</span>
                <span>
                  Version:{' '}
                  <span className='font-mono text-slate-400'>v4.0.0</span>
                </span>
                <span>•</span>
                <span>
                  Build: <span className='font-mono text-slate-400'>#4523</span>
                </span>
                <span>•</span>
                <span>
                  Uptime:{' '}
                  <span className='font-mono text-emerald-400'>99.98%</span>
                </span>
              </div>
              <p className='text-xs text-slate-600'>
                © 2024 Fleet Management Pro • Powered by IoT Engine v4.0
                Masterpiece • All Rights Reserved
              </p>
              <p className='text-[10px] text-slate-700'>
                Keyboard Shortcuts: Ctrl+G (Grid) • Ctrl+P (Pause) • Ctrl+R
                (Refresh) • ESC (Close Modal)
              </p>
            </div>
          </main>
          <style jsx global>{`
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
        </motion.div>
      </React.Suspense>
    </GlobalErrorBoundary>
  )
}

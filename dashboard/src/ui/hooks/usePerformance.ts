'use client'

import { useEffect, useRef } from 'react'
import { IS_DEVELOPMENT } from '@/config/env'

interface PerformanceMetrics {
  renderTime: number
  componentName: string
  timestamp: number
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0)
  const mountTime = useRef<number>(0)

  useEffect(() => {
    mountTime.current = globalThis.performance.now()

    return () => {
      // Cleanup: no console logging or unused lifetime calculations
    }
  }, [componentName])

  const startRender = () => {
    renderStartTime.current = globalThis.performance.now()
  }

  const endRender = () => {
    const renderTime = globalThis.performance.now() - renderStartTime.current

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
    }

    // Send to analytics in production
    globalThis.window?.gtag?.('event', 'component_render', {
      component_name: componentName,
      render_time: renderTime,
      custom_parameter: 'performance_monitoring',
    })

    // Log in development
    if (IS_DEVELOPMENT && renderTime > 16) {
      console.warn(
        `[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`
      )
    }

    return metrics
  }

  return { startRender, endRender }
}

export function useWebVitals() {
  useEffect(() => {
    if (globalThis.window === undefined) return

    // Measure Core Web Vitals
    const observer = new globalThis.PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const metric = {
          name: entry.name,
          value: entry.startTime,
          timestamp: Date.now(),
        }

        // Send to analytics
        globalThis.window?.gtag?.('event', 'web_vital', {
          metric_name: metric.name,
          metric_value: metric.value,
          page_path: globalThis.window?.location.pathname,
        })

        // Web Vitals forwarded to analytics; no console logging to satisfy SonarQube
      })
    })

    try {
      observer.observe({
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint'],
      })
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }

    return () => observer.disconnect()
  }, [])
}

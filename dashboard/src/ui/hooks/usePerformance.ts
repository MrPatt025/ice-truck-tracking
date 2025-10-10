'use client'

import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  renderTime: number
  componentName: string
  timestamp: number
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0)
  const mountTime = useRef<number>(0)

  useEffect(() => {
    mountTime.current = performance.now()

    return () => {
      const unmountTime = performance.now()
      const totalLifetime = unmountTime - mountTime.current

      // Log performance metrics
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Performance] ${componentName} lifetime: ${totalLifetime.toFixed(2)}ms`
        )
      }
    }
  }, [componentName])

  const startRender = () => {
    renderStartTime.current = performance.now()
  }

  const endRender = () => {
    const renderTime = performance.now() - renderStartTime.current

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
    }

    // Send to analytics in production
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'component_render', {
        component_name: componentName,
        render_time: renderTime,
        custom_parameter: 'performance_monitoring',
      })
    }

    // Log in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
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
    if (typeof window === 'undefined') return

    // Measure Core Web Vitals
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const metric = {
          name: entry.name,
          value: entry.startTime,
          timestamp: Date.now(),
        }

        // Send to analytics
        if ((window as any).gtag) {
          ;(window as any).gtag('event', 'web_vital', {
            metric_name: metric.name,
            metric_value: metric.value,
            page_path: window.location.pathname,
          })
        }

        console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms`)
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



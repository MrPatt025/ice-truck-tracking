/* ================================================================
 *  Motion Physics Engine — React Integration Components
 *  ──────────────────────────────────────────────────────
 *  Thin React wrappers around the imperative spring system.
 *  These components use refs + rAF to avoid re-renders.
 *
 *  Components:
 *    1. useSpring()       — Hook for spring-driven values
 *    2. useSpring2D()     — Hook for 2D spring positions
 *    3. MagneticButton    — Button with magnetic cursor attraction
 *    4. InertiaPanel      — Draggable panel with inertia
 *    5. SpringNumber      — Animated number display
 *
 *  All animations run on rAF — zero CSS transitions.
 * ================================================================ */

'use client';

import React, {
    useRef,
    useEffect,
    useCallback,
    type ReactNode,
    type CSSProperties,
} from 'react';
import {
    SpringValue,
    Spring2D,
    GestureEngine,
    SPRING_PRESETS,
} from './springPhysics';
import type { SpringConfig } from '../types';
import { frameScheduler } from '../frameScheduler';

// ═════════════════════════════════════════════════════════════════
//  1. useSpring — single value spring hook
// ═════════════════════════════════════════════════════════════════

export interface UseSpringOptions {
    config?: Partial<SpringConfig>;
    onUpdate?: (value: number) => void;
    onRest?: () => void;
}

/**
 * useSpring — creates a spring-driven value.
 * Returns: [currentRef, setTarget, snapTo]
 *
 * The currentRef.current is always up-to-date (no re-renders).
 * Use onUpdate callback to apply to DOM imperatively.
 */
export function useSpring(
  initial: number,
  options: UseSpringOptions = {}
): [
  React.MutableRefObject<number>,
  (target: number) => void,
  (value: number) => void,
] {
  const springRef = useRef<SpringValue | null>(null)
  const valueRef = useRef(initial)
  const idRef = useRef(`spring-${Math.random().toString(36).slice(2, 8)}`)

  // Initialize spring once
  springRef.current ??= new SpringValue(initial, options.config)

  useEffect(() => {
    const spring = springRef.current
    if (!spring) return
    const id = idRef.current

    spring.onChange(v => {
      valueRef.current = v
      options.onUpdate?.(v)
    })
    spring.onComplete(() => options.onRest?.())

    // Register with frame scheduler
    frameScheduler.register(id, dt => {
      spring.tick(dt / 1000) // convert ms → sec
    })

    return () => {
      frameScheduler.unregister(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTarget = useCallback((target: number) => {
    springRef.current?.setTarget(target)
  }, [])

  const snapTo = useCallback((value: number) => {
    springRef.current?.snapTo(value)
    valueRef.current = value
  }, [])

  return [valueRef, setTarget, snapTo]
}

// ═════════════════════════════════════════════════════════════════
//  2. useSpring2D — 2D position spring hook
// ═════════════════════════════════════════════════════════════════

export function useSpring2D(
  initialX: number,
  initialY: number,
  config: Partial<SpringConfig> = {},
  onUpdate?: (x: number, y: number) => void
): [
  React.MutableRefObject<{ x: number; y: number }>,
  (x: number, y: number) => void,
] {
  const springRef = useRef<Spring2D | null>(null)
  const posRef = useRef({ x: initialX, y: initialY })
  const idRef = useRef(`spring2d-${Math.random().toString(36).slice(2, 8)}`)

  springRef.current ??= new Spring2D(initialX, initialY, config)

  useEffect(() => {
    const spring = springRef.current
    if (!spring) return
    const id = idRef.current

    spring.onChange((x, y) => {
      posRef.current = { x, y }
      onUpdate?.(x, y)
    })

    frameScheduler.register(id, dt => {
      spring.tick(dt / 1000)
    })

    return () => {
      frameScheduler.unregister(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTarget = useCallback((x: number, y: number) => {
    springRef.current?.setTarget(x, y)
  }, [])

  return [posRef, setTarget]
}

// ═════════════════════════════════════════════════════════════════
//  3. MAGNETIC BUTTON
//     Cursor within radius → button moves toward cursor.
//     Uses spring physics for smooth, physical-feeling attraction.
// ═════════════════════════════════════════════════════════════════

export interface MagneticButtonProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  radius?: number // attraction radius in px (default 120)
  strength?: number // 0-1 attraction strength (default 0.3)
  onClick?: () => void
  disabled?: boolean
}

export function MagneticButton({
  children,
  className = '',
  style,
  radius = 120,
  strength = 0.3,
  onClick,
  disabled = false,
}: Readonly<MagneticButtonProps>) {
  const ref = useRef<HTMLButtonElement>(null)
  const springRef = useRef<Spring2D | null>(null)
  const idRef = useRef(`magnetic-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    if (!ref.current || disabled) return
    const el = ref.current
    const spring = new Spring2D(0, 0, SPRING_PRESETS.magnetic)
    springRef.current = spring
    const id = idRef.current

    spring.onChange((x, y) => {
      el.style.transform = `translate(${x}px, ${y}px)`
    })

    frameScheduler.register(id, dt => {
      spring.tick(dt / 1000)
    })

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)

      if (dist < radius) {
        const factor = (1 - dist / radius) * strength
        spring.setTarget(dx * factor, dy * factor)
      } else {
        spring.setTarget(0, 0)
      }
    }

    const handleMouseLeave = () => {
      spring.setTarget(0, 0)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      frameScheduler.unregister(id)
      document.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
      el.style.transform = ''
    }
  }, [disabled, radius, strength])

  return (
    <button
      ref={ref}
      className={`${className ?? ''} will-change-transform`}
      style={style}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════
//  4. INERTIA PANEL
//     Draggable panel that decelerates with spring physics.
// ═════════════════════════════════════════════════════════════════

export interface InertiaPanelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Axis constraint */
  axis?: 'x' | 'y' | 'both'
  /** Snap back to origin on release */
  snapBack?: boolean
  /** Max drag distance (px) */
  maxDistance?: number
  /** Spring config for release inertia */
  springConfig?: Partial<SpringConfig>
  /** Callback on drag/inertia update */
  onDrag?: (offsetX: number, offsetY: number) => void
}

export function InertiaPanel({
  children,
  className = '',
  style,
  axis = 'both',
  snapBack = true,
  maxDistance = 500,
  springConfig = SPRING_PRESETS.gentle,
  onDrag,
}: Readonly<InertiaPanelProps>) {
  const ref = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<GestureEngine | null>(null)
  const idRef = useRef(`inertia-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const gesture = new GestureEngine(springConfig)
    gestureRef.current = gesture
    const id = idRef.current

    gesture.onChange(state => {
      let x = state.offsetX
      let y = state.offsetY

      // Axis constraint
      if (axis === 'x') y = 0
      if (axis === 'y') x = 0

      // Clamp
      x = Math.max(-maxDistance, Math.min(maxDistance, x))
      y = Math.max(-maxDistance, Math.min(maxDistance, y))

      el.style.transform = `translate(${x}px, ${y}px)`
      onDrag?.(x, y)
    })

    frameScheduler.register(id, dt => {
      gesture.tick(dt / 1000)
    })

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      gesture.start(e.clientX, e.clientY)
    }

    const handlePointerMove = (e: PointerEvent) => {
      gesture.move(e.clientX, e.clientY)
    }

    const handlePointerUp = () => {
      gesture.release(
        snapBack ? 0 : gesture.getState().offsetX,
        snapBack ? 0 : gesture.getState().offsetY
      )
    }

    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('pointercancel', handlePointerUp)

    return () => {
      frameScheduler.unregister(id)
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('pointercancel', handlePointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, snapBack, maxDistance])

  return (
    <div
      ref={ref}
      className={`${className ?? ''} touch-none cursor-grab will-change-transform`}
      style={style}
    >
      {children}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
//  5. SPRING NUMBER — Animated number counter
//     Smoothly interpolates between values using springs.
//     Uses imperative DOM update — zero re-renders.
// ═════════════════════════════════════════════════════════════════

export interface SpringNumberProps {
  value: number
  format?: (n: number) => string
  className?: string
  style?: CSSProperties
  config?: Partial<SpringConfig>
}

export function SpringNumber({
  value,
  format = n => n.toLocaleString(undefined, { maximumFractionDigits: 1 }),
  className = '',
  style,
  config = SPRING_PRESETS.stiff,
}: Readonly<SpringNumberProps>) {
  const ref = useRef<HTMLSpanElement>(null)
  const springRef = useRef<SpringValue | null>(null)
  const idRef = useRef(`num-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    const spring = new SpringValue(value, config)
    springRef.current = spring
    const id = idRef.current

    spring.onChange(v => {
      if (ref.current) {
        ref.current.textContent = format(v)
      }
    })

    frameScheduler.register(id, dt => {
      spring.tick(dt / 1000)
    })

    return () => {
      frameScheduler.unregister(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update target when prop changes (no re-render needed)
  useEffect(() => {
    springRef.current?.setTarget(value)
  }, [value])

  return (
    <span ref={ref} className={`${className ?? ''} tabular-nums`} style={style}> {/* NOSONAR — passed-through style prop */}
      {format(value)}
    </span>
  )
}

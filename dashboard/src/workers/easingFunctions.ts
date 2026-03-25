/**
 * Easing functions for smooth camera animations.
 * Standard easing curves used in Web Animations API and Framer Motion.
 */

/**
 * easeInOutCubic — smooth cubic easing (in-out).
 * Accelerates at the start, decelerates at the end.
 * Perfect for camera fly-to transitions.
 *
 * @param t - Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * easeInOutQuad — quadratic easing (in-out).
 * Smoother than linear, good for secondary animations.
 *
 * @param t - Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * easeOutExpo — exponential easing (out).
 * Smooth deceleration, good for opening/expanding animations.
 *
 * @param t - Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/**
 * easeInOutExpo — exponential easing (in-out).
 * Starts slow, middle is fast, ends slow.
 * Good for dramatic transitions.
 *
 * @param t - Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export function easeInOutExpo(t: number): number {
  return t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2
}

/**
 * lerp — Linear interpolation between two values.
 * @param from - Start value
 * @param to - End value
 * @param t - Progress from 0 to 1
 * @returns Interpolated value
 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * clampUnit — Clamp value to 0-1 range.
 * @param value - Value to clamp
 * @returns Clamped value between 0 and 1
 */
export function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

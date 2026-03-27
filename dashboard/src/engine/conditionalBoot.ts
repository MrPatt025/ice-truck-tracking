/**
 * Conditional 3D Bootstrap — E2E Light Mode Support
 *
 * When `E2E_LIGHT=true`, engine boots without WebGL/Three.js/Map
 * layers. Used by Playwright light profile to avoid GPU memory
 * pressure during CI form/navigation testing.
 *
 * Import in your dashboard page to check:
 *   import { is3DDisabled } from '@/engine/conditionalBoot';
 */

/** Check if 3D/GPU layers should be disabled (E2E light mode) */
export function is3DDisabled(): boolean {
  if (globalThis.window === undefined) {
    return true // SSR
  }

  return (
    globalThis.window.__E2E_LIGHT__ === true ||
    process.env.NEXT_PUBLIC_E2E_LIGHT === 'true'
  )
}

// Augment Window for the E2E flag
declare global {
    interface Window {
      __E2E_LIGHT__?: boolean
    }
}

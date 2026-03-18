'use client'

import { useEffect } from 'react'

type CinematicPhase = 'idle' | 'outro' | 'intro'

const OUTRO_DURATION_MS = 1200
const INTRO_DURATION_MS = 900

export function useCinematicCamera(
    canvas: HTMLCanvasElement | null,
    isTransitioning: boolean,
    phase: CinematicPhase
) {
    useEffect(() => {
        if (!canvas) return

        let raf = 0
        const startedAt = performance.now()

        const reset = () => {
            canvas.style.opacity = '0.32'
            canvas.style.transform = 'translate3d(0, 0, 0) scale(1)'
            canvas.style.filter = 'saturate(1) contrast(1) blur(0px)'
            canvas.style.setProperty('--camera-fov', '45')
        }

        if (!isTransitioning || phase === 'idle') {
            reset()
            return
        }

        const animate = () => {
            const elapsed = performance.now() - startedAt
            const duration = phase === 'outro' ? OUTRO_DURATION_MS : INTRO_DURATION_MS
            const t = Math.min(1, elapsed / duration)

            // Ease-in-out cubic
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

            if (phase === 'outro') {
                const fov = 45 + 15 * eased
                const scale = 1 + 0.14 * eased
                const opacity = 0.32 + 0.34 * eased
                const blur = 0.8 * eased

                canvas.style.setProperty('--camera-fov', fov.toFixed(2))
                canvas.style.opacity = opacity.toFixed(3)
                canvas.style.transform = `translate3d(0, ${-8 * eased}px, 0) scale(${scale.toFixed(4)})`
                canvas.style.filter = `saturate(${(1 + 0.25 * eased).toFixed(3)}) contrast(${(1 + 0.18 * eased).toFixed(3)}) blur(${blur.toFixed(2)}px)`
            } else {
                const fov = 60 - 15 * eased
                const scale = 1.14 - 0.14 * eased
                const opacity = 0.66 - 0.34 * eased
                const blur = 0.8 - 0.8 * eased

                canvas.style.setProperty('--camera-fov', fov.toFixed(2))
                canvas.style.opacity = opacity.toFixed(3)
                canvas.style.transform = `translate3d(0, ${-8 + 8 * eased}px, 0) scale(${scale.toFixed(4)})`
                canvas.style.filter = `saturate(${(1.25 - 0.25 * eased).toFixed(3)}) contrast(${(1.18 - 0.18 * eased).toFixed(3)}) blur(${blur.toFixed(2)}px)`
            }

            if (t < 1) {
                raf = requestAnimationFrame(animate)
            }
        }

        raf = requestAnimationFrame(animate)

        return () => {
            cancelAnimationFrame(raf)
        }
    }, [canvas, isTransitioning, phase])
}

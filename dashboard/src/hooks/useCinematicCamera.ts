'use client'

import { useEffect } from 'react'

type CinematicPhase = 'idle' | 'outro' | 'intro'

export function useCinematicCamera(
    canvas: HTMLCanvasElement | null,
    isTransitioning: boolean,
    phase: CinematicPhase,
    progress: number
) {
    useEffect(() => {
        if (!canvas) return

        const reset = () => {
            canvas.style.opacity = '0.32'
            canvas.style.transform = 'translate3d(0, 0, 0) scale(1)'
            canvas.style.filter = 'saturate(1.05) contrast(1.02) blur(0px)'
            canvas.style.setProperty('--camera-fov', '45')
            canvas.style.setProperty('--transition-progress', '0')
        }

        if (!isTransitioning || phase === 'idle') {
            reset()
            return
        }

        const normalized = Math.min(1, Math.max(0, progress))

        // Ease-in-out cubic
        const eased = normalized < 0.5
            ? 4 * normalized * normalized * normalized
            : 1 - Math.pow(-2 * normalized + 2, 3) / 2

        canvas.style.setProperty('--transition-progress', eased.toFixed(4))

        if (phase === 'outro') {
            const fov = 45 + 17 * eased
            const scale = 1 + 0.16 * eased
            const opacity = 0.32 + 0.42 * eased
            const blur = 1.2 * eased

            canvas.style.setProperty('--camera-fov', fov.toFixed(2))
            canvas.style.opacity = opacity.toFixed(3)
            canvas.style.transform = `translate3d(0, ${-10 * eased}px, 0) scale(${scale.toFixed(4)})`
            canvas.style.filter = `saturate(${(1.08 + 0.28 * eased).toFixed(3)}) contrast(${(1.02 + 0.24 * eased).toFixed(3)}) blur(${blur.toFixed(2)}px)`
        } else {
            const fov = 62 - 17 * eased
            const scale = 1.16 - 0.16 * eased
            const opacity = 0.74 - 0.42 * eased
            const blur = 1.2 - 1.2 * eased

            canvas.style.setProperty('--camera-fov', fov.toFixed(2))
            canvas.style.opacity = opacity.toFixed(3)
            canvas.style.transform = `translate3d(0, ${-10 + 10 * eased}px, 0) scale(${scale.toFixed(4)})`
            canvas.style.filter = `saturate(${(1.36 - 0.28 * eased).toFixed(3)}) contrast(${(1.26 - 0.24 * eased).toFixed(3)}) blur(${blur.toFixed(2)}px)`
        }
    }, [canvas, isTransitioning, phase, progress])
}

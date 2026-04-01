'use client'

import { useEffect } from 'react'
import {
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useTransform,
} from 'framer-motion'
import { setThreeCameraFov } from '@/engine'

type CinematicPhase = 'idle' | 'outro' | 'intro'

export function useCinematicCamera(
    canvas: HTMLCanvasElement | null,
    isTransitioning: boolean,
    phase: CinematicPhase,
    progress: number
) {
    const { scrollYProgress } = useScroll()
    const transitionProgress = useMotionValue(0)
    const cinematicDriver = useTransform(
        [scrollYProgress, transitionProgress],
        (values) => {
            const [scroll, transition] = values as number[]
            const clampedScroll = Math.min(1, Math.max(0, scroll * 0.92))
            const clampedTransition = Math.min(1, Math.max(0, transition))
            return Math.min(1, clampedScroll * 0.38 + clampedTransition * 0.82)
        }
    )
    const cinematicFov = useTransform(cinematicDriver, [0, 1], [45, 66])
    const cinematicOpacity = useTransform(cinematicDriver, [0, 1], [0.28, 0.84])

    useEffect(() => {
        transitionProgress.set(progress)
    }, [progress, transitionProgress])

    useMotionValueEvent(cinematicFov, 'change', latest => {
        const clamped = Math.min(68, Math.max(36, latest))
        setThreeCameraFov(clamped)
        if (!canvas) return
        canvas.style.setProperty('--camera-fov', clamped.toFixed(2))
    })

    useMotionValueEvent(cinematicOpacity, 'change', latest => {
        if (!canvas) return
        const clamped = Math.min(0.9, Math.max(0.18, latest))
        canvas.style.opacity = clamped.toFixed(3)
    })

    useEffect(() => {
        if (!canvas) return

        const reset = () => {
            setThreeCameraFov(45)
            canvas.style.opacity = '0.32'
            canvas.style.transform = 'translate3d(0, 0, 0) scale(1)'
            canvas.style.filter = 'saturate(1.06) contrast(1.03) blur(0px)'
            canvas.style.setProperty('--camera-fov', '45')
            canvas.style.setProperty('--transition-progress', '0')
        }

        if (!isTransitioning || phase === 'idle') {
            reset()
            return
        }

        const normalized = Math.min(1, Math.max(0, progress))

        const eased =
            normalized < 0.5
                ? 4 * normalized * normalized * normalized
                : 1 - Math.pow(-2 * normalized + 2, 3) / 2

        canvas.style.setProperty('--transition-progress', eased.toFixed(4))

        if (phase === 'outro') {
            const scale = 1 + 0.16 * eased
            const blur = 1.2 * eased

            canvas.style.transform = `translate3d(0, ${-12 * eased}px, 0) scale(${scale.toFixed(4)})`
            canvas.style.filter = `saturate(${(1.1 + 0.3 * eased).toFixed(3)}) contrast(${(1.04 + 0.2 * eased).toFixed(3)}) blur(${blur.toFixed(2)}px)`
            return
        }

        const scale = 1.16 - 0.16 * eased
        const blur = 1.2 - 1.2 * eased

        canvas.style.transform = `translate3d(0, ${-10 + 10 * eased}px, 0) scale(${scale.toFixed(4)})`
        canvas.style.filter = `saturate(${(1.34 - 0.27 * eased).toFixed(3)}) contrast(${(1.24 - 0.21 * eased).toFixed(3)}) blur(${blur.toFixed(2)}px)`
    }, [canvas, isTransitioning, phase, progress])
}

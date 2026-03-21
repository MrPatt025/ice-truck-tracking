import { create } from 'zustand'

type TransitionPhase = 'idle' | 'outro' | 'intro'

interface TransitionState {
    isTransitioning: boolean
    phase: TransitionPhase
    startedAt: number | null
    progress: number
    startTransition: () => void
    startIntro: () => void
    setProgress: (progress: number) => void
    finishTransition: () => void
}

export const useTransitionStore = create<TransitionState>((set) => ({
    isTransitioning: false,
    phase: 'idle',
    startedAt: null,
    progress: 0,
    startTransition: () =>
        set({
            isTransitioning: true,
            phase: 'outro',
            startedAt: Date.now(),
            progress: 0,
        }),
    startIntro: () =>
        set((state) => ({
            isTransitioning: true,
            phase: 'intro',
            startedAt: state.startedAt ?? Date.now(),
            progress: 0,
        })),
    setProgress: (progress) =>
        set((state) => {
            if (!state.isTransitioning) return state
            const clamped = Math.max(0, Math.min(1, progress))
            if (state.progress === clamped) return state
            return { ...state, progress: clamped }
        }),
    finishTransition: () =>
        set({
            isTransitioning: false,
            phase: 'idle',
            startedAt: null,
            progress: 0,
        }),
}))

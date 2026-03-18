import { create } from 'zustand'

type TransitionPhase = 'idle' | 'outro' | 'intro'

interface TransitionState {
    isTransitioning: boolean
    phase: TransitionPhase
    startedAt: number | null
    startTransition: () => void
    startIntro: () => void
    finishTransition: () => void
}

export const useTransitionStore = create<TransitionState>((set) => ({
    isTransitioning: false,
    phase: 'idle',
    startedAt: null,
    startTransition: () =>
        set({
            isTransitioning: true,
            phase: 'outro',
            startedAt: Date.now(),
        }),
    startIntro: () =>
        set((state) => ({
            isTransitioning: true,
            phase: 'intro',
            startedAt: state.startedAt ?? Date.now(),
        })),
    finishTransition: () =>
        set({
            isTransitioning: false,
            phase: 'idle',
            startedAt: null,
        }),
}))

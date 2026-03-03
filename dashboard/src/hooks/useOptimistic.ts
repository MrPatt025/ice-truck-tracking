import { useState, useCallback, useRef, useTransition } from 'react';

/**
 * useOptimistic — apply UI changes instantly, revert on server failure.
 * Uses React 18 useTransition for non-blocking updates.
 *
 * @example
 * const { data, mutate } = useOptimistic(trucks);
 * mutate(
 *   (prev) => [...prev, newTruck],          // optimistic updater
 *   () => fetch('/api/trucks', { method: 'POST', body: ... }),   // server call
 * );
 */
export function useOptimistic<T>(serverState: T) {
    const [optimistic, setOptimistic] = useState<T>(serverState);
    const [error, setError] = useState<Error | null>(null);
    const [isPending, startTransition] = useTransition();
    const rollbackRef = useRef<T>(serverState);

    // Sync when server state changes externally
    const prevRef = useRef(serverState);
    if (prevRef.current !== serverState) {
        prevRef.current = serverState;
        setOptimistic(serverState);
        rollbackRef.current = serverState;
    }

    const mutate = useCallback(
        async (
            updater: (current: T) => T,
            serverAction: () => Promise<T | void>,
        ) => {
            setError(null);
            rollbackRef.current = optimistic;
            // Apply optimistic update immediately
            const next = updater(optimistic);
            setOptimistic(next);

            try {
                const result = await serverAction();
                // If server returns new state, use it
                startTransition(() => {
                    if (result !== undefined) {
                        setOptimistic(result as T);
                    }
                });
            } catch (err) {
                // Rollback on failure
                setOptimistic(rollbackRef.current);
                const e = err instanceof Error ? err : new Error(String(err));
                setError(e);
                throw e;
            }
        },
        [optimistic],
    );

    return { data: optimistic, mutate, error, isPending } as const;
}

/**
 * useDebouncedCallback — debounce a callback by `delay` ms.
 * Useful for search inputs, live filters.
 */
export function useDebouncedCallback<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay: number,
) {
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    return useCallback(
        (...args: Args) => {
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => callback(...args), delay);
        },
        [callback, delay],
    );
}

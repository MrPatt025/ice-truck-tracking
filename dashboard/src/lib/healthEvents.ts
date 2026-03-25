export const WS_HEALTH_EVENT_NAME = 'app:ws-health'
export const BACKEND_HEALTH_EVENT_NAME = 'app:backend-health'

export type WsHealthStatus = 'connected' | 'reconnecting' | 'offline'
export type BackendHealthStatus = 'healthy' | 'degraded'

export interface WsHealthEventDetail {
    status: WsHealthStatus
    source: string
    attempt?: number
    reason?: string
    at: number
}

export interface BackendHealthEventDetail {
    status: BackendHealthStatus
    source: string
    statusCode?: number
    reason?: string
    at: number
}

function canDispatchEvents(): boolean {
    return (
        globalThis.window !== undefined
        && typeof globalThis.window.dispatchEvent === 'function'
    )
}

export function dispatchWsHealthEvent(
    detail: Omit<WsHealthEventDetail, 'at'> & Partial<Pick<WsHealthEventDetail, 'at'>>
): void {
    if (!canDispatchEvents()) return

    const payload: WsHealthEventDetail = {
        ...detail,
        at: detail.at ?? Date.now(),
    }

    globalThis.window.dispatchEvent(
        new CustomEvent<WsHealthEventDetail>(WS_HEALTH_EVENT_NAME, {
            detail: payload,
        })
    )
}

export function dispatchBackendHealthEvent(
    detail: Omit<BackendHealthEventDetail, 'at'> & Partial<Pick<BackendHealthEventDetail, 'at'>>
): void {
    if (!canDispatchEvents()) return

    const payload: BackendHealthEventDetail = {
        ...detail,
        at: detail.at ?? Date.now(),
    }

    globalThis.window.dispatchEvent(
        new CustomEvent<BackendHealthEventDetail>(BACKEND_HEALTH_EVENT_NAME, {
            detail: payload,
        })
    )
}

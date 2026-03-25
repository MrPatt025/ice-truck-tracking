'use client'

import React from 'react'
import {
    BACKEND_HEALTH_EVENT_NAME,
    WS_HEALTH_EVENT_NAME,
    type BackendHealthEventDetail,
    type BackendHealthStatus,
    type WsHealthEventDetail,
    type WsHealthStatus,
} from '@/lib/healthEvents'

interface AppHealthState {
    wsStatus: WsHealthStatus
    backendStatus: BackendHealthStatus | 'unknown'
    wsDetail: WsHealthEventDetail | null
    backendDetail: BackendHealthEventDetail | null
}

export function useAppHealthEvents(): AppHealthState {
    const [wsStatus, setWsStatus] = React.useState<WsHealthStatus>('connected')
    const [backendStatus, setBackendStatus] = React.useState<BackendHealthStatus | 'unknown'>('unknown')
    const [wsDetail, setWsDetail] = React.useState<WsHealthEventDetail | null>(null)
    const [backendDetail, setBackendDetail] = React.useState<BackendHealthEventDetail | null>(null)

    React.useEffect(() => {
        if (globalThis.window === undefined) return

        const onWsHealth = (event: Event) => {
            const customEvent = event as CustomEvent<WsHealthEventDetail>
            if (!customEvent.detail) return
            setWsStatus(customEvent.detail.status)
            setWsDetail(customEvent.detail)
        }

        const onBackendHealth = (event: Event) => {
            const customEvent = event as CustomEvent<BackendHealthEventDetail>
            if (!customEvent.detail) return
            setBackendStatus(customEvent.detail.status)
            setBackendDetail(customEvent.detail)
        }

        globalThis.window.addEventListener(WS_HEALTH_EVENT_NAME, onWsHealth as EventListener)
        globalThis.window.addEventListener(BACKEND_HEALTH_EVENT_NAME, onBackendHealth as EventListener)

        return () => {
            globalThis.window.removeEventListener(WS_HEALTH_EVENT_NAME, onWsHealth as EventListener)
            globalThis.window.removeEventListener(BACKEND_HEALTH_EVENT_NAME, onBackendHealth as EventListener)
        }
    }, [])

    return {
        wsStatus,
        backendStatus,
        wsDetail,
        backendDetail,
    }
}

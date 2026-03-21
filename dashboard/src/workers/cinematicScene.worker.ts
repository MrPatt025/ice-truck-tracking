import React from 'react'
import { render } from '@react-three/offscreen'
import CinematicRig from './CinematicRig'
import {
  isCinematicWorkerMessage,
  type CinematicWorkerMessage,
} from './cinematicMessages'
import { runtimeState } from './cinematicRuntimeState'

// NOSONAR: OffscreenCanvas communication is same-origin and guarded below.
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const messageOrigin = event.origin || self.location.origin
  if (messageOrigin !== self.location.origin) return
  if (!isCinematicWorkerMessage(event.data)) return

  const data: CinematicWorkerMessage = event.data

  if (data.type === 'cinematic:scroll') {
    runtimeState.scroll = Math.min(1, Math.max(0, data.payload.progress))
    return
  }

  if (data.type === 'cinematic:telemetry') {
    runtimeState.telemetry = data.payload
    return
  }

  runtimeState.viewport = data.payload
})

render(React.createElement(CinematicRig))
